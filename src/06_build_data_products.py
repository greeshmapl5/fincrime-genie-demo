# Databricks notebook source
# MAGIC %md
# MAGIC # 06 - Build the data products
# MAGIC
# MAGIC Prerequisite: `02_build_gold_data_products` has run.
# MAGIC
# MAGIC `data_products` replaces gold (decision 0004). Notebook 02 now builds directly into `data_products`.
# MAGIC Normally this notebook only initializes the demo sandbox and checks the independent products.
# MAGIC Set `migrate_from_source = true` once to copy an existing gold installation: tables are copied and view SQL
# MAGIC is relocated to `data_products`, not wrapped over gold. Bronze/Lakebase dependencies remain unchanged.
# MAGIC
# MAGIC - During migration, new objects get source descriptions and tags. Existing metadata and grants are retained.
# MAGIC - `reset_metadata = true` resets descriptions and tags to gold without dropping objects; it also resets `demo_sandbox`.
# MAGIC   This removes destination-only tags, including governed certification: use only when explicitly resetting governance.
# MAGIC - Existing type mismatches stop the run before writes. Migrate them with metadata/grant backups first (see the runbook).
# MAGIC - The app-owned `business_glossary` and destination-only objects are not overwritten or deleted.

# COMMAND ----------

import json
import re

dbutils.widgets.text("catalog", "fincrime", "Catalog")
dbutils.widgets.text("source_schema", "gold", "Source schema")
dbutils.widgets.text("target_schema", "data_products", "Data products schema")
dbutils.widgets.dropdown("migrate_from_source", "false", ["false", "true"], "One-time migration from source schema")
dbutils.widgets.dropdown("reset_metadata", "false", ["false", "true"], "Reset descriptions and tags to gold")

CATALOG = dbutils.widgets.get("catalog")
SOURCE = dbutils.widgets.get("source_schema")
TARGET = dbutils.widgets.get("target_schema")
RESET = dbutils.widgets.get("reset_metadata") == "true"
MIGRATE = dbutils.widgets.get("migrate_from_source") == "true"
for value in (CATALOG, SOURCE, TARGET):
    assert re.fullmatch(r"[A-Za-z0-9_]+", value), f"invalid identifier: {value}"
assert SOURCE != TARGET, "Source and target schemas must differ"

SRC, DP, INFO = f"{CATALOG}.{SOURCE}", f"{CATALOG}.{TARGET}", f"{CATALOG}.information_schema"
SANDBOX = "demo_sandbox"


def esc(text):
    return text.replace("\\", "\\\\").replace("'", "\\'")


def run(sql):
    spark.sql(sql)


def q(sql):
    return spark.sql(sql).collect()


def object_types(schema):
    return {
        r.table_name: r.table_type
        for r in q(f"SELECT table_name, table_type FROM {INFO}.tables WHERE table_schema = '{schema}'")
    }


def relocate_view_sql(definition):
    # Leave literals and comments alone; relocate only qualified SQL identifiers.
    reference = rf"(?<![\w`])`?{re.escape(CATALOG)}`?\s*\.\s*`?{re.escape(SOURCE)}`?\s*\."
    tokens = re.compile(
        r"'(?:''|\\.|[^'\\])*'|--[^\n]*|/\*[\s\S]*?\*/"
        rf"|(?P<reference>{reference})",
        re.IGNORECASE,
    )
    return tokens.sub(lambda m: f"{DP}." if m.group("reference") else m.group(), definition)


def source_select(name, source_type):
    if source_type != "VIEW":
        return f"SELECT * FROM {SRC}.{name}"
    rows = q(
        f"SELECT view_definition FROM {INFO}.views "
        f"WHERE table_schema = '{SOURCE}' AND table_name = '{name}'"
    )
    if len(rows) != 1 or not rows[0].view_definition:
        raise ValueError(f"Missing view definition for {SRC}.{name}")
    return relocate_view_sql(rows[0].view_definition)


def preflight(selects):
    for select_sql in selects.values():
        q(f"SELECT * FROM ({select_sql}) LIMIT 0")


def check_type(name, source_type, target_type):
    if source_type not in ("MANAGED", "VIEW"):
        raise ValueError(f"{SRC}.{name}: unsupported source type {source_type}; no automatic conversion")
    if target_type is not None and target_type != source_type:
        raise ValueError(
            f"{DP}.{name} is {target_type}, but gold is {source_type}. "
            "Back up metadata and grants, then migrate the object type before running 06."
        )


def build(name, select_sql, source_type="MANAGED"):
    """Refresh without dropping objects. Return whether source metadata must be applied."""
    target_type = object_types(TARGET).get(name)
    check_type(name, source_type, target_type)
    if target_type is None:
        kind = "VIEW" if source_type == "VIEW" else "TABLE"
        run(f"CREATE {kind} {DP}.{name} AS {select_sql}")
        return True
    if source_type == "VIEW":
        comments = q(
            f"SELECT column_name, comment FROM {INFO}.columns "
            f"WHERE table_schema = '{TARGET}' AND table_name = '{name}'"
        )
        # ALTER preserves grants and tags, but clears column comments.
        run(f"ALTER VIEW {DP}.{name} AS {select_sql}")
        columns = {
            r.column_name for r in q(
                f"SELECT column_name FROM {INFO}.columns "
                f"WHERE table_schema = '{TARGET}' AND table_name = '{name}'"
            )
        }
        for r in comments:
            if r.column_name in columns and r.comment is not None:
                run(f"COMMENT ON COLUMN {DP}.{name}.`{r.column_name}` IS '{esc(r.comment)}'")
    else:
        run(f"INSERT OVERWRITE {DP}.{name} BY NAME {select_sql}")
    return RESET


def copy_metadata(name):
    where = f"table_schema = '{SOURCE}' AND table_name = '{name}'"
    for r in q(f"SELECT comment FROM {INFO}.tables WHERE {where}"):
        comment = "NULL" if r.comment is None else f"'{esc(r.comment)}'"
        run(f"COMMENT ON TABLE {DP}.{name} IS {comment}")
    for r in q(f"SELECT column_name, comment FROM {INFO}.columns WHERE {where}"):
        comment = "NULL" if r.comment is None else f"'{esc(r.comment)}'"
        run(f"COMMENT ON COLUMN {DP}.{name}.`{r.column_name}` IS {comment}")
    replace_tags(name, SOURCE)


def replace_tags(name, source_schema=None):
    for relation, prefix in (("table_tags", "NULL AS column_name"), ("column_tags", "column_name")):
        desired = {
            (r.column_name, r.tag_name): r.tag_value or ""
            for r in q(
                f"SELECT {prefix}, tag_name, tag_value FROM {INFO}.{relation} "
                f"WHERE schema_name = '{source_schema}' AND table_name = '{name}'"
            )
        } if source_schema else {}
        current = {
            (r.column_name, r.tag_name): r.tag_value or ""
            for r in q(
                f"SELECT {prefix}, tag_name, tag_value FROM {INFO}.{relation} "
                f"WHERE schema_name = '{TARGET}' AND table_name = '{name}'"
            )
        }
        for (column, key), value in current.items():
            if (column, key) not in desired:
                column_sql = f" ALTER COLUMN `{column}`" if column else ""
                run(f"ALTER TABLE {DP}.{name}{column_sql} UNSET TAGS ('{esc(key)}')")
        for (column, key), value in desired.items():
            if current.get((column, key)) != value:
                column_sql = f" ALTER COLUMN `{column}`" if column else ""
                run(f"ALTER TABLE {DP}.{name}{column_sql} SET TAGS ('{esc(key)}' = '{esc(value)}')")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Optional one-time migration; subsequent builds use notebook 02 directly

# COMMAND ----------

assert spark.catalog.databaseExists(DP), f"{DP} does not exist. Create the schema first (see decision 0004)."
source_types = object_types(SOURCE) if MIGRATE else {}
if MIGRATE:
    assert source_types, f"No source objects found in {SRC}"
DATA_SETS = sorted(set(source_types) - {"business_glossary", SANDBOX})
# Parents precede their dependent views.
DATA_SETS.sort(key=lambda name: (source_types[name] == "VIEW",
                               name not in ("data_as_of", "alerts"), name))
target_types = object_types(TARGET)
for name in DATA_SETS:
    assert re.fullmatch(r"[A-Za-z0-9_]+", name), f"invalid source object name: {name}"
    check_type(name, source_types[name], target_types.get(name))
check_type(SANDBOX, "MANAGED", target_types.get(SANDBOX))
selects = {name: source_select(name, source_types[name]) for name in DATA_SETS}
if set(DATA_SETS).issubset(target_types):
    preflight(selects)

for name in DATA_SETS:
    if build(name, selects[name], source_types[name]):
        copy_metadata(name)
        print(f"{name}: {source_types[name]}, gold descriptions and tags applied")
    else:
        print(f"{name}: {source_types[name]}, refreshed; descriptions, tags and grants kept")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Sandbox for live Catalog edits

# COMMAND ----------

sandbox_rows = """
    SELECT * FROM VALUES
      ('SBX001', 'Low', 'SBX-00000001'),
      ('SBX002', 'Medium', 'SBX-00000002'),
      ('SBX003', 'High', 'SBX-00000003')
    AS sandbox(customer_id, risk_tier, national_id)
"""
if (RESET or SANDBOX not in target_types) and build(SANDBOX, sandbox_rows):
    replace_tags(SANDBOX)
    run(f"COMMENT ON TABLE {DP}.{SANDBOX} IS 'Sandbox: small fictional table for live Catalog edits in demos. Safe to change; rerun 06_build_data_products with reset_metadata = true to restore.'")
    for col, text in {
        "customer_id": "Fictional sandbox customer identifier",
        "risk_tier": "Customer risk rating: Low, Medium or High",
        "national_id": "Fictional national identifier. Use it to demonstrate PII classification",
    }.items():
        run(f"COMMENT ON COLUMN {DP}.{SANDBOX}.{col} IS '{esc(text)}'")
    print(f"{SANDBOX}: created")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Verify

# COMMAND ----------

counts = {}
for name in DATA_SETS:
    source_rows = q(f"SELECT COUNT(*) FROM {SRC}.{name}")[0][0]
    counts[name] = q(f"SELECT COUNT(*) FROM {DP}.{name}")[0][0]
    assert counts[name] == source_rows, f"{name}: {counts[name]} rows, gold has {source_rows}"
    for left, right in ((SRC, DP), (DP, SRC)):
        difference = q(f"SELECT * FROM (SELECT * FROM {left}.{name} EXCEPT ALL SELECT * FROM {right}.{name}) LIMIT 1")
        assert not difference, f"{name}: rows differ between {left} and {right}"

tables = object_types(TARGET)
required = {
    **dict.fromkeys(("customer_360", "transactions", "counterparties", "case_notes", SANDBOX), "MANAGED"),
    **dict.fromkeys(("data_as_of", "alerts", "structuring_candidates", "counterparty_network"), "VIEW"),
}
missing = set(DATA_SETS) | set(required)
missing -= set(tables)
assert not missing, f"missing in {DP}: {missing}"
for name in DATA_SETS:
    assert tables[name] == source_types[name], f"{name}: type differs from gold"
for name, kind in required.items():
    assert tables[name] == kind, f"{DP}.{name}: expected {kind}, got {tables[name]}"
    if name not in counts:
        counts[name] = q(f"SELECT COUNT(*) FROM {DP}.{name}")[0][0]
for r in q(f"SELECT table_name, view_definition FROM {INFO}.views WHERE table_schema = '{TARGET}'"):
    assert relocate_view_sql(r.view_definition) == r.view_definition, f"{r.table_name}: still depends on {SRC}"
print("All type and row checks passed. Rows:", counts)
print("App-owned business_glossary and destination-only objects were left unchanged.")
dbutils.notebook.exit(json.dumps({"status": "verified", "types": {n: tables[n] for n in counts}, "rows": counts}))
