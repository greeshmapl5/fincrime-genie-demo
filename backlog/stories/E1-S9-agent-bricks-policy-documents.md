---
id: E1-S9
epic: E1
title: Agent Bricks policy document questions
status: blocked
priority: could
estimate: 3
owner: unassigned
sprint: TBD
issue: "#6"
---

## User story
As a demo attendee, I want an agent to answer questions from fictional policy documents with citations, so that I can see policy knowledge alongside the data-products demo.

## Context
The fictional source document, Knowledge Assistant setup instructions, and evaluation cases are in [`demo/agent-bricks/`](../../demo/agent-bricks/README.md). A workspace that supports Agent Bricks Knowledge Assistant deployment is required; the current workspace reports `NO_AVAILABLE_PHAROS_DEPLOYMENTS`.

## Acceptance criteria
- [ ] Given the policy source is indexed in a supported workspace, when asked about the reimbursement deadline, then the assistant answers correctly and cites the source.
- [ ] Given the evaluation cases in the demo README, when neutral-language and out-of-scope questions are asked, then both expected behaviors pass.
- [ ] Optional: a supervisor answers one question using both Genie data and policy knowledge.

## Technical notes
The repository supplies policy content and a manual evaluation procedure; it does not deploy an assistant. The workspace deployment prerequisite must be resolved before the assistant acceptance criteria can be demonstrated.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [ ] Docs / runbook updated if needed
- [ ] `HANDOVER.md` updated if status changed
