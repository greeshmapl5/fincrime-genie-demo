import type { Application, Request } from 'express';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { askRequestSchema, genieResponseSchema, spaceToolResultSchema, type GenieResponse } from '../shared/genie-space.js';

export function callerIdentity(req: Request) {
  const token = req.header('x-forwarded-access-token')?.trim();
  const user = req.header('x-forwarded-user')?.trim();
  if (!token || !user) return null;
  return { token, user, email: req.header('x-forwarded-email') ?? null };
}

// The space is fixed by the app's genie-space resource; callers cannot choose another one.
export function spaceId() {
  const id = process.env.DATABRICKS_GENIE_SPACE_ID;
  if (!id || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('DATABRICKS_GENIE_SPACE_ID is required.');
  return id;
}

export function mcpUrl() {
  const configuredHost = process.env.DATABRICKS_HOST;
  if (!configuredHost) throw new Error('DATABRICKS_HOST is required for the Genie space MCP.');
  const host = new URL(configuredHost);
  if (host.protocol !== 'https:') throw new Error('DATABRICKS_HOST must be HTTPS.');
  return new URL(`/api/2.0/mcp/genie/${spaceId()}`, host);
}

function mapStatus(status: string): GenieResponse['status'] {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return 'completed';
  if (s === 'FAILED' || s === 'QUERY_RESULT_EXPIRED') return 'failed';
  if (s === 'CANCELLED') return 'cancelled';
  return 'in_progress';
}

export function toResponse(raw: unknown): GenieResponse {
  const r = spaceToolResultSchema.parse(raw);
  const text = r.content?.textAttachments?.filter((t) => t.trim()).join('\n\n');
  return genieResponseSchema.parse({
    conversation_id: r.conversationId,
    response_id: r.messageId,
    status: mapStatus(r.status),
    final_answer: text || null,
    query_items: r.content?.queryAttachments?.map((q, n) => ({ item_id: String(n), sql: q.query, description: q.description, statement_response: q.statement_response })) ?? [],
    suggested_questions: r.content?.suggestedQuestions ?? [],
  });
}

export function setupGenieSpaceRoutes(app: Application) {
  app.use('/api/ask', express.json({ limit: '32kb' }));
  app.use('/api/ask', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/ask/identity', (req, res) => {
    const caller = callerIdentity(req);
    if (!caller) return void res.status(401).json({ error: 'Sign in and authorize the app to use Genie as you.' });
    res.json({ user: caller.user, email: caller.email, service: `genie-space-mcp/${spaceId()}`, mode: 'on-behalf-of-user' });
  });
  app.post('/api/ask', async (req, res) => {
    const caller = callerIdentity(req);
    if (!caller) return void res.status(401).json({ error: 'Missing signed-in user token. Sign in and authorize the genie scope; no service-principal fallback is allowed.' });
    const parsed = askRequestSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: 'Invalid Genie request.' });
    // Never share clients, MCP sessions or credentials between callers.
    const client = new Client({ name: 'catalog-manager', version: '1.0.0' });
    let stage = 'configuration';
    try {
      const id = spaceId();
      const request = parsed.data;
      const call = request.action === 'ask'
        ? { name: `query_space_${id}`, arguments: { query: request.question, ...(request.conversation_id ? { conversation_id: request.conversation_id } : {}) } }
        : { name: `poll_response_${id}`, arguments: { conversation_id: request.conversation_id, message_id: request.response_id } };
      const transport = new StreamableHTTPClientTransport(mcpUrl(), {
        requestInit: { headers: { Authorization: `Bearer ${caller.token}` }, redirect: 'error' },
        fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(120000)]) }),
      });
      stage = 'connect';
      await client.connect(transport);
      stage = 'call-tool';
      const result = await client.callTool(call, undefined, { timeout: 120000 });
      if (result.isError) {
        console.error('Genie space MCP tool failed', { action: request.action, user: caller.user });
        return void res.status(502).json({ error: 'The Genie space rejected the request.' });
      }
      stage = 'validate-response';
      res.json(toResponse(result.structuredContent));
    } catch (error) {
      const status = error instanceof StreamableHTTPError && (error.code === 401 || error.code === 403) ? error.code : 502;
      console.error('Genie space MCP request failed', { status, stage, user: caller.user, errorType: error instanceof Error ? error.name : 'unknown', detail: error instanceof Error ? error.message.slice(0, 300) : undefined });
      res.status(status).json({
        error: status === 401 || status === 403
          ? 'Genie access denied. Reauthorize the genie scope and check your CAN RUN permission on the Genie space and its data.'
          : 'The Genie space request failed or returned an unsupported response. Retry or check the app logs.',
      });
    } finally {
      await client.close();
    }
  });
}
