import { randomUUID } from 'node:crypto';
import { WorkspaceClient } from '@databricks/sdk-experimental';
import type { Application, NextFunction, Request, Response } from 'express';

const CATALOG = process.env.CATALOG_NAME ?? 'fincrime';
const SCHEMA = process.env.SCHEMA_NAME ?? 'data_products';
const STATE_SCHEMA = process.env.ACCESS_SCHEMA_NAME ?? 'catalog_manager';
const WAREHOUSE = process.env.DATABRICKS_WAREHOUSE_ID ?? '';
const REQUESTS = `${CATALOG}.${STATE_SCHEMA}.access_requests`;
const IDENT = /^[A-Za-z0-9_]+$/;
const FULL_TABLE = /^[A-Za-z0-9_]+\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/;
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// User emails, account group names and service principal IDs; never backticks, so names stay quotable.
const PRINCIPAL = /^[A-Za-z0-9][A-Za-z0-9 ._@+-]{0,127}$/;
// Workspace-local groups cannot receive Unity Catalog grants.
const LOCAL_GROUPS = new Set(['admins', 'users']);
const ALL_USERS = 'account users';
const READ_PRIVILEGES = new Set(['SELECT', 'ALL PRIVILEGES']);
const MAX_TEXT = 500;
const GROUPS_TTL_MS = 5 * 60_000;
const COLUMNS =
  'id, table_name, requester, grantee, grantee_type, privilege, reason, status, created_at, decided_by, decided_at, decision_note';

type Param = { name: string; value: string };
type Row = Record<string, string | null>;
type Caller = { client: WorkspaceClient; email: string };
type Decision = 'approved' | 'rejected' | 'cancelled';

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const appClient = new WorkspaceClient({});
let tableReady: Promise<void> | undefined;
let groupCache: { at: number; groups: string[] } | undefined;
let devUser: Promise<string> | undefined;

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const param = (name: string, value: string): Param => ({ name, value });
const fullName = (table: string) => `${CATALOG}.${SCHEMA}.${table}`;
const granteeType = (principal: string) =>
  principal.includes('@')
    ? 'user'
    : /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(principal)
      ? 'service principal'
      : 'group';

async function sql(client: WorkspaceClient, statement: string, parameters: Param[] = []): Promise<Row[]> {
  const res = await client.statementExecution.executeStatement({
    warehouse_id: WAREHOUSE,
    statement,
    parameters,
    wait_timeout: '50s',
  });
  if (res.status?.state !== 'SUCCEEDED') {
    throw new Error(res.status?.error?.message ?? `Statement ${res.status?.state}`);
  }
  const cols = (res.manifest?.schema?.columns ?? []).map((c) => c.name ?? '');
  return (res.result?.data_array ?? []).map((row) => Object.fromEntries(cols.map((c, i) => [c, row[i] ?? null])));
}

// Grants and revokes run with the signed-in user's token, so Unity Catalog decides and audits them.
async function asCaller(caller: Caller, statement: string) {
  try {
    return await sql(caller.client, statement);
  } catch (e) {
    const text = errorText(e);
    if (/PRINCIPAL_DOES_NOT_EXIST/.test(text)) {
      throw new HttpError(400, `Unity Catalog does not know this user or group. ${text}`);
    }
    if (
      /PERMISSION_DENIED|does not have|not authorized|required scopes/i.test(text) ||
      (e as { statusCode?: number }).statusCode === 403
    ) {
      throw new HttpError(403, `Databricks refused this for your account: ${text}`);
    }
    throw e;
  }
}

async function callerOf(req: Request): Promise<Caller> {
  const token = req.header('x-forwarded-access-token')?.trim();
  const email = req.header('x-forwarded-email')?.trim();
  if (token && email) {
    return { client: new WorkspaceClient({ host: process.env.DATABRICKS_HOST, token, authType: 'pat' }), email };
  }
  if (process.env.NODE_ENV === 'development') {
    // Local dev has no Apps proxy, so act as the CLI profile's user.
    devUser ??= appClient.currentUser.me().then(
      (me) => me.userName ?? '',
      (e: unknown) => {
        devUser = undefined;
        throw e;
      }
    );
    const devEmail = await devUser;
    if (devEmail) return { client: appClient, email: devEmail };
  }
  throw new HttpError(401, 'Open the app through Databricks Apps and sign in so it can act as you.');
}

function ensureTable() {
  tableReady ??= sql(
    appClient,
    `CREATE TABLE IF NOT EXISTS ${REQUESTS} (
       id STRING NOT NULL, table_name STRING NOT NULL, requester STRING NOT NULL,
       grantee STRING NOT NULL, grantee_type STRING NOT NULL, privilege STRING NOT NULL,
       reason STRING, status STRING NOT NULL, created_at TIMESTAMP NOT NULL,
       decided_by STRING, decided_at TIMESTAMP, decision_note STRING
     ) COMMENT 'Data access requests from the Catalog Manager app (decision 0005)'`
  ).then(
    () => undefined,
    (e: unknown) => {
      tableReady = undefined;
      throw new HttpError(503, `Access requests are not set up (${errorText(e)}). See the Catalog Manager runbook.`);
    }
  );
  return tableReady;
}

// Unity Catalog shows other principals' grants only to owners, managers and admins of the object.
const canManage = (caller: Caller, securable: string) =>
  sql(caller.client, `SHOW GRANTS \`${ALL_USERS}\` ON ${securable}`).then(
    () => true,
    () => false
  );

const canRead = (caller: Caller, table: string) =>
  sql(caller.client, `SELECT * FROM ${table} LIMIT 0`).then(
    () => true,
    () => false
  );

function text(value: unknown, field: string, required: boolean) {
  const raw = value ?? '';
  if (typeof raw !== 'string') throw new HttpError(400, `${field} must be text.`);
  const trimmed = raw.trim();
  if (required && !trimmed) throw new HttpError(400, `${field} is required.`);
  if (trimmed.length > MAX_TEXT) throw new HttpError(400, `${field} must be at most ${MAX_TEXT} characters.`);
  return trimmed;
}

function principal(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!PRINCIPAL.test(name)) throw new HttpError(400, 'Enter a user email or an account group name.');
  if (LOCAL_GROUPS.has(name)) {
    throw new HttpError(400, `"${name}" is a workspace-local group. Unity Catalog grants need an account group.`);
  }
  return name;
}

const routeParam = (req: Request, name: string) => {
  const value: unknown = req.params[name];
  return typeof value === 'string' ? value : '';
};

function tableOf(req: Request) {
  const table = routeParam(req, 'table');
  if (!IDENT.test(table)) throw new HttpError(400, 'Invalid table name');
  return table;
}

const toRequest = (r: Row) => ({
  id: r.id ?? '',
  table: (r.table_name ?? '').split('.').pop() ?? '',
  requester: r.requester ?? '',
  grantee: r.grantee ?? '',
  granteeType: r.grantee_type ?? '',
  privilege: r.privilege ?? 'SELECT',
  reason: r.reason ?? '',
  status: r.status ?? '',
  createdAt: r.created_at,
  decidedBy: r.decided_by,
  decidedAt: r.decided_at,
  note: r.decision_note,
});

async function tableOwner(table: string) {
  const rows = await sql(
    appClient,
    `SELECT table_owner FROM ${CATALOG}.information_schema.tables WHERE table_schema = :schema AND table_name = :table`,
    [param('schema', SCHEMA), param('table', table)]
  );
  if (!rows.length) throw new HttpError(404, `No table or view ${table} in ${CATALOG}.${SCHEMA}.`);
  return rows[0].table_owner;
}

async function pendingRequest(id: string) {
  if (!REQUEST_ID.test(id)) throw new HttpError(400, 'Invalid request id');
  await ensureTable();
  const [row] = await sql(appClient, `SELECT ${COLUMNS} FROM ${REQUESTS} WHERE id = :id`, [param('id', id)]);
  if (!row) throw new HttpError(404, 'Access request not found.');
  if (row.status !== 'pending') throw new HttpError(409, `This request is already ${row.status}.`);
  if (!FULL_TABLE.test(row.table_name ?? '')) throw new HttpError(409, 'This request names an invalid table.');
  return row as Row & { id: string; table_name: string };
}

async function decide(id: string, status: Decision, by: string, note: string, grantee?: string) {
  const assignGrantee = grantee ? ', grantee = :grantee, grantee_type = :type' : '';
  await sql(
    appClient,
    `UPDATE ${REQUESTS} SET status = :status, decided_by = :by, decided_at = current_timestamp(),
       decision_note = NULLIF(:note, '')${assignGrantee}
     WHERE id = :id AND status = 'pending'`,
    [
      param('status', status),
      param('by', by),
      param('note', note),
      param('id', id),
      ...(grantee ? [param('grantee', grantee), param('type', granteeType(grantee))] : []),
    ]
  );
}

// Read access needs USE SCHEMA on the parent schema as well; USE CATALOG is a one-time grant by the catalog owner.
async function grantRead(caller: Caller, table: string, grantee: string) {
  const schema = table.split('.').slice(0, 2).join('.');
  await asCaller(caller, `GRANT USE SCHEMA ON SCHEMA ${schema} TO \`${grantee}\``);
  await asCaller(caller, `GRANT SELECT ON TABLE ${table} TO \`${grantee}\``);
}

async function readGrants(caller: Caller, table: string) {
  const appId = process.env.DATABRICKS_CLIENT_ID ?? '';
  const rows = await sql(caller.client, `SHOW GRANTS ON TABLE ${table}`);
  return rows
    .filter((r) => READ_PRIVILEGES.has(r.ActionType ?? ''))
    .map((r) => {
      const who = r.Principal ?? '';
      const isApp = !!appId && who === appId;
      const source = (r.ObjectType ?? '').toLowerCase();
      return {
        principal: who,
        privilege: r.ActionType ?? '',
        source,
        isApp,
        removable: source === 'table' && r.ActionType === 'SELECT' && !isApp,
      };
    });
}

async function groups() {
  if (groupCache && Date.now() - groupCache.at < GROUPS_TTL_MS) return groupCache.groups;
  try {
    const rows = await sql(appClient, 'SHOW GROUPS');
    const names = rows
      .map((r) => r.name ?? '')
      .filter((n) => n && n !== ALL_USERS && !LOCAL_GROUPS.has(n) && PRINCIPAL.test(n))
      .sort((a, b) => a.localeCompare(b));
    groupCache = { at: Date.now(), groups: [ALL_USERS, ...names] };
    return groupCache.groups;
  } catch (e) {
    console.warn('access: could not list groups:', errorText(e));
    return [ALL_USERS];
  }
}

const route = (handler: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
  try {
    await handler(req, res);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    res.status(status).json({ error: errorText(e) });
  }
};

export function setupAccessRoutes(app: Application) {
  app.use(
    ['/api/catalog/access', '/api/catalog/tables/:table/access'],
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Cache-Control', 'no-store');
      // JSON-only writes cannot be sent by plain cross-site HTML forms.
      if (req.method === 'POST' && !req.is('application/json'))
        return void res.status(415).json({ error: 'Send JSON.' });
      next();
    }
  );

  app.get(
    '/api/catalog/access/groups',
    route(async (req, res) => {
      await callerOf(req);
      res.json({ groups: await groups() });
    })
  );

  // Pending-request counts per table, only for people who can manage grants on the schema.
  app.get(
    '/api/catalog/access/pending',
    route(async (req, res) => {
      const caller = await callerOf(req);
      const [manager] = await Promise.all([canManage(caller, `SCHEMA ${CATALOG}.${SCHEMA}`), ensureTable()]);
      if (!manager) return void res.json({ counts: {} });
      const prefix = `${CATALOG}.${SCHEMA}.`;
      const rows = await sql(
        appClient,
        `SELECT table_name, count(*) AS n FROM ${REQUESTS}
         WHERE status = 'pending' AND startswith(table_name, :prefix) GROUP BY table_name`,
        [param('prefix', prefix)]
      );
      res.json({
        counts: Object.fromEntries(rows.map((r) => [(r.table_name ?? '').slice(prefix.length), Number(r.n)])),
      });
    })
  );

  app.get(
    '/api/catalog/tables/:table/access',
    route(async (req, res) => {
      const table = tableOf(req);
      const full = fullName(table);
      const caller = await callerOf(req);
      await ensureTable();
      const [owner, manager, hasAccess, mine] = await Promise.all([
        tableOwner(table),
        canManage(caller, `TABLE ${full}`),
        canRead(caller, full),
        sql(
          appClient,
          `SELECT ${COLUMNS} FROM ${REQUESTS} WHERE table_name = :table AND requester = :me ORDER BY created_at DESC LIMIT 20`,
          [param('table', full), param('me', caller.email)]
        ),
      ]);
      const [pending, grants] = manager
        ? await Promise.all([
            sql(
              appClient,
              `SELECT ${COLUMNS} FROM ${REQUESTS} WHERE table_name = :table AND status = 'pending' ORDER BY created_at`,
              [param('table', full)]
            ),
            readGrants(caller, full),
          ])
        : [[], []];
      res.json({
        me: caller.email,
        owner,
        canManage: manager,
        hasAccess,
        requests: mine.map(toRequest),
        pending: pending.map(toRequest),
        grants,
      });
    })
  );

  // body: { group?: string, reason: string }; without group the request is for the signed-in user
  app.post(
    '/api/catalog/tables/:table/access/requests',
    route(async (req, res) => {
      const table = tableOf(req);
      const caller = await callerOf(req);
      const body = (req.body ?? {}) as { group?: unknown; reason?: unknown };
      const forGroup = body.group !== undefined && body.group !== null && body.group !== '';
      const grantee = principal(forGroup ? body.group : caller.email);
      const reason = text(body.reason, 'Reason', true);
      await ensureTable();
      await tableOwner(table);
      const full = fullName(table);
      const open = await sql(
        appClient,
        `SELECT id FROM ${REQUESTS} WHERE table_name = :table AND grantee = :grantee AND status = 'pending' LIMIT 1`,
        [param('table', full), param('grantee', grantee)]
      );
      if (open.length) throw new HttpError(409, `A request for ${grantee} is already pending.`);
      const id = randomUUID();
      await sql(
        appClient,
        `INSERT INTO ${REQUESTS} (id, table_name, requester, grantee, grantee_type, privilege, reason, status, created_at)
         VALUES (:id, :table, :requester, :grantee, :type, 'SELECT', :reason, 'pending', current_timestamp())`,
        [
          param('id', id),
          param('table', full),
          param('requester', caller.email),
          param('grantee', grantee),
          param('type', granteeType(grantee)),
          param('reason', reason),
        ]
      );
      res.status(201).json({ id, grantee });
    })
  );

  app.post(
    '/api/catalog/access/requests/:id/cancel',
    route(async (req, res) => {
      const caller = await callerOf(req);
      const request = await pendingRequest(routeParam(req, 'id'));
      if (request.requester !== caller.email) throw new HttpError(403, 'Only the requester can cancel this request.');
      await decide(request.id, 'cancelled', caller.email, '');
      res.json({ ok: true });
    })
  );

  // body: { grantee?: string, note?: string }; grantee replaces the requested user or group
  app.post(
    '/api/catalog/access/requests/:id/approve',
    route(async (req, res) => {
      const caller = await callerOf(req);
      const body = (req.body ?? {}) as { grantee?: unknown; note?: unknown };
      const note = text(body.note, 'Note', false);
      const request = await pendingRequest(routeParam(req, 'id'));
      const grantee = principal(body.grantee === undefined || body.grantee === '' ? request.grantee : body.grantee);
      await grantRead(caller, request.table_name, grantee);
      await decide(request.id, 'approved', caller.email, note, grantee);
      res.json({ ok: true, grantee });
    })
  );

  // body: { note?: string }
  app.post(
    '/api/catalog/access/requests/:id/reject',
    route(async (req, res) => {
      const caller = await callerOf(req);
      const note = text((req.body as { note?: unknown } | undefined)?.note, 'Note', false);
      const request = await pendingRequest(routeParam(req, 'id'));
      if (!(await canManage(caller, `TABLE ${request.table_name}`))) {
        throw new HttpError(403, 'Only people who can manage grants on this table can reject requests.');
      }
      await decide(request.id, 'rejected', caller.email, note);
      res.json({ ok: true });
    })
  );

  // body: { principal: string }
  app.post(
    '/api/catalog/tables/:table/access/grants',
    route(async (req, res) => {
      const table = tableOf(req);
      const caller = await callerOf(req);
      const grantee = principal((req.body as { principal?: unknown } | undefined)?.principal);
      await grantRead(caller, fullName(table), grantee);
      res.json({ ok: true, grantee });
    })
  );

  // query: ?principal=...; removes only a direct SELECT grant on the table
  app.delete(
    '/api/catalog/tables/:table/access/grants',
    route(async (req, res) => {
      const table = tableOf(req);
      const caller = await callerOf(req);
      const grantee = principal(req.query.principal);
      if (grantee === process.env.DATABRICKS_CLIENT_ID) {
        throw new HttpError(400, "The app's own access cannot be removed here.");
      }
      await asCaller(caller, `REVOKE SELECT ON TABLE ${fullName(table)} FROM \`${grantee}\``);
      res.json({ ok: true });
    })
  );
}
