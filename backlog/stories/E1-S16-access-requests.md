---
id: E1-S16
epic: E1
title: Request and approve access to data products in Catalog Manager
status: in-progress
priority: should
estimate: 3
owner: unassigned
sprint: TBD
issue: "#"
---

## User story
As a **data consumer**, I want to **request read access to a data product on the Catalog page**, and as a **data product owner** I want to **approve or reject requests and grant or remove access for users and account groups**, so that **the booth demo shows governed self-service access on Unity Catalog**.

## Context
Requested 2026-11-10. The requester was unavailable for design questions, so Copilot chose the recommended defaults recorded in [decision 0005](../../decisions/0005-access-approvals-as-approver.md):
- approvals run as the signed-in approver;
- requests can be for yourself or for an account group;
- requests are stored in a Delta table;
- approvers can also grant access directly and remove it.

Acceptance criteria were drafted by an agent; **a human must confirm them**.

## Acceptance criteria
- [x] When a data product is selected, the Catalog page shows an **Access** card with:
  - whether you can read the data product;
  - its owner;
  - a request form: for yourself or for a listed account group, with a required reason;
  - your last 20 requests, with status, who decided, when, and the decision note.
  - You can cancel your own pending request.
- [x] People who can manage grants on the table (owner, MANAGE, admin) also see:
  - **Requests to review (n)**, with Approve (optionally to another user or group, with a note) and Reject;
  - **Who can read this data product**: SELECT or ALL PRIVILEGES on the table, schema or catalog. Direct table grants can be removed, and new ones can be added with a Grant form.
- [x] Managers see an "n pending" badge in the table list.
- [x] Approve and Grant run `GRANT USE SCHEMA` and `GRANT SELECT` with the approver's token, so Unity Catalog checks and audits them as the approver. Remove runs `REVOKE SELECT` on the table. The app's own access cannot be removed.
- [x] Requests are stored in `fincrime.catalog_manager.access_requests`. The feature itself changes no data and no schema in `bronze`, `silver`, `gold` or `data_products`; the only effect there is the grants it gives or removes.
- [x] Errors are clear:
  - workspace-local `users` and `admins` → 400;
  - a group that is not in `ACCESS_GROUPS` (including `account users` unless listed) → 400, naming the allowed groups;
  - unknown user or group → 400;
  - no rights → 403 "Databricks refused this for your account";
  - duplicate pending request or a request already decided → 409;
  - missing requests table → 503.
- [x] Separation of duties (draft, **a human must confirm**):
  - nobody can approve their own request (403);
  - approvers cannot grant themselves access by approve override or direct grant (403);
  - in the review list, your own request shows a note instead of Approve and Reject.
- [x] Requests, approvals and grants accept only groups from the `ACCESS_GROUPS` list. Missing or empty configuration rejects all group requests and grants, including approvals of existing group requests. The request form offers a drop-down and hides the group option when the list is empty.
- [ ] Verified in the live app as an approver; a second, non-owner requester still to be tried.

## Technical notes
- **Server**: `server/access.ts`, registered in `server.ts`. It adds these routes under `/api/catalog`:
  - `GET access/groups`
  - `GET access/pending`
  - `GET tables/:table/access`
  - `POST tables/:table/access/requests`
  - `POST access/requests/:id/{cancel,approve,reject}`
  - `POST` and `DELETE tables/:table/access/grants`
- **Client**: `AccessCard.tsx` and `access.ts` in `client/src/pages/catalog/`, plus the badge and card placement in `CatalogPage.tsx`.
- **Identity**: GRANT and REVOKE use a per-request client built from the Apps header `x-forwarded-access-token` (scope `sql`).
  - Manager check: `` SHOW GRANTS `account users` ON <table> ``, run as the user.
  - Read check: `SELECT … LIMIT 0`, run as the user.
  - The app service principal reads and writes only the requests table; groups come from app configuration.
- **Prerequisite**: readers also need `USE CATALOG` on `fincrime`, which only the catalog owner or a MANAGE holder can grant. See the runbook.
- **Listed groups**: `ACCESS_GROUPS` in `app.yaml` (comma-separated). Missing, empty or whitespace-only values allow no groups; there is no discovery fallback. Set it explicitly in local development too. See the amendment to decision 0005.
- **Local dev**: AppKit sends the CLI profile user's token as the OBO header, so local runs act as you. `APPKIT_DEV_OBO=false` turns this off.
- **Speed**: each access GET runs 4–6 statements and takes about 2–3 s.

## Definition of Done
- [ ] Acceptance criteria met and demonstrated
- [ ] PR reviewed and merged by a human
- [x] Docs / runbook updated if needed
- [x] `HANDOVER.md` updated if status changed

## Notes / progress log
- 2026-11-10 — Copilot — workspace setup and tests:
  - Created schema `fincrime.catalog_manager` (owner Xiangyang) and granted the app service principal `USE SCHEMA`, `CREATE TABLE`, `SELECT` and `MODIFY` on it.
  - Added 41 tests (29 server, 12 client). All 100 tests, typecheck and build pass.
  - Ran it locally against dario-ws as Xiangyang. On `demo_sandbox`, these all worked:
    - the API cycle: request, cancel, reject, approve, remove, direct grant;
    - every error case;
    - the browser cycle: request, approve, remove.
  - Restored the `data_products` grants to their original state afterwards.
  - Not committed: the changes are on `story/E1-S15-data-products-schema` and must move to `story/E1-S16-access-requests`.
- 2026-11-10 — Copilot — deployed and checked live:
  - Drift check first: the live app source differed from local only by the access lines. Uploaded 7 files; deployment `01f1dcf437581a77b4e3c88730909ee4` succeeded.
  - Live API cycle as Xiangyang (approver) on `demo_sandbox` with group `daiwt2026`: request 201, pending badge count 1, approve 200 (about 5 s), grant listed, remove 200. Removing the app's own access was refused (400); a call without sign-in got 401.
  - The approve worked although the app service principal has no right to grant, so grants do run as the approver.
  - The deployed bundle contains the Access card. The live page was not opened in a browser, because that needs an interactive Databricks sign-in.
  - Restored the original grants and deleted the 7 test request rows.
  - Still open: a second, non-owner requester in the browser, and `USE CATALOG` on `fincrime` for readers (see the runbook).
- 2026-11-10 — Copilot — listed groups and no self-approval (after reviewing a teammate's proposal; the user asked to skip Lakebase and service-principal grants):
  - Added `ACCESS_GROUPS` (`daiwt2026,capgemini-gen-ai`). Approving your own request and granting to yourself are now refused. The request form uses a group drop-down.
  - 116 tests (14 new), typecheck, build, ESLint and Prettier pass.
  - Deployed `01f1dd01a72b10b6bd368825d9abcc1f` after a clean drift check. Live checks as Xiangyang on `demo_sandbox`:
    - groups list → `daiwt2026, capgemini-gen-ai`;
    - a request for `account users`, `other-team` or an email as the group → 400;
    - a request for `daiwt2026` → 201; approving it yourself → 403;
    - a direct grant to yourself → 403; to `account users` → 400.
  - The table grants were unchanged afterwards, and the test request was cancelled and deleted.
  - **Demo impact**: the presenter can no longer approve their own request, so a second person must make the request.
- 2026-11-10 — Copilot — corrected the missing/empty `ACCESS_GROUPS` fallback:
  - Removed `SHOW GROUPS` discovery; no configured groups means no group requests or grants. Personal requests still work.
  - Regression tests first reproduced the fallback, then passed for unset, empty, whitespace-only, separators-only and invalid-only configuration. They cover requests, existing approvals, recipient overrides and direct grants with no writes or grants on refusal; self-approval is checked case-insensitively and with a recipient override.
  - Validation from `catalog-manager`: `npm exec -- vitest run server\access.test.ts client\src\pages\catalog\AccessCard.test.tsx` passed (61 tests); `npm exec -- eslint server\access.ts server\access.test.ts` and `npm exec -- prettier --check server\access.ts server\access.test.ts` passed.
  - From the repo root, `databricks apps validate --path .\catalog-manager --profile dario-ws` passed type generation, AST-grep lint, typecheck, build and the full test suite.
  - Deployed `01f1dd02fe9c1a6aa2b2b67a763ffcb9` (12:34 UTC), uploading only the repaired server and its tests after a drift check. Live health was 200; unlisted-group requests/grants were 400; a listed-group request was 201; self-approval and self-grant were 403. Self-approval remained blocked with a recipient override. Grants were unchanged; the isolated validation request was cancelled, retaining its audit record.
