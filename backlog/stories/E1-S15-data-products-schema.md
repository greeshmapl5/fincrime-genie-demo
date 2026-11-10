---
id: E1-S15
epic: E1
title: Data products schema for Catalog Manager (no medallion)
status: in-progress
priority: should
estimate: 2
owner: unassigned
sprint: TBD
issue: "#"
---

## User story
As a **demo presenter**, I want **Catalog Manager to show a "Data products" layer instead of the medallion `gold` schema**, so that **the booth audience sees curated data products, not bronze/silver/gold plumbing**.

## Context
Requested 2026-11-09. Existing `fincrime.bronze`, `silver` and `gold` stay unchanged; the dashboard and notebooks keep using `gold`, while the Genie space reads all its tables from `data_products` since 2026-11-10. The data sets in the new schema are snapshot copies of the gold data sets, built by `src/06_build_data_products.py` (chosen by the requester on 2026-11-09). The glossary moved to `data_products` on 2026-11-10 ([decision 0004](../../decisions/0004-data-products-schema.md), amendment). Acceptance criteria were drafted by an agent; **a human must confirm them**.

## Acceptance criteria
- [x] Schema `fincrime.data_products` exists in dario-ws (comment "Data products: …"); no objects in `bronze`, `silver` or `gold` were changed.
- [x] The app service principal has `USE SCHEMA`, `SELECT`, `MODIFY` and `APPLY TAG` on `fincrime.data_products`.
- [x] Catalog shows catalog `fincrime` and schema **Data products** (`data_products`), and "No tables or views in this schema yet." while it is empty.
- [x] Glossary reads and writes `fincrime.data_products.business_glossary` (`GLOSSARY_SCHEMA_NAME`, default `SCHEMA_NAME`), with the 2 gold terms copied; `gold.business_glossary` is unchanged. *Changed 2026-11-10 from "still gold"; needs confirmation.*
- [x] The Genie space Investigations Analyst reads the glossary from `data_products` (added 2026-11-10).
- [x] Deployed app shows the above (deployment `01f1dc52bc1311ab9b060d683a47452e`, 2026-11-09).
- [x] The data sets are created in `fincrime.data_products` and appear in Catalog: tables `customer_360`, `transactions`, `counterparties`, `case_notes`, `alerts`, `structuring_candidates`, `counterparty_network`, `policy_docs` (row counts equal gold, gold descriptions and tags copied) and the fictional `demo_sandbox` (3 rows) for live edits.
- [x] `src/06_build_data_products.py` is rerunnable: a normal run replaces rows and keeps metadata edited in the app; `reset_metadata = true` restores the gold descriptions and tags and resets the sandbox.

## Technical notes
- `server/catalog.ts`: defaults `SCHEMA_NAME=data_products` and `GLOSSARY_SCHEMA_NAME` to the same schema (it was `gold` until 2026-11-10); `/api/catalog/context` adds `schemaLabel` (underscores to spaces, first letter capitalised). If the startup `CREATE TABLE IF NOT EXISTS` for the glossary fails, the app logs a warning and still serves Catalog and a pre-created glossary.
- `app.yaml` sets both env vars explicitly.
- Demo scripts now edit `demo_sandbox` instead of `gold.smoke_test`.
- Data products are tables, not views: the app tags with `ALTER TABLE`, which fails on views. Derived data sets (`alerts`, `structuring_candidates`, `counterparty_network`) are a snapshot as of the last run of notebook 06; rerun it after `02` or after investigator decisions change. Lineage shows the gold tables as sources.
- Notebook uploaded to `/Workspace/Users/xiangyang.guo@capgemini.com/fincrime-genie-demo/src/06_build_data_products`; run on serverless with `databricks jobs submit` (notebook task, `base_parameters.reset_metadata`).

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [x] Docs / runbook updated if needed
- [x] `HANDOVER.md` updated if status changed

## Notes / progress log
- 2026-11-09 — Copilot — created and granted the schema; 59 tests, typecheck and client build pass; local run against dario-ws showed the Data products header, empty state and 2 gold glossary terms. Not deployed or committed: the working tree also holds uncommitted S11/S14 changes in the same files.
- 2026-11-09 — Copilot — deployed after the app was restarted. Live source differed from local only by this story in the four uploaded files (`server/catalog.ts`, `server/catalog.test.ts`, `CatalogPage.tsx`, `app.yaml`); Ask/identity files untouched. Live `/api/catalog/context` returns `data_products` / "Data products", tables `[]`, glossary from gold; bundle contains the empty state; Ask still `app-service-principal`. Still not committed.
- 2026-11-09 — Copilot — added `src/06_build_data_products.py` and ran it on serverless three times (create; normal rerun kept an edited sandbox comment; `reset_metadata = true` restored it). SQL checks: 9 managed tables, row counts equal gold, 11 tags copied, all gold descriptions copied (gold `policy_docs` has no column comments). Live app lists all 9 with classifications; sandbox preview returns 3 rows. Gold/bronze not altered.
- 2026-11-10 — Copilot — checked where new glossary terms are saved: still only `fincrime.gold.business_glossary` (live `app.yaml` has `GLOSSARY_SCHEMA_NAME=gold`; no `business_glossary` in `data_products`). Found that the Genie space Investigations Analyst was updated at 09:53 UTC (who changed it is not recorded) and now reads its 7 data tables from `data_products`, with the glossary still from `gold`. Its instructions, example SQL and benchmarks still name `gold`. The Context above and decision 0004 still say the space uses `gold`. `data_products.alerts` is a snapshot, unlike the live `gold.alerts` view over the Lakebase decisions.
- 2026-11-10 — Copilot — moved the glossary to `data_products` at the developer's request. As the schema owner, created `fincrime.data_products.business_glossary` (same columns and comment) and copied the 2 gold terms (`EXCEPT ALL` both ways empty); gold untouched. Code: default glossary schema, `app.yaml`, tolerant startup, Pages export source; 102 tests, typecheck and build pass. **Deployed** `01f1dcf9919d10739441c49738acb397` (5 files after a drift check; Ask files untouched). Live: `/api/glossary` returns the 2 terms; a test term saved through the API landed only in `data_products` and was deleted; Catalog lists 10 tables including `business_glossary`; no startup warning, so `CREATE TABLE IF NOT EXISTS` on the existing table needs no `CREATE TABLE`. Genie space: `05_genie_glossary_space.py` (new `--dry-run`) changed only the glossary table entry (column settings kept) and its instruction line from `gold` to `data_products`; "What does Structuring mean?" queried `fincrime.data_products.business_glossary` and answered correctly (test conversation deleted). To revert the space, set those two strings back to `fincrime.gold.business_glossary`. The glossary move is not committed yet; the earlier E1-S15 work is in local commit `46d0673` (not pushed).
