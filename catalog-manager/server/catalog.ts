import { WorkspaceClient } from '@databricks/sdk-experimental';
import type { Application } from 'express';

const CATALOG = process.env.CATALOG_NAME ?? 'fincrime';
const SCHEMA = process.env.SCHEMA_NAME ?? 'gold';
const WAREHOUSE = process.env.DATABRICKS_WAREHOUSE_ID ?? '';
const GLOSSARY = `${CATALOG}.${SCHEMA}.business_glossary`;
const IDENT = /^[A-Za-z0-9_]+$/;
const TAG = 'classification';
const LEVELS = ['Public', 'Internal', 'Confidential', 'PII', 'Restricted'];

type Param = { name: string; value: string };

const client = new WorkspaceClient({});

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

const quoteComment = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export async function setupCatalogRoutes(app: Application) {
  await run(
    `CREATE TABLE IF NOT EXISTS ${GLOSSARY} (
       term STRING, definition STRING, related_table STRING, related_column STRING,
       owner STRING, updated_at TIMESTAMP
     ) COMMENT 'Business glossary maintained from the catalog-manager app'`,
  );

  app.get('/api/catalog/tables', async (_req, res) => {
    try {
      const rows = await run(
        `SELECT t.table_name, t.comment, g.tag_value AS classification
         FROM ${CATALOG}.information_schema.tables t
         LEFT JOIN ${CATALOG}.information_schema.table_tags g
           ON g.schema_name = t.table_schema AND g.table_name = t.table_name AND g.tag_name = :tag
         WHERE t.table_schema = :schema ORDER BY t.table_name`,
        [
          { name: 'schema', value: SCHEMA },
          { name: 'tag', value: TAG },
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
      await run(`COMMENT ON ${target} IS ${quoteComment(comment)}`);
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
