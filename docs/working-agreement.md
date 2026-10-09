# Working Agreement

How humans and Claude agents work together. People can change every day, so the process must be simple and fully written down.

## Principles
1. **The repo is the memory.** If it is not written here, it does not exist.
2. **Anyone can propose, a human accepts.** Humans and agents can edit stories and docs via branch + PR. A human approves merges and acceptance.
3. **Small and visible.** Small stories, small PRs, a short weekly digest.
4. **Always handover-ready.** Every session ends with `HANDOVER.md` updated.

## Cadence
- **Sprints:** 1 week (Mon–Fri), given the short runway to December.
- **Planning (15–30 min, Mon):** architect + developer pick stories from *Ready*. Claude can prepare the proposal.
- **Mid-sprint check (async):** comments on the board/PRs.
- **Weekly digest (Fri):** agent-generated, human-approved, posted in Teams. PM only needs to skim it.
- **Demo rehearsals:** milestones in the final 3–4 weeks before the Summit.

## GitHub Project board
Create once at GitHub → Projects → New project (Board layout), linked to this repo.

**Columns (Status):** `Backlog` · `Ready` · `In Progress` · `Review` · `Done` (plus `Blocked` as a label)

**Fields:**
| Field | Type | Values |
|---|---|---|
| Epic | Single select | E1, E2, ... |
| Sprint | Iteration | 1-week iterations |
| Estimate | Number | 1, 2, 3, 5, 8 (story points) |
| Priority | Single select | Must / Should / Could |
| Owner | Assignee | person (or "agent-assisted" label) |

**Automation (built-in workflows):** item closed → *Done*; PR opened → *Review*; new issue → *Backlog*.

## Definition of Ready
- Goal and acceptance criteria written
- Dependencies identified
- Estimate given (≤ 5 points; split otherwise)
- Reviewed by architect

## Definition of Done
- Acceptance criteria met and demonstrated
- PR reviewed and merged by a human
- Docs / runbook updated if behavior or setup changed
- `HANDOVER.md` updated if status changed
- Story file `status: done` and issue closed

## Roles for agents
Agents may: draft epics/stories, refine acceptance criteria, review PRs, update docs, produce digests, keep issues and Markdown in sync.
Agents may not: merge their own PRs, change priorities or scope without human approval, store secrets.

## Communication
- **Microsoft Teams:** human-to-human chat and notifications (GitHub app posts issue/PR events into one channel).
- **GitHub issues/PRs:** the shared channel between humans and agents. Questions to a person → comment with `@name`.
- **Decisions:** `decisions/NNNN-title.md`.

## Handover checklist (when someone leaves or joins)
- Leaving: update `HANDOVER.md`, comment status on any in-progress issue, push all work to a branch.
- Joining: read `README.md` → `HANDOVER.md` → this file; run Claude Code from the repo root; ask it for the start-of-session summary.
