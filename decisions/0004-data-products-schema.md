# 0004 — Catalog Manager uses a `data_products` schema, not the medallion layers
- Date: 2026-11-09
- Status: proposed
- Amended: 2026-11-10 (glossary moved to `data_products`; see the amendment below)
- Deciders: requested by the developer in the 2026-11-09 session; PM + architect to confirm

## Context
The demo should not present a bronze/silver/gold medallion architecture. Catalog Manager browsed `fincrime.gold`. The existing layers feed the Genie space, dashboard and notebooks and must not change.

## Decision
Create `fincrime.data_products` as a separate, initially empty schema for new data sets. Catalog Manager browses it (`SCHEMA_NAME=data_products`) and labels it "Data products". The business glossary stays in `fincrime.gold.business_glossary` (`GLOSSARY_SCHEMA_NAME=gold`) because the Genie space reads it there (superseded by the 2026-11-10 amendment).

## Consequences
- `bronze`, `silver` and `gold` are untouched; the dashboard and notebooks still use `gold` (the Genie space moved on 2026-11-10, see the amendment).
- Catalog shows snapshot tables copied from gold by `src/06_build_data_products.py` (added 2026-11-09), plus `demo_sandbox` for live edits. Tables rather than views, because the app tags with `ALTER TABLE`. Copies are only as fresh as the last run of the notebook, and lineage shows gold as their source.
- Two locations to explain: data products in `data_products`, glossary in `gold`. Revisit when the glossary or Genie space moves.
- The app service principal needs grants on the new schema (granted 2026-11-09).

## Amendment — 2026-11-10: the glossary moves to `data_products`
- Trigger: the Genie space Investigations Analyst was repointed to `data_products` (09:53 UTC), and the developer asked to switch the glossary "to data_products as well".
- Catalog Manager reads and writes `fincrime.data_products.business_glossary`. `GLOSSARY_SCHEMA_NAME` now defaults to `SCHEMA_NAME`; `app.yaml` sets `data_products`. This resolves the "two locations" consequence above.
- The schema owner created the table and copied the 2 terms; the app service principal has no `CREATE TABLE` on `data_products` and needs none. `fincrime.gold.business_glossary` is unchanged, a frozen copy that nothing reads any more.
- The Genie space reads the glossary from `data_products` too (since 11:29 UTC, via `src/05_genie_glossary_space.py`), so all 8 of its tables are there. Its other instructions, example SQL and benchmarks still name `gold`.
- The glossary is listed in Catalog like any other table in the schema (10 tables), so it can be described, tagged and requested.
- Chosen by the agent while the requester was unavailable (keep `gold` copy, repoint the space, show it in Catalog); confirm together with the rest of this decision.
