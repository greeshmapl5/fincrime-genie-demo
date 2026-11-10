# Catalog Manager — team live demo guide

> **Current presenter guide (2026-11-05):** Use
> [Team pre-demo and Summit video guide](./summit-team-demo.md).
> The sections below contain historical space-scoped instructions and acceptance
> notes. They are not the current script: Ask now uses Genie One MCP, and the
> export tab is named **Prepare Pages export**.

App: https://catalog-manager-7474649527621307.aws.databricksapps.com (workspace `dario-ws`)
Code: [`catalog-manager/`](../catalog-manager/) · Acceptance evidence: [acceptance-2026-10-24.md](./acceptance-2026-10-24.md)

## 1. One-line pitch
A business owner can ask questions in plain English, fix table and column descriptions, classify sensitive data, maintain the business glossary, and prepare Discover Pages in one Databricks App. Unity Catalog stays the source of truth.

## 2. Architecture

```
Browser (business owner)
   │  SSO via Databricks Apps proxy (adds user identity + OBO token headers)
   ▼
Databricks App "catalog-manager"  (AppKit: Express server + React/Vite UI)
   ├── /api/ask ──► Genie space MCP /api/2.0/mcp/genie/{space_id}   [runs AS USER]
   │                  └─► Investigations Analyst space only (its tables; no Pages)
   ├── server/catalog.ts ── /api/catalog/*, /api/glossary ──► SQL Statement API      [runs AS APP SP]
   │        └─► warehouse dea09e931a40e6e8 ► information_schema, tags, COMMENT, business_glossary
   ├── server/access.ts ── /api/catalog/access/*, /api/catalog/tables/:t/access* ──► SQL Statement API
   │        ├─► GRANT / REVOKE, SHOW GRANTS, read check                              [runs AS USER]
   │        └─► fincrime.catalog_manager.access_requests rows                         [runs AS APP SP]
   └── Pages tab (browser only) ──► downloads proposed-business-pages.md
                                     └─► human imports in Discover › Pages › Genie Code (manual)
```

| Layer | What it is | Where in code |
|---|---|---|
| UI | React + AppKit UI components and Markdown answers | `client/src/App.tsx`, `client/src/pages/*` |
| Server | Node/Express via AppKit `createApp({ plugins: [analytics(), server()] })` | `server/server.ts` |
| Ask API | User-scoped MCP SDK client, ask/poll/cancel/query actions | `server/genie-one.ts` |
| Custom API | Metadata, classification, glossary routes | `server/catalog.ts` |
| Access API | Access requests, approvals and grants ([E1-S16](../backlog/stories/E1-S16-access-requests.md)) | `server/access.ts` |
| Deploy config | Bundle resources, scopes, env mapping | `databricks.yml`, `app.yaml` |

## 3. Identity (who touches the data)

| Feature | Identity | Why it matters |
|---|---|---|
| Ask (Genie space MCP) | **Signed-in user** (forwarded OAuth token; `genie` scope) | User identity is shown; CAN RUN on the space and data permissions apply; no app-SP fallback |
| Catalog, classification, comments, glossary, governed tags | **App service principal** `ebcda4c6-…` | The SP needs `USE SCHEMA`, `SELECT`, `MODIFY` and `APPLY TAG` on `fincrime.data_products` (granted 2026-11-09; also covers `business_glossary`), plus account-level ASSIGN on governed tags. The app does **no per-user authorisation**, so anyone who can open the app can edit metadata. This is a known demo-grade gap. |
| Access card: request, approve, reject, grant, remove ([E1-S16](../backlog/stories/E1-S16-access-requests.md)) | **Signed-in user** for `GRANT`/`REVOKE` and the read and manage checks. The **app SP** only stores request rows in `fincrime.catalog_manager.access_requests`; groups come from app configuration | Unity Catalog checks each grant as the approver, so only owners, MANAGE holders and admins can approve ([decision 0005](../decisions/0005-access-approvals-as-approver.md)). Anyone signed in can request. |
| Pages | Nobody: a browser download only | Publishing is done by a human in Discover with their own rights |

## 4. Data flow per page (what to say and show)

**Home**: static cards linking to each capability.

**Ask** (`AskPage.tsx` -> `/api/ask` -> `server/genie-space.ts`)
- MCP URL is `/api/2.0/mcp/genie/<space_id>`, with the space ID taken from the app resource: Ask can only query the Investigations Analyst space.
- `query_space_<id>` starts a response; `poll_response_<id>` returns the answer, SQL and suggested questions.
- Follow-ups reuse the conversation ID; New conversation resets the UI. The tool is read-only and bypasses Unity Gateway.
- Ask does not read Discover Pages; verify Pages in Databricks Genie One.

**Catalog** (`CatalogPage.tsx` → `server/catalog.ts`; the Access card → `server/access.ts`). Browses `fincrime.data_products`, shown as "Data products"; the medallion schemas are not shown ([decision 0004](../decisions/0004-data-products-schema.md)).

| Action | Route | SQL executed |
|---|---|---|
| List tables + classification | `GET /api/catalog/tables` | `information_schema.tables` LEFT JOIN `information_schema.table_tags` (`tag_name='classification'`) |
| Columns | `GET /api/catalog/tables/:t/columns` | `information_schema.columns` + `column_tags` |
| Preview | `GET /api/catalog/tables/:t/preview` | `SELECT * FROM fincrime.data_products.<t> LIMIT 20` |
| Edit description (**Save** button) | `PUT /api/catalog/tables/:t/comment` | `COMMENT ON TABLE …` / `COMMENT ON COLUMN …` |
| Classify (**dropdown auto-saves**) | `PUT /api/catalog/tables/:t/classification` | `ALTER TABLE … [ALTER COLUMN c] SET TAGS ('classification'='PII')` or `UNSET TAGS` |
| Governed tag options | `GET /api/catalog/governed-tags` | No SQL: account `/api/2.1/tag-policies` (5-minute cache) → `system.certification_status`, `Financial Crime`, `class.*` |
| Table/column tags | `GET /api/catalog/tables/:t/tags` | `information_schema.table_tags` + `column_tags`, labelled system / governed / free-form |
| Assign / remove a governed tag (**saves immediately**) | `PUT` / `DELETE /api/catalog/tables/:t/governed-tags` | `ALTER TABLE … [ALTER COLUMN c] SET TAGS ('system.certification_status'='certified')` / `UNSET TAGS`; needs ASSIGN on the tag |
| Access card: your access, owner, your last 20 requests; for managers also requests to review and who can read | `GET /api/catalog/tables/:t/access` | As you: `SELECT * … LIMIT 0` (read check), `` SHOW GRANTS `account users` ON TABLE … `` (manage check), `SHOW GRANTS ON TABLE …`. As the app SP: owner from `information_schema.tables`, request rows |
| Request access (for yourself or a listed account group; reason required) | `POST /api/catalog/tables/:t/access/requests` | App SP: `INSERT INTO fincrime.catalog_manager.access_requests` with status `pending`. Groups must be in `ACCESS_GROUPS` |
| Approve / Reject / Cancel | `POST /api/catalog/access/requests/:id/approve` · `/reject` · `/cancel` | Approve, as you: `GRANT USE SCHEMA ON SCHEMA fincrime.data_products TO …` and `GRANT SELECT ON TABLE … TO …`; then the app SP updates the row. Refused (403) for your own request or a grant to yourself |
| Grant / Remove read access directly | `POST` / `DELETE /api/catalog/tables/:t/access/grants` | As you: the same two `GRANT`s / `REVOKE SELECT ON TABLE …` (`USE SCHEMA` stays). Grants accept users and listed groups, never yourself |
| Pending badges; group list | `GET /api/catalog/access/pending` · `GET /api/catalog/access/groups` | App SP: pending counts per table, returned only if you can manage the schema. Groups come only from `ACCESS_GROUPS`; missing or empty configuration allows no groups |

Levels: Public / Internal / Confidential / PII / Restricted. These are real Unity Catalog tags, so they show up in Catalog Explorer, search and governance tooling.

Safety: identifiers are allow-listed (`^[A-Za-z0-9_]+$`), values are parameterised and comments are escaped.

**Glossary** (`GlossaryPage.tsx` → `/api/glossary`)
- Delta table `fincrime.data_products.business_glossary` (`GLOSSARY_SCHEMA_NAME`, default `SCHEMA_NAME`), also listed in Catalog. Startup runs `CREATE TABLE IF NOT EXISTS`; the app SP has no `CREATE TABLE` there, so the schema owner created the table (2026-11-10). The existing terms were copied from `fincrime.gold.business_glossary`, which the app no longer writes.
- Save = delete by `lower(term)` then insert (case-insensitive upsert). Delete = `DELETE … WHERE lower(term)=…`.
- The glossary table remains in the curated Genie space, and Ask queries it through the Genie space MCP.
  Saving a row does not guarantee discovery or ontology ingestion. Publish the term
  as a Page and verify a citation to demonstrate governed business context.

**Pages** (`PagesPage.tsx`, `pages-export.ts`: browser-only)
- Select terms → enter an existing Discover domain → review the preview → confirm there is no sensitive content → download Markdown plus a Genie Code import prompt.
- Owner fields and data rows are stripped and Markdown is escaped. There is no publishing API call: no documented public Pages CRUD API was identified.
- In Databricks: **Discover › Pages › Create page › Genie Code › Bulk import pages** → a human reviews and publishes → **Genie One** (not the space-scoped Ask) can cite the Page.

## 5. Deployment model (30-second explanation)
- `databricks.yml` retains app resources `sql-warehouse` (CAN_USE) and `genie-space` (CAN_RUN), plus `user_api_scopes: [sql, dashboards.genie, genie]`. Ask uses the space resource's ID.
- `app.yaml` runs `npm run start` and maps those resources to env vars.
- Deploy: `databricks bundle deploy -p dario-ws` then `databricks apps deploy` (or `bundle run`). Databricks builds and hosts the app and handles SSO. No servers or secrets in the repo.

## 6. Demo script (~15 min)

| # | In the app | Then show in the workspace | Talking point |
|---|---|---|---|
| 1 | Home | Compute › Apps › catalog-manager (resources, SP, scopes) | Governed app, no extra infra |
| 2 | Ask: "What does Concentration of transfers mean in the Financial Crime domain? Explain 0.94 and cite the published Page." | Open the answer's Page citation | Ontology context, runs as *me* |
| 3 | Follow-up: "Using that definition, show the top 3 customers by top_onward_counterparty_share in fincrime.gold.structuring_candidates." | Expand query details / Explore in Databricks | Conversation context + data |
| 4 | Catalog › `demo_sandbox` › edit description › **Save** | Catalog Explorer › `fincrime.data_products.demo_sandbox` › About | Real UC comment |
| 5 | Classify column `national_id` as **PII** (saves on select) | Catalog Explorer › Columns › tags | Real UC tag, usable for ABAC/masking |
| 6 | Catalog › `demo_sandbox` › **Access**: a second person (not the presenter) requests read access for group `daiwt2026` with a reason. The presenter then **Approves** it under **Requests to review**. Optionally show that the requester's own view has no Approve button | Catalog Explorer › `demo_sandbox` › Permissions: `daiwt2026` has SELECT | Self-service access with separation of duties: only listed groups, nobody approves their own request, and the grant runs as the approver, so Unity Catalog decides whether they may grant it |
| 7 | Glossary: add term "Demo term" | SQL editor: `SELECT * FROM fincrime.data_products.business_glossary` | Delta table, versioned |
| 8 | Explain that a glossary row is not a published Page | — | Business context needs reviewed publication |
| 9 | Pages: select terms → domain → confirm → download | Discover › Pages › Genie Code bulk import (if Beta enabled) | Human-in-the-loop publishing |
| 10 | Clean up: delete demo term, reset classification and description. In **Access**, **Remove** `daiwt2026`, then run `` REVOKE USE SCHEMA ON SCHEMA fincrime.data_products FROM `daiwt2026` `` | — | Leave the workspace clean |

## 7. Pre-demo checklist (T-30 min)
```powershell
databricks auth login --profile dario-ws          # if token expired
databricks apps get catalog-manager -p dario-ws   # compute_status must be ACTIVE
databricks apps start catalog-manager -p dario-ws # if STOPPED
```
- Open the app once in a browser (accept the consent screen) and ask one warm-up question, because the warehouse may need to start.
- Confirm you can open Discover › Pages and have a domain. If not, show only the download step.
- Catalog shows only `fincrime.data_products`: snapshot copies of the gold data sets plus `demo_sandbox`, built by [`src/06_build_data_products.py`](../src/06_build_data_products.py). Run it with `reset_metadata = true` to restore descriptions, tags and the sandbox before the demo; rerun it after the gold notebook or decision changes, because the copies do not refresh themselves.
- Access card: `demo_sandbox` has no pending request and `daiwt2026` has no grant on it. The approving presenter must own the table or hold MANAGE; only they see **Requests to review**. A second signed-in person must make the request, because nobody can approve their own. That person can file the request just before the demo. Readers also need `USE CATALOG` on `fincrime` ([runbook](./runbook.md), section 1).

## 8. Known limitations (say them before someone asks)
- The classification dropdown **saves immediately**. The grey Save button applies only to the description.
- Write actions (description and classification) were only acceptance-tested on managed tables. `alerts`, `structuring_candidates`, `counterparty_network` and `data_as_of` are **views** (the app issues `ALTER TABLE`/`COMMENT ON TABLE`), so don't edit them live.
- Metadata edits run as the app SP and are not authorised per user (fine for a demo, not for production).
- Access approvals run as the approver, but the 20-row **preview still runs as the app SP**, so people without SELECT still see preview rows ([decision 0005](../decisions/0005-access-approvals-as-approver.md)).
- Remove revokes only the table `SELECT`; `USE SCHEMA` stays. The app never grants `USE CATALOG`.
- The Access card takes about 2 s to load and Approve about 5 s. Anyone signed in can file a request, but only for themselves or a group in `ACCESS_GROUPS` (`daiwt2026`, `capgemini-gen-ai`).
- Governed tag changes need ASSIGN on each tag for the app SP. Not granted as of 2026-11-06, so the card explains the missing grant instead of saving ([E1-S14](../backlog/stories/E1-S14-governed-tags-in-catalog.md)).
- Policy answers can merge two sections in one citation (1 of 52 acceptance checks failed).
- Browser UI flows and the Discover Pages import and publish steps have **not** been verified end-to-end.
- Pages is an account-level Beta and may be replicated globally, so never export PII.

## Space-scoped Ask (2026-10-29)

Ask was switched from Genie One to the Genie space MCP so it answers only from the
Investigations Analyst space. Verified: typecheck and 24 tests pass; the space MCP
returned the status-count answer and SQL in the shape the app maps. **Not verified
end to end:** the deployed app returned 403 ("required scopes: genie") because the
forwarded token still carried the earlier consent (`ai-gateway`, `sql`). A user
must sign in through a browser and re-consent (or revoke the earlier consent) so the
token includes `genie`, then retest Ask.

## Genie One migration acceptance (2026-10-28, superseded for Ask)

Ask now uses `system.ai.genie_one_mcp`, not the old Beta MCP or the Genie space
Conversation API. Tested through the deployed app's `/api/ask` route with
authenticated Apps proxy headers, not only a direct MCP call.

- Identity endpoint: `xiangyang.guo@capgemini.com`, mode `on-behalf-of-user`;
  no token returned. Live app scopes read back as `sql` and `ai-gateway`.
- Asked: "What is the published definition of Concentration of transfers in
  the Financial Crime domain? Explain the 0.94 example and cite the published
  Discover Page. Do not use the glossary table as a substitute."
- Completed answer: "Concentration is the share of a customer's transfers out,
  over the last 14 days, that went to the single largest recipient, from 0 to 1."
  It also returned: "A value of 0.94 means 94 percent of the money sent by
  transfer went to one recipient."
- Citation: [Concentration of transfers](https://dbc-417d24d1-5086.cloud.databricks.com/one/discover/pages/901ecc5d-b8ea-4997-a022-305bdec418f5?o=7474649527621307).
- [Explore in Databricks](https://dbc-417d24d1-5086.cloud.databricks.com/one/chat/threads/8b02c3825f194d6984c998ae595e3526?o=7474649527621307&utm_source=genie_chat_mcp).
- Conversation `8b02c3825f194d6984c998ae595e3526`;
  response `d57cc001c3a94122b10a914700dfe830`.
- Health, catalog list and glossary reads: HTTP 200. Malformed tool action:
  HTTP 400. Removed `/api/genie/default/messages` route: HTTP 404.

Local validation from `catalog-manager`:

| Command | Result |
|---|---|
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run build` | Passed |
| `npm.cmd test` | 23 tests passed, including 14 new MCP route tests |
| `npx.cmd eslint server\genie-one.ts server\genie-one.test.ts shared\genie-one.ts client\src\pages\ask\AskPage.tsx` | No errors; three array-index-key warnings |
| `databricks apps validate -p dario-ws` | Passed, including tests |

The route tests cover missing credentials, caller-token isolation, exact MCP
URL, action allow-list, follow-up IDs, poll/cancel/query routing, Page citation
preservation, malformed upstream responses and explicit permission denial.
They do not substitute for a second-user permission test or browser acceptance.
Workspace browser automation redirected to sign-in; sign-in/consent, visual
rendering and opening the Page in a browser remain human acceptance items.
Pages creation/import/publication was not exercised; this test retrieved an
existing published Page. No new Page or glossary content was created.
# Genie One restoration (2026-11-05)

Ask now uses `system.ai.genie_one_mcp` again, superseding the space-scoped
configuration described in earlier dated sections. The signed-in user's token
is mandatory, with no service-principal fallback. The app is no longer restricted
to Investigations Analyst. Accessible published Pages can inform answers.

The deployed app's requested user scopes are `sql` and `ai-gateway`. After this
change, authorize the app again in a browser if access is denied. The initial API
check returned HTTP 403, but a retry at 09:56 UTC succeeded through the deployed
Apps proxy: ask/poll completed with a published Page citation and its distinctive
14-day / largest-recipient / 0.94 = 94% definition. Conversation:
`f3c2df5e96d244f9b8a867b466a01984`.

The migrated route was independently checked with a real user CLI OAuth token
on loopback: it completed an answer citing the published Concentration of
transfers Page and its 14-day / largest-recipient / 0.94 = 94 percent definition.
This does not substitute for testing the deployed browser user's consent.

Retest: open Ask, authorize, ask the same Page-definition question, inspect its
source citation, then repeat with a second authorized user. Workspace Genie One
and app answers may differ due to conversation context and generation.
