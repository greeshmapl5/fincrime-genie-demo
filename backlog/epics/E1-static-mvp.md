---
id: E1
title: Static MVP — resources to record the demo video
status: backlog        # backlog | ready | in-progress | review | done | blocked
priority: high
owner: unassigned
target: TBD (before the Summit date, which is TBD)
issue: "#"
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
_Not yet defined. To be refined in a later session._

## Success criteria
- [ ] Dataset chosen and documented
- [ ] Data present in Lakebase and in both catalogs
- [ ] Dashboard and Genie agent working on `data_products`
- [ ] A 3-minute walkthrough shows the above end to end

## Open questions
- Which dataset? (not chosen yet; to be studied)
- Which workspace and Databricks edition? One workspace only, no separate environments. Workspace choice, ownership and governance are still to be defined.
- What exactly is shown in the 3-minute walkthrough?

## Risks / dependencies
- Dataset and workspace decisions block everything else in this epic.
- Lakebase, Genie and dashboard availability depends on the chosen workspace and edition (to verify).
