# 0004 — Catalog Manager uses a `data_products` schema, not the medallion layers
- Date: 2026-11-09
- Status: proposed
- Deciders: requested by the developer in the 2026-11-09 session; PM + architect to confirm

## Context
The demo should not present a bronze/silver/gold medallion architecture. Catalog Manager browsed `fincrime.gold`. The existing layers feed the Genie space, dashboard and notebooks and must not change.

## Decision
Create `fincrime.data_products` as a separate, initially empty schema for new data sets. Catalog Manager browses it (`SCHEMA_NAME=data_products`) and labels it "Data products". The business glossary stays in `fincrime.gold.business_glossary` (`GLOSSARY_SCHEMA_NAME=gold`) because the Genie space reads it there.

## Consequences
- `bronze`, `silver` and `gold` are untouched; Genie, dashboard and notebooks still use `gold`.
- Catalog shows snapshot tables copied from gold by `src/06_build_data_products.py` (added 2026-11-09), plus `demo_sandbox` for live edits. Tables rather than views, because the app tags with `ALTER TABLE`. Copies are only as fresh as the last run of the notebook, and lineage shows gold as their source.
- Two locations to explain: data products in `data_products`, glossary in `gold`. Revisit when the glossary or Genie space moves.
- The app service principal needs grants on the new schema (granted 2026-11-09).
