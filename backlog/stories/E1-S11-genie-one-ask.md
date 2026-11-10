---
id: E1-S11
epic: E1
title: Ask via Genie One MCP with user identity
status: review
priority: must
estimate: 5
owner: unassigned
sprint: TBD
issue: "#"
---

## User story
As a **demo attendee**, I want **Ask to use Genie One MCP as my own identity**, so that **answers use my accessible data and published business definitions, with context comparable to workspace Genie One**.

## Context
Decision 2026-11-05: user approved removing the single-space restriction and
returning to `system.ai.genie_one_mcp`, preserving signed-in identity. This
supersedes the 2026-10-29 space-scoped choice. Identical answers are not guaranteed.

## Acceptance criteria
- [x] Ask targets Genie One MCP with the caller's token, without service-principal fallback or single-space restriction.
- [x] Tests preserve answer citations, SQL, links and partial statuses.
- [x] Authenticated ask/poll through the deployed Apps proxy completed with the
  published Concentration of transfers Page citation (2026-11-05).
- [ ] Deployed app answers a question for a signed-in browser user after ai-gateway consent.
- [ ] A second, non-owner user with service/domain/data access can use Ask.

## Technical notes
User scopes `sql`, `ai-gateway`. `DATABRICKS_HOST` and `DATABRICKS_WORKSPACE_ID`
are set in `app.yaml`. Each request creates and closes a caller-isolated MCP client.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [x] Docs / runbook updated if needed
- [x] `HANDOVER.md` updated if status changed

## Notes / progress log
- 2026-10-28 — Copilot — deployed to dario-ws and verified at API level.
