# catalog-manager

A Databricks App powered by [AppKit](https://developers.databricks.com/docs/appkit/v0/), featuring React, TypeScript, and Tailwind CSS.

**Enabled plugins:**
- **Analytics** -- SQL query execution against Databricks SQL Warehouses
- **Server** -- Express HTTP server with static file serving and Vite dev mode

## Ask: Genie space MCP

Ask calls the Genie Agent MCP endpoint `/api/2.0/mcp/genie/{space_id}`, scoped to
the Investigations Analyst space only. The space ID comes from the app's
`genie-space` resource (`DATABRICKS_GENIE_SPACE_ID`); callers cannot pick another
space. It does not read Discover Pages (use Genie One for that). The backend creates
one MCP client per request from the Apps proxy's `x-forwarded-access-token` and
requires `x-forwarded-user`. There is no service-principal fallback or conversation cache.

- Declare `user_api_scopes: [sql, dashboards.genie, genie]`; the MCP endpoint
  requires the `genie` scope. Users must re-consent in a browser after the scopes
  change, otherwise the forwarded token lacks `genie` and Ask returns 403.
- Users need CAN RUN on the Genie space and access to its data.
- `GET /api/ask/identity` displays the caller, never the token.
- `POST /api/ask` allows only ask and poll. Follow-ups reuse the conversation ID.
- The tool is read-only and returns text, SQL and suggested questions.
- The endpoint is not governed by Unity Gateway (no grants, policies or tracing).
  The Beta endpoint without a space ID is deprecated (end of life 2026-11-30); the
  space-scoped endpoint is not named in that notice, but confirm before the Summit.
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
- The export is a snapshot of selected terms from `fincrime.gold.business_glossary`.
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
