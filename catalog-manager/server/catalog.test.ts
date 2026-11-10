import express from 'express';
import { createServer } from 'node:http';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ executeStatement: vi.fn(), request: vi.fn() }));

vi.mock('@databricks/sdk-experimental', () => ({
  WorkspaceClient: class {
    statementExecution = { executeStatement: sdk.executeStatement };
    apiClient = { request: sdk.request };
  },
}));

const firstPolicyPage = [
  { tag_key: 'system.certification_status', description: 'Quality', values: [{ name: 'certified' }, { name: 'deprecated' }] },
  { tag_key: 'Financial Crime', description: 'Domain' },
  { tag_key: 'class.us_ssn', description: 'SSN' },
];
const secondPolicyPage = [
  { tag_key: 'class.email_address', description: 'Email' },
  { tag_key: 'sap.PersonalData.IsPotentiallyPersonal' },
  { tag_key: 'ai.model_family' },
  { tag_key: 'system.system_tables_fgac' },
];

const succeeded = (columns: string[] = [], rows: (string | null)[][] = []) => ({
  status: { state: 'SUCCEEDED' },
  manifest: { schema: { columns: columns.map((name) => ({ name })) } },
  result: { data_array: rows },
});

beforeEach(() => {
  sdk.executeStatement.mockReset().mockResolvedValue(succeeded());
  sdk.request.mockReset().mockImplementation(({ query }: { query: { page_token?: string } }) =>
    Promise.resolve(
      query.page_token === 'p2'
        ? { tag_policies: secondPolicyPage }
        : { tag_policies: firstPolicyPage, next_page_token: 'p2' },
    ),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function withApp(fn: (base: string) => Promise<void>) {
  const { setupCatalogRoutes } = await import('./catalog.js');
  const app = express();
  app.use('/api/catalog', express.json());
  await setupCatalogRoutes(app);
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

const tagStatements = () =>
  sdk.executeStatement.mock.calls
    .map(([req]) => (req as { statement: string }).statement)
    .filter((s) => s.startsWith('ALTER'));

const put = (base: string, table: string, body: unknown) =>
  fetch(`${base}/api/catalog/tables/${table}/governed-tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test.each([
  ['fincrime', 'data_products', 'Data products'],
  ['demo_catalog', 'review_schema', 'Review schema'],
])('returns configured catalog %s and schema %s independently of table rows', async (catalog, schema, schemaLabel) => {
  vi.stubEnv('CATALOG_NAME', catalog);
  vi.stubEnv('SCHEMA_NAME', schema);
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/catalog/context`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ catalog, schema, schemaLabel });
  });
});

const statements = () =>
  sdk.executeStatement.mock.calls.map(([req]) => req as { statement: string; parameters?: { name: string; value: string }[] });

test('browses data_products and keeps the glossary in gold by default', async () => {
  vi.stubEnv('CATALOG_NAME', undefined);
  vi.stubEnv('SCHEMA_NAME', undefined);
  vi.stubEnv('GLOSSARY_SCHEMA_NAME', undefined);
  await withApp(async (base) => {
    expect(await (await fetch(`${base}/api/catalog/context`)).json()).toEqual({
      catalog: 'fincrime',
      schema: 'data_products',
      schemaLabel: 'Data products',
    });
    expect((await fetch(`${base}/api/catalog/tables`)).status).toBe(200);
    expect((await fetch(`${base}/api/glossary`)).status).toBe(200);
  });
  const calls = statements();
  expect(calls[0].statement).toContain('CREATE TABLE IF NOT EXISTS fincrime.gold.business_glossary');
  expect(calls.find((c) => c.statement.includes('information_schema.tables'))?.parameters).toContainEqual({
    name: 'schema',
    value: 'data_products',
  });
  expect(calls.map((c) => c.statement)).toContain('SELECT * FROM fincrime.gold.business_glossary ORDER BY term');
});

test('uses GLOSSARY_SCHEMA_NAME for glossary reads and writes', async () => {
  vi.stubEnv('SCHEMA_NAME', 'data_products');
  vi.stubEnv('GLOSSARY_SCHEMA_NAME', 'glossary_home');
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/glossary/Structuring`, { method: 'DELETE' });
    expect(response.status).toBe(200);
  });
  const glossary = statements()
    .map((c) => c.statement)
    .filter((s) => s.includes('business_glossary'));
  expect(glossary).toHaveLength(2);
  expect(glossary.every((s) => s.includes('fincrime.glossary_home.business_glossary'))).toBe(true);
});

test('lists assignable governed tags across policy pages', async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/catalog/governed-tags`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { table: unknown; column: { key: string }[] };
    expect(body.table).toEqual([
      { key: 'system.certification_status', description: 'Quality', values: ['certified', 'deprecated'] },
      { key: 'Financial Crime', description: 'Domain', values: [] },
    ]);
    expect(body.column.map((p) => p.key)).toEqual(['class.email_address', 'class.us_ssn']);
    expect(sdk.request).toHaveBeenCalledTimes(2);
    expect(sdk.request.mock.calls[0][0]).toMatchObject({ path: '/api/2.1/tag-policies', method: 'GET', query: {} });
    expect(sdk.request.mock.calls[1][0]).toMatchObject({ query: { page_token: 'p2' } });
  });
});

test('labels table and column tags as system, governed or free-form', async () => {
  sdk.executeStatement.mockImplementation(({ statement }: { statement: string }) =>
    Promise.resolve(
      statement.includes('information_schema.column_tags')
        ? succeeded(['column_name', 'tag_name', 'tag_value'], [
            [null, 'Financial Crime', ''],
            [null, 'certified', 'true'],
            [null, 'system.certification_status', 'certified'],
            ['national_id', 'class.us_ssn', ''],
            ['national_id', 'sensitivity', 'pii'],
          ])
        : succeeded(),
    ),
  );
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/catalog/tables/customer_360/tags`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      table: [
        { key: 'Financial Crime', value: '', kind: 'governed' },
        { key: 'certified', value: 'true', kind: 'free-form' },
        { key: 'system.certification_status', value: 'certified', kind: 'system' },
      ],
      columns: [
        {
          column: 'national_id',
          tags: [
            { key: 'class.us_ssn', value: '', kind: 'system' },
            { key: 'sensitivity', value: 'pii', kind: 'free-form' },
          ],
        },
      ],
    });
  });
});

test.each([
  [{ key: 'system.certification_status', value: 'certified' }, "ALTER TABLE fincrime.data_products.alerts SET TAGS ('system.certification_status' = 'certified')"],
  [{ key: 'Financial Crime' }, "ALTER TABLE fincrime.data_products.alerts SET TAGS ('Financial Crime' = '')"],
  [{ column: 'national_id', key: 'class.us_ssn' }, "ALTER TABLE fincrime.data_products.alerts ALTER COLUMN national_id SET TAGS ('class.us_ssn' = '')"],
])('assigns allowlisted governed tag %j', async (body, statement) => {
  await withApp(async (base) => {
    const response = await put(base, 'alerts', body);
    expect(response.status).toBe(200);
    expect(tagStatements()).toEqual([statement]);
  });
});

test.each<[string, unknown]>([
  ['bad-name', { key: 'Financial Crime' }],
  ['alerts', { key: 'classification', value: 'PII' }],
  ['alerts', { key: 'sap.PersonalData.IsPotentiallyPersonal' }],
  ['alerts', { key: 'class.us_ssn' }],
  ['alerts', { column: 'national_id', key: 'system.certification_status', value: 'certified' }],
  ['alerts', { key: 'system.certification_status', value: 'gold' }],
  ['alerts', { key: 'system.certification_status' }],
  ['alerts', { key: 'Financial Crime', value: 'yes' }],
  ['alerts', { column: 'national_id; DROP TABLE x', key: 'class.us_ssn' }],
  ['alerts', { column: 5, key: 'class.us_ssn' }],
])('rejects governed tag request on %s: %j', async (table, body) => {
  await withApp(async (base) => {
    const response = await put(base, table, body);
    expect(response.status).toBe(400);
    expect(tagStatements()).toEqual([]);
  });
});

test('explains a missing ASSIGN permission', async () => {
  sdk.executeStatement.mockImplementation(({ statement }: { statement: string }) =>
    Promise.resolve(
      statement.startsWith('ALTER')
        ? {
            status: {
              state: 'FAILED',
              error: { message: 'PERMISSION_DENIED: User is not authorized to update the tag assignment for the following tag policies: system.certification_status' },
            },
          }
        : succeeded(),
    ),
  );
  await withApp(async (base) => {
    const response = await put(base, 'alerts', { key: 'system.certification_status', value: 'certified' });
    expect(response.status).toBe(403);
    const { error } = (await response.json()) as { error: string };
    expect(error).toContain('ASSIGN');
    expect(error).toContain('system.certification_status');
  });
});

test.each([
  ['key=Financial%20Crime', 200, "ALTER TABLE fincrime.data_products.alerts UNSET TAGS ('Financial Crime')"],
  ['key=class.us_ssn&column=national_id', 200, "ALTER TABLE fincrime.data_products.alerts ALTER COLUMN national_id UNSET TAGS ('class.us_ssn')"],
  ['key=classification', 400, undefined],
  ['key=class.us_ssn&column=a%20b', 400, undefined],
])('removes governed tags: %s', async (query, status, statement) => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/catalog/tables/alerts/governed-tags?${query}`, { method: 'DELETE' });
    expect(response.status).toBe(status);
    expect(tagStatements()).toEqual(statement ? [statement] : []);
  });
});