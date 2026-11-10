---
id: E1-S14
epic: E1
title: Show and assign governed tags in Catalog Manager
status: blocked
priority: should
estimate: 3
owner: unassigned
sprint: TBD
issue: "#"
---

## User story
As a **data steward**, I want **to see a table's system, governed and free-form tags in Catalog Manager and assign certification, domain and data-classification tags**, so that **data products carry account-governed tags, not only free-form labels**.

## Context
Requested 2026-11-06. Supports [docs/backlog.md](../../docs/backlog.md) 5.1 (domain `Financial Crime`) and 5.4 (governed tags). Governed tags are account-level tag policies (`/api/2.1/tag-policies`). Assigning one needs **ASSIGN** on the tag policy plus `APPLY TAG` on the object; ALL PRIVILEGES on the catalog is not enough. Existing free-form tags (`classification`, `certified=true`, `sensitivity=pii`) are unchanged. Acceptance criteria were drafted by an agent; **a human must confirm them**.

**Blocked:** the app service principal (`app-2a3ty8 catalog-manager`) has no ASSIGN grant. An account admin must grant it (see [runbook](../../docs/runbook.md); UI steps, notebook `scripts/grant_governed_tag_assign.py` or `scripts/grant-governed-tag-assign.ps1`).

## Acceptance criteria
- [x] Selecting a table shows its table and column tags, each labelled System, Governed or Free-form.
- [x] Tables offer only `system.certification_status` (Certified / Deprecated) and the key-only `Financial Crime` tag; columns offer only `class.*` tags. Values come from the tag policy.
- [x] The table list marks certified and deprecated tables.
- [x] Without ASSIGN, a change shows a message naming the missing grant, and nothing changes.
- [ ] With ASSIGN granted to the app service principal: certify `demo_sandbox` (in `data_products` since E1-S15), add the domain tag and a `class.*` column tag; Catalog Explorer shows them; removing them restores the original state.
- [ ] A human confirms the identity choice in [decision 0003](../../decisions/0003-governed-tag-writes-app-sp.md).

## Technical notes
- Routes in `server/catalog.ts`: `GET /api/catalog/governed-tags` (policy list, 5-minute cache), `GET /api/catalog/tables/:t/tags`, `PUT` and `DELETE /api/catalog/tables/:t/governed-tags`.
- Writes use `ALTER TABLE … [ALTER COLUMN c] SET TAGS / UNSET TAGS` as the app service principal. The server rejects keys and values not allowed by the tag policy.
- UI: `client/src/pages/catalog/GovernedTagsCard.tsx`. Changes save immediately; certification is cleared with "Not set", the domain with its checkbox, and only `class.*` chips are removable.
- Free-form `certified=true` and governed `system.certification_status` are different tags; the card shows both.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [x] Docs / runbook updated if needed
- [x] `HANDOVER.md` updated if status changed

## Notes / progress log
- 2026-11-06 — Copilot — built, 22 server and 6 render tests pass; deployed `01f1d9f0254c1b6c84b98e3b3409636c`. Live reads work (2 table policies, 113 `class.*` policies). Live writes on `smoke_test` return the app's 403 ASSIGN message for all three tag types; tags unchanged. Uncommitted on `story/E1-S11-genie-one`; move to `story/E1-S14-governed-tags` before the PR.
