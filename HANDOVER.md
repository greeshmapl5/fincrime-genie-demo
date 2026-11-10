# HANDOVER

> Keep this file current. Whoever (human or agent) ends a session updates it.
> Last updated: 2026-11-10 — by Copilot (access requests: fail-closed group allowlist and no self-approval, E1-S16; glossary moved to `data_products`)

## Project in one line
Build the Databricks demo for our Summit booth (December 2026) and run the project with human + Claude agent collaboration.

## Status
- **Access requests hardened (2026-11-10, deployed; E1-S16):** After reviewing a
  teammate's proposal, the developer asked for two guardrails; Lakebase storage and
  service-principal grants were skipped on purpose.
  - Requests, approvals and grants now accept only the groups in `ACCESS_GROUPS`
    (`daiwt2026,capgemini-gen-ai` in `app.yaml`); `account users` is excluded unless
    listed. Missing, empty or whitespace-only configuration allows no groups:
    the `SHOW GROUPS` fallback has been removed, including for local development.
  - Nobody can approve their own request or grant themselves access (403).
  - The request form uses a group drop-down. Your own pending request shows a note
    instead of Approve/Reject.
  - Chosen while the developer was unavailable; recorded as an amendment to decision
    0005, which a human must confirm.
  - 61 focused access API/UI tests pass, including empty-allowlist rejection on
    requests, existing approvals, approval overrides and direct grants. Full
    `databricks apps validate --path .\catalog-manager --profile dario-ws` passed
    type generation, AST-grep lint, typecheck, build and all tests; focused ESLint
    and Prettier pass.
  - **Deployed repair** `01f1dd02fe9c1a6aa2b2b67a763ffcb9` at 12:34 UTC after a
    drift check (only `server/access.ts` and its test uploaded; app config and UI
    already matched). Live checks passed: unlisted groups rejected, a listed-group
    request accepted, self-approval refused even with a recipient override, and
    grants unchanged. The validation request was cancelled; its audit row is retained.
  - **Demo impact**: step 6 now needs a second person to make the request.
  - **Not committed**: uncommitted on `story/E1-S15-data-products-schema`.
- **Glossary moved to `data_products` (2026-11-10, deployed; E1-S15 amendment):**
  At the developer's request, the Glossary page reads and writes
  `fincrime.data_products.business_glossary`, and Catalog lists it with the 9 data
  products (10 tables). The schema owner created the table and copied the 2 gold
  terms; the app SP needs no `CREATE TABLE` there (if the startup create fails, the
  app now logs a warning and keeps serving). `fincrime.gold.business_glossary` is
  unchanged: a frozen copy that nothing reads any more. 102 tests, typecheck and
  build pass. **Deployed** `01f1dcf9919d10739441c49738acb397` (5 files after a drift
  check; Ask files untouched); a live test term landed only in `data_products` and
  was deleted. The Genie space Investigations Analyst now reads the glossary from
  `data_products` too (`src/05_genie_glossary_space.py`, new `--dry-run`; only the
  table entry and one instruction line changed) and answered "What does Structuring
  mean?" from there. Chosen while the developer was unavailable: keep the gold copy,
  repoint the space, list the glossary in Catalog. Confirm with decision 0004's
  amendment (action 10) and tell Greeshma (the space is in her folder). **Not
  committed**: uncommitted on `story/E1-S15-data-products-schema`, on top of `46d0673`.
- **Catalog access requests (2026-11-10, deployed; E1-S16 in progress):** The
  Catalog page has an **Access** card. Anyone signed in can request read access to
  a data product for themselves or an account group, with a reason. Owners, MANAGE
  holders and admins approve or reject requests, see who can read, and grant or
  remove access directly; the table list shows them "n pending". Grants run as the
  signed-in approver with their forwarded token (decision 0005, **proposed**); the
  app SP only stores requests in the new schema `fincrime.catalog_manager` (the app
  SP has `USE SCHEMA`, `CREATE TABLE`, `SELECT`, `MODIFY` there). 41 new tests (100
  total), typecheck and build pass. Local API and browser cycles and a live API
  cycle passed as the approver; the live approve proved grants run as the user,
  because the app SP cannot grant. **Deployed** `01f1dcf437581a77b4e3c88730909ee4`
  (7 files after a drift check; Ask files untouched). Original grants restored and
  test requests deleted. **Open:** a second, non-owner user in the browser; readers
  need `USE CATALOG` on `fincrime` (action 12); the preview still runs as the app SP.
  **Committed locally** in `46d0673` on `story/E1-S15-data-products-schema` (not
  pushed); move to `story/E1-S16-access-requests`.
- **Catalog Manager availability (2026-11-10, verified):** The unavailable report
  at 09:30:42 UTC coincided with startup. Live logs show runtime starting at
  09:28:52 UTC, build success at 09:30:53 UTC and the server listening at
  09:30:55 UTC. At 09:35 UTC, compute was `ACTIVE`, app `RUNNING` and deployment
  `01f1dce939f619cf8d6fad1517e3a0a3` `SUCCEEDED`. Authenticated checks at
  09:36 UTC (no redirects): `/health` 200 `{"status":"ok"}`, `/catalog` 200,
  Catalog context 200 (`data_products`), tables 200 (9). Browser requires sign-in.
  Retained system logs do not explain an earlier shutdown; do not claim quota
  exhaustion or a 24-hour timeout as the confirmed cause. No restart, deployment,
  code or permission change was needed in this verification. Evidence and
  diagnostic commands are in [the runbook](docs/runbook.md#verified-availability-check-2026-11-10).
  No implementation was added during the availability investigation; the
  access-request feature was built afterwards (E1-S16 above).
- **Data products schema (2026-11-09, deployed; E1-S15):** No medallion in the
  demo. Created empty `fincrime.data_products` in dario-ws (owner: requester) and
  granted the app SP `USE SCHEMA`, `SELECT`, `MODIFY`, `APPLY TAG` on it.
  `bronze`/`silver`/`gold` untouched. Catalog Manager now defaults to
  `SCHEMA_NAME=data_products` (labelled "Data products") and kept the glossary in
  `gold` via new `GLOSSARY_SCHEMA_NAME` until it moved on 2026-11-10 (see above;
  decision 0004, **proposed**); `app.yaml` sets both. Catalog shows an empty-state message. 59 tests, typecheck and client
  build pass; a local run against dario-ws showed the header, empty state and the
  2 gold glossary terms. **Deployed** `01f1dc52bc1311ab9b060d683a47452e` after the app
  was restarted: uploaded only `server/catalog.ts`, `server/catalog.test.ts`,
  `CatalogPage.tsx` and `app.yaml` (live copies differed only by this story; verified
  after upload; Ask/identity files untouched). Live context returns "Data products",
  tables `[]`, glossary from gold; bundle has the empty state; Ask still
  `app-service-principal`. **Committed locally** in `46d0673` (not pushed): branch
  `story/E1-S15-data-products-schema` was cut from the S11 branch, and its two local
  commits mix the S10/S11/S14/S15/S16 work, which shares
  `catalog.ts`, `CatalogPage.tsx`, `app.yaml` and docs. **Data sets created
  (2026-11-09):** new `src/06_build_data_products.py` copies `customer_360`,
  `transactions`, `counterparties`, `case_notes`, `alerts`, `structuring_candidates`,
  `counterparty_network` and `policy_docs` from gold as snapshot **tables** (gold
  descriptions and tags copied; app tagging fails on views), plus fictional
  `demo_sandbox` (3 rows) for live edits; demo docs now use it instead of
  `smoke_test`. Ran on serverless: create, normal rerun (kept app edits) and
  `reset_metadata = true` (restored gold metadata) all succeeded; row counts equal
  gold; the live app lists all 9. Copies refresh only when 06 is rerun.
- **Catalog governed tags (2026-11-06, deployed; E1-S14 blocked on a grant):**
  Catalog has a **Governed tags** card. It lists table and column tags labelled
  System / Governed / Free-form. It assigns `system.certification_status`, the
  `Financial Crime` domain tag and `class.*` column tags; the table list marks
  certified/deprecated tables. Writes run as the app service principal (decision
  0003, **proposed**, chosen while the requester was unavailable). 28 new tests,
  typecheck, focused lint and build pass; browser checks covered keyboard focus,
  errors, empty states, 375 px and dark mode. Uploaded 8 files (hash-verified;
  no Ask/identity files) and deployed `01f1d9f0254c1b6c84b98e3b3409636c`: RUNNING,
  `/health` 200, Ask identity still `app-service-principal`, the service principal
  reads 2 table and 113 `class.*` tag policies. **Live writes on `smoke_test`
  return the app's 403 ASSIGN message for all three tag types; tags unchanged.**
  An account admin must grant ASSIGN (runbook). Committed locally in `46d0673` (not pushed).
- **Ask Markdown tables (2026-11-06, deployed):** Genie One table answers (e.g.
  alerts by status, expected monthly volume) render as tables, not raw pipes.
  `client/src/pages/ask/AnswerMarkdown.tsx` adds `remark-gfm` 4.0.1 (exact pin),
  right-aligns all-numeric columns, keeps links HTTPS-only (`safe-link.ts`) and
  wraps wide tables in a keyboard-scrollable region. Three render tests, typecheck,
  focused lint and client build pass; a preview with two captured live answers was
  checked at desktop, 375 px, dark mode and keyboard focus. Deployed without
  changing identity: the live service-principal `AskPage.tsx` was patched only to
  use the renderer, and that exact folder state was built locally before uploading
  six files (no Page source cards or per-user files). Deployment
  `01f1d9d10df31837a50398b65153ecf7` SUCCEEDED; app RUNNING, `/health` 200,
  identity still `app-service-principal`, the bundle contains the renderer, and a
  live question returned a completed table answer. Users must reload the app.
- **Ask identity mismatch found (2026-11-05, decision needed):** Live Ask runs
  Genie One as the **app service principal** (`/api/ask/identity` returns
  `mode: app-service-principal`). That version was uploaded to the workspace source
  folder and deployed at 10:41 UTC (`01f1d905…`); later deployments, including a
  teammate's unchanged 2026-11-06 08:59 UTC redeploy, kept it. Local `server/genie-one.ts`,
  `shared/genie-one.ts` and `AskPage.tsx` are the per-user (on-behalf-of) version,
  as are README, decision 0002 and `docs/summit-team-demo.md`. Do not deploy the
  identity files from either side until a human chooses the identity model;
  identity-neutral Ask fixes are patched onto the live `AskPage.tsx` (see above).
- **Discover Page source cards (2026-11-05, local only, not deployed):** Ask lists
  the Discover Pages cited in each answer as cards linking to the Page
  (`client/src/pages/ask/page-citations.ts`, 3 tests). Genie One MCP has no tool to
  list Pages, and the beta `domains` CLI API manages only domain metadata, so the
  app still cannot list every workspace Page. Held back because of the identity
  mismatch above.
- **Catalog location header (2026-11-05):** Catalog automatically displays catalog
  and schema from `/api/catalog/context`, independently of table selection/rows,
  with loading and error states. Two context tests, typecheck and client build
  pass. Only Catalog UI/server files deployed; deployment SUCCEEDED and live
  context returned `fincrime` / `gold`; `/catalog` HTTP 200 and new bundle verified.
  Ask implementation was not edited or uploaded.
- **Team/Summit presenter guide prepared (2026-11-05):** See
  `docs/summit-team-demo.md` for a 20-minute show/say/explain walkthrough,
  architecture and identity flows, code tour, 3-minute video storyboard,
  preflight/reset steps and Q&A. Corrects the supplied screenshot's obsolete
  single-space Ask, chart and per-user audit claims. Grounded in current source;
  no new live data or second-user acceptance was performed for this documentation.
  Next: rehearse exact prompts and current counts, resolve second-user access,
  then obtain human approval of recorded claims.
- **Pages label clarified (2026-11-05):** Navigation (desktop/mobile), home card,
  page heading and glossary link now say "Prepare Pages export". Route remains
  `/pages`; export behavior is unchanged. Client build passed; deployment
  `01f1d907ffa11ba29b6586f0a38f951c` SUCCEEDED, authenticated `/pages` HTTP 200,
  and new label verified in deployed JavaScript. Only the three UI files uploaded.
- **Workspace-wide Ask access check (2026-11-05):** User requires Ask for every
  workspace user while retaining caller identity. App ACL already includes the
  workspace `users` group (CAN_MANAGE; broader than query-only access, unchanged).
  Effective grants on `system.ai.genie_one_mcp` already include EXECUTE for
  `account users`, inherited from `system.ai`; do not assume the second user's
  403 means a missing service EXECUTE grant. Parent catalog/schema grant inspection
  was denied (READ METADATA), and group inspection requires admin. Per-user OAuth
  consent and parent/domain/data access remain to verify with the affected user
  and administrator. No access grants were changed or identities bypassed.
- **Ask switched back to Genie One (2026-11-05):** User approved removing the
  single-space restriction. `server/genie-one.ts` now calls `genie_ask` and
  `genie_poll_response` on `system.ai.genie_one_mcp` with each caller's forwarded
  token; no app-SP fallback. Preserves SQL, citations, partial status and deep links.
  Live user scopes are now `sql`, `ai-gateway`; resources preserved. Deployment
  `01f1d8fea26a1ffca321359b333c66ce` SUCCEEDED. Health and identity HTTP 200;
  identity reports Genie One and on-behalf-of-user. Initial HTTP 403 cleared on
  retry at 09:56 UTC: authenticated requests through the deployed Apps proxy
  completed conversation `f3c2df5e96d244f9b8a867b466a01984` and cited the published
  Concentration of transfers Page with its 14-day / largest-recipient / 0.94 = 94%
  definition. Browser UI sign-in and second-user checks remain separate follow-ups.
  Separately, a loopback-only run of the migrated route with the real user CLI OAuth
  token completed and cited published Page `901ecc5d-b8ea-4997-a022-305bdec418f5`,
  including the 14-day / largest-recipient / 0.94 = 94 percent definition.
  The loopback check proves MCP/route compatibility; the subsequent deployed
  proxy test above verifies actual app-to-MCP caller-token access.
  Typecheck, 23 tests, server/client builds and focused lint pass (existing
  index-key warning). See decision 0002 and E1-S11; second-user testing remains open.
- **UI refresh deployed (2026-11-05):** Shared blue light/dark theme, icon-labelled
  navigation, clearer home workflow cards, keyboard focus/skip link, and friendlier
  Ask starter questions, progress labels, markdown and composer. Catalog explains
  immediate classification saves; Glossary/Pages share the accent styling. No MCP,
  permissions or backend changes. Only six changed UI files were uploaded to the
  existing workspace source (no full local sync). Deployment
  `01f1d8fb646610178e8dc0d3e3784a61` SUCCEEDED; app RUNNING, authenticated home and
  health HTTP 200, refreshed home/Ask text verified in the deployed JS bundle.
  Typecheck, 24 tests and client production build pass. Focused App/Ask ESLint has
  no errors (existing index-key warning); broader page lint still reports existing
  Catalog/Glossary unsafe JSON and async-handler issues. Controlled-response browser
  checks passed starter/focus, polling/answer/SQL/identity, 403 display, reset,
  mobile navigation and dark mode without horizontal overflow. These checks do
  not establish real Genie query acceptance; browser re-consent remains to verify.
- **App availability restored (2026-11-05):** Redeployed the existing workspace
  source without syncing local files or changing permissions. Deployment
  `01f1d8fa003811ac9b03c8d83e179e8d` SUCCEEDED at 09:21 UTC; app RUNNING,
  compute ACTIVE. Authenticated `/health` returned HTTP 200 `{"status":"ok"}`;
  `/` returned HTTP 200. The earlier failure's exact cause remains unconfirmed:
  retry succeeded without an ACL change, so the missing explicit source-folder
  grant alone did not establish the cause. Ask and full UI acceptance were not retested.
- **App availability investigation (2026-11-05):** Catalog Manager's public URL
  responds with HTTP 302 to Databricks sign-in, but authenticated requests return
  502 in runtime logs. After OAuth reauthentication, CLI confirmed compute ACTIVE,
  app UNAVAILABLE: deployment `01f1d8f6b53b15769201a516136a5038` failed at
  08:55 UTC with "Error downloading source code ... no files found".
  The original workspace source folder still contains files; the failure references
  its app-owned deployment snapshot. Check snapshot/source permissions and retry
  deployment from the verified source; missing files versus permissions is not yet
  distinguished. Source folder ACL (directory `958251023971296`) shows only the
  owner's inherited CAN_MANAGE and the admins group's inherited CAN_MANAGE; no
  explicit app service-principal grant appears. Verify effective access and grant
  CAN_READ on the source folder if needed before retrying deployment.
  No restart, permission change, or deployment was performed.
- **Ask limited to the Genie space via MCP (2026-10-29):** Branch `story/E1-S11-genie-one` now
  uses the Genie Agent MCP `/api/2.0/mcp/genie/{space_id}` as the signed-in user, restricted to
  the Investigations Analyst space (Genie One was tried first and replaced; it is not space-scoped
  and Page citations were proven on it earlier). Deployed to dario-ws with scopes `sql`,
  `dashboards.genie`, `genie`. Typecheck and 24 tests pass; the space MCP response shape was
  checked live. **Blocked on a browser re-consent:** the deployed app gets 403 "required scopes:
  genie" until the user re-consents. Metadata writes still run as the app SP with no per-user
  audit. The old Beta MCP endpoint ends 2026-11-30; confirm the space-scoped one is unaffected.
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
1. E1-S15 and E1-S16: a human confirms decisions 0004 (with its glossary amendment) and 0005 (with its listed-groups and separation-of-duties amendment) and accepts the deployed Catalog (9 data products plus the glossary, Access card). Acceptance includes a second, non-owner user making a request in the browser that the owner then approves, since nobody can approve their own request.
2. E1-S13: a domain owner imports and publishes an exported term in Discover Pages.
3. E1-S11: human-test the Ask UI, sign-in/consent and a second user.
(Stories are in `backlog/stories/`. The S10/S11/S14/S15/S16 work sits in two local, unpushed commits on `story/E1-S15-data-products-schema` (`b5484a2` "changes to the app", `46d0673` "new changes", 2026-11-10), with the glossary move uncommitted on top; split it into one `E1-Sx:` commit and PR per story before pushing.)

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
| 8 | Choose the Ask identity model (app service principal live vs per-user in repo), then align source, workspace folder and docs | PM + architect | open |
| 9 | Grant ASSIGN on `system.certification_status`, `Financial Crime` and needed `class.*` tags to `app-2a3ty8 catalog-manager` (UI, notebook `scripts/grant_governed_tag_assign.py` or `scripts/grant-governed-tag-assign.ps1`; both tested up to the admin-only permission read on 2026-11-09); confirm decision 0003 and E1-S14 criteria | Account admin (likely the Free Edition account owner) + PM | open |
| 10 | Confirm decision 0004 and its 2026-11-10 amendment (Catalog and glossary in `data_products`; `gold.business_glossary` kept as a frozen copy) and the changed E1-S15 criteria. The Genie space now reads all 8 tables, including the glossary, from `data_products`; align or revert its other instructions, example SQL and benchmarks (still `gold`) | PM + architect + Greeshma (the space is in her folder) | open |
| 11 | Confirm decision 0005 (access grants run as the signed-in approver) and its amendment (only `ACCESS_GROUPS` groups; no self-approval), plus the E1-S16 criteria; test a request with a second, non-owner user | PM + architect | open |
| 12 | Grant readers `USE CATALOG` on `fincrime` (`` GRANT USE CATALOG ON CATALOG fincrime TO `account users` ``) or confirm they have it; approved readers cannot query without it | Catalog owner (Greeshma) or Dario (MANAGE) | open |

## Risks
- Free Edition apps run for up to 24 hours after start/update/redeploy and may
  also be affected by fair-usage limits. Capture status/logs before restarting;
  check authenticated health before a demo. The 2026-11-10 earlier-stop cause is
  not established.
- Pages is account-level Beta; availability, domain access, import, and publication require
  verification by an authorized user. No PII, regulated data, or sensitive information
  may be included in exported Page content.
- Developer and architect may be reassigned to client projects within 1–2 weeks → keep all knowledge in the repo.
- PM has little time → weekly digest must be short and decision-focused.
- Dataset and workspace are undecided and block E1; current workspace also blocks Agent Bricks deployment.
- E2 and E3 are low priority and may slip.
- Two certification signals: free-form `certified=true` (set by `src/02_build_gold_data_products.py`) and the governed `system.certification_status`. Decide which one the demo uses.
- `fincrime.data_products` holds snapshot copies. Since 2026-11-10 (space updated 09:53 UTC; who changed it is not recorded) the Genie space Investigations Analyst reads its 7 data tables from `data_products`, and since the glossary move (11:29 UTC, by Copilot) also the glossary; `gold.business_glossary` no longer receives new terms. The space's other instructions, 3 example SQL queries and 25 benchmarks still name `fincrime.gold.*`. `gold.alerts` is a live view over the Lakebase decisions, but `data_products.alerts` is a snapshot, so new investigator decisions reach Genie answers only after `src/06_build_data_products.py` is rerun (rerun it after `02` too).
- Catalog's 20-row preview runs as the app SP, so people without SELECT on a data product still see sample rows; access approvals only govern their own queries (decision 0005; follow-up with E1-S12).

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
