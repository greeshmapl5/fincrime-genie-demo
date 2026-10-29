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
No public Pages create/publish API was found (CLI v1.20.0 has none; the Beta `databricks domains` group manages domains only). Publishing is manual. Drafts are visible only to their owner; Genie One retrieves published Pages. Ask the Databricks contact whether an API is planned.

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
