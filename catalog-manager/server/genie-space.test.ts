import express from 'express';
import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { setupGenieSpaceRoutes } from './genie-space.js';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(), callTool: vi.fn(), close: vi.fn(), transports: vi.fn(),
}));
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class {
    connect = mocks.connect;
    callTool = mocks.callTool;
    close = mocks.close;
  },
}));
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', async (original) => {
  const actual = await original<typeof import('@modelcontextprotocol/sdk/client/streamableHttp.js')>();
  return {
    ...actual,
    StreamableHTTPClientTransport: class {
      constructor(...args: unknown[]) { mocks.transports(...args); }
    },
  };
});

const SPACE = 'space123';
const raw = (status: string, extra: Record<string, unknown> = {}) => ({
  conversationId: 'conversation1', messageId: 'message1', status, content: { textAttachments: [], queryAttachments: [], ...extra },
});
const headers = { 'x-forwarded-access-token': 'alice-token', 'x-forwarded-user': 'alice', 'x-forwarded-email': 'alice@example.test' };
let http: Server;
let base: string;

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv('DATABRICKS_HOST', 'https://workspace.example.test');
  vi.stubEnv('DATABRICKS_GENIE_SPACE_ID', SPACE);
  mocks.callTool.mockResolvedValue({ structuredContent: raw('EXECUTING_QUERY'), content: [] });
  const app = express();
  setupGenieSpaceRoutes(app);
  http = createServer(app);
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  const address = http.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) => http.close((error) => error ? reject(error) : resolve()));
  vi.unstubAllEnvs();
});

const post = (body: unknown, userHeaders: Record<string, string> = headers) => fetch(`${base}/api/ask`, {
  method: 'POST', headers: { ...userHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('Genie space MCP user-scoped routes', () => {
  test('exposes caller identity without the token and disables caching', async () => {
    const res = await fetch(`${base}/api/ask/identity`, { headers });
    expect(await res.json()).toEqual({ user: 'alice', email: 'alice@example.test', service: `genie-space-mcp/${SPACE}`, mode: 'on-behalf-of-user' });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
  test.each<Record<string, string>>([{}, { 'x-forwarded-user': 'alice' }, { 'x-forwarded-access-token': 'token' }])('rejects missing caller credentials without service-principal fallback: %j', async (userHeaders) => {
    expect((await post({ action: 'ask', question: 'test' }, userHeaders)).status).toBe(401);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  test.each([
    { action: 'ask', question: ' ' }, { action: 'unknown' }, { action: 'cancel', conversation_id: 'c' },
    { action: 'poll', conversation_id: '../other', response_id: 'r' }, { action: 'ask', question: 'q', space_id: 'other' },
  ])('rejects malformed or arbitrary requests: %j', async (body) => {
    const res = await post(body);
    if (res.status === 200) expect(String(mocks.callTool.mock.calls[0][0].name)).toBe(`query_space_${SPACE}`);
    else expect(res.status).toBe(400);
    expect(mocks.callTool.mock.calls.every(([c]) => c.name.endsWith(SPACE))).toBe(true);
  });
  test('targets only the configured space URL with the requesting user token; isolates users', async () => {
    expect((await post({ action: 'ask', question: 'Alerts?' })).status).toBe(200);
    expect((await post({ action: 'ask', question: 'More', conversation_id: 'conversation1' }, { ...headers, 'x-forwarded-access-token': 'bob-token', 'x-forwarded-user': 'bob' })).status).toBe(200);
    expect(String(mocks.transports.mock.calls[0][0])).toBe(`https://workspace.example.test/api/2.0/mcp/genie/${SPACE}`);
    expect(mocks.transports.mock.calls[0][1]).toMatchObject({ requestInit: { headers: { Authorization: 'Bearer alice-token' } } });
    expect(mocks.transports.mock.calls[1][1]).toMatchObject({ requestInit: { headers: { Authorization: 'Bearer bob-token' } } });
    expect(mocks.callTool.mock.calls[0][0]).toEqual({ name: `query_space_${SPACE}`, arguments: { query: 'Alerts?' } });
    expect(mocks.callTool.mock.calls[1][0]).toEqual({ name: `query_space_${SPACE}`, arguments: { query: 'More', conversation_id: 'conversation1' } });
    expect(mocks.close).toHaveBeenCalledTimes(2);
  });
  test('maps poll to the poll tool', async () => {
    expect((await post({ action: 'poll', conversation_id: 'c', response_id: 'm' })).status).toBe(200);
    expect(mocks.callTool.mock.calls[0][0]).toEqual({ name: `poll_response_${SPACE}`, arguments: { conversation_id: 'c', message_id: 'm' } });
  });
  test('maps answer text, SQL and statuses', async () => {
    mocks.callTool.mockResolvedValue({ structuredContent: raw('COMPLETED', {
      textAttachments: ['There are 3 open alerts.'], suggestedQuestions: ['By status?'],
      queryAttachments: [{ query: 'SELECT 1', description: 'count', statement_response: { result: 1 } }],
    }) });
    expect(await (await post({ action: 'ask', question: 'q' })).json()).toEqual({
      conversation_id: 'conversation1', response_id: 'message1', status: 'completed', final_answer: 'There are 3 open alerts.',
      query_items: [{ item_id: '0', sql: 'SELECT 1', description: 'count', statement_response: { result: 1 } }], suggested_questions: ['By status?'],
    });
    mocks.callTool.mockResolvedValue({ structuredContent: raw('FAILED') });
    expect(((await (await post({ action: 'ask', question: 'q' })).json()) as { status: string }).status).toBe('failed');
  });
  test('returns an explicit failure for malformed upstream response or tool error', async () => {
    mocks.callTool.mockResolvedValueOnce({ structuredContent: {} }).mockResolvedValueOnce({ isError: true, content: [] });
    expect((await post({ action: 'ask', question: 'test' })).status).toBe(502);
    expect((await post({ action: 'ask', question: 'test' })).status).toBe(502);
  });
  test('fails closed when the space is not configured', async () => {
    vi.stubEnv('DATABRICKS_GENIE_SPACE_ID', '');
    expect((await post({ action: 'ask', question: 'test' })).status).toBe(502);
    expect(mocks.callTool).not.toHaveBeenCalled();
  });
  test('preserves permission denial without trying other credentials', async () => {
    mocks.connect.mockRejectedValue(new StreamableHTTPError(403, 'Denied'));
    const res = await post({ action: 'ask', question: 'test' });
    expect(res.status).toBe(403);
    expect(mocks.callTool).not.toHaveBeenCalled();
    expect(mocks.connect).toHaveBeenCalledTimes(1);
  });
});
