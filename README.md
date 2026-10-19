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

## No More Middleman: financial crime analytics demo

> All data, names and rules in this repository are fictional and synthetic.
> This is not legal, financial or regulatory guidance.

A 3-minute booth demo for Databricks Data & AI World Tour Stockholm 2026.
An investigator asks questions in plain language (Genie), answers are grounded
in the bank's own definitions (Pages) and built on governed data products
(Unity Catalog).

### Repository layout (demo code)
- `src/` notebooks and SQL
- `resources/` Asset Bundle resources
- `pages/` source text for Pages content
- `dashboards/` exported dashboard JSON
- `video/` script and storyboard
- `docs/genie/`, `docs/workspace-findings.md`, `docs/backlog.md` architecture and notes

### How to deploy
To be completed after the bundle is built.

### Status
Under development. Content owner: [name].

Story 9 note: the original Knowledge Assistant path is retired in the tested accounts. The replacement path is a Genie Agent backed by a policy table (`workspace.default.policy_docs`), with the smoke test validated in `mydev-ws`.
