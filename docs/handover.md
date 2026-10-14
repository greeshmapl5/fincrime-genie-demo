# Handover notes: financial crime demo foundation

**For:** the colleague who will develop and enhance this.
**Status:** a working foundation, built on Databricks Free Edition with fictional data. Not production, and not yet recorded as a video.

All data, names and rules are fictional and synthetic. Nothing relates to a client. These notes are an AI-assisted draft and should be reviewed by a person before they go outside the squad.

## 1. What this is

A demo where a bank investigator asks questions in plain English (Genie), gets answers from governed data with the SQL shown, records a decision in Lakebase, and an oversight dashboard (the MLRO view) updates within seconds.

**The story the data tells:** seven accounts meet the structuring rule (5 or more cash deposits of 9,000 to 9,999.99 SEK in 14 days). Six send almost all their transfers to one recipient (X9001). The seventh, an established seasonal florist, spreads its payments out.

## 2. Where things live

| Thing | Location |
|---|---|
| Code, docs, dashboard export, Pages text, video plan | GitHub repo `greeshmapl5/fincrime-genie-demo` (private, personal account). A shared repo `Daiwt2026` is pending access |
| Databricks workspace | Free Edition, owned by a personal account (AWS us-east-2) |
| Lakebase project | `fincrime-source`, database `databricks_postgres`, branch `production` |
| Unity Catalog | `fincrime` (bronze, silver, gold), `fincrime_source` (read-only window onto Lakebase) |

## 3. Repo map

| Path | Purpose |
|---|---|
| `src/00_lakebase_case_decisions.sql` | Creates and seeds the decisions table. Run in the **Lakebase** SQL editor |
| `src/01_generate_bronze_data.py` | Generates the fictional bank into `fincrime.bronze` (seeded, deterministic) |
| `src/02_build_gold_data_products.py` | Builds gold tables and views, tags, and a verification cell |
| `docs/genie/` | Space instructions, example SQL, 22 benchmark questions, copy-paste version |
| `pages/` | Five Pages texts and a publishing guide |
| `dashboards/` | MLRO dashboard export (`.lvdash.json`) |
| `video/` | Storyboard, captions, title and end cards, recording checklist |
| `docs/workspace-findings.md` | **Read this first**: what works, what does not, and the quirks |
| `docs/backlog.md` | Nine epics with stories, sizes and statuses |
| `docs/policy_docs/` | A fictional procedure document, used for the Knowledge Assistant test |

## 4. How to rebuild it (in order)

1. **Lakebase:** run `00_lakebase_case_decisions.sql`. Expect 20 Escalated and 20 Closed - false positive.
2. **Register the catalog:** Catalog, then **+**, then Create a catalog, type Lakebase Postgres, Autoscaling. Name it `fincrime_source`. Click refresh schema so `case_decisions` appears.
3. **Notebook 01** (serverless, widgets `catalog`, `seed` = 2026, `as_of`). Expect 600 customers, 5,008 counterparties, 30,400 transactions, 69 alerts, 69 case notes.
4. **Notebook 02** (widgets `catalog`, `lakebase_catalog`, `cleanup_old_tests`). The last cell must print "All checks passed" with seven candidates.
5. **Genie space:** paste `docs/genie/instructions.md` and the example SQL, add the six tables and views, run the benchmarks (target 22 of 22).
6. **Pages:** publish in the order in `pages/README.md`. A domain is required first.
7. **Dashboard:** import the JSON (Dashboards list, then import). Publish with Share data permission.

## 5. Design decisions worth keeping

- **Decisions live in Lakebase only.** `gold.alerts` joins them, so there is one source of truth. The lakehouse reads Lakebase read-only through the catalog.
- **Logic lives in gold views, not in Genie's prose.** Counts and ratios are columns (for example `inflows_exceed_expected_volume`, `top_onward_counterparty_share`), because Genie's written counts slipped in testing.
- **Time windows are measured from the latest data** (`data_as_of`), not today, so answers do not drift.
- **Inflows only** when comparing with expected volume, never inflows plus outflows.
- **Neutral language everywhere.** "Consistent with" a pattern, never guilt, intent or a recommendation to file or escalate.
- **Data is deterministic** from a seed. The planted story is by design: ring `C0591` to `C0596`, florist `C0580`, near-misses `C0597` to `C0600`, planted alerts `A0101` to `A0109`.

## 6. Known issues and limits

- **Knowledge Assistant:** created and synced, but fails to answer with `NO_AVAILABLE_PHAROS_DEPLOYMENTS`. Needs a workspace where it works.
- **Genie One has chat memory** and no off switch. Delete old test chats, and rephrase questions to force a fresh lookup (page icons and a Genie Ontology chip mean a fresh lookup).
- **Genie One can embellish how a metric is calculated.** For rapid pass-through it claimed the ratio tests 48 hours, but it is a 14-day proxy. The fix is backlog story 3.6.
- **Pages is Beta.** Allow 10 to 15 minutes after publishing before testing. A page cannot be published without a domain.
- **The Genie space does not read Pages.** Genie One does.
- **The registered Lakebase catalog caches metadata.** Refresh the schema after creating objects.
- **Dashboard gotcha:** do not put the date field in the colour or group-by, or the chart draws empty.
- **The benchmark compares against live SQL,** so it does not notice stale demo state.
- **Free Edition:** non-commercial, no SLA, a daily compute quota, no Databricks CLI on the team machine (so deployment is manual), browser automation disabled.

## 7. Resetting the demo

After showing the decision moment, run this in Lakebase and refresh the dashboard:

```sql
DELETE FROM case_decisions WHERE alert_id = 'A0107';
```

The dashboard should show **29 open, 20 closed as false positive, 7 structuring candidates**.

## 8. Leftovers from testing (safe to delete)

The `smoke_cases` table in Lakebase, the `smoke_test` table in gold and `smoke_txn` in bronze, the dashboard "Financial Crime Overview (test)", and the agent `procedure-assistant` (kept deliberately, to retest the error later).

## 9. What to do next

Follow the epic **Static MVP: resources to record the demo video** (nine stories): validate the dataset, load it into Lakebase, workspace access, governance groups, the two-catalog data mesh layout, ODCS data contracts, repointing the dashboard and Genie, Genie One and Pages, and Agent Bricks. Bigger backlog items are in `docs/backlog.md`, notably the Lakebase to lakehouse load with watermarking (squad step 2) and the real 48-hour pass-through column.

## 10. Rules to keep

- Keep every dataset, page and document fictional. Pages data is stored in plain text and may be replicated globally.
- Never put credentials or tokens in the repo or in chat.
- Do not commit or publish anything that has not been reviewed by a person. The code, notes and drafts are AI-assisted.
- Open items outside the code: the licence and sponsor-workspace answer, and the compliance and Data Privacy Officer review, both before anything is published.

## 11. First hour checklist

1. Read `docs/workspace-findings.md`.
2. Confirm you can open the workspace, the Genie space, the dashboard and Discover.
3. Run the benchmark (22 questions) and the notebook-02 check cell, and confirm both pass.
4. Ask the three guardrail questions in the space (guilty, report, off-topic).
5. Read `video/storyboard.md`, then the epic stories.
