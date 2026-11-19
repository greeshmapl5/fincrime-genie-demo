# 0004 — Catalog Manager uses a `data_products` schema, not the medallion layers
- Date: 2026-11-09
- Status: proposed
- Amended: 2026-11-10 (glossary location), 2026-11-17 (preserve gold object types)
- Deciders: requested by the developer in the 2026-11-09 session; PM + architect to confirm

## Context
The demo should not present a bronze/silver/gold medallion architecture. Catalog Manager browsed `fincrime.gold`. The existing layers feed the Genie space, dashboard and notebooks and must not change.

## Decision
Create `fincrime.data_products` as a separate, initially empty schema for new data sets. Catalog Manager browses it (`SCHEMA_NAME=data_products`) and labels it "Data products". The business glossary stays in `fincrime.gold.business_glossary` (`GLOSSARY_SCHEMA_NAME=gold`) because the Genie space reads it there (superseded by the 2026-11-10 amendment).

## Consequences
- `bronze`, `silver` and `gold` are untouched; the dashboard and notebooks still use `gold` (the Genie space moved on 2026-11-10, see the amendment).
- Catalog initially showed only snapshot tables (2026-11-09). The 2026-11-17 amendment below supersedes that choice: source views remain live views, and source tables remain table copies.
- Two locations to explain: data products in `data_products`, glossary in `gold`. Revisit when the glossary or Genie space moves.
- The app service principal needs grants on the new schema (granted 2026-11-09).

## Amendment — 2026-11-10: the glossary moves to `data_products`
- Trigger: the Genie space Investigations Analyst was repointed to `data_products` (09:53 UTC), and the developer asked to switch the glossary "to data_products as well".
- Catalog Manager reads and writes `fincrime.data_products.business_glossary`. `GLOSSARY_SCHEMA_NAME` now defaults to `SCHEMA_NAME`; `app.yaml` sets `data_products`. This resolves the "two locations" consequence above.
- The schema owner created the table and copied the 2 terms; the app service principal has no `CREATE TABLE` on `data_products` and needs none. `fincrime.gold.business_glossary` is unchanged, a frozen copy that nothing reads any more.
- The Genie space reads the glossary from `data_products` too (since 11:29 UTC, via `src/05_genie_glossary_space.py`), so all 8 of its tables are there. Its other instructions, example SQL and benchmarks still name `gold`.
- The glossary is listed in Catalog like any other table in the schema (10 tables), so it can be described, tagged and requested.
- Chosen by the agent while the requester was unavailable (keep `gold` copy, repoint the space, show it in Catalog); confirm together with the rest of this decision.

## Amendment - 2026-11-17: preserve gold object types
- **Superseded later the same day by the replacement clarification below.**
- The developer explicitly requested the same data as gold, with a view in `data_products` whenever the source is a view.
- `alerts`, `structuring_candidates`, `counterparty_network` and `data_as_of` are live views using `SELECT * FROM fincrime.gold.<name>`. This reuses the authoritative logic without changing any source objects. In particular, Lakebase decisions no longer require a snapshot rebuild to reach `data_products.alerts`.
- Source managed tables remain managed table copies, refreshed by notebook 06. The missing `data_as_of` and `smoke_test` are included. The app-owned glossary already matches gold and stays writable; it is deliberately excluded from future overwrite runs. Destination-only objects, including `demo_sandbox`, are kept.
- Normal runs preserve target descriptions, tags, ownership and grants. `ALTER VIEW ... AS` preserves grants/tags but clears column comments, so the builder restores those comments. Type mismatches fail before writes; the one-time migration stages replacements, verifies metadata/data, then renames with rollback backups.
- `reset_metadata = true` resets descriptions and tags without dropping objects. It still removes destination-only governance tags and resets the sandbox; do not use it as an ordinary refresh.
- The previous table-only rationale was incorrect on the current warehouse: live probes confirmed `ALTER TABLE ... SET TAGS`, column tagging and comments work on views, including governed certification. No Catalog Manager code change is needed.
- View owners must retain access to the gold source. Table copies still require refresh after gold table rebuilds. Ask's learned gold references and the Genie space's old SQL are separate follow-ups, not changed by this migration.

## Amendment - 2026-11-17: replace gold, do not depend on it
- The developer clarified: "I want data_products to be exactly the same as gold, so I can drop gold completely". This overrides the previous wrapper design and the original requirement to keep gold as an operational layer.
- Move the original view SQL into `data_products`, relocating internal gold references. Keep the same table/view types, rows and column types; preserve existing app governance metadata and grants.
- Notebook 02 and script 03 now build directly in `data_products`. Notebook 01 no longer creates gold. The historical filename of 02 stays unchanged to avoid breaking notebook links.
- Notebook 06 defaults to source-independent sandbox initialization/verification. `migrate_from_source=true` is an explicit one-time migration; it is not the ongoing pipeline.
- Update maintained dashboard exports, Genie SQL templates/benchmarks and Page source references. Live consumer configuration needs separate validation and appropriate owner approval. Do not infer that editing repository files deploys those consumers.
- Gold is retained during cutover. No automatic drop is added: validate full data/type parity, metadata/grants, all downstream consumers and obtain explicit deletion approval first. Bronze and Lakebase remain upstream and are not removed.
