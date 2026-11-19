---
id: E1-S13
epic: E1
title: Verify manual Discover Pages import and publish
status: backlog
priority: should
estimate: 2
owner: unassigned
sprint: TBD
issue: "#"
---

## User story
As a **domain owner**, I want **to import an exported glossary term into Discover Pages and publish it**, so that **Ask can cite it**.

## Context
At planning time no public Pages create/publish API was found (CLI v1.20.0 has none; the Beta `databricks domains` group manages domains only). Since then, the docs list a Beta Pages REST API (`/api/2.0/knowledge/pages`: list, get, create, update, delete; `state` DRAFT or PUBLISHED). Drafts are visible only to their owner; Genie One retrieves published Pages.

Evidence (2026-11-11, read-only): `databricks api get /api/2.0/knowledge/pages -p dario-ws` lists 12 published Pages and 1 draft ("High-risk customer") in the Financial Crime domain. Genie One MCP, called as a user, cited the published Structuring Page. Still unverified: importing an export from the app with Genie Code, and a citation through the deployed app's Ask, which runs as the app service principal.

## Acceptance criteria
- [ ] Given an exported term, when a domain owner bulk-imports it with Genie Code and publishes it, then it appears as a published Page in the Financial Crime domain.
- [ ] Given the published Page, when Ask is asked for the term, then the answer cites it.
- [ ] Result and any limits are written into `docs/runbook.md`.

## Technical notes
No PII or regulated data in exported content. Pages is an account-level Beta.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [ ] Docs / runbook updated if needed
- [ ] `HANDOVER.md` updated if status changed
