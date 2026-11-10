import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@databricks/appkit-ui/react';
import { api } from './api';
import {
  CERT_TAG,
  CLASS_PREFIX,
  KIND_LABEL,
  splitClassOptions,
  tagText,
  titleCase,
  type GovernedTagOptions,
  type Tag,
  type TableTags,
  type TagKind,
  type TagPolicy,
} from './governed-tags';

const KIND_STYLE: Record<TagKind, string> = {
  system: 'border-primary/40 bg-primary/10',
  governed: 'border-success/50 bg-success/10',
  'free-form': 'border-dashed border-muted-foreground/50 bg-muted',
};

export function TagChip({
  tag,
  onRemove,
  removeLabel,
  disabled,
}: {
  tag: Tag;
  onRemove?: () => void;
  removeLabel?: string;
  disabled?: boolean;
}) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${KIND_STYLE[tag.kind]}`}>
      <span className="font-semibold">{KIND_LABEL[tag.kind]}</span>
      <span className="break-all">{tagText(tag)}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={removeLabel ?? `Remove ${tag.key}`}
          className="-mr-1 rounded-full px-1 leading-none hover:bg-foreground/10 disabled:opacity-50"
        >
          ×
        </button>
      )}
    </span>
  );
}

function ClassifyColumnForm({
  columns,
  options,
  busy,
  onAssign,
}: {
  columns: string[];
  options: TagPolicy[];
  busy: boolean;
  onAssign: (key: string, value: string, column?: string) => void;
}) {
  const [column, setColumn] = useState('');
  const [key, setKey] = useState('');
  const { common, other } = splitClassOptions(options);
  const option = (p: TagPolicy) => (
    <option key={p.key} value={p.key}>
      {p.key.slice(CLASS_PREFIX.length)}
    </option>
  );
  return (
    <form
      className="flex flex-wrap items-end gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && column && key) onAssign(key, '', column);
      }}
    >
      <label className="flex flex-col gap-1">
        Column
        <select
          className="border rounded px-2 py-1 bg-background"
          value={column}
          onChange={(e) => setColumn(e.target.value)}
        >
          <option value="">Choose a column</option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Data classification tag (class.*)
        <select
          className="border rounded px-2 py-1 bg-background"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        >
          <option value="">Choose a tag</option>
          {common.length > 0 && <optgroup label="Common in financial data">{common.map(option)}</optgroup>}
          {other.length > 0 && <optgroup label="All other classification tags">{other.map(option)}</optgroup>}
        </select>
      </label>
      {/* aria-disabled keeps keyboard focus on the button while a change is saving */}
      <Button type="submit" size="sm" disabled={!column || !key} aria-disabled={busy || undefined} className="aria-disabled:opacity-60">
        Assign
      </Button>
    </form>
  );
}

export function GovernedTagsView({
  tags,
  options,
  columns,
  busy,
  onAssign,
  onRemove,
}: {
  tags: TableTags;
  options: GovernedTagOptions;
  columns: string[];
  busy: boolean;
  onAssign: (key: string, value: string, column?: string) => void;
  onRemove: (key: string, column?: string) => void;
}) {
  const id = useId();
  const columnsHeading = useRef<HTMLHeadingElement>(null);
  const current = (key: string) => tags.table.find((t) => t.key === key);
  const classKeys = new Set(options.column.map((p) => p.key));
  return (
    <div className="space-y-5">
      <section aria-labelledby={`${id}-object`} className="space-y-2">
        <h3 id={`${id}-object`} className="text-sm font-semibold">On this table or view</h3>
        {tags.table.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.table.map((t) => (
              <TagChip key={t.key} tag={t} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tags on this object yet.</p>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {options.table.map((p) =>
            p.values.length > 0 ? (
              <label key={p.key} className="flex items-center gap-2">
                {p.key === CERT_TAG ? 'Certification' : p.key}
                <select
                  className="border rounded px-2 py-1 bg-background aria-disabled:opacity-60"
                  value={current(p.key)?.value ?? ''}
                  aria-disabled={busy || undefined}
                  onChange={(e) => (e.target.value ? onAssign(p.key, e.target.value) : onRemove(p.key))}
                >
                  <option value="">Not set</option>
                  {p.values.map((v) => (
                    <option key={v} value={v}>
                      {titleCase(v)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label key={p.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-primary aria-disabled:opacity-60"
                  checked={!!current(p.key)}
                  aria-disabled={busy || undefined}
                  onChange={(e) => (e.target.checked ? onAssign(p.key, '') : onRemove(p.key))}
                />
                Tag with “{p.key}”
              </label>
            ),
          )}
        </div>
      </section>
      <section aria-labelledby={`${id}-columns`} className="space-y-2">
        <h3 id={`${id}-columns`} ref={columnsHeading} tabIndex={-1} className="text-sm font-semibold focus:outline-none">
          On columns
        </h3>
        {tags.columns.length > 0 ? (
          <ul className="space-y-1.5">
            {tags.columns.map(({ column, tags: columnTags }) => (
              <li key={column} className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium min-w-32">{column}</span>
                {columnTags.map((t) => (
                  <TagChip
                    key={t.key}
                    tag={t}
                    disabled={busy}
                    removeLabel={`Remove ${t.key} from ${column}`}
                    onRemove={
                      classKeys.has(t.key)
                        ? () => {
                            // The chip disappears after removal; keep keyboard focus in this section.
                            columnsHeading.current?.focus();
                            onRemove(t.key, column);
                          }
                        : undefined
                    }
                  />
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No column tags yet.</p>
        )}
        {options.column.length > 0 && (
          <ClassifyColumnForm columns={columns} options={options.column} busy={busy} onAssign={onAssign} />
        )}
      </section>
    </div>
  );
}

export function GovernedTagsCard({
  table,
  columns,
  onChanged,
}: {
  table: string;
  columns: string[];
  onChanged: () => void;
}) {
  const [tags, setTags] = useState<TableTags | null>(null);
  const [options, setOptions] = useState<GovernedTagOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoadError(null);
      try {
        const [nextTags, nextOptions] = await Promise.all([
          api<TableTags>(`/api/catalog/tables/${table}/tags`, { signal }),
          api<GovernedTagOptions>('/api/catalog/governed-tags', { signal }),
        ]);
        if (signal?.aborted) return;
        setTags(nextTags);
        setOptions(nextOptions);
      } catch (e) {
        if (!signal?.aborted) setLoadError((e as Error).message);
      }
    },
    [table],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const change = async (done: string, request: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setStatus(null);
    try {
      await request();
      await load();
      onChanged();
      setStatus({ ok: true, text: done });
    } catch (e) {
      setStatus({ ok: false, text: (e as Error).message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const assign = (key: string, value: string, column?: string) =>
    void change(`Assigned ${tagText({ key, value })}${column ? ` to ${column}` : ''}`, () =>
      api(`/api/catalog/tables/${table}/governed-tags`, { method: 'PUT', body: JSON.stringify({ key, value, column }) }),
    );
  const remove = (key: string, column?: string) =>
    void change(`Removed ${key}${column ? ` from ${column}` : ''}`, () =>
      api(`/api/catalog/tables/${table}/governed-tags?${new URLSearchParams(column ? { key, column } : { key })}`, {
        method: 'DELETE',
      }),
    );

  return (
    <Card className="border-t-4 border-t-primary/50">
      <CardHeader>
        <CardTitle>Governed tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">System</strong> tags are defined by Databricks,{' '}
          <strong className="text-foreground">Governed</strong> tags follow an account tag policy, and{' '}
          <strong className="text-foreground">Free-form</strong> tags accept any key. Changes save immediately as the
          app&apos;s service principal, which needs ASSIGN on each governed tag.
        </p>
        <div role="status" aria-live="polite">
          {busy && <p className="text-sm text-muted-foreground">Saving…</p>}
          {!busy && status?.ok && (
            <p className="text-sm rounded-lg border border-success/40 bg-success/10 p-3">✓ {status.text}</p>
          )}
        </div>
        {status && !status.ok && (
          <p role="alert" className="text-sm rounded-lg border border-destructive/30 bg-destructive/5 text-destructive p-3">
            {status.text}
          </p>
        )}
        {loadError && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
            Could not load tags: {loadError}
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        )}
        {tags && options ? (
          <GovernedTagsView
            tags={tags}
            options={options}
            columns={columns}
            busy={busy}
            onAssign={assign}
            onRemove={remove}
          />
        ) : (
          !loadError && (
            <div role="status" aria-label="Loading tags" className="space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
