import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@databricks/appkit-ui/react';
import { api } from './api';
import {
  MAX_TEXT,
  SOURCE_LABEL,
  STATUS_LABEL,
  formatWhen,
  principalLabel,
  samePerson,
  type AccessGrant,
  type AccessRequest,
  type TableAccess,
} from './access';

export type AccessActions = {
  onRequest: (reason: string, group?: string) => Promise<boolean>;
  onCancel: (request: AccessRequest) => Promise<boolean>;
  onApprove: (request: AccessRequest, grantee: string, note: string) => Promise<boolean>;
  onReject: (request: AccessRequest, note: string) => Promise<boolean>;
  onGrant: (principal: string) => Promise<boolean>;
  onRemove: (principal: string) => Promise<boolean>;
};

const FIELD = 'border rounded px-2 py-1 bg-background';
const BUSY = 'aria-disabled:opacity-60';
const STATUS_STYLE: Record<string, string> = {
  pending: 'border-primary/40 bg-primary/10',
  approved: 'border-success/50 bg-success/10',
  rejected: 'border-destructive/40 bg-destructive/5 text-destructive',
  cancelled: 'bg-muted',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] ?? 'bg-muted'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function RequestForm({
  me,
  forGroup,
  groups,
  busy,
  onRequest,
}: {
  me: string;
  forGroup: boolean;
  groups: string[];
  busy: boolean;
  onRequest: AccessActions['onRequest'];
}) {
  const id = useId();
  const [target, setTarget] = useState<'me' | 'group'>(forGroup ? 'group' : 'me');
  const [group, setGroup] = useState('');
  const [reason, setReason] = useState('');
  // Groups load separately; without any, requests are for yourself only.
  const forListedGroup = target === 'group' && groups.length > 0;
  return (
    <form
      className="space-y-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy || (forListedGroup && !group)) return;
        void onRequest(reason, forListedGroup ? group : undefined).then((ok) => {
          if (ok) setReason('');
        });
      }}
    >
      <fieldset className="space-y-1">
        <legend className="font-medium">Request read access for</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`${id}-for`}
              className="accent-primary"
              checked={!forListedGroup}
              onChange={() => setTarget('me')}
            />
            Me ({me})
          </label>
          {groups.length > 0 && (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${id}-for`}
                className="accent-primary"
                checked={forListedGroup}
                onChange={() => setTarget('group')}
              />
              An account group
            </label>
          )}
        </div>
      </fieldset>
      {forListedGroup && (
        <label className="flex flex-col gap-1">
          Account group
          <select className={FIELD} required value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">Choose a group</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1">
        Why do you need access?
        <textarea
          className={FIELD}
          required
          rows={2}
          maxLength={MAX_TEXT}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {/* aria-disabled keeps keyboard focus on the button while a change is saving */}
      <Button type="submit" size="sm" aria-disabled={busy || undefined} className={BUSY}>
        Request access
      </Button>
    </form>
  );
}

function PendingItem({
  request,
  me,
  listId,
  busy,
  onApprove,
  onReject,
  beforeDecide,
}: {
  request: AccessRequest;
  me: string;
  listId: string;
  busy: boolean;
  onApprove: AccessActions['onApprove'];
  onReject: AccessActions['onReject'];
  beforeDecide: () => void;
}) {
  const [grantee, setGrantee] = useState(request.grantee);
  const [note, setNote] = useState('');
  const decide = (action: () => Promise<boolean>) => {
    if (busy) return;
    // The request leaves the list once decided; keep keyboard focus in this section.
    beforeDecide();
    void action();
  };
  const own = samePerson(request.requester, me);
  return (
    <li className="rounded-lg border p-3 text-sm space-y-2">
      <p>
        <strong>{request.requester}</strong> asks read access for <strong>{request.grantee}</strong>
        {request.granteeType && ` (${request.granteeType})`}
        <span className="text-muted-foreground"> · {formatWhen(request.createdAt)}</span>
      </p>
      <p className="break-words">“{request.reason}”</p>
      {own ? (
        <p className="text-muted-foreground">
          This is your own request, so another approver must decide it. You can cancel it under Your requests.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            Grant to (user email or listed group)
            <input
              className={FIELD}
              list={listId}
              autoComplete="off"
              value={grantee}
              onChange={(e) => setGrantee(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-48">
            Note to the requester (optional)
            <input className={FIELD} maxLength={MAX_TEXT} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Button
            size="sm"
            aria-disabled={busy || undefined}
            className={BUSY}
            aria-label={`Approve request from ${request.requester} for ${request.grantee}`}
            onClick={() => decide(() => onApprove(request, grantee.trim() || request.grantee, note))}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-disabled={busy || undefined}
            className={BUSY}
            aria-label={`Reject request from ${request.requester} for ${request.grantee}`}
            onClick={() => decide(() => onReject(request, note))}
          >
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

function GrantsTable({
  grants,
  busy,
  onRemove,
}: {
  grants: AccessGrant[];
  busy: boolean;
  onRemove: (principal: string) => void;
}) {
  if (grants.length === 0) {
    return <p className="text-sm text-muted-foreground">No read grants yet. Only the owner can read it.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="pb-1 pr-4 font-medium">User, group or app</th>
          <th className="pb-1 pr-4 font-medium">Privilege</th>
          <th className="pb-1 pr-4 font-medium">Granted on</th>
          <th className="pb-1">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {grants.map((g) => (
          <tr key={`${g.principal}|${g.privilege}|${g.source}`} className="border-t">
            <td className="py-1 pr-4 break-all">{principalLabel(g)}</td>
            <td className="py-1 pr-4">{g.privilege}</td>
            <td className="py-1 pr-4">{SOURCE_LABEL[g.source] ?? g.source}</td>
            <td className="py-1 text-right">
              {g.removable && (
                <Button
                  size="sm"
                  variant="outline"
                  aria-disabled={busy || undefined}
                  className={BUSY}
                  aria-label={`Remove read access for ${g.principal}`}
                  onClick={() => !busy && onRemove(g.principal)}
                >
                  Remove
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GrantForm({ listId, busy, onGrant }: { listId: string; busy: boolean; onGrant: AccessActions['onGrant'] }) {
  const [principal, setPrincipal] = useState('');
  return (
    <form
      className="flex flex-wrap items-end gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy || !principal.trim()) return;
        void onGrant(principal.trim()).then((ok) => {
          if (ok) setPrincipal('');
        });
      }}
    >
      <label className="flex flex-col gap-1">
        User email or listed group
        <input
          className={FIELD}
          list={listId}
          required
          autoComplete="off"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
        />
      </label>
      <Button type="submit" size="sm" aria-disabled={busy || undefined} className={BUSY}>
        Grant read access
      </Button>
    </form>
  );
}

export function AccessView({
  access,
  groups,
  busy,
  actions,
}: {
  access: TableAccess;
  groups: string[];
  busy: boolean;
  actions: AccessActions;
}) {
  const id = useId();
  const listId = `${id}-groups`;
  const mineHeading = useRef<HTMLHeadingElement>(null);
  const pendingHeading = useRef<HTMLHeadingElement>(null);
  const grantsHeading = useRef<HTMLHeadingElement>(null);
  const approvedForMe = access.requests.some((r) => r.status === 'approved' && r.grantee === access.me);
  return (
    <div className="space-y-5">
      <datalist id={listId}>
        {groups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <section aria-labelledby={`${id}-you`} className="space-y-2">
        <h3 id={`${id}-you`} className="text-sm font-semibold">
          Your access
        </h3>
        <p className="text-sm">
          {access.hasAccess ? '✓ You can read this data product.' : 'You cannot read this data product yet.'}
        </p>
        {!access.hasAccess && approvedForMe && (
          <p className="text-sm text-muted-foreground">
            Your request was approved. If you still cannot query it, ask the catalog owner for USE CATALOG.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Approved by {access.owner ? <strong className="text-foreground">{access.owner}</strong> : 'the owner'} or
          anyone who can manage grants on it.
        </p>
        <RequestForm
          me={access.me}
          forGroup={access.hasAccess}
          groups={groups}
          busy={busy}
          onRequest={actions.onRequest}
        />
      </section>
      {access.requests.length > 0 && (
        <section aria-labelledby={`${id}-mine`} className="space-y-2">
          <h3 id={`${id}-mine`} ref={mineHeading} tabIndex={-1} className="text-sm font-semibold focus:outline-none">
            Your requests
          </h3>
          <ul className="space-y-2">
            {access.requests.map((r) => (
              <li key={r.id} className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span>
                    For <strong>{r.grantee}</strong>
                  </span>
                  <span className="text-muted-foreground">{formatWhen(r.createdAt)}</span>
                  {r.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-disabled={busy || undefined}
                      className={`ml-auto ${BUSY}`}
                      aria-label={`Cancel request for ${r.grantee}`}
                      onClick={() => {
                        if (busy) return;
                        mineHeading.current?.focus();
                        void actions.onCancel(r);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <p className="break-words text-muted-foreground">“{r.reason}”</p>
                {r.decidedBy && (r.status === 'approved' || r.status === 'rejected') && (
                  <p className="break-words">
                    {STATUS_LABEL[r.status]} by {r.decidedBy}
                    {r.decidedAt && ` on ${formatWhen(r.decidedAt)}`}
                    {r.note && `: ${r.note}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {access.canManage && (
        <>
          <section aria-labelledby={`${id}-pending`} className="space-y-2">
            <h3
              id={`${id}-pending`}
              ref={pendingHeading}
              tabIndex={-1}
              className="text-sm font-semibold focus:outline-none"
            >
              Requests to review ({access.pending.length})
            </h3>
            {access.pending.length > 0 ? (
              <ul className="space-y-2">
                {access.pending.map((r) => (
                  <PendingItem
                    key={r.id}
                    request={r}
                    me={access.me}
                    listId={listId}
                    busy={busy}
                    onApprove={actions.onApprove}
                    onReject={actions.onReject}
                    beforeDecide={() => pendingHeading.current?.focus()}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No requests waiting.</p>
            )}
          </section>
          <section aria-labelledby={`${id}-grants`} className="space-y-2">
            <h3
              id={`${id}-grants`}
              ref={grantsHeading}
              tabIndex={-1}
              className="text-sm font-semibold focus:outline-none"
            >
              Who can read this data product
            </h3>
            <p className="text-sm text-muted-foreground">
              Approving or granting adds USE SCHEMA and SELECT, as you. Readers also need USE CATALOG, which only the
              catalog owner can grant.
            </p>
            <GrantsTable
              grants={access.grants}
              busy={busy}
              onRemove={(principal) => {
                grantsHeading.current?.focus();
                void actions.onRemove(principal);
              }}
            />
            <GrantForm listId={listId} busy={busy} onGrant={actions.onGrant} />
          </section>
        </>
      )}
    </div>
  );
}

export function AccessCard({ table, onChanged }: { table: string; onChanged: () => void }) {
  const [access, setAccess] = useState<TableAccess | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const busyRef = useRef(false);
  const base = `/api/catalog/tables/${table}/access`;

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoadError(null);
      try {
        const next = await api<TableAccess>(`/api/catalog/tables/${table}/access`, { signal });
        if (!signal?.aborted) setAccess(next);
      } catch (e) {
        if (!signal?.aborted) setLoadError((e as Error).message);
      }
    },
    [table]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    api<{ groups: string[] }>('/api/catalog/access/groups', { signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted) setGroups(body.groups);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [load]);

  const change = async (done: string, request: () => Promise<unknown>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setStatus(null);
    try {
      await request();
      await load();
      onChanged();
      setStatus({ ok: true, text: done });
      return true;
    } catch (e) {
      setStatus({ ok: false, text: (e as Error).message });
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const post = (url: string, body: object) => api(url, { method: 'POST', body: JSON.stringify(body) });

  const actions: AccessActions = {
    onRequest: (reason, group) =>
      change(`Requested read access for ${group ?? 'you'}. An approver will review it.`, () =>
        post(`${base}/requests`, group ? { group, reason } : { reason })
      ),
    onCancel: (r) => change('Cancelled your request.', () => post(`/api/catalog/access/requests/${r.id}/cancel`, {})),
    onApprove: (r, grantee, note) =>
      change(`Approved. ${grantee} can now read ${table}.`, () =>
        post(`/api/catalog/access/requests/${r.id}/approve`, { grantee, note })
      ),
    onReject: (r, note) =>
      change(`Rejected the request for ${r.grantee}.`, () =>
        post(`/api/catalog/access/requests/${r.id}/reject`, { note })
      ),
    onGrant: (principal) => change(`Granted read access to ${principal}.`, () => post(`${base}/grants`, { principal })),
    onRemove: (principal) =>
      change(`Removed read access for ${principal}.`, () =>
        api(`${base}/grants?${new URLSearchParams({ principal })}`, { method: 'DELETE' })
      ),
  };

  return (
    <Card className="border-t-4 border-t-primary/50">
      <CardHeader>
        <CardTitle>Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ask for read access to this data product. Approvals run as the approver, so Unity Catalog checks their rights
          and audits every grant.
        </p>
        <div role="status" aria-live="polite">
          {busy && <p className="text-sm text-muted-foreground">Saving…</p>}
          {!busy && status?.ok && (
            <p className="text-sm rounded-lg border border-success/40 bg-success/10 p-3">✓ {status.text}</p>
          )}
        </div>
        {status && !status.ok && (
          <p
            role="alert"
            className="text-sm rounded-lg border border-destructive/30 bg-destructive/5 text-destructive p-3"
          >
            {status.text}
          </p>
        )}
        {loadError && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
            Could not load access: {loadError}
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        )}
        {access ? (
          <AccessView access={access} groups={groups} busy={busy} actions={actions} />
        ) : (
          !loadError && (
            <div role="status" aria-label="Loading access" className="space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
