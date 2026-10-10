# HANDOVER

> Keep this file current. Whoever (human or agent) ends a session updates it.
> Last updated: 2026-10-10 — by Claude (epics defined)

## Project in one line
Build the Databricks demo for our Summit booth (December 2026) and run the project with human + Claude agent collaboration.

## Status
- **Phase:** Planning. Three epics defined (see `backlog/epics.md`); stories not yet written.
- **Board:** GitHub Project being created by the PM; deliberately not updated yet.
- **Demo scope:** Epics agreed in outline; details to be refined in a later session.

## Epics
| ID | Epic | Priority |
|---|---|---|
| E1 | Static MVP: resources to record the video (Lakebase, `data_sources`/`data_products` catalogs, dashboard, Genie agent) | **High** |
| E2 | MVP with code: incremental loading (more data may be loaded into Lakebase to test it) | Low |
| E3 | Declarative Automation Bundles for new workspaces | Low |

## Next 3 steps
1. Refine the epics and write E1 stories in a second session.
2. Choose the dataset (open point, to be studied).
3. Decide which workspace and edition to use, plus ownership and governance.

## Open actions / blockers
| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Create GitHub Project board (columns in `docs/working-agreement.md`) | PM | in progress |
| 2 | Confirm exact Summit date and epic target dates | PM | open |
| 3 | Choose the dataset | Architect | open |
| 4 | Choose workspace and edition; define ownership and governance | PM + architect | open |
| 5 | Set up Teams channel + GitHub app notifications | PM | open |
| 6 | Technical approach for E2 (sync, Change Data Feed, orchestration, simulating increments) | Architect | later |

## Risks
- Developer and architect may be reassigned to client projects within 1–2 weeks → keep all knowledge in the repo.
- PM has little time → weekly digest must be short and decision-focused.
- Dataset and workspace are undecided and block E1.
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
