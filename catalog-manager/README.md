# catalog-manager

A Databricks App powered by [AppKit](https://developers.databricks.com/docs/appkit/v0/), featuring React, TypeScript, and Tailwind CSS.

**Enabled plugins:**
- **Analytics** -- SQL query execution against Databricks SQL Warehouses
- **Server** -- Express HTTP server with static file serving and Vite dev mode

Catalog automatically displays the configured catalog and schema when opened,
including when there are no tables. `/api/catalog/context` supplies the server's
`CATALOG_NAME` and `SCHEMA_NAME` values (defaults: `fincrime` and `data_products`)
plus a display label (`data_products` → "Data products"). The glossary table
`business_glossary` lives in `GLOSSARY_SCHEMA_NAME` (default: the `SCHEMA_NAME`
schema), where the Genie space reads it, so Catalog lists it with the data products
([decision 0004](../decisions/0004-data-products-schema.md)). If the app cannot
create it at startup (no `CREATE TABLE`), it logs a warning and uses the table the
schema owner created.

## Catalog: governed tags

The **Governed tags** card shows the selected object's table and column tags,
labelled System, Governed (account tag policy) or Free-form. It can assign:

- `system.certification_status` (Certified / Deprecated) and the key-only
  `Financial Crime` domain tag on tables and views;
- `class.*` data-classification tags on columns.

Changes save immediately as the app service principal
([decision 0003](../decisions/0003-governed-tag-writes-app-sp.md), proposed).
An account admin must grant that principal **ASSIGN** on each tag; without it the
card shows a 403 explaining the missing grant (see the
[runbook](../docs/runbook.md)). Options come from `/api/2.1/tag-policies` (cached
for 5 minutes); the server rejects other keys or values. Free-form tags such as
`certified=true` are shown but not edited by this card; the existing
Classification dropdown still sets the free-form `classification` tag.

- `GET /api/catalog/governed-tags`, `GET /api/catalog/tables/:table/tags`
- `PUT /api/catalog/tables/:table/governed-tags` with `{ column?, key, value }`
  (`value` is `''` for key-only tags); `DELETE` with `?key=&column=`

Validate with `npx vitest run server/catalog.test.ts client/src/pages/catalog/GovernedTagsCard.test.tsx`.

## Catalog: access requests

The **Access** card ([E1-S16](../backlog/stories/E1-S16-access-requests.md)) shows
whether you can read the selected data product, and who owns it. Anyone signed in
can request read access for themselves or a listed account group, with a reason,
and cancel their own pending request. Owners, MANAGE holders and admins also see
the requests to review (Approve, optionally for another principal, or Reject, with
a note) and who can read the object, and can grant or remove access directly. They
also see an "n pending" badge in the table list.

Guardrails ([decision 0005 amendment](../decisions/0005-access-approvals-as-approver.md#amendment--2026-11-10-listed-groups-and-separation-of-duties)):

- **Listed groups**: requests, approvals and grants accept only the groups in
  `ACCESS_GROUPS` (comma-separated, set in `app.yaml`). Missing, empty or
  whitespace-only values allow no groups; there is no group-discovery fallback.
  Requests for yourself remain available. Set this explicitly for local development too.
- **Separation of duties**: nobody can approve their own request or grant
  themselves access (403).

Grants run **as the signed-in user**
([decision 0005](../decisions/0005-access-approvals-as-approver.md), proposed). Each
request builds a client from `x-forwarded-access-token` (`sql` scope), so Unity
Catalog checks the approver's own rights. Approve and Grant run `GRANT USE SCHEMA`
on the schema and `GRANT SELECT` on the table. Remove runs `REVOKE SELECT` on the
table only, and cannot remove the app's own access. The app service principal only
reads and writes request rows. The group list comes only from app configuration.

- Requests live in `<CATALOG_NAME>.<ACCESS_SCHEMA_NAME>.access_requests` (default
  `fincrime.catalog_manager.access_requests`). The app creates the table; its service
  principal needs `USE SCHEMA`, `CREATE TABLE`, `SELECT` and `MODIFY` on the schema.
- Readers also need `USE CATALOG` on the catalog, which the app does not grant
  (see the [runbook](../docs/runbook.md)).
- `GET /api/catalog/access/groups`, `GET /api/catalog/access/pending`,
  `GET /api/catalog/tables/:table/access`
- `POST /api/catalog/tables/:table/access/requests` with `{ group?, reason }`
- `POST /api/catalog/access/requests/:id/cancel`, `/approve` with
  `{ grantee?, note? }`, `/reject` with `{ note? }`
- `POST /api/catalog/tables/:table/access/grants` with `{ principal }`; `DELETE`
  with `?principal=`. POST bodies must be JSON (otherwise 415).
- Locally there is no Apps proxy, so the server acts as the CLI profile's user.

Validate with `npx vitest run server/access.test.ts client/src/pages/catalog/AccessCard.test.tsx`.

## Ask: Genie One MCP

The UI uses a shared blue brand theme with light/dark variants, icon-labelled
navigation, keyboard focus outlines, and a skip-to-content link. The home page
links to each workflow. Ask offers editable starter questions, readable progress
labels, and formatted answers while keeping caller identity, SQL inspection and
the AI verification reminder visible. Answer Markdown supports GFM tables via
`remark-gfm`: all-numeric columns are right-aligned and wide tables scroll inside
a keyboard-focusable region. Starter questions populate the composer;
they never submit a query automatically.

Ask calls `/ai-gateway/mcp-services/system.ai.genie_one_mcp?o=<workspace-id>`,
using `DATABRICKS_HOST` and `DATABRICKS_WORKSPACE_ID`. It is no longer restricted
to Investigations Analyst: Genie One can use the caller's accessible data and
published Discover Pages. Identical workspace answers are not guaranteed because
conversation context and generation can differ. The backend creates
one MCP client per request from the Apps proxy's `x-forwarded-access-token` and
requires `x-forwarded-user`. There is no service-principal fallback or conversation cache.

- Declare `user_api_scopes: [sql, ai-gateway]`. Users must re-consent in a browser
  after scopes change; an old forwarded token can otherwise cause HTTP 403.
- Users need EXECUTE on `system.ai.genie_one_mcp` and access to the relevant domains/data.
- `GET /api/ask/identity` displays the caller, never the token.
- `POST /api/ask` allows only ask and poll. Follow-ups reuse the conversation ID.
- The tool is read-only and returns text, SQL and suggested questions.
- Uses the Unity Gateway service, not the deprecated space-less Beta Genie MCP.
- Standalone local development deliberately rejects Ask without trusted caller
  headers. Use a deployed Apps proxy for real user-identity validation; never
  expose a local server that trusts arbitrary forwarded headers to untrusted users.

Live Page-citation acceptance passed on 2026-10-28 through the deployed app:
the Financial Crime Page "Concentration of transfers" was cited alongside its
distinctive 14-day / largest-recipient / 0.94 = 94 percent definition.
See the [current demo guide](../docs/demo-catalog-manager.md#genie-one-migration-acceptance-2026-10-28).
The older 2026-10-24 acceptance report describes the previous space-based chat.

## Discover Pages workflow

The **Pages** tab bridges the lakehouse glossary to the documented
[Discover Pages bulk-import workflow](https://docs.databricks.com/aws/en/uc-semantics/pages#bulk-import-pages).
It does not call a Pages CRUD API, browse live Pages, publish automatically, or
synchronize edits in either direction. No documented public Pages CRUD API was
identified in the official documentation or installed CLI/SDK during implementation.

1. Save definitions on **Glossary**.
2. Open **Pages**, refresh the glossary, enter an existing Discover domain or
   subdomain, and select the terms to export.
3. Review the preview and confirm it contains no sensitive information. Download
   the proposed Pages document. Owner values and data rows are excluded, but
   definitions and asset names still require review.
4. Open `dario-ws`, navigate to **Discover > Pages > Create page**, and open
   **Genie Code > Bulk import pages**. Attach the document (or paste its contents
   as source context) and use the suggested import prompt.
5. Review duplicates, conflicts, definitions, owners, and related assets. Create
   drafts, then review and publish them in Databricks.
6. In **Genie One**, ask about the term and check the definition and Page citation.

**Prerequisites and governance:** Pages is an account-level Beta that an account
admin may need to enable. A domain must exist and the user must have access.
The Page owner or a curator reviews and publishes drafts. Page content may be
replicated globally and must not contain PII, regulated data, or sensitive
information. See the official documentation for current permissions and limitations.

**Important distinctions:**
- The export is a snapshot of selected terms from `fincrime.data_products.business_glossary`.
  Refresh it after glossary edits; downloading is not publication.
- Pages feed the human-modeled context of the Genie Ontology used by **Genie One**.
  Published Pages are available to users with domain access; drafts are only
  available to their owner.
- The app's **Ask** tab uses Genie One MCP and can retrieve accessible published
  Pages. Downloading an export does not publish them.
- Later glossary changes do not update a Page. Review and update it separately.
- The workspace link on the Pages tab targets this deployment's `dario-ws`.
  Update it when deploying the app to a different workspace.

### Pages validation

From this directory:

```powershell
npm run typecheck
npx vitest run client\src\pages\pages\pages-export.test.ts
npx eslint client\src\pages\pages\pages-export.ts client\src\pages\pages\pages-export.test.ts client\src\pages\pages\PagesPage.tsx
```

Browser acceptance: verify loading/error/empty states; select only the intended
terms; confirm download remains disabled until domain, selection, and review are
present; inspect the downloaded file; and complete the import/publication steps
above with a domain owner. Verify Page citations in Ask after publishing.

Implementation verification (2026-10-23): typecheck, six export tests, focused
ESLint, production build, and `databricks apps validate --profile dario-ws` passed.
Browser checks with controlled glossary responses verified review/selection gates,
export Blob content, owner-field exclusion, empty/error states, and reset after
changing the domain. The integrated browser did not expose a download event, so
the exported Blob was checked against the preview instead. Actual Pages import,
publication, and Genie One citations have not been verified.

Deployment retried successfully on 2026-10-23 with
`databricks apps deploy --profile dario-ws` after authentication was restored.
Post-deploy checks confirmed RUNNING state, health `ok`, HTTP 200 on `/pages`,
the Pages workflow in the deployed JavaScript bundle, and successful live glossary
access (one term). Discover Pages import, publication, and citations still require
human verification in Databricks.

## Prerequisites

- Node.js v22+ and npm
- Databricks CLI (for deployment)
- Access to a Databricks workspace

## Databricks Authentication

### Local Development

For local development, configure your environment variables by creating a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set the environment variables you need:

```env
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_APP_PORT=8000
# ... other environment variables, depending on the plugins you use
```

### CLI Authentication

The Databricks CLI requires authentication to deploy and manage apps. Configure authentication using one of these methods:

#### OAuth U2M

Interactive browser-based authentication with short-lived tokens:

```bash
databricks auth login --host https://your-workspace.cloud.databricks.com
```

This will open your browser to complete authentication. The CLI saves credentials to `~/.databrickscfg`.

#### Configuration Profiles

Use multiple profiles for different workspaces:

```ini
[DEFAULT]
host = https://dev-workspace.cloud.databricks.com

[production]
host = https://prod-workspace.cloud.databricks.com
client_id = prod-client-id
client_secret = prod-client-secret
```

Deploy using a specific profile:

```bash
databricks bundle deploy --profile production
```

**Note:** Personal Access Tokens (PATs) are legacy authentication. OAuth is strongly recommended for better security.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Run the app in development mode with hot reload:

```bash
npm run dev
```

The app will be available at the URL shown in the console output.

### Build

Build both client and server for production:

```bash
npm run build
```

This creates:

- `dist/server.js` - Compiled server bundle
- `client/dist/` - Bundled client assets

### Production

Run the production build:

```bash
npm start
```

## Code Quality

There are a few commands to help you with code quality:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:fix
```

## Deployment with Databricks Asset Bundles

### 1. Configure Bundle

Update `databricks.yml` with your workspace settings:

```yaml
targets:
  default:
    workspace:
      host: https://your-workspace.cloud.databricks.com
```

Make sure to replace all placeholder values in `databricks.yml` with your actual resource IDs.

### 2. Deploy

Deploy and start the app with a single command:

```bash
databricks apps deploy
```

`databricks apps deploy` validates the project, deploys it, starts the app, and prints its URL.

### Deploy to Production

1. Configure the production target in `databricks.yml`
2. Deploy to production:

```bash
databricks apps deploy -t prod
```

> **Restarting a stopped app:** apps stop after a period of inactivity. To start one again without redeploying, run `databricks apps start <APP_NAME>`.

## Project Structure

```
* client/          # React frontend
  * src/           # Source code
  * public/        # Static assets
* server/          # Express backend
  * server.ts      # Server entry point
  * routes/        # Routes
* shared/          # Shared types
* config/          # Configuration
  * queries/       # SQL query files
* databricks.yml   # Bundle configuration
* app.yaml         # App configuration
* .env.example     # Environment variables example
```

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React.js, TypeScript, Vite, Tailwind CSS, React Router
- **UI Components**: Radix UI, shadcn/ui
- **Databricks**: AppKit SDK
