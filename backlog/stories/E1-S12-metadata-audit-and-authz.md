---
id: E1-S12
epic: E1
title: User-attributed audit and edit authorization in Catalog Manager
status: backlog
priority: should
estimate: 3
owner: unassigned
sprint: TBD
issue: "#"
---

## User story
As a **data governance lead**, I want **a record of who changed which metadata and a check that the user may change it**, so that **edits are accountable**.

## Context
Catalog and glossary writes run as the app service principal, so Unity Catalog audit shows the service principal, not the person. The app keeps no change history. Not confirmed in `system.access.audit` (no access in dario-ws).

## Acceptance criteria
- [ ] Given a user edits a comment, tag or glossary term, when the edit is saved, then an audit row records user email (from `x-forwarded-email`), action, object, old and new value and time.
- [ ] Given a user without the right privilege, when they try to edit, then the edit is refused.
- [ ] The Catalog or Glossary page shows recent changes with the author.

## Technical notes
Option 1 (quick): app-side audit Delta table written on every edit. Option 2 (longer term): run writes with the user's token (`sql` scope already granted) so Unity Catalog attributes and authorizes them.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [ ] Docs / runbook updated if needed
- [ ] `HANDOVER.md` updated if status changed
