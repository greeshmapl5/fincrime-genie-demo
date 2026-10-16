# CLAUDE.md — Instructions for Claude agents

This repo prepares and builds the **Databricks Summit booth demo (December 2026)**. Several humans and several Claude Code instances (from different people) work here. Assume the person you are helping may be new today.

## Start-of-session routine
1. Read `HANDOVER.md` (current status, next stories, risks).
2. Read `docs/working-agreement.md` and skim `docs/demo-storyline.md`.
3. Check the GitHub Project board and open PRs (`gh pr list`, `gh issue list`).
4. Summarize to the user in 5 lines: where we are, what is next, what is blocked. Then propose the next step.

## Source of truth
- Backlog lives in `/backlog` (Markdown) and is mirrored by GitHub Issues on the Project board. If they diverge, **the Markdown file wins**; update the issue to match.
- Decisions go in `/decisions` as short numbered files. Do not bury decisions in chat or PR comments only.
- Never rely on chat memory. If something matters, write it into the repo.

## Rules
- **Never push to `main` directly** (except the very first bootstrap commit). Work on a branch `story/<ID>-short-name`, open a PR, link the story.
- A **human approves merges and story acceptance**. Agents may propose, draft, review and update docs and tickets.
- One story per PR. Keep PRs small.
- Every story needs: goal, acceptance criteria, definition of done. If missing, draft them and ask a human to confirm.
- Update `HANDOVER.md` at the end of every working session (status, next 3 stories, open risks, anything surprising).
- No secrets, tokens, customer data or PII in the repo. Use environment variables or the secret store; document names, not values, in `docs/runbook.md`.
- Write in English. Keep files short and scannable.

## Story IDs and naming
- Epics: `E1`, `E2`, ... Stories: `E1-S1`, `E1-S2`, ...
- Files: `backlog/epics/E1-name.md`, `backlog/stories/E1-S1-name.md`
- Branches: `story/E1-S1-short-name`
- Commits: `E1-S1: imperative summary`

## Status values (Markdown front-matter and board columns)
`backlog` → `ready` → `in-progress` → `review` → `done` (also `blocked`)

## Weekly digest (when asked, or scheduled)
Produce: progress vs plan, stories done/in progress/blocked, risks, decisions needed from the PM, days to Summit. Max 15 lines. Save to `docs/digests/YYYY-MM-DD.md`.

## Setup for teammates' agents
- Authenticate GitHub for your Claude Code (`gh auth login`) with access to this repo.
- Clone, then run Claude Code from the repo root so this file loads automatically.
- Databricks workspace access and any other tool setup: see `docs/runbook.md`.
