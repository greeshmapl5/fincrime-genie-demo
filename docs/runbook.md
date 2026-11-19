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
| `USE SCHEMA`, `SELECT`, `MODIFY`, `APPLY TAG` on `fincrime.data_products` for `app-2a3ty8 catalog-manager` ([E1-S15](../backlog/stories/E1-S15-data-products-schema.md)); also covers the glossary table `business_glossary` there (no `CREATE TABLE`: the schema owner creates it) | Schema owner | Granted 2026-11-09 |
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
| Catalog › Access: "… is not a group you can choose here. Allowed groups: …" (400), or the group option is missing | Requests and grants accept only the account groups in the `ACCESS_GROUPS` app setting ([decision 0005 amendment](../decisions/0005-access-approvals-as-approver.md#amendment--2026-11-10-listed-groups-and-separation-of-duties)). Missing, empty or whitespace-only configuration allows no groups, including when approving existing requests. There is no discovery fallback; requests for yourself still work | Add the account group to `ACCESS_GROUPS` (comma-separated) in `catalog-manager/app.yaml`, then upload `app.yaml` and redeploy the app. Set it explicitly for local development too. |
| Catalog › Access: "You cannot approve your own request" or "You cannot give yourself access here" (403) | Separation of duties: nobody approves their own request or grants themselves access | Ask another person who owns the table or holds MANAGE to approve it. For the demo, a second person makes the request. |
| Glossary fails with `TABLE_OR_VIEW_NOT_FOUND` for `business_glossary`; app log "Glossary table … not created" | The table is missing from `GLOSSARY_SCHEMA_NAME` (default `data_products`), and the app service principal has no `CREATE TABLE` there | As the schema owner: `CREATE TABLE IF NOT EXISTS fincrime.data_products.business_glossary (term STRING, definition STRING, related_table STRING, related_column STRING, owner STRING, updated_at TIMESTAMP) COMMENT 'Business glossary maintained from the catalog-manager app'`. The app's schema grants cover it; no restart needed. |

## 6. Booth day checklist
- [ ] Laptop charged, backup laptop ready
- [ ] Offline fallback (video) tested
- [ ] Credentials valid and tested the day before
- [ ] Demo reset script run

## 7. Deploy Catalog Manager to another workspace
Assessed 2026-11-13: **not turnkey yet** ([E3](../backlog/epics/E3-declarative-automation-bundles.md) has no stories). The server reads catalog, schemas and warehouse from the environment, and `npx vitest run` (122 tests) and `npm run typecheck` pass, but the config below is pinned to dario-ws. Not yet tried on a second workspace.

**Pinned to dario-ws (change before deploying)**
| Where | Value | Action |
|---|---|---|
| `catalog-manager/databricks.yml` | Only target `default`: dario-ws host, `sql_warehouse_id`, `genie_space_id` | Add a target with the new host and variables (the root `databricks.yml` shows the pattern). |
| `catalog-manager/databricks.yml` | Required `genie-space` resource "Investigations Analyst" | The app code does not read it (Ask uses Genie One MCP). Create a space and pass its ID, or remove the resource. |
| `catalog-manager/app.yaml` | `DATABRICKS_HOST`, `DATABRICKS_WORKSPACE_ID` | Ask builds the Genie One MCP URL from them (`server/genie-one.ts`, `https://` required); they override the values Databricks Apps injects. Set the new workspace URL and ID. |
| `catalog-manager/app.yaml` | `ACCESS_GROUPS: daiwt2026,capgemini-gen-ai` | List account groups that exist in the target account. |
| `client/src/pages/pages/PagesPage.tsx`, `pages-export.ts` | "Open dario-ws" link; `fincrime.data_products.business_glossary` source line | Cosmetic; needs a code change. |
| `server/catalog.ts` | `DOMAIN_TAG = 'Financial Crime'` | Create that governed tag in the target account; otherwise the Governed tags card does not offer it. |

**Workspace prerequisites, in order**
1. Catalog `fincrime` and a SQL warehouse. The notebooks create `bronze`, `silver` and `gold`, not the catalog.
2. Data: `src/01_generate_bronze_data.py`; optionally `src/00_lakebase_case_decisions.sql` in Lakebase plus catalog `fincrime_source` (without it, `02` uses a local fallback); `src/02_build_gold_data_products.py`; `py -3 src/03_policy_docs.py <profile> <warehouse_id>` (`06` copies `gold.policy_docs`).
3. As the catalog owner: `CREATE SCHEMA IF NOT EXISTS fincrime.data_products` and `fincrime.catalog_manager` (no notebook creates them), then run `src/06_build_data_products.py` and create `business_glossary` (§5).
4. `databricks bundle deploy -t <target>` from `catalog-manager/`, then note the app service principal under Compute › Apps › catalog-manager › Authorization.
5. Grants as in §1: `USE SCHEMA`, `SELECT`, `MODIFY`, `APPLY TAG` on `data_products`; `USE SCHEMA`, `CREATE TABLE`, `SELECT`, `MODIFY` on `catalog_manager`; ASSIGN on the governed tags (account admin); `USE CATALOG` for readers; users need EXECUTE on `system.ai.genie_one_mcp`.
6. Account and Discover setup: `Financial Crime` and needed `class.*` tag policies, the Financial Crime domain, and published Pages (E1-S13). Pages and governed tags are Beta.
7. Open the app URL, accept the `sql` and `ai-gateway` consent, then check Catalog, Glossary, Access and one Ask question.

Also decide which build to ship: the repo's Ask runs as the signed-in user, while dario-ws runs an app service principal build that matches no commit (HANDOVER action 8).

## 8. Replace gold with independent data products
The clarified 2026-11-17 requirement supersedes the earlier snapshot/wrapper design:
`data_products` is the authoritative curated schema and must not depend on gold.

**Live cutover is currently blocked.** The current data-product view/build owner
lacks direct upstream Lakebase privileges; original gold views work because
their owner has access. An upstream administrator must run the following for the
intended view owner/build identity (replace the principal placeholder):

```sql
GRANT USE SCHEMA ON SCHEMA fincrime_source.public TO `<data-products-view-owner>`;
GRANT SELECT ON TABLE fincrime_source.public.case_decisions TO `<data-products-view-owner>`;
```

`USE CATALOG` on `fincrime_source` is already present for the current identity.
Do not grant all schema data or change app service-principal privileges for this.
An independent live alerts view still needs its Lakebase input; dropping gold
does not remove that requirement. Until permission and consumer tests pass,
the existing live gold-backed view definitions stay in place.

**Normal builds (no gold required):**
1. Run 01 only when intentionally regenerating bronze synthetic data. It creates
   `data_products`, not gold. Keep the existing Lakebase decision setup.
2. Run [`02_build_gold_data_products.py`](../src/02_build_gold_data_products.py).
   Despite its historical name, it now writes directly to `data_products`.
   Existing tables are refreshed by name without replacement; existing view
   definitions are altered with app-edited comments restored.
3. Run `py -3 src\03_policy_docs.py dario-ws dea09e931a40e6e8` when refreshing
   fictional policies; its default target is `fincrime.data_products`.
4. Run [`06_build_data_products.py`](../src/06_build_data_products.py) with
   `migrate_from_source=false`, `reset_metadata=false` to initialize the sandbox
   and verify products. It does not read gold in this mode.

**One-time migration of an existing gold installation:**
- Back up source/destination definitions, owners, tags, comments and grants first.
- Run 06 with `migrate_from_source=true`, `source_schema=gold`,
  `target_schema=data_products`, `reset_metadata=false`. Source views' SQL is copied
  with qualified internal references relocated to `data_products`; these are NOT
  `SELECT * FROM gold.<view>` wrappers. Source bronze/Lakebase references remain.
- Types must already match; a mismatch fails before writes. An old all-table
  installation needs a separately staged, metadata-preserving table-to-view
  migration first. Keep rollback definitions until all checks pass.
- The glossary stays app-owned and is not overwritten; keep the extra sandbox.
- A metadata reset during migration deliberately replaces app tags with source
  tags (removing destination-only certification). Do not use it for cutover.

**Deletion gate:** independent data objects alone do not prove all consumers have
moved. Update and validate live dashboard drafts AND published snapshots, saved
queries, deployed notebooks/jobs, and Genie instructions/examples/benchmarks.
Keep gold until owners confirm no remaining consumers and approve deletion.
Never use an unchecked schema-wide cascading drop. Bronze/Lakebase remain valid
upstream dependencies and are not part of this replacement.

Local regression tests: `py -3 -B -m unittest discover -s tests -p test_data_products.py -v`.
Live validation also runs the notebook and compares `EXCEPT ALL` in both directions; equal row counts alone are insufficient.
