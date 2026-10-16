# Verify the decision loop

All data is fictional and synthetic.

**What this proves.** A decision recorded in Lakebase changes the alert status in the lakehouse, on the dashboard and in Genie, with no pipeline run in between. Run it after any change to the load, the catalog layout, the gold views or the dashboard.

**Why it works.** `gold.alerts` is a view. It takes alerts from the bronze table and joins the latest decision per alert from the Lakebase table `case_decisions`, read through the registered catalog `fincrime_source`. An alert with no decision is `Open`.

## Prerequisites

- [ ] The data notebooks have run, and notebook 02's last cell printed "All checks passed".
- [ ] The Lakebase project is registered as the catalog `fincrime_source`, and the schema is refreshed in Catalog.
- [ ] The seed state is in place: no decision for alert `A0107`.
- [ ] A serverless SQL warehouse is available.

If the table `case_decisions` lives in a schema other than `public`, or the catalog has another name, adjust the names below and in the gold notebook.

## 1. Check the state before (Databricks SQL Editor)

```sql
SELECT status, COUNT(*) AS alerts FROM fincrime.gold.alerts GROUP BY status;
```
Expected: Open 29, Escalated 20, Closed - false positive 20.

```sql
SELECT alert_id, customer_id, status, decision_rationale
FROM fincrime.gold.alerts WHERE alert_id = 'A0107';
```
Expected: status `Open`, empty rationale.

## 2. Insert the decision (the Lakebase SQL editor, database `databricks_postgres`)

```sql
INSERT INTO case_decisions (alert_id, decision, rationale, decided_by)
VALUES ('A0107', 'Closed - false positive', 'Activity matches the seasonal trading profile of a florist.', 'investigator');
```
Expected: a success message such as `INSERT 1`.

## 3. Check the state after (Databricks SQL Editor)

Run the two queries from step 1 again.

Expected:
- Open 28, Escalated 20, Closed - false positive 21.
- A0107: status `Closed - false positive`, with the rationale you inserted.

## 4. Check downstream

- **Dashboard:** refresh the published MLRO dashboard. Open alerts show 28, closed as false positive 21, and A0107 has left the open queue.
- **Genie:** in a new chat, ask `How many alerts are open, escalated and closed as false positive?` and look for 28, 20 and 21.

## 5. Optional: latest decision wins

```sql
INSERT INTO case_decisions (alert_id, decision, rationale, decided_by)
VALUES ('A0107', 'Escalated', 'Second review requested.', 'investigator');
```
Expected: the status of A0107 becomes `Escalated` (Escalated 21, Closed - false positive 20).

## 6. Reset to the seed state (Lakebase)

```sql
DELETE FROM case_decisions WHERE alert_id = 'A0107';
```
Refresh the dashboard. Expected: 29 open, 20 closed as false positive.

## If it does not change

| Symptom | Likely cause |
|---|---|
| The lakehouse query still shows the old status | The registered catalog is cached. Refresh the schema in Catalog and rerun. Check you inserted into the right database and schema |
| "Table not found" in the lakehouse | The catalog is not registered, or `case_decisions` is not visible yet |
| Counts are 28 and 21 before you start | A test decision for A0107 is still there. Reset first |
| The dashboard does not update | Click the refresh icon. Check the SQL editor result first, since the dashboard reads the same view |

## Record

| Date | Run by | Before (open, escalated, closed) | After | Time to appear | Result |
|---|---|---|---|---|---|
| | | | | | |
