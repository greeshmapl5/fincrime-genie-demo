---
id: E1-S10
epic: E1
title: Catalog Manager app with glossary and Discover Pages export
status: review
priority: should
estimate: 5
owner: unassigned
sprint: TBD
issue: "#"
---

## User story
As a **business owner**, I want **to browse and annotate the data catalog, define glossary terms and prepare them for Discover Pages**, so that **business definitions are governed and reach Genie One**.

## Context
AppKit app `catalog-manager` in dario-ws. See [`docs/demo-catalog-manager.md`](../../docs/demo-catalog-manager.md) and [`docs/acceptance-2026-10-24.md`](../../docs/acceptance-2026-10-24.md). No public Pages create/publish API exists, so the app exports Markdown and a human imports and publishes it in Discover > Pages (Genie Code bulk import).

## Acceptance criteria
- [x] Catalog page browses tables/columns, edits comments and sets a classification tag (tested on managed tables).
- [x] Glossary page creates, edits and deletes terms in `fincrime.gold.business_glossary`.
- [x] Pages page exports selected terms as Markdown behind a review gate.
- [x] Capgemini logo shown in the UI.
- [ ] A human imports and publishes an exported term in Discover Pages. (Not done; manual step.)
- [ ] Policy answers cite one source line per section (open failure from the 52-check run: 51 pass, 1 fail).

## Technical notes
Writes run as the app service principal. Classification auto-saves on selection; the grey Save button is expected. Views (`alerts` etc.) are read-only for tags and comments; use managed tables in demos.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [x] Docs / runbook updated if needed
- [x] `HANDOVER.md` updated if status changed

## Notes / progress log
- 2026-10-24 — Copilot — live API acceptance: 51/52 pass; browser flows unverified.
- 2026-10-28 — Copilot — committed with S11 on `story/E1-S11-genie-one`; to be split before the PR.
