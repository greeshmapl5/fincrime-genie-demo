# Databricks notebook source
# MAGIC %md
# MAGIC # 01 - Generate synthetic bronze data
# MAGIC
# MAGIC Fictional bank "Fjallbanken". **All names, numbers and rules are synthetic.** Any resemblance to a real
# MAGIC person or company is coincidental. Not regulatory guidance.
# MAGIC
# MAGIC Writes to `<catalog>.bronze`: `customers_raw`, `transactions_raw`, `counterparties_raw`, `alerts_raw`, `case_notes_raw`.
# MAGIC
# MAGIC The data is deterministic for a given `seed`. Timestamps are relative to `as_of`, so re-run before the event
# MAGIC to refresh the "last 14 days" story.
# MAGIC
# MAGIC **Planted story (customer ids)**
# MAGIC - `C0591`-`C0596` ring: 10 cash deposits each, 9,100-9,900 SEK, followed within hours by transfers to one counterparty `X9001`
# MAGIC - `C0580` seasonal florist: 6 deposits in the same range, long-standing account, no onward pattern (the false positive)
# MAGIC - `C0597` only 3 near-threshold deposits (below the rule), `C0598` high cash but far from the threshold,
# MAGIC   `C0599` invoices in and one supplier out (pass-through-looking but explained), `C0600` plain new account
# MAGIC - 10 ordinary small businesses with 1-2 stray near-threshold deposits (never 5 within 14 days)

# COMMAND ----------

import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone

dbutils.widgets.text("catalog", "fincrime", "Catalog")
dbutils.widgets.text("seed", "2026", "Random seed")
dbutils.widgets.text("as_of", "", "As-of UTC timestamp, ISO format (blank = now)")

CATALOG = dbutils.widgets.get("catalog")
SEED = int(dbutils.widgets.get("seed"))
_as_of = dbutils.widgets.get("as_of").strip()
AS_OF = datetime.fromisoformat(_as_of) if _as_of else datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
rng = np.random.default_rng(SEED)

N_CUSTOMERS = 600
RING = list(range(591, 597))
FLORIST = 580
NEAR_MISS_FEW_DEPOSITS = 597
NEAR_MISS_HIGH_CASH = 598
NEAR_MISS_INVOICES = 599
NEAR_MISS_PLAIN = 600
RANDOM_NEW = list(range(581, 589))
SPECIAL = set(RING + [FLORIST, NEAR_MISS_FEW_DEPOSITS, NEAR_MISS_HIGH_CASH, NEAR_MISS_INVOICES, NEAR_MISS_PLAIN] + RANDOM_NEW)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Customers

# COMMAND ----------

FIRST = ["Anna", "Erik", "Maja", "Oskar", "Elsa", "Nils", "Saga", "Axel", "Freja", "Lars", "Ida", "Hugo", "Klara", "Viktor", "Alva", "Sven", "Tilda", "Gustav", "Wilma", "Leo"]
LAST = ["Lindqvist", "Bergstrom", "Holm", "Sandberg", "Nyberg", "Falk", "Dahl", "Ekman", "Strand", "Lund", "Ahlberg", "Vik", "Soderlund", "Hedlund", "Mattsson"]
STEM = ["Nordlys", "Kvarn", "Fjard", "Skog", "Havs", "Brygga", "Lyckan", "Tallen", "Vagen", "Ljung", "Stjarn", "Bjork"]
SUFFIX = ["Handel AB", "Service AB", "Trading AB", "Partner AB", "Design AB"]
SECTORS_SMALL = ["Cafe and restaurant", "Construction", "Consulting", "E-commerce", "Hairdresser", "Craft and trades", "Convenience store"]
SECTORS_CORP = ["Manufacturing", "Logistics", "Energy services", "Software"]
BASE_VOLUME = {"Retail": 15_000, "Small business": 120_000, "Corporate": 900_000}


def cid(i):
    return f"C{i:04d}"


customers = []
for i in range(1, N_CUSTOMERS + 1):
    if i in RING:
        seg, risk, opened_days, sector = "Small business", "Medium", 20, ["Consulting", "E-commerce", "Construction", "Craft and trades", "Consulting", "E-commerce"][i - 591]
    elif i == FLORIST:
        seg, risk, opened_days, sector = "Small business", "Low", 1800, "Florist (seasonal)"
    elif i == NEAR_MISS_FEW_DEPOSITS:
        seg, risk, opened_days, sector = "Small business", "Medium", 22, "Cafe and restaurant"
    elif i == NEAR_MISS_HIGH_CASH:
        seg, risk, opened_days, sector = "Small business", "Medium", 25, "Convenience store"
    elif i == NEAR_MISS_INVOICES:
        seg, risk, opened_days, sector = "Small business", "Medium", 26, "Consulting"
    elif i == NEAR_MISS_PLAIN:
        seg, risk, opened_days, sector = "Small business", "Low", 23, "Hairdresser"
    else:
        seg = rng.choice(["Retail", "Small business", "Corporate"], p=[0.70, 0.24, 0.06])
        risk = rng.choice(["Low", "Medium", "High"], p=[0.78, 0.17, 0.05])
        opened_days = int(rng.integers(5, 30)) if i in RANDOM_NEW else int(rng.integers(60, 3000))
        sector = "Individual" if seg == "Retail" else str(rng.choice(SECTORS_SMALL if seg == "Small business" else SECTORS_CORP))
    country = "SE" if (i in SPECIAL or i == FLORIST) else str(rng.choice(["SE", "NO", "DK", "FI"], p=[0.94, 0.02, 0.02, 0.02]))
    if i in RING:
        expected = int(round(rng.integers(60_000, 140_000), -2))
    elif i == FLORIST:
        expected = 150_000
    else:
        expected = int(round(BASE_VOLUME[seg] * float(np.exp(rng.normal(0, 0.25))), -2))
    if seg == "Retail":
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        national_id = f"SYN-{int(rng.integers(10_000_000, 99_999_999))}"
    else:
        name = f"{rng.choice(STEM)} {rng.choice(SUFFIX)}"
        national_id = f"SYN-ORG-{int(rng.integers(10_000_000, 99_999_999))}"
    opened_ts = AS_OF - timedelta(days=opened_days)
    customers.append({
        "customer_id": cid(i), "customer_name": name, "national_id": national_id, "segment": str(seg),
        "sector": sector, "risk_tier": str(risk), "country": country,
        "opened_date": opened_ts.date(), "expected_monthly_volume": expected,
    })

customers_pdf = pd.DataFrame(customers)
print(customers_pdf.segment.value_counts().to_dict(), customers_pdf.risk_tier.value_counts().to_dict())

# COMMAND ----------
# MAGIC %md
# MAGIC ## Counterparties
# MAGIC Transfers go to counterparties owned by one customer (so they are rarely shared). Card and mobile payments go to shared merchants and utilities.
# MAGIC The only counterparty paid by many customers is the planted `X9001`.

# COMMAND ----------

counterparties = [("CASH", "Cash"), ("X9001", "Business"), ("S0001", "Business")]
counterparties += [(f"M{j:03d}", "Merchant") for j in range(1, 31)]
counterparties += [(f"U{j:03d}", "Utility") for j in range(1, 6)]
OWN_CPS = {}
for i in range(1, N_CUSTOMERS + 1):
    seg = customers[i - 1]["segment"]
    n_own = {"Retail": 6, "Small business": 12, "Corporate": 20}[seg]
    ids = [f"P{i:04d}{j:02d}" for j in range(n_own)]
    p_individual = 0.7 if seg == "Retail" else 0.4
    OWN_CPS[i] = ids
    counterparties += [(c, "Individual" if rng.random() < p_individual else "Business") for c in ids]
counterparties_pdf = pd.DataFrame(counterparties, columns=["counterparty_id", "counterparty_type"])

# COMMAND ----------
# MAGIC %md
# MAGIC ## Transactions

# COMMAND ----------

MIX = {
    "Retail": [("card", "out", .45), ("mobile", "out", .15), ("transfer", "out", .10), ("transfer", "in", .20), ("cash", "in", .05), ("cash", "out", .05)],
    "Small business": [("card", "out", .20), ("mobile", "out", .05), ("transfer", "out", .25), ("transfer", "in", .30), ("cash", "in", .15), ("cash", "out", .05)],
    "Corporate": [("card", "out", .05), ("transfer", "out", .45), ("transfer", "in", .45), ("cash", "in", .025), ("cash", "out", .025)],
}
AMOUNT_MU = {"Retail": np.log(300), "Small business": np.log(1500), "Corporate": np.log(25_000)}
AMOUNT_SIGMA = {"Retail": 0.9, "Small business": 1.0, "Corporate": 0.9}
CASH_CAP = 8_500  # ordinary cash never lands in the 9,000-9,999 band by accident

rows = []


def add(i, ts, amount, channel, direction, counterparty):
    rows.append((cid(i), ts, round(float(amount), 2), channel, direction, counterparty))


def background(i):
    c = customers[i - 1]
    seg = c["segment"]
    opened = datetime.combine(c["opened_date"], datetime.min.time())
    active_days = max(1.0, min(90.0, (AS_OF - opened).total_seconds() / 86400 - 0.1))
    n = max(3, int(rng.poisson({"Retail": 35, "Small business": 80, "Corporate": 140}[seg] * active_days / 90)))
    secs = rng.uniform(3600, active_days * 86400, n)
    mix = MIX[seg]
    pick = rng.choice(len(mix), n, p=np.array([m[2] for m in mix]) / sum(m[2] for m in mix))
    amounts = np.maximum(20, np.exp(rng.normal(AMOUNT_MU[seg], AMOUNT_SIGMA[seg], n)))
    for s, k, a in zip(secs, pick, amounts):
        channel, direction, _ = mix[k]
        if channel == "cash":
            a = min(a, CASH_CAP)
            cp = "CASH"
        elif channel in ("card", "mobile"):
            cp = f"U{int(rng.integers(1, 6)):03d}" if rng.random() < 0.1 else f"M{int(rng.integers(1, 31)):03d}"
        else:
            cp = str(rng.choice(OWN_CPS[i]))
        add(i, AS_OF - timedelta(seconds=float(s)), a, channel, direction, cp)


def ring(i):
    hours_before = np.sort(rng.uniform(14, 9 * 24, 10))
    for h in hours_before:
        ts = AS_OF - timedelta(hours=float(h))
        dep = rng.uniform(9100, 9900)
        add(i, ts, dep, "cash", "in", "CASH")
        out_ts = min(ts + timedelta(hours=float(rng.uniform(3, 12))), AS_OF - timedelta(hours=1))
        add(i, out_ts, dep * rng.uniform(0.88, 0.92), "transfer", "out", "X9001")


def florist(i):
    for h in np.sort(rng.uniform(20, 12 * 24, 6)):
        add(i, AS_OF - timedelta(hours=float(h)), rng.uniform(9100, 9800), "cash", "in", "CASH")
    for h in rng.uniform(24, 12 * 24, 3):
        add(i, AS_OF - timedelta(hours=float(h)), rng.uniform(4000, 8000), "transfer", "out", str(rng.choice(OWN_CPS[i])))


def few_deposits(i):
    for h in rng.uniform(24, 8 * 24, 3):
        add(i, AS_OF - timedelta(hours=float(h)), rng.uniform(9200, 9800), "cash", "in", "CASH")


def high_cash(i):
    for h in rng.uniform(24, 14 * 24, 8):
        add(i, AS_OF - timedelta(hours=float(h)), rng.uniform(2500, 8000), "cash", "in", "CASH")


def invoices(i):
    own = OWN_CPS[i]
    for k, h in enumerate(rng.uniform(48, 10 * 24, 5)):
        amt = rng.uniform(12_000, 25_000)
        ts = AS_OF - timedelta(hours=float(h))
        add(i, ts, amt, "transfer", "in", own[k])
        out_ts = min(ts + timedelta(hours=float(rng.uniform(24, 60))), AS_OF - timedelta(hours=1))
        add(i, out_ts, amt * 0.82, "transfer", "out", "S0001")


for i in range(1, N_CUSTOMERS + 1):
    background(i)
for i in RING:
    ring(i)
florist(FLORIST)
few_deposits(NEAR_MISS_FEW_DEPOSITS)
high_cash(NEAR_MISS_HIGH_CASH)
invoices(NEAR_MISS_INVOICES)

# Ordinary small businesses with stray near-threshold deposits, spaced so 5 within 14 days never happens
eligible = [i for i in range(1, N_CUSTOMERS + 1)
            if i not in SPECIAL and customers[i - 1]["segment"] == "Small business"
            and (AS_OF.date() - customers[i - 1]["opened_date"]).days > 100]
NOISE = sorted(int(x) for x in rng.choice(eligible, 10, replace=False))
for i in NOISE:
    first = float(rng.uniform(24, 10 * 24))
    second = first + float(rng.uniform(15 * 24, 25 * 24))
    for h in (first, second):
        add(i, AS_OF - timedelta(hours=h), rng.uniform(9000, 9900), "cash", "in", "CASH")

transactions_pdf = pd.DataFrame(rows, columns=["customer_id", "txn_ts", "amount", "channel", "direction", "counterparty_id"])
transactions_pdf = transactions_pdf.sort_values("txn_ts").reset_index(drop=True)
transactions_pdf.insert(0, "txn_id", ["T" + str(n + 1).zfill(8) for n in range(len(transactions_pdf))])
print(len(transactions_pdf), "transactions; noise depositors:", NOISE)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Alerts and case notes
# MAGIC Alert status is NOT stored here. It comes from investigator decisions in Lakebase (`case_decisions`), joined in the gold layer.
# MAGIC Alerts `A0001`-`A0060` are historical (decisions seeded by `00_lakebase_case_decisions.sql`). `A0101`-`A0109` are the planted demo alerts and start open.

# COMMAND ----------

regular = [i for i in range(1, N_CUSTOMERS + 1) if i not in SPECIAL]
TYPOLOGIES = ["Rapid pass-through", "Mule account", "Unusual volume", "Structuring"]
alerts = []
for n in range(1, 61):
    alerts.append((f"A{n:04d}", cid(int(rng.choice(regular))), (AS_OF - timedelta(days=int(rng.integers(4, 61)))).date(),
                   str(rng.choice(TYPOLOGIES, p=[.3, .2, .3, .2])), round(float(rng.uniform(0.30, 0.82)), 2)))
for k, i in enumerate(RING):
    alerts.append((f"A{101 + k:04d}", cid(i), (AS_OF - timedelta(days=int(rng.integers(1, 4)))).date(), "Structuring", round(float(rng.uniform(0.88, 0.95)), 2)))
alerts.append(("A0107", cid(FLORIST), (AS_OF - timedelta(days=2)).date(), "Structuring", 0.74))
alerts.append(("A0108", cid(NEAR_MISS_HIGH_CASH), (AS_OF - timedelta(days=1)).date(), "Unusual volume", 0.70))
alerts.append(("A0109", cid(NEAR_MISS_INVOICES), (AS_OF - timedelta(days=1)).date(), "Rapid pass-through", 0.66))
alerts_pdf = pd.DataFrame(alerts, columns=["alert_id", "customer_id", "alert_date", "typology", "risk_score"])

NOTES_ESCALATED = [
    "Deposits just below the review threshold followed by transfers to a single counterparty. Escalating to a senior investigator.",
    "Pattern consistent with rapid pass-through on a recently opened account. Escalated for second review.",
    "Several incoming transfers from unrelated senders, funds sent onward the same day. Escalated.",
]
NOTES_CLOSED = [
    "Activity matches the customer's seasonal trading profile in earlier periods. No further action. Closed as false positive.",
    "Large transfers are explained by supplier invoices on file. Closed as false positive.",
    "Cash takings are in line with expected volume for this sector. Closed as false positive.",
]
NOTES_PENDING = [
    "Awaiting source-of-funds documents from the customer.",
    "Initial review started. Counterparties are still being checked.",
    "Comparing activity with peer customers in the same sector.",
]
PLANTED_NOTES = {
    **{f"A{101 + k:04d}": "Alert opened. Reviewing the cash deposits and the onward transfers." for k in range(6)},
    "A0107": "Customer is a florist and the deposits coincide with the pre-holiday trading period. Checking prior-year activity.",
    "A0108": "High cash turnover for a convenience store. Comparing with expected monthly volume.",
    "A0109": "Incoming invoices from several customers and payments to one supplier. Reviewing the supplier relationship.",
}
notes = []
for n in range(1, 61):
    pool = NOTES_ESCALATED if n % 3 == 0 else NOTES_CLOSED if n % 3 == 1 else NOTES_PENDING
    a = alerts_pdf.iloc[n - 1]
    notes.append((a.alert_id, a.customer_id, pd.Timestamp(a.alert_date) + pd.Timedelta(hours=14), pool[n % len(pool)]))
for a in alerts_pdf.iloc[60:].itertuples():
    notes.append((a.alert_id, a.customer_id, pd.Timestamp(a.alert_date) + pd.Timedelta(hours=10), PLANTED_NOTES[a.alert_id]))
case_notes_pdf = pd.DataFrame(notes, columns=["alert_id", "customer_id", "note_ts", "note_text"])
case_notes_pdf.insert(0, "note_id", [f"N{n + 1:05d}" for n in range(len(case_notes_pdf))])

# COMMAND ----------
# MAGIC %md
# MAGIC ## Write bronze tables

# COMMAND ----------

for schema in ("bronze", "silver", "gold"):
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{schema}")


def write_bronze(pdf, name):
    spark.createDataFrame(pdf).write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(f"{CATALOG}.bronze.{name}")
    print(name, len(pdf))


write_bronze(customers_pdf, "customers_raw")
write_bronze(counterparties_pdf, "counterparties_raw")
write_bronze(transactions_pdf, "transactions_raw")
write_bronze(alerts_pdf, "alerts_raw")
write_bronze(case_notes_pdf, "case_notes_raw")
print("as_of:", AS_OF, "| next: run 00_lakebase_case_decisions.sql in Lakebase, then 02_build_gold_data_products")
