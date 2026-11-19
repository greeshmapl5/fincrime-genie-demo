---
id: E1-S15
epic: E1
title: Data products schema for Catalog Manager (no medallion)
status: blocked
priority: should
estimate: 2
owner: unassigned
sprint: TBD
issue: "#"
---

## User story
As a **demo presenter**, I want **Catalog Manager to show a "Data products" layer instead of the medallion `gold` schema**, so that **the booth audience sees curated data products, not bronze/silver/gold plumbing**.

## Context
**Clarified 2026-11-17:** `data_products` must replace gold completely, not
depend on it; Ask must query only data products and existing test answers must
remain correct. Prepared independent build/migration code is blocked live:
the view/build owner lacks `USE SCHEMA` on `fincrime_source.public`.
Gold must remain until that is fixed and consumer/Ask UAT passes.

Requested 2026-11-09. Existing `fincrime.bronze`, `silver` and `gold` stay unchanged; the dashboard and notebooks keep using `gold`, while the Genie space reads its data from `data_products` since 2026-11-10. On 2026-11-17 the developer requested matching gold object types: managed table copies and live view wrappers, built by `src/06_build_data_products.py`. The glossary moved to `data_products` on 2026-11-10 and remains app-owned ([decision 0004](../../decisions/0004-data-products-schema.md), amendments). Formal story acceptance still needs a human.

## Acceptance criteria
- [x] Schema `fincrime.data_products` exists in dario-ws (comment "Data products: …"); no objects in `bronze`, `silver` or `gold` were changed.
- [x] The app service principal has `USE SCHEMA`, `SELECT`, `MODIFY` and `APPLY TAG` on `fincrime.data_products`.
- [x] Catalog shows catalog `fincrime` and schema **Data products** (`data_products`), and "No tables or views in this schema yet." while it is empty.
- [x] Glossary reads and writes `fincrime.data_products.business_glossary` (`GLOSSARY_SCHEMA_NAME`, default `SCHEMA_NAME`), with the 2 gold terms copied; `gold.business_glossary` is unchanged. *Changed 2026-11-10 from "still gold"; needs confirmation.*
- [x] The Genie space Investigations Analyst reads the glossary from `data_products` (added 2026-11-10).
- [x] Deployed app shows the above (deployment `01f1dc52bc1311ab9b060d683a47452e`, 2026-11-09).
- [x] All gold objects have matching names, types and rows in `data_products`: tables remain tables; `alerts`, `structuring_candidates`, `counterparty_network` and `data_as_of` remain views. Existing governance metadata/grants, app-owned glossary and extra sandbox are preserved. *Amended 2026-11-17 at the developer's request; live SQL/API verified.*
- [x] `src/06_build_data_products.py` is rerunnable: ordinary refresh preserves metadata/grants; views stay live and tables refresh by column name. `reset_metadata = true` restores gold descriptions/tags without dropping objects and resets the sandbox. *Ordinary live run and reset unit regressions pass; metadata reset was not applied to the live governance tags.*
- [ ] Independent data-products views contain the original business logic and no gold dependencies; direct builds need no gold schema. *Prepared; live migration blocked by upstream privileges.*
- [ ] Live consumers and Ask use data products only; rerun the original definition/tag/data UAT and inspect all executed SQL before declaring gold removable.

## Technical notes
- `server/catalog.ts`: defaults `SCHEMA_NAME=data_products` and `GLOSSARY_SCHEMA_NAME` to the same schema (it was `gold` until 2026-11-10); `/api/catalog/context` adds `schemaLabel` (underscores to spaces, first letter capitalised). If the startup `CREATE TABLE IF NOT EXISTS` for the glossary fails, the app logs a warning and still serves Catalog and a pre-created glossary.
- `app.yaml` sets both env vars explicitly.
- Demo scripts now edit `demo_sandbox` instead of `gold.smoke_test`.
- Data products preserve gold object types. View wrappers read gold live; table copies refresh when notebook 06 runs. Live SQL probes confirmed the app's tagging/comment syntax supports views. Existing type mismatches stop before writes rather than silently dropping metadata or grants.
- Notebook 06 discovers gold managed tables/views except the app-owned glossary and reserved sandbox. Normal runs leave the glossary, sandbox and other destination-only objects untouched. Resetting metadata removes destination-only certification, so use `false` for ordinary refreshes.
- Notebook uploaded to `/Workspace/Users/xiangyang.guo@capgemini.com/fincrime-genie-demo/src/06_build_data_products`; run on serverless with `databricks jobs submit` (notebook task, `base_parameters.reset_metadata`).

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [x] Docs / runbook updated if needed
- [x] `HANDOVER.md` updated if status changed

## Notes / progress log
- 2026-11-17 (later) - Copilot - developer clarified replacement, not wrappers. Prepared direct builds in 02/03, optional independent-view migration in 06, updated repository consumer references. Serverless run `761163659154705` failed compiling independent alerts because the data-product view/build owner lacks `USE SCHEMA` on `fincrime_source.public`. Cancelled retries; original working gold-backed alerts view retained. No permission grants, no gold deletion, no live consumer/Ask cutover. Thirteen Python regressions and 122 app tests/typecheck pass; original Ask UAT not rerun. Thirty-six of 37 proposed consumer SQL queries pass; existing test-dashboard smoke_cases SQL fails upstream permissions too. App restarted successfully on its existing source; Catalog context and Ask identity both HTTP 200. Post-abort full row/type/metadata/grant parity verified for all 11 objects; four views still depend on gold. Uploaded permission-preflight guards after a source drift/roundtrip check; no further blocked execution attempted. See HANDOVER for the remaining gate.
- 2026-11-17 - Copilot - preserved gold object types at the developer's request. Three old snapshots replaced with staged, metadata-preserving live views; added `data_as_of` (view, 1 row) and `smoke_test` (table, 2 rows). All 11 gold objects match target types, columns and rows (`EXCEPT ALL` both ways empty), plus the untouched extra sandbox. Existing descriptions, tags (including seven governed certifications), owners and grants preserved; gold IDs/update timestamps/definitions/metadata unchanged. Rollback tables removed only after independent verification. Notebook 06 uploaded after source drift check and run on serverless STANDARD: run `435531940905675`, task `175954110786516`, SUCCESS. Seven stdlib unittest regressions in `tests/test_data_products.py` and Python syntax validation pass; Pylance syntax calls timed out, so local parsing and actual serverless execution supplied validation. Live metadata/read/access SQL supports views. No app deployment needed; UI/app-SP smoke testing was unavailable because app compute is STOPPED due to workspace/account status. No commits or pushes; pre-existing unrelated changes preserved.
- 2026-11-09 — Copilot — created and granted the schema; 59 tests, typecheck and client build pass; local run against dario-ws showed the Data products header, empty state and 2 gold glossary terms. Not deployed or committed: the working tree also holds uncommitted S11/S14 changes in the same files.
- 2026-11-09 — Copilot — deployed after the app was restarted. Live source differed from local only by this story in the four uploaded files (`server/catalog.ts`, `server/catalog.test.ts`, `CatalogPage.tsx`, `app.yaml`); Ask/identity files untouched. Live `/api/catalog/context` returns `data_products` / "Data products", tables `[]`, glossary from gold; bundle contains the empty state; Ask still `app-service-principal`. Still not committed.
- 2026-11-09 — Copilot — added `src/06_build_data_products.py` and ran it on serverless three times (create; normal rerun kept an edited sandbox comment; `reset_metadata = true` restored it). SQL checks: 9 managed tables, row counts equal gold, 11 tags copied, all gold descriptions copied (gold `policy_docs` has no column comments). Live app lists all 9 with classifications; sandbox preview returns 3 rows. Gold/bronze not altered.
- 2026-11-10 — Copilot — checked where new glossary terms are saved: still only `fincrime.gold.business_glossary` (live `app.yaml` has `GLOSSARY_SCHEMA_NAME=gold`; no `business_glossary` in `data_products`). Found that the Genie space Investigations Analyst was updated at 09:53 UTC (who changed it is not recorded) and now reads its 7 data tables from `data_products`, with the glossary still from `gold`. Its instructions, example SQL and benchmarks still name `gold`. The Context above and decision 0004 still say the space uses `gold`. `data_products.alerts` is a snapshot, unlike the live `gold.alerts` view over the Lakebase decisions.
- 2026-11-10 — Copilot — moved the glossary to `data_products` at the developer's request. As the schema owner, created `fincrime.data_products.business_glossary` (same columns and comment) and copied the 2 gold terms (`EXCEPT ALL` both ways empty); gold untouched. Code: default glossary schema, `app.yaml`, tolerant startup, Pages export source; 102 tests, typecheck and build pass. **Deployed** `01f1dcf9919d10739441c49738acb397` (5 files after a drift check; Ask files untouched). Live: `/api/glossary` returns the 2 terms; a test term saved through the API landed only in `data_products` and was deleted; Catalog lists 10 tables including `business_glossary`; no startup warning, so `CREATE TABLE IF NOT EXISTS` on the existing table needs no `CREATE TABLE`. Genie space: `05_genie_glossary_space.py` (new `--dry-run`) changed only the glossary table entry (column settings kept) and its instruction line from `gold` to `data_products`; "What does Structuring mean?" queried `fincrime.data_products.business_glossary` and answered correctly (test conversation deleted). To revert the space, set those two strings back to `fincrime.gold.business_glossary`. The glossary move is not committed yet; the earlier E1-S15 work is in local commit `46d0673` (not pushed).
