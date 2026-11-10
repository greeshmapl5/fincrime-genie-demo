import type { Application, Request } from 'express';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { askRequestSchema, genieResponseSchema } from '../shared/genie-one.js';

export function callerIdentity(req: Request) {
  const token = req.header('x-forwarded-access-token')?.trim();
  const user = req.header('x-forwarded-user')?.trim();
  if (!token || !user) return null;
  return { token, user, email: req.header('x-forwarded-email') ?? null };
}

export function mcpUrl() {
  const configuredHost = process.env.DATABRICKS_HOST;
  if (!configuredHost) throw new Error('DATABRICKS_HOST is required for Genie One MCP.');
  const host = new URL(configuredHost);
  const workspace = process.env.DATABRICKS_WORKSPACE_ID;
  if (host.protocol !== 'https:' || !workspace || !/^\d+$/.test(workspace)) {
    throw new Error('Configure an HTTPS DATABRICKS_HOST and numeric DATABRICKS_WORKSPACE_ID.');
  }
  return new URL(`/ai-gateway/mcp-services/system.ai.genie_one_mcp?o=${workspace}`, host);
}

export function setupGenieOneRoutes(app: Application) {
  app.use('/api/ask', express.json({ limit: '32kb' }));
  app.use('/api/ask', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/ask/identity', (req, res) => {
    const caller = callerIdentity(req);
    if (!caller) return void res.status(401).json({ error: 'Sign in and authorize the app to use Genie as you.' });
    res.json({ user: caller.user, email: caller.email, service: 'system.ai.genie_one_mcp', mode: 'on-behalf-of-user' });
  });
  app.post('/api/ask', async (req, res) => {
    const caller = callerIdentity(req);
    if (!caller) return void res.status(401).json({ error: 'Missing signed-in user token. Sign in and authorize the ai-gateway scope; no service-principal fallback is allowed.' });
    const parsed = askRequestSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: 'Invalid Genie request.' });
    // Never share clients, MCP sessions or credentials between callers.
    const client = new Client({ name: 'catalog-manager', version: '1.0.0' });
    let stage = 'configuration';
    try {
      const request = parsed.data;
      const { action, ...args } = request;
      const call = request.action === 'ask'
        ? { name: 'genie_ask', arguments: args }
        : { name: 'genie_poll_response', arguments: args };
      const transport = new StreamableHTTPClientTransport(mcpUrl(), {
        requestInit: { headers: { Authorization: `Bearer ${caller.token}` }, redirect: 'error' },
        fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(120000)]) }),
      });
      stage = 'connect';
      await client.connect(transport);
      stage = 'call-tool';
      const result = await client.callTool(call, undefined, { timeout: 120000 });
      if (result.isError) {
        console.error('Genie One MCP tool failed', { action, user: caller.user });
        return void res.status(502).json({ error: 'Genie One rejected the request.' });
      }
      stage = 'validate-response';
      res.json(genieResponseSchema.parse(result.structuredContent));
    } catch (error) {
      const status = error instanceof StreamableHTTPError && (error.code === 401 || error.code === 403) ? error.code : 502;
      console.error('Genie One MCP request failed', { status, stage, user: caller.user, errorType: error instanceof Error ? error.name : 'unknown' });
      res.status(status).json({
        error: status === 401 || status === 403
          ? 'Genie One access denied. Reauthorize the app for the ai-gateway scope and check your EXECUTE permission on system.ai.genie_one_mcp and domain/data access.'
          : 'Genie One request failed or returned an unsupported response. Retry or check the app logs.',
      });
    } finally {
      await client.close();
    }
  });
}
