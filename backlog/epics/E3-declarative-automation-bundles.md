---
id: E3
title: Declarative Automation Bundles — deploy to new workspaces
status: backlog        # backlog | ready | in-progress | review | done | blocked
priority: low
owner: unassigned
target: TBD
issue: "#4"
---

## Goal
Replicate the E2 code-based MVP in **Declarative Automation Bundles**, so the code can be brought into other, new workspaces.

## Scope
**In**
- Express the E2 solution as a bundle (jobs/pipelines, catalogs and related resources as far as bundles support them).
- Deploy it to a new workspace from this repo.

**Out**
- New features beyond the E2 MVP.
- Video recording.

## Stories
_Not yet defined. To be refined in a later session._

## Success criteria
- [ ] The bundle deploys the E2 solution to a workspace other than the original one
- [ ] Deployment steps are documented in `docs/runbook.md`

## Open questions
- Only one workspace exists today. Which workspace will be used to prove the deployment?
- Which parts of the setup (catalogs, Lakebase, dashboard, Genie) can be deployed through bundles and which stay manual?

## Risks / dependencies
- Depends on E2.
- Priority is low: it may slip if E1 or E2 take longer than planned.
