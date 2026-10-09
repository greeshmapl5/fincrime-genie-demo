# Databricks notebook source
# MAGIC %md
# MAGIC # 02 - Build the gold data products
# MAGIC
# MAGIC Prerequisites: `01_generate_bronze_data` has run, and `00_lakebase_case_decisions.sql` has run in Lakebase with the project registered
# MAGIC as catalog `fincrime_source`. If that catalog is missing, a local Delta table with the same seed is used instead, so the notebook still works.
# MAGIC
# MAGIC Creates in `<catalog>.gold`:
# MAGIC - tables `customer_360`, `transactions`, `counterparties`, `case_notes`
# MAGIC - views `data_as_of`, `alerts` (status comes from investigator decisions in Lakebase), `structuring_candidates`, `counterparty_network`
# MAGIC
# MAGIC Every table and column gets a description, because Genie reads them. All content is fictional.

# COMMAND ----------

dbutils.widgets.text("catalog", "fincrime", "Catalog")
dbutils.widgets.text("lakebase_catalog", "fincrime_source", "Lakebase catalog")
dbutils.widgets.dropdown("cleanup_old_tests", "false", ["false", "true"], "Drop the early smoke-test objects")

CATALOG = dbutils.widgets.get("catalog")
LAKEBASE = dbutils.widgets.get("lakebase_catalog")
B, G = f"{CATALOG}.bronze", f"{CATALOG}.gold"


def esc(text):
    return text.replace("'", "\\'")


def run(sql):
    spark.sql(sql)


def try_run(sql):
    try:
        spark.sql(sql)
    except Exception as e:  # tags and some comment forms can be unavailable on a given workspace
        print("skipped:", sql[:90], "->", str(e)[:120])


def describe_table(name, table_comment, columns):
    run(f"COMMENT ON TABLE {G}.{name} IS '{esc(table_comment)}'")
    for col, text in columns.items():
        run(f"COMMENT ON COLUMN {G}.{name}.{col} IS '{esc(text)}'")


def create_view(name, view_comment, columns, select_sql):
    column_list = ", ".join(f"{c} COMMENT '{esc(t)}'" for c, t in columns.items())
    run(f"CREATE OR REPLACE VIEW {G}.{name} ({column_list}) COMMENT '{esc(view_comment)}' AS {select_sql}")


# COMMAND ----------
# MAGIC %md
# MAGIC ## Where do investigator decisions live?

# COMMAND ----------

catalogs = {r[0] for r in spark.sql("SHOW CATALOGS").collect()}
if LAKEBASE in catalogs:
    DECISIONS = f"{LAKEBASE}.public.case_decisions"
    print("Using Lakebase decisions:", DECISIONS)
else:
    DECISIONS = f"{B}.case_decisions_local"
    run(f"""
        CREATE OR REPLACE TABLE {DECISIONS} AS
        SELECT CAST(i AS BIGINT) AS decision_id,
               concat('A', lpad(CAST(i AS STRING), 4, '0')) AS alert_id,
               CASE WHEN i % 3 = 0 THEN 'Escalated' ELSE 'Closed - false positive' END AS decision,
               CASE WHEN i % 3 = 0 THEN 'Pattern consistent with a documented typology. Escalated to a senior investigator.'
                    ELSE 'Activity explained by the customer profile. No further action.' END AS rationale,
               'seed' AS decided_by,
               current_timestamp() - make_interval(0, 0, 0, i) AS decided_at
        FROM (SELECT explode(sequence(1, 60)) AS i) WHERE i % 3 IN (0, 1)
    """)
    print(f"Catalog {LAKEBASE} not found. Using local fallback table:", DECISIONS)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Gold tables

# COMMAND ----------

# The early test notebook created gold.alerts as a table. It becomes a view now.
for stmt in (f"DROP TABLE IF EXISTS {G}.alerts", f"DROP VIEW IF EXISTS {G}.alerts"):
    try:
        spark.sql(stmt)
    except Exception:
        pass
if dbutils.widgets.get("cleanup_old_tests") == "true":
    try_run(f"DROP TABLE IF EXISTS {G}.smoke_test")
    try_run(f"DROP TABLE IF EXISTS {B}.smoke_txn")

run(f"""
    CREATE OR REPLACE TABLE {G}.customer_360 AS
    SELECT customer_id, customer_name, national_id, segment, sector, risk_tier, country, opened_date,
           CAST(expected_monthly_volume AS DECIMAL(18,2)) AS expected_monthly_volume
    FROM {B}.customers_raw
""")
describe_table("customer_360", "One row per customer with KYC and risk attributes. Fictional synthetic data.", {
    "customer_id": "Unique customer identifier",
    "customer_name": "Customer or business name. Fictional",
    "national_id": "Synthetic national or organisation identifier. Sensitive, masked for most roles",
    "segment": "Customer segment: Retail, Small business or Corporate",
    "sector": "Business sector, or Individual for retail customers",
    "risk_tier": "Customer risk rating: Low, Medium or High",
    "country": "Country of residence, ISO code",
    "opened_date": "Date the customer relationship started",
    "expected_monthly_volume": "Expected monthly inflow value in SEK, captured at KYC",
})

run(f"""
    CREATE OR REPLACE TABLE {G}.transactions AS
    SELECT t.txn_id, t.customer_id, t.txn_ts, CAST(t.amount AS DECIMAL(18,2)) AS amount, 'SEK' AS currency,
           t.channel, t.direction, t.counterparty_id, cp.counterparty_type
    FROM {B}.transactions_raw t
    LEFT JOIN {B}.counterparties_raw cp ON t.counterparty_id = cp.counterparty_id
""")
describe_table("transactions", "One row per transaction over the last 90 days. Fictional synthetic data.", {
    "txn_id": "Unique transaction identifier",
    "customer_id": "Customer who owns the account",
    "txn_ts": "Transaction timestamp",
    "amount": "Transaction amount",
    "currency": "Currency code, always SEK",
    "channel": "card, mobile, transfer or cash",
    "direction": "in = money received, out = money sent",
    "counterparty_id": "The other party. CASH for cash deposits and withdrawals",
    "counterparty_type": "Cash, Individual, Business, Merchant or Utility",
})

run(f"""
    CREATE OR REPLACE TABLE {G}.counterparties AS
    SELECT counterparty_id, counterparty_type FROM {B}.counterparties_raw
""")
describe_table("counterparties", "Reference list of counterparties and their type. Fictional synthetic data.", {
    "counterparty_id": "Unique counterparty identifier",
    "counterparty_type": "Cash, Individual, Business, Merchant or Utility",
})

run(f"""
    CREATE OR REPLACE TABLE {G}.case_notes AS
    SELECT note_id, alert_id, customer_id, note_ts, note_text FROM {B}.case_notes_raw
""")
describe_table("case_notes", "Free-text investigator notes per alert. Used to demonstrate text AI functions. Fictional.", {
    "note_id": "Unique note identifier",
    "alert_id": "Alert the note belongs to",
    "customer_id": "Customer the note is about",
    "note_ts": "When the note was written",
    "note_text": "Free text written by the investigator",
})

# COMMAND ----------
# MAGIC %md
# MAGIC ## Views

# COMMAND ----------

create_view("data_as_of", "The timestamp of the latest transaction. Time windows in the data products are measured back from here, not from today.",
            {"as_of_ts": "Timestamp of the latest transaction in the data"},
            f"SELECT MAX(txn_ts) AS as_of_ts FROM {G}.transactions")

create_view("alerts",
            "One row per monitoring alert. Status comes from the investigator decision recorded in Lakebase; alerts with no decision are Open.",
            {
                "alert_id": "Unique alert identifier",
                "customer_id": "Customer the alert relates to",
                "alert_date": "Date the alert was raised",
                "typology": "Pattern the alert matched, such as Structuring",
                "risk_score": "Model score from 0 to 1, higher is riskier",
                "status": "Open, Escalated or Closed - false positive. Derived from the latest investigator decision",
                "decision_rationale": "Reason recorded by the investigator, empty while the alert is open",
                "decided_at": "When the decision was recorded, empty while the alert is open",
            },
            f"""
            SELECT a.alert_id, a.customer_id, a.alert_date, a.typology, CAST(a.risk_score AS DECIMAL(4,2)) AS risk_score,
                   COALESCE(d.decision, 'Open') AS status, d.rationale AS decision_rationale, d.decided_at
            FROM {B}.alerts_raw a
            LEFT JOIN (
                SELECT alert_id, decision, rationale, decided_at
                FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY alert_id ORDER BY decided_at DESC) AS rn FROM {DECISIONS})
                WHERE rn = 1
            ) d ON a.alert_id = d.alert_id
            """)

create_view("structuring_candidates",
            "Customers with 5 or more cash deposits of at least 9,000 and below 10,000 SEK in the last 14 days. One row per customer, with the evidence an investigator needs.",
            {
                "customer_id": "Customer identifier",
                "segment": "Retail, Small business or Corporate",
                "sector": "Business sector",
                "risk_tier": "Customer risk rating",
                "opened_date": "Date the relationship started",
                "account_age_days": "Days between account opening and the latest transaction",
                "near_threshold_deposits": "Number of cash deposits between 9,000 and 9,999.99 SEK in the last 14 days",
                "total_near_threshold_deposited": "Sum of those deposits in SEK",
                "first_deposit_ts": "Earliest of those deposits",
                "last_deposit_ts": "Latest of those deposits",
                "expected_monthly_volume": "Expected monthly inflow in SEK from KYC",
                "inflow_14d": "All money received in the last 14 days, in SEK",
                "outflow_14d": "All money sent in the last 14 days, in SEK",
                "outflow_to_inflow_ratio": "Outflow divided by inflow over the last 14 days. Close to 1 means funds pass straight through",
                "onward_transfer_counterparties": "Distinct counterparties that received transfers from this customer in the last 14 days",
                "top_onward_counterparty": "The counterparty that received the largest share of this customer's transfers in the last 14 days",
                "top_onward_counterparty_share": "Share of the customer's transfers out in the last 14 days that went to that one counterparty, from 0 to 1. Close to 1 means funds are concentrated on one recipient",
                "inflows_exceed_expected_volume": "True when inflow in the last 14 days is above expected monthly volume. Uses inflows only",
                "open_alert_id": "Open structuring alert on this customer, if any",
            },
            f"""
            WITH w AS (SELECT as_of_ts, as_of_ts - INTERVAL 14 DAYS AS start_ts FROM {G}.data_as_of),
            dep AS (
                SELECT t.customer_id, COUNT(*) AS near_threshold_deposits, SUM(t.amount) AS total_near_threshold_deposited,
                       MIN(t.txn_ts) AS first_deposit_ts, MAX(t.txn_ts) AS last_deposit_ts
                FROM {G}.transactions t CROSS JOIN w
                WHERE t.channel = 'cash' AND t.direction = 'in' AND t.amount >= 9000 AND t.amount < 10000 AND t.txn_ts >= w.start_ts
                GROUP BY t.customer_id HAVING COUNT(*) >= 5
            ),
            flows AS (
                SELECT t.customer_id,
                       SUM(CASE WHEN t.direction = 'in' THEN t.amount ELSE 0 END) AS inflow_14d,
                       SUM(CASE WHEN t.direction = 'out' THEN t.amount ELSE 0 END) AS outflow_14d,
                       COUNT(DISTINCT CASE WHEN t.direction = 'out' AND t.channel = 'transfer' THEN t.counterparty_id END) AS onward_transfer_counterparties
                FROM {G}.transactions t CROSS JOIN w WHERE t.txn_ts >= w.start_ts GROUP BY t.customer_id
            ),
            paid AS (
                SELECT t.customer_id, t.counterparty_id, SUM(t.amount) AS paid_amount
                FROM {G}.transactions t CROSS JOIN w
                WHERE t.direction = 'out' AND t.channel = 'transfer' AND t.txn_ts >= w.start_ts
                GROUP BY t.customer_id, t.counterparty_id
            ),
            top_cp AS (
                SELECT customer_id, top_onward_counterparty, top_onward_counterparty_share
                FROM (
                    SELECT customer_id, counterparty_id AS top_onward_counterparty,
                           paid_amount / SUM(paid_amount) OVER (PARTITION BY customer_id) AS top_onward_counterparty_share,
                           ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY paid_amount DESC) AS rn
                    FROM paid
                )
                WHERE rn = 1
            )
            SELECT d.customer_id, c.segment, c.sector, c.risk_tier, c.opened_date,
                   DATEDIFF(CAST(w.as_of_ts AS DATE), c.opened_date) AS account_age_days,
                   d.near_threshold_deposits, d.total_near_threshold_deposited, d.first_deposit_ts, d.last_deposit_ts,
                   c.expected_monthly_volume, f.inflow_14d, f.outflow_14d,
                   CAST(f.outflow_14d / NULLIF(f.inflow_14d, 0) AS DECIMAL(6,2)) AS outflow_to_inflow_ratio,
                   f.onward_transfer_counterparties, tc.top_onward_counterparty,
                   CAST(tc.top_onward_counterparty_share AS DECIMAL(4,2)) AS top_onward_counterparty_share,
                   (f.inflow_14d > c.expected_monthly_volume) AS inflows_exceed_expected_volume,
                   a.alert_id AS open_alert_id
            FROM dep d
            JOIN {G}.customer_360 c ON d.customer_id = c.customer_id
            JOIN flows f ON d.customer_id = f.customer_id
            LEFT JOIN top_cp tc ON d.customer_id = tc.customer_id
            CROSS JOIN w
            LEFT JOIN {G}.alerts a ON a.customer_id = d.customer_id AND a.typology = 'Structuring' AND a.status = 'Open'
            """)

create_view("counterparty_network",
            "Counterparties that received transfers from customers in the last 30 days, with how many distinct customers paid them. Card and mobile merchants are excluded.",
            {
                "counterparty_id": "Counterparty identifier",
                "counterparty_type": "Individual or Business",
                "distinct_customers_paying": "Number of different customers who sent transfers to this counterparty",
                "payment_count": "Number of transfers received",
                "total_received": "Total received in SEK",
                "first_payment_ts": "Earliest transfer in the window",
                "last_payment_ts": "Latest transfer in the window",
            },
            f"""
            SELECT t.counterparty_id, t.counterparty_type, COUNT(DISTINCT t.customer_id) AS distinct_customers_paying,
                   COUNT(*) AS payment_count, SUM(t.amount) AS total_received, MIN(t.txn_ts) AS first_payment_ts, MAX(t.txn_ts) AS last_payment_ts
            FROM {G}.transactions t CROSS JOIN {G}.data_as_of w
            WHERE t.channel = 'transfer' AND t.direction = 'out' AND t.txn_ts >= w.as_of_ts - INTERVAL 30 DAYS
            GROUP BY t.counterparty_id, t.counterparty_type
            """)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Governance: sensitivity and certification tags (skipped silently where unavailable)

# COMMAND ----------

try_run(f"ALTER TABLE {G}.customer_360 ALTER COLUMN national_id SET TAGS ('sensitivity' = 'pii')")
for name in ("customer_360", "transactions", "counterparties", "case_notes"):
    try_run(f"ALTER TABLE {G}.{name} SET TAGS ('certified' = 'true')")
for name in ("alerts", "structuring_candidates", "counterparty_network", "data_as_of"):
    try_run(f"ALTER VIEW {G}.{name} SET TAGS ('certified' = 'true')")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Verify the planted story
# MAGIC Fails loudly if the data does not tell the intended story. Expected values assume the Lakebase seed is untouched,
# MAGIC so run it before the demo and again after you reset the decisions.

# COMMAND ----------

def q(sql):
    return spark.sql(sql).collect()


assert q(f"SELECT COUNT(*) FROM {G}.customer_360")[0][0] == 600
assert q(f"SELECT COUNT(*) FROM {G}.transactions WHERE txn_ts > current_timestamp()")[0][0] == 0, "transactions dated in the future"

candidates = {r.customer_id: r.near_threshold_deposits for r in q(f"SELECT customer_id, near_threshold_deposits FROM {G}.structuring_candidates")}
expected = {f"C{i:04d}": 10 for i in range(591, 597)} | {"C0580": 6}
assert candidates == expected, f"structuring candidates differ: {candidates}"

top = {r.customer_id: (r.top_onward_counterparty, float(r.top_onward_counterparty_share))
       for r in q(f"SELECT customer_id, top_onward_counterparty, top_onward_counterparty_share FROM {G}.structuring_candidates")}
for i in range(591, 597):
    cp, share = top[f"C{i:04d}"]
    assert cp == "X9001" and share >= 0.6, f"ring account C{i:04d} should send most transfers to X9001: {cp} {share}"
assert top["C0580"][1] < 0.6, f"florist should spread its payments: {top['C0580']}"

network = q(f"SELECT counterparty_id, distinct_customers_paying FROM {G}.counterparty_network WHERE distinct_customers_paying >= 3")
assert [(r.counterparty_id, r.distinct_customers_paying) for r in network] == [("X9001", 6)], f"shared counterparties: {network}"

status = {r.status: r.n for r in q(f"SELECT status, COUNT(*) AS n FROM {G}.alerts GROUP BY status")}
assert status == {"Escalated": 20, "Closed - false positive": 20, "Open": 29}, f"alert status counts: {status}"
print("All checks passed. Candidates:", candidates)
