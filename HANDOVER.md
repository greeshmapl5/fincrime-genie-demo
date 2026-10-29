# HANDOVER

> Keep this file current. Whoever (human or agent) ends a session updates it.
> Last updated: 2026-10-28 — by Copilot (Genie One MCP migration)

## Project in one line
Build the Databricks demo for our Summit booth (December 2026) and run the project with human + Claude agent collaboration.

## Status
- **Ask migrated to Genie One MCP:** Branch `story/E1-S11-genie-one` replaces the
  AppKit Genie space chat with user-scoped `system.ai.genie_one_mcp` via Unity
  Gateway. Deployed to dario-ws with `sql` and `ai-gateway` user scopes. Missing
  user tokens fail closed; no app-SP fallback, shared clients, or conversation
  cache. Live `/api/ask/identity` reports the signed-in user. Ask returned the
  published Financial Crime "Concentration of transfers" Page citation and its
  distinctive 14-day / largest-recipient / 0.94 = 94 percent definition.
  See `docs/demo-catalog-manager.md` for evidence. Local tests: 23/23 pass;
  typecheck, production build and apps validation pass. Focused lint has no
  errors (three array-index-key warnings). Browser sign-in/consent remains
  unverified; users may need to consent to the new scope. Dependency audit
  reports 34 advisories; no blanket upgrades were made. Metadata writes still
  run as app SP, without user-attributed change history. Earlier uncommitted
  Pages/logo changes were preserved; no commits, push or merge performed.
- **Acceptance testing:** See `docs/acceptance-2026-10-24.md`. Restarted stopped app
  compute successfully. Live API suite: 51 passes / 1 failure across 52 checks.
  Classification table/column set/read/remove now works on `smoke_test`.
  Failed criterion: separate policy citation lines per section. Browser automation
  timed out, so UI workflows and actual Discover Pages publication remain unverified.
  No full acceptance claim; test comments/tags were restored and the temporary term deleted.
- **Phase:** E1 planning and demo preparation. Story 9's fictional policy source and Agent Bricks setup/evaluation instructions are drafted in this branch.
- **Board:** GitHub Project being created by the PM; deliberately not updated yet.
- **Story 9 (#6):** In review. Knowledge Assistant is retired in dario-ws and mydev-ws, so the policy chatbot is built as a Genie Agent: the "Investigations Analyst" space in dario-ws now includes `fincrime.gold.policy_docs` (`src/03_policy_docs.py`, `src/04_genie_policy_space.py`). Deadline, late-request, out-of-scope and escalation questions pass with section-level citations. Supervisor criterion untested. Awaiting human acceptance.
- **Demo scope:** E1 includes Genie and an Agent Bricks policy assistant; a combined supervisor remains optional.
- **Catalog Manager / Pages:** Branch `story/E1-S10-discover-pages` adds a selected-glossary-term
  export and a guided Discover Pages / Genie Code import workflow. It is not live
  Pages CRUD, automatic publication, or two-way synchronization. Official docs describe
  reviewed bulk import; no public Pages CRUD API was identified in the docs or installed
  CLI/SDK. See `catalog-manager/README.md` for steps and governance limits.
  Local typecheck, six export tests, focused ESLint, production build, and Databricks
  app validation passed. Browser checks used controlled glossary responses and verified
  selection/review gates, export Blob content, empty/error states, and review reset.
  Deployment retried successfully on 2026-10-23 after authentication was restored.
  Verified RUNNING state, health `ok`, HTTP 200 on `/pages`, Pages workflow content
  in the deployed JavaScript bundle, and successful live glossary read (one term).
  No Discover Pages were created or published; import remains a human-reviewed step.

## Epics
| ID | Epic | Priority |
|---|---|---|
| E1 | Static MVP: resources to record the video (Lakebase, `data_sources`/`data_products` catalogs, dashboard, Genie agent) | **High** |
| E2 | MVP with code: incremental loading (more data may be loaded into Lakebase to test it) | Low |
| E3 | Declarative Automation Bundles for new workspaces | Low |

## Next 3 steps
1. E1-S13: a domain owner imports and publishes an exported term in Discover Pages.
2. E1-S11: human-test the Ask UI, sign-in/consent and a second user.
3. E1-S12: user-attributed metadata audit and edit authorization.
(Stories are in `backlog/stories/`; split the S10/S11 commit before the PR.)

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
- Pages is account-level Beta; availability, domain access, import, and publication require
  verification by an authorized user. No PII, regulated data, or sensitive information
  may be included in exported Page content.
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
