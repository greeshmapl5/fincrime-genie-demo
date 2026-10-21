# Load procedure: dataset into Lakebase (template)

**Status:** template. Fill in the sections marked **TO FILL** when the load is built (Static MVP epic, story 2). All data is fictional and synthetic.

**Purpose.** Load the settled dataset into Lakebase tables so the lakehouse reads it through a registered catalog, and make the load repeatable by someone who did not build it.

## 1. Scope

- **In:** customers, transactions, counterparties, alerts, case notes and decisions, loaded into one Lakebase schema.
- **Out:** changing the dataset itself (story 1), the catalog layout (story 5), the dashboard and Genie repointing (story 7).
- **Today (before this story):** only `case_decisions` is in Lakebase. The generator writes the other tables to Delta in `fincrime.bronze`.

## 2. Decisions to record before loading

| Decision | Answer | Decided by, date |
|---|---|---|
| Dataset outcome from story 1 (keep, change, replace) | TO FILL | |
| Lakebase schema name (one schema per source catalog) | TO FILL | |
| Load method | TO FILL (for example: generate files then load with SQL, or a Postgres connection from a notebook) | |
| Where credentials come from (never the repo) | TO FILL | |
| Who runs the load | TO FILL | |

## 3. Prerequisites

- [ ] Access to the Databricks workspace (story 3).
- [ ] The Lakebase project `fincrime-source` is running (database `databricks_postgres`, branch `production`).
- [ ] The Lakebase project is registered as a Unity Catalog catalog, and the schema is refreshed in Catalog.
- [ ] A serverless SQL warehouse is available.
- [ ] The dataset outcome from story 1 is recorded.
- [ ] The generator version and seed are noted (current: `src/01_generate_bronze_data.py`, seed 2026).

## 4. Procedure

Fill in the exact commands or notebook names for each step. After each step, run the check and compare with the expected result.

| # | Step | Command or notebook | Check | Expected result |
|---|---|---|---|---|
| 1 | Create the Lakebase schema and tables | TO FILL | List the tables in the Lakebase Tables view | All tables listed |
| 2 | Generate the data | TO FILL | Row counts | 600 customers, about 5,000 counterparties, 30,400 transactions, 69 alerts, 69 case notes (for seed 2026, if the dataset is kept) |
| 3 | Load the data into Lakebase | TO FILL | `SELECT COUNT(*)` per table in Lakebase | Counts equal step 2 |
| 4 | Load the decision seed | `src/00_lakebase_case_decisions.sql` | `SELECT decision, COUNT(*) FROM case_decisions GROUP BY decision` | Escalated 20, Closed - false positive 20 |
| 5 | Refresh the registered catalog | Catalog, then refresh schema | Query a table through the catalog on a serverless warehouse | Rows returned |
| 6 | Rebuild the gold layer | `src/02_build_gold_data_products.py` | Last cell | "All checks passed", seven structuring candidates |
| 7 | Run the decision-loop check | See `docs/verify-decision-loop.md` (to be written) | Status of alert A0107 before and after | Open, then Closed - false positive, then reset |

## 5. Repeating the load safely

For the current Delta bronze generator (notebook 01), see `docs/rerun-bronze.md`. This section is for the Lakebase load.

- **What is overwritten:** TO FILL (for example, tables are replaced on each run).
- **What is kept:** TO FILL (for example, decisions recorded after the seed).
- **Idempotent?** TO FILL. Running the procedure twice must give the same result.
- **How to reset the demo state:** run `DELETE FROM case_decisions WHERE alert_id = 'A0107';` in Lakebase, then refresh the dashboard (expected: 29 open, 20 closed as false positive).

## 6. Verification record

Fill this in each time the procedure is run.

| Date | Run by | Dataset and seed | Counts match | Decision-loop check | Notes |
|---|---|---|---|---|---|
| | | | | | |

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| A table is missing in the lakehouse | The registered catalog is cached | Refresh the schema in Catalog |
| Counts differ from the generator | A step was skipped or run twice | Re-run from step 2 and compare |
| The gold check fails | The source tables changed names or schema | Update the names in notebook 02 and re-run |
| Counters on the dashboard show 28 and 21 | A test decision is still in Lakebase | Reset (section 5) |
| Authentication or connection error | Credentials missing or expired | Obtain new credentials through the agreed route. Never paste them into the repo or chat |

## 8. Rules

- Credentials are never stored in the repo, in notebooks, in commits or in chat.
- Keep all data fictional.
- Record who ran the procedure and when (section 6).
