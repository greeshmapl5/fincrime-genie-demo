import { WorkspaceClient } from '@databricks/sdk-experimental';
import type { Application, Response } from 'express';

const CATALOG = process.env.CATALOG_NAME ?? 'fincrime';
const SCHEMA = process.env.SCHEMA_NAME ?? 'data_products';
// The glossary lives with the data products, where the Genie space reads it (decision 0004).
const GLOSSARY_SCHEMA = process.env.GLOSSARY_SCHEMA_NAME ?? SCHEMA;
const WAREHOUSE = process.env.DATABRICKS_WAREHOUSE_ID ?? '';
const GLOSSARY = `${CATALOG}.${GLOSSARY_SCHEMA}.business_glossary`;
const IDENT = /^[A-Za-z0-9_]+$/;
const TAG = 'classification';
const LEVELS = ['Public', 'Internal', 'Confidential', 'PII', 'Restricted'];
const CERT_TAG = 'system.certification_status';
const DOMAIN_TAG = 'Financial Crime';
const CLASS_PREFIX = 'class.';
const SYSTEM_PREFIXES = ['system.', 'class.', 'sap.', 'ai.'];
const POLICY_TTL_MS = 5 * 60_000;

type Param = { name: string; value: string };
type TagPolicy = { key: string; description: string; values: string[] };
type RawTagPolicy = { tag_key?: string; description?: string; values?: { name?: string }[] };

const client = new WorkspaceClient({});
let policyCache: { at: number; policies: Map<string, TagPolicy> } | undefined;

// Governed tag policies are account-level; the SDK has no typed client for them yet.
async function tagPolicies(): Promise<Map<string, TagPolicy>> {
  if (policyCache && Date.now() - policyCache.at < POLICY_TTL_MS) return policyCache.policies;
  const policies = new Map<string, TagPolicy>();
  let pageToken: string | undefined;
  for (let page = 0; page < 50; page++) {
    const body = (await client.apiClient.request({
      path: '/api/2.1/tag-policies',
      method: 'GET',
      query: pageToken ? { page_token: pageToken } : {},
      headers: new Headers(),
      raw: false,
    })) as { tag_policies?: RawTagPolicy[]; next_page_token?: string };
    for (const p of body.tag_policies ?? []) {
      if (!p.tag_key) continue;
      const values = (p.values ?? []).map((v) => v.name ?? '').filter(Boolean);
      policies.set(p.tag_key, { key: p.tag_key, description: p.description ?? '', values });
    }
    pageToken = body.next_page_token || undefined;
    if (!pageToken) break;
  }
  policyCache = { at: Date.now(), policies };
  return policies;
}

const tagKind = (key: string, policies: Map<string, TagPolicy>) =>
  !policies.has(key) ? 'free-form' : SYSTEM_PREFIXES.some((p) => key.startsWith(p)) ? 'system' : 'governed';

const assignable = (key: string, column: string | undefined, policies: Map<string, TagPolicy>) =>
  policies.has(key) && (column ? key.startsWith(CLASS_PREFIX) : key === CERT_TAG || key === DOMAIN_TAG);

const optionalIdent = (v: unknown) => v === undefined || v === null || v === '' || (typeof v === 'string' && IDENT.test(v));

function sendTagWriteError(res: Response, e: unknown, key: string) {
  const message = e instanceof Error ? e.message : String(e);
  if (/not authorized to update the tag assignment/i.test(message)) {
    return void res.status(403).json({
      error: `The app's service principal is not allowed to assign the governed tag "${key}". An account admin must grant it ASSIGN on this tag in Catalog > Govern > Governed Tags.`,
    });
  }
  res.status(/PERMISSION_DENIED/.test(message) ? 403 : 500).json({ error: message });
}

async function run(statement: string, parameters: Param[] = []): Promise<Record<string, string | null>[]> {
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
  return (res.result?.data_array ?? []).map((row) =>
    Object.fromEntries(cols.map((c, i) => [c, row[i] ?? null])),
  );
}

const sqlString = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const displayName = (name: string) => {
  const words = name.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export async function setupCatalogRoutes(app: Application) {
  app.get('/api/catalog/context', (_req, res) => {
    res.json({ catalog: CATALOG, schema: SCHEMA, schemaLabel: displayName(SCHEMA) });
  });

  try {
    await run(
      `CREATE TABLE IF NOT EXISTS ${GLOSSARY} (
         term STRING, definition STRING, related_table STRING, related_column STRING,
         owner STRING, updated_at TIMESTAMP
       ) COMMENT 'Business glossary maintained from the catalog-manager app'`,
    );
  } catch (e) {
    // Without CREATE TABLE the schema owner pre-creates the table; the routes below still work then.
    console.warn(`Glossary table ${GLOSSARY} not created: ${(e as Error).message}`);
  }

  app.get('/api/catalog/tables', async (_req, res) => {
    try {
      const rows = await run(
        `SELECT t.table_name, t.comment, g.tag_value AS classification, c.tag_value AS certification
         FROM ${CATALOG}.information_schema.tables t
         LEFT JOIN ${CATALOG}.information_schema.table_tags g
           ON g.schema_name = t.table_schema AND g.table_name = t.table_name AND g.tag_name = :tag
         LEFT JOIN ${CATALOG}.information_schema.table_tags c
           ON c.schema_name = t.table_schema AND c.table_name = t.table_name AND c.tag_name = :cert
         WHERE t.table_schema = :schema ORDER BY t.table_name`,
        [
          { name: 'schema', value: SCHEMA },
          { name: 'tag', value: TAG },
          { name: 'cert', value: CERT_TAG },
        ],
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/catalog/tables/:table/columns', async (req, res) => {
    try {
      const { table } = req.params;
      if (!IDENT.test(table)) return void res.status(400).json({ error: 'Invalid table name' });
      const rows = await run(
        `SELECT c.column_name, c.data_type, c.comment, t.tag_value AS classification
         FROM ${CATALOG}.information_schema.columns c
         LEFT JOIN ${CATALOG}.information_schema.column_tags t
           ON t.schema_name = c.table_schema AND t.table_name = c.table_name
          AND t.column_name = c.column_name AND t.tag_name = :tag
         WHERE c.table_schema = :schema AND c.table_name = :table ORDER BY c.ordinal_position`,
        [
          { name: 'schema', value: SCHEMA },
          { name: 'table', value: table },
          { name: 'tag', value: TAG },
        ],
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/catalog/classification-levels', (_req, res) => res.json(LEVELS));

  // body: { column?: string, level: string | '' }; empty level removes the tag
  app.put('/api/catalog/tables/:table/classification', async (req, res) => {
    try {
      const { table } = req.params;
      const { column, level } = req.body ?? {};
      if (!IDENT.test(table) || (column && !IDENT.test(column)) || (level && !LEVELS.includes(level))) {
        return void res.status(400).json({ error: 'Invalid request' });
      }
      const target = column
        ? `ALTER TABLE ${CATALOG}.${SCHEMA}.${table} ALTER COLUMN ${column}`
        : `ALTER TABLE ${CATALOG}.${SCHEMA}.${table}`;
      await run(level ? `${target} SET TAGS ('${TAG}' = '${level}')` : `${target} UNSET TAGS ('${TAG}')`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/catalog/governed-tags', async (_req, res) => {
    try {
      const policies = [...(await tagPolicies()).values()];
      res.json({
        table: policies.filter((p) => p.key === CERT_TAG || p.key === DOMAIN_TAG),
        column: policies.filter((p) => p.key.startsWith(CLASS_PREFIX)).sort((a, b) => a.key.localeCompare(b.key)),
      });
    } catch (e) {
      res.status(502).json({ error: `Could not load governed tags: ${(e as Error).message}` });
    }
  });

  app.get('/api/catalog/tables/:table/tags', async (req, res) => {
    try {
      const { table } = req.params;
      if (!IDENT.test(table)) return void res.status(400).json({ error: 'Invalid table name' });
      const params = [
        { name: 'schema', value: SCHEMA },
        { name: 'table', value: table },
      ];
      const [rows, policies] = await Promise.all([
        run(
          `SELECT CAST(NULL AS STRING) AS column_name, tag_name, tag_value
           FROM ${CATALOG}.information_schema.table_tags WHERE schema_name = :schema AND table_name = :table
           UNION ALL
           SELECT column_name, tag_name, tag_value
           FROM ${CATALOG}.information_schema.column_tags WHERE schema_name = :schema AND table_name = :table
           ORDER BY column_name NULLS FIRST, tag_name`,
          params,
        ),
        tagPolicies(),
      ]);
      const toTag = (r: Record<string, string | null>) => {
        const key = r.tag_name ?? '';
        return { key, value: r.tag_value ?? '', kind: tagKind(key, policies) };
      };
      const columns = new Map<string, ReturnType<typeof toTag>[]>();
      for (const r of rows.filter((row) => row.column_name)) {
        columns.set(r.column_name!, [...(columns.get(r.column_name!) ?? []), toTag(r)]);
      }
      res.json({
        table: rows.filter((r) => !r.column_name).map(toTag),
        columns: [...columns].map(([column, tags]) => ({ column, tags })),
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // body: { column?: string, key: string, value?: string }; key-only tags use an empty value
  app.put('/api/catalog/tables/:table/governed-tags', async (req, res) => {
    const { column: rawColumn, key, value = '' } = (req.body ?? {}) as { column?: unknown; key?: unknown; value?: unknown };
    try {
      if (!IDENT.test(req.params.table) || !optionalIdent(rawColumn) || typeof key !== 'string' || typeof value !== 'string') {
        return void res.status(400).json({ error: 'Invalid request' });
      }
      const column = typeof rawColumn === 'string' && rawColumn ? rawColumn : undefined;
      const policies = await tagPolicies();
      if (!assignable(key, column, policies)) {
        return void res.status(400).json({ error: `The app does not assign "${key}" on ${column ? 'columns' : 'tables'}` });
      }
      const allowed = policies.get(key)!.values;
      if (allowed.length ? !allowed.includes(value) : value !== '') {
        return void res.status(400).json({ error: `Invalid value for "${key}"` });
      }
      const target = `ALTER TABLE ${CATALOG}.${SCHEMA}.${req.params.table}${column ? ` ALTER COLUMN ${column}` : ''}`;
      await run(`${target} SET TAGS (${sqlString(key)} = ${sqlString(value)})`);
      res.json({ ok: true });
    } catch (e) {
      sendTagWriteError(res, e, typeof key === 'string' ? key : '');
    }
  });

  // query: ?key=...&column=...
  app.delete('/api/catalog/tables/:table/governed-tags', async (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key : '';
    const column = typeof req.query.column === 'string' ? req.query.column : '';
    try {
      if (!IDENT.test(req.params.table) || !optionalIdent(column)) {
        return void res.status(400).json({ error: 'Invalid request' });
      }
      if (!assignable(key, column, await tagPolicies())) {
        return void res.status(400).json({ error: `The app does not remove "${key}" on ${column ? 'columns' : 'tables'}` });
      }
      const target = `ALTER TABLE ${CATALOG}.${SCHEMA}.${req.params.table}${column ? ` ALTER COLUMN ${column}` : ''}`;
      await run(`${target} UNSET TAGS (${sqlString(key)})`);
      res.json({ ok: true });
    } catch (e) {
      sendTagWriteError(res, e, key);
    }
  });

  app.get('/api/catalog/tables/:table/preview', async (req, res) => {
    try {
      const { table } = req.params;
      if (!IDENT.test(table)) return void res.status(400).json({ error: 'Invalid table name' });
      res.json(await run(`SELECT * FROM ${CATALOG}.${SCHEMA}.${table} LIMIT 20`));
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // body: { column?: string, comment: string }; without column the table comment is set
  app.put('/api/catalog/tables/:table/comment', async (req, res) => {
    try {
      const { table } = req.params;
      const { column, comment } = req.body ?? {};
      if (!IDENT.test(table) || (column && !IDENT.test(column)) || typeof comment !== 'string') {
        return void res.status(400).json({ error: 'Invalid request' });
      }
      const target = column
        ? `COLUMN ${CATALOG}.${SCHEMA}.${table}.${column}`
        : `TABLE ${CATALOG}.${SCHEMA}.${table}`;
      await run(`COMMENT ON ${target} IS ${sqlString(comment)}`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/glossary', async (_req, res) => {
    try {
      res.json(await run(`SELECT * FROM ${GLOSSARY} ORDER BY term`));
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post('/api/glossary', async (req, res) => {
    try {
      const { term, definition, related_table = '', related_column = '', owner = '' } = req.body ?? {};
      if (!term || !definition) return void res.status(400).json({ error: 'term and definition are required' });
      const p = (name: string, value: string): Param => ({ name, value: String(value) });
      await run(`DELETE FROM ${GLOSSARY} WHERE lower(term) = lower(:term)`, [p('term', term)]);
      await run(
        `INSERT INTO ${GLOSSARY} VALUES (:term, :definition, :t, :c, :owner, current_timestamp())`,
        [p('term', term), p('definition', definition), p('t', related_table), p('c', related_column), p('owner', owner)],
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.delete('/api/glossary/:term', async (req, res) => {
    try {
      await run(`DELETE FROM ${GLOSSARY} WHERE lower(term) = lower(:term)`, [
        { name: 'term', value: req.params.term },
      ]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });
}
