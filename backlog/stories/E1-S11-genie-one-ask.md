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
As a **demo attendee**, I want **Ask to use the new Genie One MCP as my own identity**, so that **answers use the ontology and published Pages, and respect my permissions**.

## Context
Replaces the Genie space chat. Uses `system.ai.genie_one_mcp` through Unity Gateway; the old `/api/2.0/mcp/genie` endpoint retires 31 Oct 2026. Branch `story/E1-S11-genie-one`, commit `5f705c0`.

## Acceptance criteria
- [x] Ask calls the new Genie One MCP with the caller's token; no service-principal fallback. (`/api/ask/identity` returned the signed-in user.)
- [x] An answer cites a published Page with a distinctive business definition. ("Concentration of transfers": 14-day, largest recipient, 0.94 = 94 percent.)
- [x] A follow-up question in the same conversation returns data and the generated SQL (`query_items`: `item_id`, `sql`).
- [x] 23 tests, typecheck, build and `apps validate` pass.
- [ ] Browser check: sign-in, consent to `ai-gateway` scope, answer/SQL/citation rendering.
- [ ] A second, non-owner user can use Ask (permissions on the MCP service and domain).

## Technical notes
`DATABRICKS_HOST` and `DATABRICKS_WORKSPACE_ID` are set in `app.yaml` (change if the app moves workspaces). User scopes: `sql`, `ai-gateway`. Dependency audit shows 34 advisories; none force-fixed.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [x] Docs / runbook updated if needed
- [x] `HANDOVER.md` updated if status changed

## Notes / progress log
- 2026-10-28 — Copilot — deployed to dario-ws and verified at API level.
