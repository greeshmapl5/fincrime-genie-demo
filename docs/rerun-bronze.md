# Re-running the bronze data notebook

All data is fictional and synthetic. This page explains what happens when you run `src/01_generate_bronze_data.py` again, what to run afterwards, and how to check it worked.

**Short version.** Re-running notebook 01 is safe. It overwrites the five bronze tables. With the same seed you get the same dataset. Afterwards, re-run notebook 02 so the gold layer catches up.

## When to re-run it

- To refresh the "last 14 days" story before recording or an event (leave `as_of` blank, so timestamps are relative to now).
- After changing the generator code.
- To return the bronze data to a known state.

Avoid re-running on the day you record or present. It uses compute quota, and the gold layer is stale until notebook 02 finishes.

## What the notebook does

- Takes three widgets: `catalog` (default `fincrime`), `seed` (default 2026) and `as_of` (blank means now, UTC).
- Creates the schemas `bronze`, `silver` and `gold` in the catalog if they are missing.
- Writes five tables to `<catalog>.bronze` with `overwrite`, replacing any existing content and schema:

| Table | Rows (seed 2026) |
|---|---|
| `customers_raw` | 600 |
| `counterparties_raw` | 5,008 |
| `transactions_raw` | 30,400 |
| `alerts_raw` | 69 |
| `case_notes_raw` | 69 |

## What it changes and what it leaves alone

| Object | After a re-run |
|---|---|
| The five bronze tables | **Replaced** |
| Gold tables and views (`customer_360`, `transactions`, `counterparties`, `case_notes`, `alerts`, `structuring_candidates`, `counterparty_network`, `data_as_of`) | **Not touched.** They stay as they were until notebook 02 runs. The gold tables are snapshots, so they are stale in between |
| Lakebase decisions (`case_decisions`) | **Not touched** |
| The dashboard | Reads the gold layer live, so it shows the old data until notebook 02 has run |
| The Genie space, Pages and the domain | Not touched |

## What the widgets change

- **Same `seed`, same `as_of`:** identical dataset, including timestamps.
- **Same `seed`, blank `as_of`:** the same customers, ids and planted story, with all timestamps shifted to be relative to the new "now".
- **Different `seed`:** names, background transactions and counts differ. The planted story stays at the same ids (ring `C0591` to `C0596`, florist `C0580`, near-misses `C0597` to `C0600`, planted alerts `A0101` to `A0109`). The expected counts in this repo are only for seed 2026.
- Alert ids `A0001` to `A0060` do not change with the seed, so the seeded Lakebase decisions still match, though a different seed attaches them to different customers.

## Steps

1. Make sure nothing else is running on the warehouse, and that the Lakebase catalog is registered and refreshed.
2. Run notebook 01 (serverless). Leave `catalog` as is, set `seed` and `as_of` as needed, and **Run all**.
3. Check the printed counts (see the table above, for seed 2026).
4. Run notebook 02 (**Run all**). The last cell must print "All checks passed" with seven structuring candidates.
5. Check the downstream objects:
   - Refresh the dashboard: expect 29 open, 20 closed as false positive, 7 structuring candidates.
   - Run the decision-loop check in `docs/verify-decision-loop.md`.
   - Open the Genie space, and confirm its tables are still listed.
   - Re-run the benchmark (22 questions) after a re-run, to confirm the answers still match.
6. If a test decision is left in Lakebase, reset it:

```sql
DELETE FROM case_decisions WHERE alert_id = 'A0107';
```

## What is verified and what is not

- **Verified:** the original runs with seed 2026 and a blank `as_of` produced the counts above, and notebook 02's checks passed.
- **Not verified:** re-running with a different seed, a fixed `as_of`, or in another workspace. The planted story uses relative offsets, so the checks should pass, but this has not been run.

## If something goes wrong

| Symptom | Likely cause | What to do |
|---|---|---|
| Notebook 02's check cell fails after a re-run | The data changed (different seed or `as_of`), or notebook 01 did not finish | Re-run notebook 01 fully, then 02. The failure message prints what differed |
| "Transactions dated in the future" fails | The session time zone is not UTC, and the generator uses UTC | Re-run with a fixed `as_of` slightly in the past, and check the session time zone |
| The dashboard shows old numbers | Notebook 02 has not run since the re-run | Run notebook 02, then refresh the dashboard |
| Counters show 28 and 21 | A test decision is still in Lakebase | Reset it (step 6) |
| A table is missing in the Genie space | The gold tables were replaced | Open Configure, Data, and re-add the tables |
| Compute error or timeout | The daily quota is used up or the warehouse is busy | Wait for the quota to reset, and try again later |

## Rules

- Keep the data fictional.
- Never put credentials in the notebooks, the repo or chat.
- Record the date and who ran it if you re-run for a recording.
