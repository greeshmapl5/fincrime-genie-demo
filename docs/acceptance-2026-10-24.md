# Catalog Manager acceptance test report

## Verdict

**Not fully accepted.** Current live API testing produced **51 passes and one
failure across 52 checks**. Local typecheck, nine unit tests, production build,
and focused Pages ESLint passed. Current interactive browser acceptance and
Discover Pages publication remain unverified.

Tested on 2026-10-24 against:

- Workspace: `dario-ws`
- App: https://catalog-manager-7474649527621307.aws.databricksapps.com
- Restart deployment: `01f1cfd7ecc71d67a30914fcb468f818`
- Source branch: `story/E1-S10-discover-pages`
- Authenticated caller: existing Databricks CLI OAuth profile
- Access path: real deployed HTTPS APIs, not local mocks

This is a functional acceptance exercise, not a security audit, load test, or
multi-user authorization certification. API success is not browser UX evidence.

## Environment recovery

The first status query reported app `UNAVAILABLE` and compute `STOPPED`, with
"App compute was stopped due to workspace or account status."
`databricks apps start catalog-manager --profile dario-ws --timeout 3m`
successfully restored compute and initiated a snapshot deployment of the configured
workspace source. Health and final status confirmed the app was running.
No local source changes were deployed as part of this test.

## Live checks: 52 total, 51 passed, one failed

### Availability and catalog: checks 1-30

| Check | Exact assertion | Result |
|---|---|---|
| 1 | Authenticated `/health` returns HTTP 200 and `status: ok` | PASS |
| 2-6 | `/`, `/ask`, `/catalog`, `/glossary`, `/pages` each return HTTP 200 and HTML | PASS, 5 checks; not proof of UI rendering |
| 7 | `/api/catalog/tables` returns a nonempty array; every entry has a table name and classification field | PASS, 11 tables |
| 8 | Classification levels equal Public, Internal, Confidential, PII, Restricted | PASS |
| 9-30 | For each table below: columns return a nonempty array with name, type, comment and classification; preview returns an array of at most 20 rows | PASS, 22 checks |

| Table in `fincrime.gold` | Columns verified | Preview rows verified |
|---|---:|---:|
| alerts | 8 | 20 |
| business_glossary | 6 | 1 |
| case_notes | 5 | 20 |
| counterparties | 2 | 20 |
| counterparty_network | 7 | 20 |
| customer_360 | 9 | 20 |
| data_as_of | 1 | 1 |
| policy_docs | 4 | 12 |
| smoke_test | 3 | 2 |
| structuring_candidates | 19 | 7 |
| transactions | 9 | 20 |

These checks cover response shape, availability and the 20-row cap. They do not
independently establish the correctness of every source value or every comment.

### Writes, persistence, and validation: checks 31-39

| Check | Exact operation and assertion | Result |
|---|---|---|
| 31 | Change `smoke_test` table comment to a test description containing apostrophe, double quotes, and backslash; read back exact value; restore and read back original | PASS |
| 32 | Set table classification to Internal; read back; remove tag; read back null; restore original classification if present | PASS |
| 33 | Repeat comment write/read/restore for `smoke_test.national_id` | PASS |
| 34 | Repeat classification set/read/remove/restore for `smoke_test.national_id` | PASS |
| 35 | Create a uniquely named glossary term with definition, related table/column and owner; read definition; upsert with uppercase term and updated definition; verify one case-insensitive match, new definition and timestamp; delete and verify absence | PASS |
| 36 | Preview request with invalid table identifier `not-a-table` returns HTTP 400 | PASS |
| 37 | Classification value `INVALID` returns HTTP 400 | PASS |
| 38 | Numeric comment instead of string returns HTTP 400 | PASS |
| 39 | Glossary create without definition returns HTTP 400 | PASS |

The prior live `APPLY TAG` permission blocker is resolved for the smoke-test
table and column. This does not prove tag permissions on every other table.
Original comments were restored and verified. Both classification tags were
removed after testing; originals were restored if present. The unique glossary
test term was deleted and its absence verified. No pre-existing glossary term
was overwritten.

### Genie transport and answers: checks 40-52

| Check | Question / assertion | Result |
|---|---|---|
| 40 | "How many alerts are there by status?" returns final message, generated SQL and query-result events | PASS |
| 41 | Follow-up "Show only the Open alerts." returns a completed answer in the existing conversation | PASS |
| 42 | "Which customers are structuring candidates?" returns a final answer | PASS |
| 43 | "What does structuring mean in our business glossary and who owns it?" returns a final answer | PASS |
| 44 | "How soon must I submit an expense reimbursement request?" returns a final answer | PASS |
| 45 | "What does our policy say I must do if I lose my passport while traveling?" returns a final answer | PASS |
| 46 | Inspect first query result: SUCCEEDED, Open 29, Escalated 20, Closed - false positive 20; narrative agrees with those values | PASS |
| 47 | Inspect follow-up: same conversation ID, 29 rows, every returned status equals Open | PASS |
| 48 | Inspect candidates SQL: queries curated `fincrime.gold.structuring_candidates`; narrative says seven candidates, matching the seven-row live preview | PASS |
| 49 | Inspect glossary answer: queries business_glossary, mentions 10,000 SEK threshold and AML team ownership | PASS |
| 50 | Inspect reimbursement answer: 30 calendar days and source naming Expense Reimbursement Policy / Submission deadline | PASS |
| 51 | Require separate `Source:` line for every policy section used | **FAIL** |
| 52 | Inspect unsupported passport question: declines guidance, cites Policy scope, does not invent embassy/police instructions | PASS |

Checks 40-45 establish transport/completion only; checks 46-52 examine the
specific semantics listed. They do not certify all narrative statements.
For example, the candidates answer included additional account-age/time-window
claims that were not independently validated here.

**Observed citation defect (check 51):**

```text
Source: Expense Reimbursement Policy, section Submission deadline and section Late requests.
```

The deadline and policy references are correct, but two sections were combined
into one source line rather than separate citations as required by the existing
policy instructions. This is a formatting failure, not a missing answer.
No instruction changes or fixes were made during this acceptance run.

## Local checks performed again

Run from `catalog-manager`:

| Command | Current result |
|---|---|
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test` | PASS: 2 files, 9 tests |
| `npm.cmd run build` | PASS, server and client |
| `npx.cmd eslint client\src\pages\pages\pages-export.ts client\src\pages\pages\pages-export.test.ts client\src\pages\pages\PagesPage.tsx` | PASS |

Non-fatal output included existing npm configuration warnings, stale Browserslist
data, a Node deprecation notice and a large client bundle warning. Full-repository
ESLint was not rerun; the lint result above is scoped to the Pages implementation.

The nine unit tests consist of:

1. Export includes definitions, domain, provenance and suggested assets without claiming publication.
2. Owner and extra API fields are stripped from exported terms.
3. Markdown/HTML and line breaks cannot introduce document sections.
4. Missing selection/domain/definition and invalid response shapes are rejected.
5. Missing optional assets are handled and only supplied terms are exported.
6. Import prompt preserves definitions and requires draft review before publication.
7. Template plugin context records its registered route.
8. Template streaming example emits events in order.
9. Template HTTP example boots and returns its greeting.

The last three are scaffold examples, not Catalog Manager feature acceptance tests.

## Blocked or not performed in this run

Browser navigation to the live app was attempted twice. The shared browser tool
timed out, including a no-response timeout. No browser result is counted as a pass.
The shared original tab pointed to a stopped local preview, not the deployed app.

| Area | Remaining acceptance work |
|---|---|
| Sign-in / consent | Fresh browser login, SQL/Genie authorization prompts, expired-session behavior |
| Navigation | Render every page; desktop and mobile menus; refresh/deep links in an authenticated browser |
| Catalog UI | Select tables, edit/save descriptions, inspect previews, verify loading/empty/error UX |
| Classification UI | Use the selectors; disabled/loading state and errors; permissions on non-test tables |
| Glossary UI | Form validation, add/update/delete buttons, error UX, unsaved/repeated submissions |
| Ask UI | Type questions, watch streaming, inspect SQL/results, follow-up and reset/history controls |
| Pages UI | Real glossary selection, domain/review gates, actual downloaded file from the deployed browser |
| Pages publication | Domain access, import in Genie Code, duplicates/conflicts, draft review, publication |
| Genie One | Verify actual published Page retrieval and clickable citations |
| Integration loop | Create a new glossary term and ask Genie about that new term before deleting it |
| Permissions | A second non-admin business-user identity, denial behavior, multi-user isolation |
| Reliability | Concurrent edits, interrupted writes, SQL polling/chunked large results, load/accessibility tests |

Earlier Pages browser tests with controlled responses are documented in the app
README, but were not repeated successfully in the deployed browser today.

## Next actions

1. Reconnect browser automation or perform the browser checklist with a business owner.
2. Correct and retest policy citation formatting before claiming that criterion passes.
3. Complete actual Pages import/publication and Genie One verification under an authorized domain.

The API-level results are positive, but the application must not be labeled
"all functions acceptance-tested" until the failed and blocked checks are resolved.
