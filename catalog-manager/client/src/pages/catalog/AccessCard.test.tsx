import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AccessView, type AccessActions } from './AccessCard';
import { formatWhen, type AccessRequest, type TableAccess } from './access';

// AppKit's React entry also loads the chart bundle, which Node cannot resolve outside Vite.
vi.mock('@databricks/appkit-ui/react', async () => {
  const { createElement } = await import('react');
  const stub = (tag: string) => (props: Record<string, unknown>) => createElement(tag, props);
  return {
    Button: stub('button'),
    Card: stub('div'),
    CardContent: stub('div'),
    CardHeader: stub('div'),
    CardTitle: stub('div'),
    Skeleton: stub('div'),
  };
});

const request = (over: Partial<AccessRequest> = {}): AccessRequest => ({
  id: 'r1',
  table: 'accounts',
  requester: 'ana@example.com',
  grantee: 'ana@example.com',
  granteeType: 'user',
  privilege: 'SELECT',
  reason: 'AML case review',
  status: 'pending',
  createdAt: '2026-11-10T09:05:00.000Z',
  decidedBy: null,
  decidedAt: null,
  note: null,
  ...over,
});

const requester: TableAccess = {
  me: 'ana@example.com',
  owner: 'owner@example.com',
  canManage: false,
  hasAccess: false,
  requests: [],
  pending: [],
  grants: [],
};

const manager: TableAccess = {
  me: 'owner@example.com',
  owner: 'owner@example.com',
  canManage: true,
  hasAccess: true,
  requests: [],
  pending: [request({ id: 'r2', grantee: 'daiwt2026', granteeType: 'group' })],
  grants: [
    { principal: 'daiwt2026', privilege: 'SELECT', source: 'table', isApp: false, removable: true },
    { principal: 'app-sp-id', privilege: 'SELECT', source: 'schema', isApp: true, removable: false },
    { principal: 'lead@example.com', privilege: 'ALL PRIVILEGES', source: 'catalog', isApp: false, removable: false },
  ],
};

const ok = () => Promise.resolve(true);
const actions: AccessActions = {
  onRequest: ok,
  onCancel: ok,
  onApprove: ok,
  onReject: ok,
  onGrant: ok,
  onRemove: ok,
};
const render = (access: TableAccess, busy = false, groups = ['capgemini-gen-ai', 'daiwt2026']) =>
  renderToStaticMarkup(<AccessView access={access} groups={groups} busy={busy} actions={actions} />);

describe('AccessView', () => {
  it('tells requesters whether they can read and who approves', () => {
    const html = render(requester);
    expect(html).toContain('You cannot read this data product yet.');
    expect(html).toContain('Approved by <strong class="text-foreground">owner@example.com</strong>');
    expect(html).toMatch(/<input type="radio"[^>]*checked=""[^>]*\/>Me \(ana@example.com\)/);
    expect(html).toMatch(/<textarea[^>]*required=""[^>]*maxlength="500"/i);
    expect(html).toContain('<option value="daiwt2026"></option>');
    expect(html).not.toContain('Requests to review');
    expect(html).not.toContain('Who can read this data product');
  });

  it('suggests a group request to people who can already read, choosing only from listed groups', () => {
    const html = render(manager);
    expect(html).toContain('✓ You can read this data product.');
    expect(html).toMatch(/<input type="radio"[^>]*checked=""[^>]*\/>An account group/);
    expect(html).toMatch(
      /<select[^>]*required=""[^>]*><option value=""[^>]*>Choose a group<\/option><option value="capgemini-gen-ai">capgemini-gen-ai<\/option><option value="daiwt2026">daiwt2026<\/option><\/select>/
    );
    expect(html).not.toContain('account users');
  });

  it('offers only requests for yourself when no groups are listed', () => {
    const html = render(manager, false, []);
    expect(html).not.toContain('An account group');
    expect(html).not.toContain('<select');
    expect(html).toMatch(/<input type="radio"[^>]*checked=""[^>]*\/>Me \(owner@example.com\)/);
  });

  it('lists your requests with their status in text and lets you cancel pending ones', () => {
    const html = render({
      ...requester,
      requests: [
        request(),
        request({
          id: 'r0',
          status: 'approved',
          decidedBy: 'owner@example.com',
          decidedAt: '2026-11-10T10:00:00.000Z',
          note: 'Granted for the case',
        }),
      ],
    });
    expect(html).toContain('>Pending</span>');
    expect(html).toContain('>Approved</span>');
    expect(html).toContain('2026-11-10 09:05 UTC');
    expect(html).toContain('Approved by owner@example.com on 2026-11-10 10:00 UTC: Granted for the case');
    expect(html.match(/aria-label="Cancel request for ana@example.com"/g)).toHaveLength(1);
  });

  it('explains USE CATALOG only when an approval has not taken effect', () => {
    const approved = { ...requester, requests: [request({ status: 'approved', decidedBy: 'owner@example.com' })] };
    expect(render(approved)).toContain('ask the catalog owner for USE CATALOG');
    expect(render({ ...approved, hasAccess: true })).not.toContain('ask the catalog owner for USE CATALOG');
  });

  it('gives approvers the pending requests and who can read the data product', () => {
    const html = render(manager);
    expect(html).toContain('Requests to review (1)');
    expect(html).toContain('<strong>ana@example.com</strong> asks read access for <strong>daiwt2026</strong> (group)');
    expect(html).toContain('aria-label="Approve request from ana@example.com for daiwt2026"');
    expect(html).toContain('aria-label="Reject request from ana@example.com for daiwt2026"');
    expect(html).toMatch(
      /Grant to \(user email or listed group\)<input class="[^"]*" list="[^"]+" autoComplete="off" value="daiwt2026"/i
    );
    expect(html).toContain('Catalog Manager app (service principal)');
    expect(html).not.toContain('app-sp-id');
    expect(html).toContain('<td class="py-1 pr-4">Whole schema</td>');
    expect(html).toContain('<td class="py-1 pr-4">Whole catalog</td>');
    expect(html).toContain('<td class="py-1 pr-4">This data product</td>');
    expect(html.match(/aria-label="Remove read access for [^"]+"/g)).toEqual([
      'aria-label="Remove read access for daiwt2026"',
    ]);
    expect(html).toContain('Grant read access');
  });

  it('does not let approvers decide their own requests', () => {
    const html = render({
      ...manager,
      pending: [request({ id: 'r3', requester: 'Owner@example.com', grantee: 'daiwt2026', granteeType: 'group' })],
    });
    expect(html).toContain('This is your own request, so another approver must decide it.');
    expect(html).not.toContain('aria-label="Approve request');
    expect(html).not.toContain('aria-label="Reject request');
  });

  it('keeps every button focusable while a change is saving', () => {
    const html = render({ ...manager, requests: [request()] }, true);
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(4);
    for (const button of buttons) expect(button).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/<button[^>]* disabled=""/);
  });

  it('shows empty states for approvers', () => {
    const html = render({ ...manager, pending: [], grants: [] });
    expect(html).toContain('Requests to review (0)');
    expect(html).toContain('No requests waiting.');
    expect(html).toContain('No read grants yet.');
  });
});

describe('formatWhen', () => {
  it.each([
    ['2026-11-10T09:05:00.000Z', '2026-11-10 09:05 UTC'],
    ['2026-11-10T10:05:00+01:00', '2026-11-10 09:05 UTC'],
    ['2026-11-10 09:05:30', '2026-11-10 09:05 UTC'],
    ['soon', 'soon'],
    [null, ''],
  ])('formats %s', (value, expected) => {
    expect(formatWhen(value)).toBe(expected);
  });
});
