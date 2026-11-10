import express from 'express';
import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

type Param = { name: string; value: string };
type Call = { who: string; statement: string; parameters: Param[] };

const sdk = vi.hoisted(() => ({
  calls: [] as Call[],
  clients: [] as Record<string, unknown>[],
  respond: vi.fn<(statement: string) => unknown>(),
  me: vi.fn(),
}));

vi.mock('@databricks/sdk-experimental', () => ({
  WorkspaceClient: class {
    currentUser = { me: sdk.me };
    statementExecution: { executeStatement: (req: { statement: string; parameters?: Param[] }) => Promise<unknown> };
    constructor(opts: { token?: string } = {}) {
      sdk.clients.push(opts);
      const who = opts.token ? `user:${opts.token}` : 'app';
      this.statementExecution = {
        executeStatement: (req) => {
          sdk.calls.push({ who, statement: req.statement.trim(), parameters: req.parameters ?? [] });
          return Promise.resolve(sdk.respond(req.statement.trim()));
        },
      };
    }
  },
}));

const APP_ID = '11111111-2222-3333-4444-555555555555';
const ID = '0f8b7a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const USER = {
  'x-forwarded-access-token': 'tok-ana',
  'x-forwarded-email': 'ana@example.com',
  'x-forwarded-user': '42',
};
const GRANT_COLS = ['Principal', 'ActionType', 'ObjectType', 'ObjectKey'];
const REQUEST_COLS = [
  'id',
  'table_name',
  'requester',
  'grantee',
  'grantee_type',
  'privilege',
  'reason',
  'status',
  'created_at',
  'decided_by',
  'decided_at',
  'decision_note',
];

const request = (over: Record<string, string | null> = {}) => {
  const row: Record<string, string | null> = {
    id: ID,
    table_name: 'fincrime.data_products.accounts',
    requester: 'bob@example.com',
    grantee: 'daiwt2026',
    grantee_type: 'group',
    privilege: 'SELECT',
    reason: 'AML case review',
    status: 'pending',
    created_at: '2026-11-10T09:00:00.000Z',
    decided_by: null,
    decided_at: null,
    decision_note: null,
    ...over,
  };
  return REQUEST_COLS.map((c) => row[c]);
};

const succeeded = (columns: string[] = [], rows: (string | null)[][] = []) => ({
  status: { state: 'SUCCEEDED' },
  manifest: { schema: { columns: columns.map((name) => ({ name })) } },
  result: { data_array: rows },
});
const failed = (message: string) => ({ status: { state: 'FAILED', error: { message } } });

const world = {
  manager: false,
  reader: false,
  tableExists: true,
  duplicate: false,
  setupFails: false,
  request: null as (string | null)[] | null,
  mine: [] as (string | null)[][],
  pending: [] as (string | null)[][],
  grants: [] as string[][],
  ucError: '',
};
const fresh = { ...world };

function respond(s: string) {
  if (s.startsWith('CREATE TABLE')) {
    return world.setupFails
      ? failed('[SCHEMA_NOT_FOUND] The schema `fincrime`.`catalog_manager` cannot be found.')
      : succeeded();
  }
  if (s.startsWith('SHOW GRANTS `account users`')) {
    return world.manager
      ? succeeded(GRANT_COLS)
      : failed("PERMISSION_DENIED: Principal 'ana' does not have READ METADATA");
  }
  if (s.startsWith('SHOW GRANTS ON TABLE')) return succeeded(GRANT_COLS, world.grants);
  if (s.startsWith('SHOW GROUPS')) {
    return succeeded(
      ['name', 'directGroup'],
      [
        ['daiwt2026', ''],
        ['admins', ''],
        ['users', ''],
        ['capgemini-gen-ai', ''],
      ]
    );
  }
  if (s.startsWith('SELECT * FROM'))
    return world.reader ? succeeded() : failed('PERMISSION_DENIED: does not have SELECT');
  if (s.startsWith('GRANT') || s.startsWith('REVOKE')) return world.ucError ? failed(world.ucError) : succeeded();
  if (s.includes('information_schema.tables'))
    return succeeded(['table_owner'], world.tableExists ? [['owner@example.com']] : []);
  if (s.startsWith('SELECT id FROM')) return succeeded(['id'], world.duplicate ? [[ID]] : []);
  if (s.startsWith('SELECT') && s.includes('WHERE id = :id'))
    return succeeded(REQUEST_COLS, world.request ? [world.request] : []);
  if (s.includes('requester = :me')) return succeeded(REQUEST_COLS, world.mine);
  if (s.includes('count(*)')) return succeeded(['table_name', 'n'], [['fincrime.data_products.accounts', '2']]);
  if (s.includes("status = 'pending' ORDER BY")) return succeeded(REQUEST_COLS, world.pending);
  return succeeded();
}

beforeEach(() => {
  Object.assign(world, fresh, { mine: [], pending: [], grants: [] });
  sdk.calls.length = 0;
  sdk.clients.length = 0;
  sdk.respond.mockReset().mockImplementation(respond);
  sdk.me.mockReset();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('DATABRICKS_HOST', 'https://example.cloud.databricks.com');
  vi.stubEnv('DATABRICKS_CLIENT_ID', APP_ID);
  vi.stubEnv('CATALOG_NAME', undefined);
  vi.stubEnv('SCHEMA_NAME', undefined);
  vi.stubEnv('ACCESS_SCHEMA_NAME', undefined);
  vi.stubEnv('ACCESS_GROUPS', 'daiwt2026,capgemini-gen-ai');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function withApp(fn: (base: string) => Promise<void>) {
  const { setupAccessRoutes } = await import('./access.js');
  const app = express();
  app.use('/api/catalog', express.json());
  setupAccessRoutes(app);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test address');
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

const call = (
  base: string,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
) =>
  fetch(`${base}${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: { ...USER, ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

const ran = (who: string) => sdk.calls.filter((c) => c.who === who).map((c) => c.statement);
const find = (prefix: string) => sdk.calls.find((c) => c.statement.startsWith(prefix));
const values = (c: Call | undefined) => Object.fromEntries((c?.parameters ?? []).map((p) => [p.name, p.value]));

describe('identity', () => {
  test('refuses callers without a forwarded user token outside local dev', async () => {
    await withApp(async (base) => {
      const res = await fetch(`${base}/api/catalog/tables/accounts/access`);
      expect(res.status).toBe(401);
    });
    expect(sdk.calls).toEqual([]);
  });

  test('builds the user client from the forwarded token', async () => {
    await withApp(async (base) => {
      expect((await call(base, '/api/catalog/tables/accounts/access')).status).toBe(200);
    });
    expect(sdk.clients).toContainEqual({
      host: 'https://example.cloud.databricks.com',
      token: 'tok-ana',
      authType: 'pat',
    });
  });

  test('local dev acts as the CLI profile user', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    sdk.me.mockResolvedValue({ userName: 'dev@example.com' });
    await withApp(async (base) => {
      const res = await fetch(`${base}/api/catalog/tables/accounts/access`);
      expect(res.status).toBe(200);
      expect((await json(res)).me).toBe('dev@example.com');
    });
    expect(sdk.calls.every((c) => c.who === 'app')).toBe(true);
  });
});

describe('requests', () => {
  test('stores a pending group request as the app after checking the table', async () => {
    await withApp(async (base) => {
      const res = await call(base, '/api/catalog/tables/accounts/access/requests', {
        body: { group: 'daiwt2026', reason: ' AML case review ' },
      });
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({ grantee: 'daiwt2026' });
    });
    expect(find('CREATE TABLE')?.statement).toContain(
      'CREATE TABLE IF NOT EXISTS fincrime.catalog_manager.access_requests'
    );
    const insert = find('INSERT');
    expect(insert?.who).toBe('app');
    expect(values(insert)).toMatchObject({
      table: 'fincrime.data_products.accounts',
      requester: 'ana@example.com',
      grantee: 'daiwt2026',
      type: 'group',
      reason: 'AML case review',
    });
    expect(ran('user:tok-ana')).toEqual([]);
  });

  test('requests access for the signed-in user when no group is given', async () => {
    await withApp(async (base) => {
      const res = await call(base, '/api/catalog/tables/accounts/access/requests', { body: { reason: 'Need it' } });
      expect(res.status).toBe(201);
    });
    expect(values(find('INSERT'))).toMatchObject({ grantee: 'ana@example.com', type: 'user' });
  });

  test.each([
    ['a principal with a backtick', 'accounts', { group: 'x` TO `y', reason: 'r' }],
    ['a workspace-local group', 'accounts', { group: 'users', reason: 'r' }],
    ['a group that is not listed', 'accounts', { group: 'other-team', reason: 'r' }],
    ['account users unless listed', 'accounts', { group: 'account users', reason: 'r' }],
    ["another person's email as the group", 'accounts', { group: 'bob@example.com', reason: 'r' }],
    ['a missing reason', 'accounts', { group: 'daiwt2026' }],
    ['a long reason', 'accounts', { reason: 'x'.repeat(501) }],
    ['a reason that is not text', 'accounts', { reason: 42 }],
    ['an invalid table name', 'accounts;drop', { reason: 'r' }],
  ])('rejects %s', async (_label, table, body) => {
    await withApp(async (base) => {
      expect(
        (await call(base, `/api/catalog/tables/${encodeURIComponent(table)}/access/requests`, { body })).status
      ).toBe(400);
    });
    expect(find('INSERT')).toBeUndefined();
  });

  test('uses the configured group list instead of listing account groups', async () => {
    vi.stubEnv('ACCESS_GROUPS', ' fincrime_analysts, users ,fincrime_analysts,account users');
    await withApp(async (base) => {
      expect(await (await call(base, '/api/catalog/access/groups')).json()).toEqual({
        groups: ['fincrime_analysts', 'account users'],
      });
      const listed = await call(base, '/api/catalog/tables/accounts/access/requests', {
        body: { group: 'fincrime_analysts', reason: 'r' },
      });
      expect(listed.status).toBe(201);
      const unlisted = await call(base, '/api/catalog/tables/accounts/access/requests', {
        body: { group: 'daiwt2026', reason: 'r' },
      });
      expect(unlisted.status).toBe(400);
      expect((await json(unlisted)).error).toContain('Allowed groups: fincrime_analysts, account users');
    });
    expect(find('SHOW GROUPS')).toBeUndefined();
    expect(sdk.calls.filter((c) => c.statement.startsWith('INSERT'))).toHaveLength(1);
  });

  test('accepts only JSON writes', async () => {
    await withApp(async (base) => {
      const res = await call(base, '/api/catalog/tables/accounts/access/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
      });
      expect(res.status).toBe(415);
    });
    expect(sdk.calls).toEqual([]);
  });

  test('refuses a second pending request for the same grantee', async () => {
    world.duplicate = true;
    await withApp(async (base) => {
      const res = await call(base, '/api/catalog/tables/accounts/access/requests', {
        body: { group: 'daiwt2026', reason: 'r' },
      });
      expect(res.status).toBe(409);
    });
    expect(find('INSERT')).toBeUndefined();
  });

  test('returns 404 for tables outside the schema', async () => {
    world.tableExists = false;
    await withApp(async (base) => {
      expect((await call(base, '/api/catalog/tables/missing/access/requests', { body: { reason: 'r' } })).status).toBe(
        404
      );
    });
  });

  test('reports missing setup and retries it on the next call', async () => {
    world.setupFails = true;
    await withApp(async (base) => {
      const first = await call(base, '/api/catalog/tables/accounts/access');
      expect(first.status).toBe(503);
      expect((await json(first)).error).toContain('not set up');
      world.setupFails = false;
      expect((await call(base, '/api/catalog/tables/accounts/access')).status).toBe(200);
    });
    expect(sdk.calls.filter((c) => c.statement.startsWith('CREATE TABLE'))).toHaveLength(2);
  });

  test('only the requester can cancel', async () => {
    world.request = request();
    await withApp(async (base) => {
      expect((await call(base, `/api/catalog/access/requests/${ID}/cancel`, { body: {} })).status).toBe(403);
      world.request = request({ requester: 'ana@example.com' });
      expect((await call(base, `/api/catalog/access/requests/${ID}/cancel`, { body: {} })).status).toBe(200);
    });
    const updates = sdk.calls.filter((c) => c.statement.startsWith('UPDATE'));
    expect(updates).toHaveLength(1);
    expect(values(updates[0])).toMatchObject({ status: 'cancelled', by: 'ana@example.com' });
  });
});

describe('access summary', () => {
  test('shows approvers pending requests and who can read the table', async () => {
    world.manager = true;
    world.reader = true;
    world.pending = [request()];
    world.grants = [
      ['daiwt2026', 'SELECT', 'TABLE', 'fincrime.data_products.accounts'],
      [APP_ID, 'SELECT', 'SCHEMA', 'fincrime.data_products'],
      [APP_ID, 'USE SCHEMA', 'SCHEMA', 'fincrime.data_products'],
      ['lead@example.com', 'ALL PRIVILEGES', 'CATALOG', 'fincrime'],
    ];
    await withApp(async (base) => {
      const res = await call(base, '/api/catalog/tables/accounts/access');
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toMatchObject({
        me: 'ana@example.com',
        owner: 'owner@example.com',
        canManage: true,
        hasAccess: true,
      });
      expect(body.pending).toEqual([
        expect.objectContaining({
          id: ID,
          table: 'accounts',
          grantee: 'daiwt2026',
          reason: 'AML case review',
          status: 'pending',
        }),
      ]);
      expect(body.grants).toEqual([
        { principal: 'daiwt2026', privilege: 'SELECT', source: 'table', isApp: false, removable: true },
        { principal: APP_ID, privilege: 'SELECT', source: 'schema', isApp: true, removable: false },
        {
          principal: 'lead@example.com',
          privilege: 'ALL PRIVILEGES',
          source: 'catalog',
          isApp: false,
          removable: false,
        },
      ]);
    });
    expect(ran('user:tok-ana')).toEqual([
      'SHOW GRANTS `account users` ON TABLE fincrime.data_products.accounts',
      'SELECT * FROM fincrime.data_products.accounts LIMIT 0',
      'SHOW GRANTS ON TABLE fincrime.data_products.accounts',
    ]);
  });

  test('hides approver data from other users', async () => {
    world.mine = [request({ requester: 'ana@example.com', grantee: 'ana@example.com', grantee_type: 'user' })];
    await withApp(async (base) => {
      const body = await json(await call(base, '/api/catalog/tables/accounts/access'));
      expect(body).toMatchObject({ canManage: false, hasAccess: false, pending: [], grants: [] });
      expect(body.requests).toHaveLength(1);
    });
    expect(find('SHOW GRANTS ON TABLE')).toBeUndefined();
    expect(sdk.calls.some((c) => c.statement.includes("status = 'pending' ORDER BY"))).toBe(false);
  });

  test('counts pending requests for schema managers only', async () => {
    await withApp(async (base) => {
      expect(await (await call(base, '/api/catalog/access/pending')).json()).toEqual({ counts: {} });
      world.manager = true;
      expect(await (await call(base, '/api/catalog/access/pending')).json()).toEqual({ counts: { accounts: 2 } });
    });
    expect(find('SHOW GRANTS `account users`')?.statement).toBe(
      'SHOW GRANTS `account users` ON SCHEMA fincrime.data_products'
    );
    expect(sdk.calls.filter((c) => c.statement.includes('count(*)'))).toHaveLength(1);
  });

  test('offers only the configured groups without querying Unity Catalog', async () => {
    await withApp(async (base) => {
      expect(await (await call(base, '/api/catalog/access/groups')).json()).toEqual({
        groups: ['daiwt2026', 'capgemini-gen-ai'],
      });
    });
    expect(sdk.calls).toEqual([]);
  });
});

describe('empty allowlist', () => {
  test.each([undefined, '', ' \t ', ', ,', 'users,admins,`invalid`'])(
    'rejects all group requests, approvals and direct grants with ACCESS_GROUPS=%j',
    async (configured) => {
      vi.stubEnv('ACCESS_GROUPS', configured);
      await withApp(async (base) => {
        expect(await (await call(base, '/api/catalog/access/groups')).json()).toEqual({ groups: [] });
        for (const group of ['daiwt2026', 'account users']) {
          const submitted = await call(base, '/api/catalog/tables/accounts/access/requests', {
            body: { group, reason: 'r' },
          });
          expect(submitted.status).toBe(400);
          expect((await json(submitted)).error).toContain('Allowed groups: none');

          world.request = request({ grantee: group });
          expect((await call(base, `/api/catalog/access/requests/${ID}/approve`, { body: {} })).status).toBe(400);

          world.request = request({ grantee: 'bob@example.com', grantee_type: 'user' });
          expect(
            (await call(base, `/api/catalog/access/requests/${ID}/approve`, { body: { grantee: group } })).status
          ).toBe(400);
          expect(
            (await call(base, '/api/catalog/tables/accounts/access/grants', { body: { principal: group } })).status
          ).toBe(400);
        }
      });
      expect(find('SHOW GROUPS')).toBeUndefined();
      expect(find('INSERT')).toBeUndefined();
      expect(find('UPDATE')).toBeUndefined();
      expect(find('GRANT')).toBeUndefined();
    }
  );

  test.each([undefined, ''])(
    'preserves personal requests and another user approving with ACCESS_GROUPS=%j',
    async (configured) => {
      vi.stubEnv('ACCESS_GROUPS', configured);
      await withApp(async (base) => {
        expect(
          (await call(base, '/api/catalog/tables/accounts/access/requests', { body: { reason: 'r' } })).status
        ).toBe(201);
        world.request = request({ grantee: 'bob@example.com', grantee_type: 'user' });
        expect((await call(base, `/api/catalog/access/requests/${ID}/approve`, { body: {} })).status).toBe(200);
      });
      expect(values(find('INSERT'))).toMatchObject({ grantee: 'ana@example.com', type: 'user' });
      expect(values(find('UPDATE'))).toMatchObject({
        status: 'approved',
        by: 'ana@example.com',
        grantee: 'bob@example.com',
      });
      expect(ran('user:tok-ana')).toEqual([
        'GRANT USE SCHEMA ON SCHEMA fincrime.data_products TO `bob@example.com`',
        'GRANT SELECT ON TABLE fincrime.data_products.accounts TO `bob@example.com`',
      ]);
      expect(find('SHOW GROUPS')).toBeUndefined();
    }
  );
});

describe('decisions', () => {
  test('approves by granting USE SCHEMA and SELECT as the approver, then records it', async () => {
    world.request = request();
    await withApp(async (base) => {
      const res = await call(base, `/api/catalog/access/requests/${ID}/approve`, {
        body: { note: 'Approved for the case' },
      });
      expect(res.status).toBe(200);
    });
    expect(ran('user:tok-ana')).toEqual([
      'GRANT USE SCHEMA ON SCHEMA fincrime.data_products TO `daiwt2026`',
      'GRANT SELECT ON TABLE fincrime.data_products.accounts TO `daiwt2026`',
    ]);
    const update = find('UPDATE');
    expect(update?.who).toBe('app');
    expect(values(update)).toMatchObject({
      status: 'approved',
      by: 'ana@example.com',
      note: 'Approved for the case',
      grantee: 'daiwt2026',
    });
  });

  test('lets the approver grant to a different group', async () => {
    world.request = request({ grantee: 'bob@example.com', grantee_type: 'user' });
    await withApp(async (base) => {
      expect(
        (await call(base, `/api/catalog/access/requests/${ID}/approve`, { body: { grantee: 'capgemini-gen-ai' } }))
          .status
      ).toBe(200);
    });
    expect(ran('user:tok-ana')).toContain(
      'GRANT SELECT ON TABLE fincrime.data_products.accounts TO `capgemini-gen-ai`'
    );
    expect(values(find('UPDATE'))).toMatchObject({ grantee: 'capgemini-gen-ai', type: 'group' });
  });

  test.each(['ana@example.com', 'ANA@example.com'])(
    'nobody approves their own request (%s), even to another listed group',
    async (requester) => {
      world.request = request({ requester });
      await withApp(async (base) => {
        for (const body of [{}, { grantee: 'capgemini-gen-ai' }]) {
          const res = await call(base, `/api/catalog/access/requests/${ID}/approve`, { body });
          expect(res.status).toBe(403);
          expect((await json(res)).error).toContain('own request');
        }
      });
      expect(find('GRANT')).toBeUndefined();
      expect(find('UPDATE')).toBeUndefined();
    }
  );

  test.each([
    ['to themselves', 'ana@example.com', 403],
    ['to a group that is not listed', 'other-team', 400],
    ['to account users unless listed', 'account users', 400],
  ])('an approver cannot redirect a grant %s', async (_label, to, status) => {
    world.request = request();
    await withApp(async (base) => {
      expect((await call(base, `/api/catalog/access/requests/${ID}/approve`, { body: { grantee: to } })).status).toBe(
        status
      );
    });
    expect(find('GRANT')).toBeUndefined();
    expect(find('UPDATE')).toBeUndefined();
  });

  test.each([
    ['PERMISSION_DENIED: User does not have MANAGE on Schema fincrime.data_products', 403],
    ['[PRINCIPAL_DOES_NOT_EXIST.PRINCIPAL_DOES_NOT_EXIST] Could not find principal with name daiwt2026.', 400],
  ])('does not record an approval Databricks refused: %s', async (ucError, status) => {
    world.request = request();
    world.ucError = ucError;
    await withApp(async (base) => {
      const res = await call(base, `/api/catalog/access/requests/${ID}/approve`, { body: {} });
      expect(res.status).toBe(status);
      expect((await json(res)).error).toContain(ucError);
    });
    expect(find('UPDATE')).toBeUndefined();
  });

  test('refuses decisions on requests that are no longer pending', async () => {
    world.request = request({ status: 'approved' });
    await withApp(async (base) => {
      expect((await call(base, `/api/catalog/access/requests/${ID}/approve`, { body: {} })).status).toBe(409);
      expect((await call(base, '/api/catalog/access/requests/not-an-id/approve', { body: {} })).status).toBe(400);
    });
    expect(find('GRANT')).toBeUndefined();
  });

  test('only people who can manage the table can reject', async () => {
    world.request = request();
    await withApp(async (base) => {
      expect((await call(base, `/api/catalog/access/requests/${ID}/reject`, { body: { note: 'No' } })).status).toBe(
        403
      );
      expect(find('UPDATE')).toBeUndefined();
      world.manager = true;
      expect(
        (await call(base, `/api/catalog/access/requests/${ID}/reject`, { body: { note: 'Use the masked view' } }))
          .status
      ).toBe(200);
    });
    expect(values(find('UPDATE'))).toMatchObject({ status: 'rejected', note: 'Use the masked view' });
  });
});

describe('direct grants', () => {
  test('grants and removes read access as the signed-in user', async () => {
    await withApp(async (base) => {
      expect(
        (await call(base, '/api/catalog/tables/accounts/access/grants', { body: { principal: 'daiwt2026' } })).status
      ).toBe(200);
      expect(
        (await call(base, '/api/catalog/tables/accounts/access/grants', { body: { principal: 'bob@example.com' } }))
          .status
      ).toBe(200);
      const removed = await call(base, '/api/catalog/tables/accounts/access/grants?principal=account%20users', {
        method: 'DELETE',
      });
      expect(removed.status).toBe(200);
    });
    expect(ran('user:tok-ana')).toEqual([
      'GRANT USE SCHEMA ON SCHEMA fincrime.data_products TO `daiwt2026`',
      'GRANT SELECT ON TABLE fincrime.data_products.accounts TO `daiwt2026`',
      'GRANT USE SCHEMA ON SCHEMA fincrime.data_products TO `bob@example.com`',
      'GRANT SELECT ON TABLE fincrime.data_products.accounts TO `bob@example.com`',
      'REVOKE SELECT ON TABLE fincrime.data_products.accounts FROM `account users`',
    ]);
  });

  test.each([
    ['themselves', 'Ana@Example.com', 403],
    ['a group that is not listed', 'other-team', 400],
    ['account users unless listed', 'account users', 400],
  ])('refuses direct grants to %s', async (_label, principal, status) => {
    await withApp(async (base) => {
      expect((await call(base, '/api/catalog/tables/accounts/access/grants', { body: { principal } })).status).toBe(
        status
      );
    });
    expect(find('GRANT')).toBeUndefined();
  });

  test("never removes the app's own access", async () => {
    await withApp(async (base) => {
      const res = await call(base, `/api/catalog/tables/accounts/access/grants?principal=${APP_ID}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(400);
    });
    expect(find('REVOKE')).toBeUndefined();
  });
});
