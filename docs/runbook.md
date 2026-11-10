# Runbook

How to set up, run and troubleshoot the demo. Written so a new person can follow it cold.

> Never write secret values here. Name them and say where they are stored.

## 1. Access checklist
| System | Who grants access | Status |
|---|---|---|
| GitHub repo (this one) | PM | _TBD_ |
| Databricks workspace | _TBD_ | _TBD_ |
| Claude Code subscription | own company licence | _TBD_ |
| Teams channel | PM | _TBD_ |
| ASSIGN on governed tags for the Catalog Manager app service principal `app-2a3ty8 catalog-manager` ([E1-S14](../backlog/stories/E1-S14-governed-tags-in-catalog.md)) | Account admin | Not granted (rechecked 2026-11-09); UI steps, notebook [`scripts/grant_governed_tag_assign.py`](../scripts/grant_governed_tag_assign.py) or CLI [`scripts/grant-governed-tag-assign.ps1`](../scripts/grant-governed-tag-assign.ps1) |
| `USE SCHEMA`, `SELECT`, `MODIFY`, `APPLY TAG` on `fincrime.data_products` for `app-2a3ty8 catalog-manager` ([E1-S15](../backlog/stories/E1-S15-data-products-schema.md)) | Schema owner | Granted 2026-11-09 |
| `USE SCHEMA`, `CREATE TABLE`, `SELECT`, `MODIFY` on `fincrime.catalog_manager` (access-request table) for `app-2a3ty8 catalog-manager` ([E1-S16](../backlog/stories/E1-S16-access-requests.md)) | Schema owner | Granted 2026-11-10 |
| `USE CATALOG` on `fincrime` for data product readers, once: `` GRANT USE CATALOG ON CATALOG fincrime TO `account users` `` ([E1-S16](../backlog/stories/E1-S16-access-requests.md)) | Catalog owner or a MANAGE holder (Dario has MANAGE) | Unknown: catalog grants are hidden from non-owners |

## 2. Local setup
```bash
git clone https://github.com/dariocapgemini-droid/Daiwt2026.git
cd Daiwt2026
gh auth login        # GitHub CLI, needed for agents to read/update issues and PRs
claude               # run Claude Code from the repo root
```
_Add demo-specific setup (CLI, Python env, Databricks profile) as it is defined._

## 3. Run the demo
_TBD — numbered steps from cold start to finished demo._

For the Agent Bricks policy assistant setup and evaluation procedure, see [`demo/agent-bricks/README.md`](../demo/agent-bricks/README.md). A workspace with Agent Bricks deployment support is required.

## 4. Record the demo video
_TBD — tool, resolution, script, where the final file is stored._

## 5. Troubleshooting
| Symptom | Likely cause | Fix |
|---|---|---|
| Catalog › Governed tags: "The app's service principal is not allowed to assign the governed tag …" | The app service principal lacks ASSIGN on that tag policy. (It also needs `APPLY TAG` on the schema, a normal SQL `GRANT`, already granted on `data_products`.) | ASSIGN has no SQL `GRANT`; an account admin grants it in one of three ways: (1) **Catalog › Govern › Governed Tags**, open `system.certification_status`, `Financial Crime` or the `class.*` tag › **Permissions** › grant ASSIGN to `app-2a3ty8 catalog-manager` (the **Account Permissions** tab covers every governed tag, broader); (2) import and run the notebook `scripts/grant_governed_tag_assign.py` in the workspace, no CLI needed; (3) `.\scripts\grant-governed-tag-assign.ps1 -AccountId <ACCOUNT_ID> -Profile <PROFILE> -DryRun`, then without `-DryRun`. Both scripts add the app to `roles/tagPolicy.assigner` on `system.certification_status`, `Financial Crime` and `class.se_personnummer` by default and keep existing grants. Run them with dry run first. Retry after a minute. |
| Catalog › Access: "Open the app through Databricks Apps and sign in so it can act as you." (401) | No user token was forwarded: the app was called outside the Apps proxy, or user authorization (`sql` scope) is off | Open the app URL in a browser and accept the consent screen. Check that Compute › Apps › catalog-manager › Authorization lists the `sql` scope. |
| Catalog › Access: "Databricks refused this for your account: …" (403) on Approve, Grant or Remove | Grants run as the signed-in person ([decision 0005](../decisions/0005-access-approvals-as-approver.md)), who is not the table owner, a MANAGE holder or an admin | Ask the owner shown in the card to approve, or grant MANAGE on the schema to the approvers. |
| Catalog › Access: "Access requests are not set up (…)" (503) | Schema `fincrime.catalog_manager` is missing, or the app service principal lacks rights on it | As the schema owner: `CREATE SCHEMA IF NOT EXISTS fincrime.catalog_manager;` then `` GRANT USE SCHEMA, CREATE TABLE, SELECT, MODIFY ON SCHEMA fincrime.catalog_manager TO `<app SP application ID>` `` (the ID is under Compute › Apps › catalog-manager › Authorization). The app creates `access_requests` itself. |
| Request approved, but the reader's query fails with "does not have USE CATALOG on Catalog 'fincrime'" | Readers need `USE CATALOG`, which the app does not grant | Catalog owner or MANAGE holder: `` GRANT USE CATALOG ON CATALOG fincrime TO `account users` `` (once). |

## 6. Booth day checklist
- [ ] Laptop charged, backup laptop ready
- [ ] Offline fallback (video) tested
- [ ] Credentials valid and tested the day before
- [ ] Demo reset script run
