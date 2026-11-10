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
Requested 2026-11-09. Existing `fincrime.bronze`, `silver` and `gold` stay unchanged; the Genie space, dashboard and notebooks keep using `gold`. The data sets in the new schema are snapshot copies of the gold data sets, built by `src/06_build_data_products.py` (chosen by the requester on 2026-11-09). The glossary stays in `gold` because the Genie space reads it there. See [decision 0004](../../decisions/0004-data-products-schema.md). Acceptance criteria were drafted by an agent; **a human must confirm them**.

## Acceptance criteria
- [x] Schema `fincrime.data_products` exists in dario-ws (comment "Data products: …"); no objects in `bronze`, `silver` or `gold` were changed.
- [x] The app service principal has `USE SCHEMA`, `SELECT`, `MODIFY` and `APPLY TAG` on `fincrime.data_products`.
- [x] Catalog shows catalog `fincrime` and schema **Data products** (`data_products`), and "No tables or views in this schema yet." while it is empty.
- [x] Glossary still reads and writes `fincrime.gold.business_glossary` (`GLOSSARY_SCHEMA_NAME`).
- [x] Deployed app shows the above (deployment `01f1dc52bc1311ab9b060d683a47452e`, 2026-11-09).
- [x] The data sets are created in `fincrime.data_products` and appear in Catalog: tables `customer_360`, `transactions`, `counterparties`, `case_notes`, `alerts`, `structuring_candidates`, `counterparty_network`, `policy_docs` (row counts equal gold, gold descriptions and tags copied) and the fictional `demo_sandbox` (3 rows) for live edits.
- [x] `src/06_build_data_products.py` is rerunnable: a normal run replaces rows and keeps metadata edited in the app; `reset_metadata = true` restores the gold descriptions and tags and resets the sandbox.

## Technical notes
- `server/catalog.ts`: defaults `SCHEMA_NAME=data_products`, new `GLOSSARY_SCHEMA_NAME=gold`; `/api/catalog/context` adds `schemaLabel` (underscores to spaces, first letter capitalised).
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
