# Daiwt2026 — Databricks Summit Demo

Planning, documentation and code for the demo we will present at our booth at the **Databricks Summit (December 2026)**.

This repository is the **single source of truth** for the project. People and Claude agents are interchangeable: everything needed to continue the work lives here, not in anyone's head or chat history.

## Where things are

| Path | What it contains |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Instructions for any Claude Code agent working here. **Agents read this first.** |
| [`HANDOVER.md`](HANDOVER.md) | Current status, next steps, risks. Always up to date. **Humans read this first.** |
| [`docs/`](docs/) | Vision, demo storyline, architecture, runbook, working agreement |
| [`backlog/`](backlog/) | Epics and user stories (Markdown), plus templates |
| [`decisions/`](decisions/) | Lightweight decision log (ADRs) |
| [`demo/`](demo/) | Demo source code and assets |
| [`.github/`](.github/) | Issue and pull request templates |

## Deliverables

1. A Databricks demo video for the booth.
2. A planning and monitoring setup for human and Claude agent collaboration.

## Quick start for a new team member (human or agent)

1. Read `HANDOVER.md`, then `docs/working-agreement.md`.
2. Open the GitHub Project board and pick the top story in **Ready**.
3. Work on a branch, open a PR, link the story.
4. Before you leave, update `HANDOVER.md`.

## Roles

| Role | Responsibility |
|---|---|
| Project manager | Monitors progress through the weekly digest; unblocks decisions |
| Technical architect / scrum master | Creates and refines epics and stories; owns architecture |
| Developer | Implements stories; mostly reads tasks, proposes updates via PR/issue comments |
| Claude agents | Draft and refine stories, review PRs, write status digests, keep docs in sync |

See [`docs/working-agreement.md`](docs/working-agreement.md) for the full process.
