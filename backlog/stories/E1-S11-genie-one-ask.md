---
id: E1-S11
epic: E1
title: Ask via Genie space MCP with user identity
status: review
priority: must
estimate: 5
owner: unassigned
sprint: TBD
issue: "#"
---

## User story
As a **demo attendee**, I want **Ask to use an MCP limited to the Investigations Analyst Genie space, as my own identity**, so that **answers come only from that space and respect my permissions**.

## Context
Decision 2026-10-29: Ask must be limited to the Genie space we built, so it uses the Genie Agent MCP `/api/2.0/mcp/genie/{space_id}` (scope `genie`) instead of Genie One (`system.ai.genie_one_mcp`, workspace-wide and Page-grounded; proven earlier on commit `5f705c0`). The space-less Beta endpoint ends 2026-11-30; the space-scoped endpoint is not named in that notice (confirm with Databricks).

## Acceptance criteria
- [x] Ask calls only the configured space's MCP with the caller's token; no service-principal fallback; caller cannot choose another space.
- [x] The space MCP returns answer text and SQL in the shape the app maps (checked with a real call: alerts by status).
- [x] Typecheck and 24 tests pass; deployed to dario-ws.
- [ ] Deployed app answers a question for a signed-in browser user. Blocked: forwarded token lacks the `genie` scope until the user re-consents (403 "required scopes: genie").
- [ ] A second, non-owner user with CAN RUN can use Ask.

## Technical notes
User scopes `sql`, `dashboards.genie`, `genie`. `DATABRICKS_HOST` is set in `app.yaml`. The endpoint bypasses Unity Gateway. Dependency audit shows 34 advisories; none force-fixed.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [x] Docs / runbook updated if needed
- [x] `HANDOVER.md` updated if status changed

## Notes / progress log
- 2026-10-28 — Copilot — deployed to dario-ws and verified at API level.
