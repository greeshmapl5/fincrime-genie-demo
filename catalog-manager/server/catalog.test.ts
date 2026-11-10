import express from 'express';
import { createServer } from 'node:http';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('@databricks/sdk-experimental', () => ({
  WorkspaceClient: class {
    statementExecution = {
      executeStatement: vi.fn().mockResolvedValue({ status: { state: 'SUCCEEDED' } }),
    };
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each([
  ['fincrime', 'gold'],
  ['demo_catalog', 'review_schema'],
])('returns configured catalog %s and schema %s independently of table rows', async (catalog, schema) => {
  vi.stubEnv('CATALOG_NAME', catalog);
  vi.stubEnv('SCHEMA_NAME', schema);
  const { setupCatalogRoutes } = await import('./catalog.js');
  const app = express();
  await setupCatalogRoutes(app);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test address');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/catalog/context`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ catalog, schema });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
