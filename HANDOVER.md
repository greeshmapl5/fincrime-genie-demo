# HANDOVER

> Keep this file current. Whoever (human or agent) ends a session updates it.
> Last updated: 2026-10-15 — by Copilot (Story 9 assets drafted)

## Project in one line
Build the Databricks demo for our Summit booth (December 2026) and run the project with human + Claude agent collaboration.

## Status
- **Phase:** E1 planning and demo preparation. Story 9's fictional policy source and Agent Bricks setup/evaluation instructions are drafted in this branch.
- **Board:** GitHub Project being created by the PM; deliberately not updated yet.
- **Story 9 (#6):** Blocked pending a workspace where Agent Bricks Knowledge Assistant can deploy; current workspace reports `NO_AVAILABLE_PHAROS_DEPLOYMENTS`. Policy-answer and evaluation acceptance criteria are not yet demonstrated.
- **Demo scope:** E1 includes Genie and an Agent Bricks policy assistant; a combined supervisor remains optional.

## Epics
| ID | Epic | Priority |
|---|---|---|
| E1 | Static MVP: resources to record the video (Lakebase, `data_sources`/`data_products` catalogs, dashboard, Genie agent) | **High** |
| E2 | MVP with code: incremental loading (more data may be loaded into Lakebase to test it) | Low |
| E3 | Declarative Automation Bundles for new workspaces | Low |

## Next 3 steps
1. Identify a workspace with Agent Bricks deployment support or get the current workspace limitation resolved.
2. Configure the Knowledge Assistant using `demo/agent-bricks/README.md` and demonstrate the cited answer and evaluation cases.
3. Continue refining E1 stories, choose the dataset, and confirm workspace ownership and governance.

## Open actions / blockers
| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Create GitHub Project board (columns in `docs/working-agreement.md`) | PM | in progress |
| 2 | Confirm exact Summit date and epic target dates | PM | open |
| 3 | Choose the dataset | Architect | open |
| 4 | Choose which Databricks Free Edition workspace to use; define ownership and governance; verify feature limits | PM + architect | open |
| 5 | Set up Teams channel + GitHub app notifications | PM | open |
| 6 | Technical approach for E2 (sync, Change Data Feed, orchestration, simulating increments) | Architect | later |
| 7 | Resolve `NO_AVAILABLE_PHAROS_DEPLOYMENTS` for the Agent Bricks Knowledge Assistant | PM + workspace administrator | blocked |

## Risks
- Developer and architect may be reassigned to client projects within 1–2 weeks → keep all knowledge in the repo.
- PM has little time → weekly digest must be short and decision-focused.
- Dataset and workspace are undecided and block E1; current workspace also blocks Agent Bricks deployment.
- E2 and E3 are low priority and may slip.

## Key links
- Repo: https://github.com/dariocapgemini-droid/Daiwt2026
- Board: _TBD_
- Teams channel: _TBD_
- Databricks workspace: _TBD (do not paste secrets here)_

## Who decides what
| Topic | Decider |
|---|---|
| Priorities, scope, acceptance | PM |
| Architecture and story refinement | Technical architect / scrum master |
| Implementation details | Developer |
