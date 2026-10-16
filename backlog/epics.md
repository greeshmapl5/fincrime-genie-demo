# Epics overview

Three epics, in this order. Stories will be defined in a later session. Epic files are in [`epics/`](epics/).

| ID | Epic | Goal | Priority | Status |
|---|---|---|---|---|
| [E1](epics/E1-static-mvp.md) (#2) | Static MVP | Resources to record the demo video: dataset in Lakebase and Unity Catalog (`data_sources`, `data_products`), dashboard and Genie agent on `data_products` | **High** | backlog |
| [E2](epics/E2-mvp-with-code.md) (#3) | MVP with code | Incremental loading with code: Lakebase → `data_sources` → `data_products`, then dashboard refresh | Low | backlog |
| [E3](epics/E3-declarative-automation-bundles.md) (#4) | Declarative Automation Bundles | Package the E2 solution so it can be deployed to new workspaces | Low | backlog |

## Notes
- E1 is manual and uses a static dataset. Its final deliverable is a 3-minute showcase that everything needed to record the video is in place. Recording the video is not part of E1.
- Technical details of E2 (sync mechanism, Change Data Feed, orchestration, simulating increments) are intentionally left for later and will be recorded in `/decisions`.
- Project setup and collaboration actions (board, Teams, digest) are tracked in `HANDOVER.md`, not as an epic.

## Open points
- Dataset (not chosen)
- Which Databricks Free Edition workspace to use, plus ownership and governance (one workspace only)
- Summit date and epic target dates
