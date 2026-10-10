# Demo Storyline

> Work in progress. The detailed narrative will be refined in a later session. Backlog: see [`backlog/epics.md`](../backlog/epics.md).

## What the demo shows
A governed data flow on Databricks, from an operational database to end-user analytics:

1. Data in **Lakebase**.
2. Data in **Unity Catalog**, split into `data_sources` (as loaded) and `data_products` (curated).
3. A **dashboard** and a **Genie agent** on top of `data_products`.
4. *(E2)* The same flow running **incrementally with code**.
5. *(E3)* The same solution **deployed to a new workspace** with Declarative Automation Bundles.

## Delivery stages
| Stage | Epic | Result |
|---|---|---|
| Static MVP | E1 | Everything needed to record a demo video; 3-minute showcase |
| MVP with code | E2 | Incremental loading with code |
| Portable solution | E3 | Deployable to new workspaces via bundles |

## Open points
- [ ] Dataset (not chosen)
- [ ] Which Databricks Free Edition workspace to use, plus ownership and governance
- [ ] Exact Summit date and booth time slots
- [ ] Narrative, wow moment and target length
- [ ] Fallback plan
- [ ] Branding or content guidelines
