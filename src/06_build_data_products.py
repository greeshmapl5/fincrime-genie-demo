# Databricks notebook source
# MAGIC %md
# MAGIC # 06 - Build the data products
# MAGIC
# MAGIC Prerequisite: `02_build_gold_data_products` has run.
# MAGIC
# MAGIC Copies the business data sets from `<catalog>.gold` into `<catalog>.data_products`, the layer Catalog Manager shows
# MAGIC (decision 0004). `bronze`, `silver` and `gold` are only read. Every data set becomes a **table**, including the gold views,
# MAGIC so `alerts` and the other derived data sets are a snapshot as of this run. Rerun after `02` or after investigator decisions change.
# MAGIC
# MAGIC - New tables get the gold descriptions and tags.
# MAGIC - Existing tables keep descriptions and tags edited in Catalog Manager; only the rows are replaced.
# MAGIC - `reset_metadata = true` recreates every table with the gold descriptions and tags and resets `demo_sandbox`. Use it before a demo.
# MAGIC - `demo_sandbox` is a small fictional table that is safe to edit live.

# COMMAND ----------

import re

dbutils.widgets.text("catalog", "fincrime", "Catalog")
dbutils.widgets.text("source_schema", "gold", "Source schema")
dbutils.widgets.text("target_schema", "data_products", "Data products schema")
dbutils.widgets.dropdown("reset_metadata", "false", ["false", "true"], "Recreate tables with gold descriptions and tags")

CATALOG = dbutils.widgets.get("catalog")
SOURCE = dbutils.widgets.get("source_schema")
TARGET = dbutils.widgets.get("target_schema")
RESET = dbutils.widgets.get("reset_metadata") == "true"
for value in (CATALOG, SOURCE, TARGET):
    assert re.fullmatch(r"[A-Za-z0-9_]+", value), f"invalid identifier: {value}"

SRC, DP, INFO = f"{CATALOG}.{SOURCE}", f"{CATALOG}.{TARGET}", f"{CATALOG}.information_schema"
DATA_SETS = ["customer_360", "transactions", "counterparties", "case_notes",
             "alerts", "structuring_candidates", "counterparty_network", "policy_docs"]
SANDBOX = "demo_sandbox"


def esc(text):
    return text.replace("\\", "\\\\").replace("'", "\\'")


def run(sql):
    spark.sql(sql)


def q(sql):
    return spark.sql(sql).collect()


def try_run(sql):
    try:
        spark.sql(sql)
    except Exception as e:  # some tags can be unavailable on a given workspace
        print("skipped:", sql[:90], "->", str(e)[:120])


def build(name, select_sql):
    """Create or refresh one data product. Returns True when the table is new and needs descriptions and tags."""
    if RESET or not spark.catalog.tableExists(f"{DP}.{name}"):
        run(f"DROP TABLE IF EXISTS {DP}.{name}")
        run(f"CREATE TABLE {DP}.{name} AS {select_sql}")
        return True
    try:
        run(f"INSERT OVERWRITE {DP}.{name} {select_sql}")
        return False
    except Exception as e:
        print(f"{name}: columns changed, recreating the table ->", str(e)[:120])
        run(f"CREATE OR REPLACE TABLE {DP}.{name} AS {select_sql}")
        return True


def copy_metadata(name):
    where = f"table_schema = '{SOURCE}' AND table_name = '{name}'"
    tag_where = f"schema_name = '{SOURCE}' AND table_name = '{name}'"
    for r in q(f"SELECT comment FROM {INFO}.tables WHERE {where} AND comment IS NOT NULL AND comment <> ''"):
        run(f"COMMENT ON TABLE {DP}.{name} IS '{esc(r.comment)}'")
    for r in q(f"SELECT column_name, comment FROM {INFO}.columns WHERE {where} AND comment IS NOT NULL AND comment <> ''"):
        run(f"COMMENT ON COLUMN {DP}.{name}.`{r.column_name}` IS '{esc(r.comment)}'")
    for r in q(f"SELECT tag_name, tag_value FROM {INFO}.table_tags WHERE {tag_where}"):
        try_run(f"ALTER TABLE {DP}.{name} SET TAGS ('{esc(r.tag_name)}' = '{esc(r.tag_value or '')}')")
    for r in q(f"SELECT column_name, tag_name, tag_value FROM {INFO}.column_tags WHERE {tag_where}"):
        try_run(f"ALTER TABLE {DP}.{name} ALTER COLUMN `{r.column_name}` SET TAGS ('{esc(r.tag_name)}' = '{esc(r.tag_value or '')}')")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Data products copied from gold

# COMMAND ----------

assert spark.catalog.databaseExists(DP), f"{DP} does not exist. Create the schema first (see decision 0004)."
for name in DATA_SETS:
    if build(name, f"SELECT * FROM {SRC}.{name}"):
        copy_metadata(name)
        print(f"{name}: created with gold descriptions and tags")
    else:
        print(f"{name}: rows refreshed, descriptions and tags kept")

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
if build(SANDBOX, sandbox_rows):
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
assert q(f"SELECT COUNT(*) FROM {DP}.{SANDBOX}")[0][0] == 3, "demo_sandbox should have 3 rows"

tables = {r.table_name: r.table_type for r in q(f"SELECT table_name, table_type FROM {INFO}.tables WHERE table_schema = '{TARGET}'")}
missing = set(DATA_SETS + [SANDBOX]) - set(tables)
assert not missing, f"missing in {DP}: {missing}"
views = sorted(n for n, t in tables.items() if t == "VIEW")
assert not views, f"data products should be tables, found views: {views}"
print("All checks passed. Rows:", counts)
