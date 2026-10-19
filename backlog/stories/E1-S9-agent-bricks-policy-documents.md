---
id: E1-S9
epic: E1
title: Agent Bricks policy document questions
status: review
priority: could
estimate: 3
owner: unassigned
sprint: TBD
issue: "#6"
---

## User story
As a demo attendee, I want an agent to answer questions from fictional policy documents with citations, so that I can see policy knowledge alongside the data-products demo.

## Context
The fictional source document, Knowledge Assistant setup instructions, and evaluation cases are in [`demo/agent-bricks/`](../../demo/agent-bricks/README.md). Knowledge Assistant is retired ("legacy feature, use Genie Agents instead") in both tested workspaces, so the assistant is built as a Genie Agent instead (see `docs/workspace-findings.md`).

## Acceptance criteria
- [x] Given the policy source is loaded, when asked about the reimbursement deadline, then the assistant answers correctly and cites the source. (dario-ws, "Investigations Analyst" space: 30 calendar days, `Source: Expense Reimbursement Policy, section Submission deadline`.)
- [x] Given the evaluation cases in the demo README, when neutral-language and out-of-scope questions are asked, then both expected behaviors pass. (Late request answered neutrally with section citation; lost-passport question declined as out of scope.)
- [ ] Optional: a supervisor answers one question using both Genie data and policy knowledge. (Not tested; the same space now holds both data tables and `policy_docs`.)

## Technical notes
Policy text is loaded as 12 section rows into `fincrime.gold.policy_docs` by `src/03_policy_docs.py`; `src/04_genie_policy_space.py` adds the table, policy rules and 3 benchmarks to the space. Citations are section level, not page level. Data questions still work (regression: alerts by status). Not pushed or deployed through a bundle; the workspace changes were made directly.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [ ] Docs / runbook updated if needed
- [ ] `HANDOVER.md` updated if status changed
