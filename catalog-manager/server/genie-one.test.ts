import express from 'express';
import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { setupGenieOneRoutes } from './genie-one.js';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(), callTool: vi.fn(), close: vi.fn(), transports: vi.fn(),
}));
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class { connect = mocks.connect; callTool = mocks.callTool; close = mocks.close; },
}));
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', async (original) => ({
  ...await original<typeof import('@modelcontextprotocol/sdk/client/streamableHttp.js')>(),
  StreamableHTTPClientTransport: class {
    constructor(...args: unknown[]) { mocks.transports(...args); }
  },
}));
const response = { conversation_id: 'c', response_id: 'r', status: 'in_progress' };
const headers = { 'x-forwarded-user': 'alice', 'x-forwarded-access-token': 'alice-token' };
let http: Server;
let base: string;
beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv('DATABRICKS_HOST', 'https://workspace.example.test');
  vi.stubEnv('DATABRICKS_WORKSPACE_ID', '123');
  mocks.callTool.mockResolvedValue({ structuredContent: response });
  const app = express();
  setupGenieOneRoutes(app);
  http = createServer(app);
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  const address = http.address();
  if (!address || typeof address === 'string') throw new Error('Missing test address');
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) => http.close((e) => e ? reject(e) : resolve()));
  vi.unstubAllEnvs();
});
const post = (body: unknown, userHeaders: Record<string, string> = headers) => fetch(`${base}/api/ask`, {
  method: 'POST', headers: { ...userHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
describe('Genie One user-scoped MCP', () => {
  test('discloses service and caller without token, with no caching', async () => {
    const res = await fetch(`${base}/api/ask/identity`, { headers });
    expect(await res.json()).toEqual({ user: 'alice', email: null, service: 'system.ai.genie_one_mcp', mode: 'on-behalf-of-user' });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
  test.each<Record<string, string>>([{}, { 'x-forwarded-user': 'alice' }, { 'x-forwarded-access-token': 'token' }])('rejects missing credentials: %j', async (userHeaders) => {
    expect((await post({ action: 'ask', question: 'test' }, userHeaders)).status).toBe(401);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  test.each([{ action: 'ask', question: ' ' }, { action: 'unknown' }, { action: 'poll', conversation_id: '../other', response_id: 'r' }])('rejects invalid requests: %j', async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  test('uses Genie One and isolates caller tokens', async () => {
    await post({ action: 'ask', question: 'Definition?' });
    await post({ action: 'ask', question: 'Follow up', conversation_id: 'c' }, { ...headers, 'x-forwarded-user': 'bob', 'x-forwarded-access-token': 'bob-token' });
    expect(String(mocks.transports.mock.calls[0][0])).toBe('https://workspace.example.test/ai-gateway/mcp-services/system.ai.genie_one_mcp?o=123');
    expect(mocks.transports.mock.calls[0][1]).toMatchObject({ requestInit: { headers: { Authorization: 'Bearer alice-token' } } });
    expect(mocks.transports.mock.calls[1][1]).toMatchObject({ requestInit: { headers: { Authorization: 'Bearer bob-token' } } });
    expect(mocks.callTool.mock.calls[1][0]).toEqual({ name: 'genie_ask', arguments: { question: 'Follow up', conversation_id: 'c' } });
    expect(mocks.close).toHaveBeenCalledTimes(2);
  });
  test('polls and preserves citations, SQL, deep links and partial status', async () => {
    const answer = { ...response, status: 'incomplete', final_answer: '[Definition](https://workspace.example.test/page/1)', deep_link: 'https://workspace.example.test/genie/1', query_items: [{ item_id: 'q', sql: 'SELECT 1' }] };
    mocks.callTool.mockResolvedValue({ structuredContent: answer });
    expect(await (await post({ action: 'poll', conversation_id: 'c', response_id: 'r' })).json()).toEqual(answer);
    expect(mocks.callTool.mock.calls[0][0]).toEqual({ name: 'genie_poll_response', arguments: { conversation_id: 'c', response_id: 'r' } });
  });
  test('fails explicitly on malformed responses and tool errors', async () => {
    mocks.callTool.mockResolvedValueOnce({ structuredContent: {} }).mockResolvedValueOnce({ isError: true });
    expect((await post({ action: 'ask', question: 'q' })).status).toBe(502);
    expect((await post({ action: 'ask', question: 'q' })).status).toBe(502);
  });
  test.each(['', 'invalid'])('fails closed for missing/invalid workspace: %s', async (workspace) => {
    vi.stubEnv('DATABRICKS_WORKSPACE_ID', workspace);
    expect((await post({ action: 'ask', question: 'q' })).status).toBe(502);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  test.each([401, 403])('preserves %s without fallback', async (code) => {
    mocks.connect.mockRejectedValue(new StreamableHTTPError(code, 'Denied'));
    expect((await post({ action: 'ask', question: 'q' })).status).toBe(code);
    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(mocks.callTool).not.toHaveBeenCalled();
  });
});
