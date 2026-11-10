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
  - a request form: for yourself or for an account group, with a required reason;
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
  - unknown user or group → 400;
  - no rights → 403 "Databricks refused this for your account";
  - duplicate pending request or a request already decided → 409;
  - missing requests table → 503.
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
  - The app service principal reads and writes only the requests table and lists groups.
- **Prerequisite**: readers also need `USE CATALOG` on `fincrime`, which only the catalog owner or a MANAGE holder can grant. See the runbook.
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
