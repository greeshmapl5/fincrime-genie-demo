# 0005 — Access requests: approvals run as the approver, requests in a Delta table
- Date: 2026-11-10
- Status: proposed
- Deciders: PM + architect (to confirm); chosen by Copilot while the requester was unavailable

## Context
E1-S16 lets users request read access to a data product on the Catalog page, and lets owners approve, reject, grant and remove access. Open questions were:
- whose identity runs `GRANT`;
- who may approve;
- who can receive access;
- where requests are stored.

## Decision
- **Identity**: `GRANT` and `REVOKE` run with the signed-in user's token (Databricks Apps user authorization, `sql` scope). The app service principal gets no MANAGE.
- **Approvers**: anyone Unity Catalog allows to see other principals' grants on the table, meaning the owner, a MANAGE holder or an admin. The app keeps no approver list.
- **Grantees**: the requester or an account group. Workspace-local `users` and `admins` are refused. An approver can change the grantee.
- **Grants**: approving grants `USE SCHEMA` on the schema and `SELECT` on the table. Remove revokes only the table `SELECT`.
- **Storage**: requests are rows in `fincrime.catalog_manager.access_requests` (Delta), written by the app service principal. Because this is a separate schema, the medallion layers and the data products stay untouched.

## Consequences
- **Least privilege**: Unity Catalog decides who may grant and audits the person, not the app. This differs from [0003](0003-governed-tag-writes-app-sp.md) on purpose, because access changes carry more risk than tags.
- **USE CATALOG**: readers also need `USE CATALOG` on `fincrime`. Only the catalog owner or a MANAGE holder can grant it, once.
- **Preview gap**: the data preview and other Catalog reads still run as the app service principal, so people without SELECT still see preview rows. Follow-up: run the preview as the user (with E1-S12).
- **Remove**: removing access leaves `USE SCHEMA` in place. That is harmless without SELECT, and other tables may need it.
- **Request rows**: anyone signed in to the app can create requests. The requester and decider names come from the identity that Databricks Apps forwards.
- **Native requests**: Unity Catalog's own "Request access" (Public Preview) has no API to list or approve requests. Later, its destination could point to this app.
- **Alternatives rejected**:
  - grants run by the app service principal with MANAGE, which would let any app user grant;
  - a Lakebase table for requests, which is an extra resource;
  - a ticketing or Workflows integration, which is too much for the demo.
