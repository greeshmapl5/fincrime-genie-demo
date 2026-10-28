import express from 'express';
import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { setupGenieOneRoutes } from './genie-one.js';

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

const response = { conversation_id: 'conversation1', response_id: 'response1', status: 'in_progress' };
const headers = { 'x-forwarded-access-token': 'alice-token', 'x-forwarded-user': 'alice', 'x-forwarded-email': 'alice@example.test' };
let http: Server;
let base: string;

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv('DATABRICKS_HOST', 'https://workspace.example.test');
  vi.stubEnv('DATABRICKS_WORKSPACE_ID', '123');
  mocks.callTool.mockResolvedValue({ structuredContent: response, content: [] });
  const app = express();
  setupGenieOneRoutes(app);
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

describe('Genie One MCP user-scoped routes', () => {
  test('exposes caller identity without exposing the token and disables caching', async () => {
    const res = await fetch(`${base}/api/ask/identity`, { headers });
    expect(await res.json()).toEqual({ user: 'alice', email: 'alice@example.test', service: 'system.ai.genie_one_mcp', mode: 'on-behalf-of-user' });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
  test.each<Record<string, string>>([{}, { 'x-forwarded-user': 'alice' }, { 'x-forwarded-access-token': 'token' }])('rejects missing caller credentials without service-principal fallback: %j', async (userHeaders) => {
    expect((await post({ action: 'ask', question: 'test' }, userHeaders)).status).toBe(401);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  test.each([{ action: 'ask', question: ' ' }, { action: 'unknown' }, { action: 'poll', conversation_id: '../other', response_id: 'r' }])('rejects malformed or arbitrary tool requests: %j', async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  test('uses the new gateway URL and requesting user token; isolates successive users', async () => {
    expect((await post({ action: 'ask', question: 'Definition?' })).status).toBe(200);
    expect((await post({ action: 'ask', question: 'Follow up', conversation_id: 'conversation1' }, { ...headers, 'x-forwarded-access-token': 'bob-token', 'x-forwarded-user': 'bob' })).status).toBe(200);
    expect(String(mocks.transports.mock.calls[0][0])).toBe('https://workspace.example.test/ai-gateway/mcp-services/system.ai.genie_one_mcp?o=123');
    expect(mocks.transports.mock.calls[0][1]).toMatchObject({ requestInit: { headers: { Authorization: 'Bearer alice-token' } } });
    expect(mocks.transports.mock.calls[1][1]).toMatchObject({ requestInit: { headers: { Authorization: 'Bearer bob-token' } } });
    expect(mocks.callTool.mock.calls[1][0]).toEqual({ name: 'genie_ask', arguments: { question: 'Follow up', conversation_id: 'conversation1' } });
    expect(mocks.close).toHaveBeenCalledTimes(2);
  });
  test.each([
    [{ action: 'poll', conversation_id: 'c', response_id: 'r' }, 'genie_poll_response'],
    [{ action: 'cancel', conversation_id: 'c' }, 'genie_cancel_response'],
    [{ action: 'query', conversation_id: 'c', response_id: 'r', item_id: 'pub_output' }, 'genie_get_query_result'],
  ])('maps only supported actions: %j', async (body, tool) => {
    expect((await post(body)).status).toBe(200);
    expect(mocks.callTool.mock.calls[0][0]).toMatchObject({ name: tool });
  });
  test('preserves exact Page citations, distinct definition and query details', async () => {
    const answer = { ...response, status: 'completed', final_answer: '0.94 means 94 percent. [Page](https://workspace.example.test/one/discover/pages/page1)', query_items: [{ item_id: 'pub_1_output', sql: 'SELECT 1' }] };
    mocks.callTool.mockResolvedValue({ structuredContent: answer });
    expect(await (await post({ action: 'poll', conversation_id: 'c', response_id: 'r' })).json()).toEqual(answer);
  });
  test('returns an explicit failure for malformed upstream response or tool error', async () => {
    mocks.callTool.mockResolvedValueOnce({ structuredContent: {} }).mockResolvedValueOnce({ isError: true, content: [] });
    expect((await post({ action: 'ask', question: 'test' })).status).toBe(502);
    expect((await post({ action: 'ask', question: 'test' })).status).toBe(502);
  });
  test('preserves permission denial without trying other credentials', async () => {
    mocks.connect.mockRejectedValue(new StreamableHTTPError(403, 'Denied'));
    const res = await post({ action: 'ask', question: 'test' });
    expect(res.status).toBe(403);
    expect(mocks.callTool).not.toHaveBeenCalled();
    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(mocks.close).toHaveBeenCalled();
  });
});
