---
id: E2
title: MVP with code — incremental loading
status: backlog        # backlog | ready | in-progress | review | done | blocked
priority: low
owner: unassigned
target: TBD
issue: "#3"
---

## Goal
Turn the E1 MVP into a **code-based** solution that loads data **incrementally**: Lakebase → `data_sources` → `data_products`, then refreshes the dashboard.

## Scope
**In**
- Load data from Lakebase into `data_sources` with code, incrementally.
- Load data from `data_sources` into `data_products` with code, incrementally. Change Data Feed is one possible mechanism.
- Refresh the dashboard afterwards.
- To test and showcase incremental loading, **more data may be loaded into Lakebase** over time (possible, not confirmed).

**Out**
- Packaging for other workspaces (E3).
- Video recording.

## Technical details
Deliberately left open: sync mechanism, use of Change Data Feed, orchestration, and how increments are simulated. They will be decided later and recorded in `/decisions`.

## Stories
_Not yet defined. To be refined in a later session._

## Success criteria
- [ ] New rows added in Lakebase reach `data_sources` and `data_products` without a full reload
- [ ] The dashboard shows the new data after a refresh
- [ ] Everything runs from code in this repo, not by hand

## Open questions
- Is more data actually available to load into Lakebase to demonstrate increments?
- Technical approach (to be decided later).

## Risks / dependencies
- Depends on E1 (dataset, workspace, catalogs).
- Priority is low: it may slip if E1 takes longer than planned.
