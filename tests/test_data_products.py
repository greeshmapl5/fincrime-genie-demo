import ast
import re
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, call


NOTEBOOK = Path(__file__).resolve().parents[1] / "src" / "06_build_data_products.py"


class DataProductsTests(unittest.TestCase):
    def setUp(self):
        source = ast.parse(NOTEBOOK.read_text(encoding="utf-8"))
        functions = ast.Module(
            body=[node for node in source.body if isinstance(node, ast.FunctionDef)],
            type_ignores=[],
        )
        self.ns = {"SRC": "fincrime.gold", "DP": "fincrime.data_products",
                   "re": re, "CATALOG": "fincrime",
                   "INFO": "fincrime.information_schema", "TARGET": "data_products",
                   "SOURCE": "gold", "RESET": False}
        exec(compile(functions, str(NOTEBOOK), "exec"), self.ns)
        self.execute = Mock()
        self.query = Mock(return_value=[])
        self.types = Mock(return_value={})
        self.ns.update(run=self.execute, q=self.query, object_types=self.types)

    def test_creates_source_views_as_live_views(self):
        sql = "SELECT * FROM fincrime.bronze.alerts_raw"
        self.query.return_value = [SimpleNamespace(view_definition=sql)]
        select = self.ns["source_select"]("alerts", "VIEW")
        self.assertTrue(self.ns["build"]("alerts", select, "VIEW"))
        self.execute.assert_called_once_with(
            "CREATE VIEW fincrime.data_products.alerts AS SELECT * FROM fincrime.bronze.alerts_raw"
        )

    def test_view_logic_references_local_products_without_changing_literals(self):
        sql = (
            "SELECT 'fincrime.gold.transactions' AS label, \"t\".* "
            "FROM `fincrime`.`gold`.`transactions` t "
            "JOIN FINCRIME.gold.customer_360 c ON c.customer_id=t.customer_id "
            "-- fincrime.gold.notes\n"
            "/* fincrime.gold.comment */"
        )
        relocated = self.ns["relocate_view_sql"](sql)
        self.assertIn("FROM fincrime.data_products.`transactions` t", relocated)
        self.assertIn("JOIN fincrime.data_products.customer_360 c", relocated)
        self.assertIn("'fincrime.gold.transactions'", relocated)
        self.assertIn("-- fincrime.gold.notes", relocated)
        self.assertIn("/* fincrime.gold.comment */", relocated)

    def test_missing_source_view_definition_fails_instead_of_creating_wrapper(self):
        with self.assertRaisesRegex(ValueError, "Missing view definition"):
            self.ns["source_select"]("alerts", "VIEW")
        self.execute.assert_not_called()

    def test_preflight_surfaces_upstream_denial_without_writing(self):
        self.query.side_effect = RuntimeError("Missing USE SCHEMA on fincrime_source.public")
        with self.assertRaisesRegex(RuntimeError, "Missing USE SCHEMA"):
            self.ns["preflight"]({"alerts": "SELECT * FROM fincrime_source.public.case_decisions"})
        self.execute.assert_not_called()

    def test_view_refresh_restores_column_comments_without_replacing_object(self):
        self.types.return_value = {"alerts": "VIEW"}
        self.query.side_effect = [
            [SimpleNamespace(column_name="status", comment="App's description"),
             SimpleNamespace(column_name="removed", comment="Old column")],
            [SimpleNamespace(column_name="status")],
        ]
        self.assertFalse(self.ns["build"]("alerts", "SELECT * FROM fincrime.gold.alerts", "VIEW"))
        self.assertEqual(self.execute.call_args_list, [
            call("ALTER VIEW fincrime.data_products.alerts AS SELECT * FROM fincrime.gold.alerts"),
            call("COMMENT ON COLUMN fincrime.data_products.alerts.`status` IS 'App\\'s description'"),
        ])

    def test_table_refresh_uses_column_names_and_never_drops_grants(self):
        self.types.return_value = {"transactions": "MANAGED"}
        self.ns["RESET"] = True
        self.assertTrue(self.ns["build"]("transactions", "SELECT * FROM fincrime.gold.transactions"))
        self.execute.assert_called_once_with(
            "INSERT OVERWRITE fincrime.data_products.transactions BY NAME SELECT * FROM fincrime.gold.transactions"
        )

    def test_type_mismatch_stops_even_when_resetting_metadata(self):
        self.types.return_value = {"alerts": "MANAGED"}
        self.ns["RESET"] = True
        with self.assertRaisesRegex(ValueError, "Back up metadata and grants"):
            self.ns["build"]("alerts", "SELECT * FROM fincrime.gold.alerts", "VIEW")
        self.execute.assert_not_called()

    def test_write_failures_do_not_trigger_destructive_recreation(self):
        self.types.return_value = {"transactions": "MANAGED"}
        self.execute.side_effect = RuntimeError("PERMISSION_DENIED")
        with self.assertRaisesRegex(RuntimeError, "PERMISSION_DENIED"):
            self.ns["build"]("transactions", "SELECT * FROM fincrime.gold.transactions")
        self.assertEqual(self.execute.call_count, 1)

    def test_metadata_reset_removes_only_tags_missing_from_source(self):
        self.query.side_effect = [
            [SimpleNamespace(column_name=None, tag_name="classification", tag_value="Internal")],
            [SimpleNamespace(column_name=None, tag_name="classification", tag_value="Internal"),
             SimpleNamespace(column_name=None, tag_name="system.certification_status", tag_value="certified")],
            [],
            [],
        ]
        self.ns["replace_tags"]("alerts", "gold")
        self.execute.assert_called_once_with(
            "ALTER TABLE fincrime.data_products.alerts UNSET TAGS ('system.certification_status')"
        )

    def test_tag_assignment_failure_is_not_silently_skipped(self):
        self.query.side_effect = [
            [SimpleNamespace(column_name=None, tag_name="classification", tag_value="Restricted")],
            [],
        ]
        self.execute.side_effect = RuntimeError("PERMISSION_DENIED")
        with self.assertRaisesRegex(RuntimeError, "PERMISSION_DENIED"):
            self.ns["replace_tags"]("alerts", "gold")


class DirectBuildTests(unittest.TestCase):
    def setUp(self):
        path = NOTEBOOK.with_name("02_build_gold_data_products.py")
        source = ast.parse(path.read_text(encoding="utf-8"))
        functions = ast.Module(
            body=[node for node in source.body if isinstance(node, ast.FunctionDef)],
            type_ignores=[],
        )
        self.spark = Mock()
        self.spark.catalog.tableExists.return_value = True
        self.execute = Mock()
        self.ns = {"spark": self.spark, "G": "fincrime.data_products",
                   "NEW_TABLES": set(), "RESET": False}
        exec(compile(functions, str(path), "exec"), self.ns)
        self.ns["run"] = self.execute

    def test_build_writes_to_products_in_place_without_gold(self):
        self.ns["build_table"]("transactions", "SELECT * FROM fincrime.bronze.transactions_raw")
        self.execute.assert_called_once_with(
            "INSERT OVERWRITE fincrime.data_products.transactions BY NAME "
            "SELECT * FROM fincrime.bronze.transactions_raw"
        )
        self.ns["describe_table"]("transactions", "Default", {"txn_id": "Default"})
        self.assertEqual(self.execute.call_count, 1)

    def test_existing_view_and_its_app_comments_are_retained(self):
        self.spark.sql.return_value.collect.return_value = [
            SimpleNamespace(col_name="status", comment="App description"),
        ]
        self.ns["create_view"]("alerts", "Default", {"status": "Default"}, "SELECT 'Open' AS status")
        self.assertEqual(self.execute.call_args_list, [
            call("ALTER VIEW fincrime.data_products.alerts AS SELECT 'Open' AS status"),
            call("COMMENT ON COLUMN fincrime.data_products.alerts.`status` IS 'App description'"),
        ])

    def test_existing_comment_escapes_backslashes_and_quotes(self):
        self.spark.sql.return_value.collect.return_value = [
            SimpleNamespace(col_name="status", comment="Owner's C:\\notes"),
        ]
        self.ns["create_view"]("alerts", "Default", {"status": "Default"}, "SELECT 'Open' AS status")
        self.assertEqual(
            self.execute.call_args_list[1],
            call("COMMENT ON COLUMN fincrime.data_products.alerts.`status` IS 'Owner\\'s C:\\\\notes'"),
        )


if __name__ == "__main__":
    unittest.main()
