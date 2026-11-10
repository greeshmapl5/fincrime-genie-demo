---
id: E1
title: Static MVP — resources to record the demo video
status: backlog        # backlog | ready | in-progress | review | done | blocked
priority: high
owner: unassigned
target: TBD (before the Summit date, which is TBD)
issue: "#2"
---

## Goal
Build the resources needed to replicate and record a video of the demo. The data is **static**: it does not refresh or grow over time, and everything in this epic can be built manually.

## Scope
**In**
- Choose a dataset (open point, see below).
- Load the dataset into **Lakebase** tables.
- Put the same dataset into **Unity Catalog**, split into two catalogs:
  - `data_sources` — the source data as loaded.
  - `data_products` — the curated data consumed by end users.
- Build a **dashboard** on top of `data_products`.
- Build a **Genie agent** (Genie space) on top of `data_products`.

**Out**
- Recording or editing the video itself.
- Incremental loading, automation and code-based pipelines (E2).
- Packaging for other workspaces (E3).

## Final deliverable
Show in **3 minutes** that everything needed to record the video is in place: the data in Lakebase, the two catalogs in Unity Catalog, the dashboard and the Genie agent working on `data_products`. Exact details to be refined later.

## Stories
| Story | Title | Status |
|---|---|---|
| [E1-S9](../stories/E1-S9-agent-bricks-policy-documents.md) | Policy document questions (Genie Agent) | review |
| [E1-S10](../stories/E1-S10-discover-pages.md) | Catalog Manager, glossary, Pages export | review |
| [E1-S11](../stories/E1-S11-genie-one-ask.md) | Ask via Genie One MCP with user identity | review |
| [E1-S12](../stories/E1-S12-metadata-audit-and-authz.md) | Metadata audit and edit authorization | backlog |
| [E1-S13](../stories/E1-S13-publish-pages-manually.md) | Verify manual Pages import and publish | backlog |
| [E1-S14](../stories/E1-S14-governed-tags-in-catalog.md) | Show and assign governed tags in Catalog Manager | blocked |
| [E1-S15](../stories/E1-S15-data-products-schema.md) | Data products schema for Catalog Manager (no medallion) | in-progress |
| [E1-S16](../stories/E1-S16-access-requests.md) | Request and approve access to data products in Catalog Manager | in-progress |

Other E1 stories (dataset, Lakebase, catalogs, dashboard) are still to be defined.

## Success criteria
- [ ] Dataset chosen and documented
- [ ] Data present in Lakebase and in both catalogs
- [ ] Dashboard and Genie agent working on `data_products`
- [ ] A 3-minute walkthrough shows the above end to end

## Open questions
- Which dataset? (not chosen yet; to be studied)
- Which workspace? The plan is to use a **Databricks Free Edition** workspace, but which Free Edition workspace to use is still to be decided. One workspace only, no separate environments. Ownership and governance are still to be defined.
- What exactly is shown in the 3-minute walkthrough?

## Risks / dependencies
- Dataset and workspace decisions block everything else in this epic.
- Lakebase, Genie and dashboard availability on the chosen Free Edition workspace must be verified, including any limits.
