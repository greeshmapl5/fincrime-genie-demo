import { useEffect, useRef, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@databricks/appkit-ui/react';
import { z } from 'zod';

type Row = Record<string, string | null>;
const catalogContextSchema = z.object({ catalog: z.string().min(1), schema: z.string().min(1) });

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body as T;
}

function CommentEditor({
  value,
  onSave,
  disabled,
}: {
  value: string;
  onSave: (v: string) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setText(value), [value]);
  return (
    <div className="flex gap-2">
      <input
        className="border rounded px-2 py-1 text-sm flex-1 bg-background disabled:opacity-60"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        size="sm"
        disabled={disabled || saving || text === value}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(text);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}

function ClassificationSelect({
  value,
  levels,
  onChange,
  disabled,
}: {
  value: string;
  levels: string[];
  onChange: (v: string) => Promise<boolean>;
  disabled?: boolean;
}) {
  return (
    <select
      className="border rounded px-2 py-1 text-sm bg-background disabled:opacity-60"
      value={value}
      disabled={disabled}
      onChange={(e) => void onChange(e.target.value)}
    >
      <option value="">Unclassified</option>
      {levels.map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function CatalogPage() {
  const [context, setContext] = useState<z.infer<typeof catalogContextSchema> | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [tables, setTables] = useState<Row[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [columns, setColumns] = useState<Row[]>([]);
  const [preview, setPreview] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flash = (msg: string) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  };
  const loadTables = () => api<Row[]>('/api/catalog/tables').then(setTables).catch((e) => setError(e.message));
  useEffect(() => {
    const controller = new AbortController();
    void api<unknown>('/api/catalog/context', { signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted) setContext(catalogContextSchema.parse(body));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setContextError(cause instanceof Error ? cause.message : 'Could not load catalog and schema.');
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    void loadTables();
    api<string[]>('/api/catalog/classification-levels').then(setLevels).catch(() => undefined);
  }, []);

  const select = async (name: string) => {
    setSelected(name);
    setError(null);
    try {
      setColumns(await api<Row[]>(`/api/catalog/tables/${name}/columns`));
      setPreview(await api<Row[]>(`/api/catalog/tables/${name}/preview`));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveClassification = async (table: string, level: string, column?: string) => {
    setError(null);
    try {
      await api(`/api/catalog/tables/${table}/classification`, {
        method: 'PUT',
        body: JSON.stringify({ column, level }),
      });
      await Promise.all([loadTables(), select(table)]);
      flash(`Saved classification${column ? ` for ${column}` : ''}: ${level || 'Unclassified'}`);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const saveComment = async (table: string, comment: string, column?: string) => {
    setError(null);
    try {
      await api(`/api/catalog/tables/${table}/comment`, {
        method: 'PUT',
        body: JSON.stringify({ column, comment }),
      });
      await Promise.all([loadTables(), select(table)]);
      flash(`Saved description${column ? ` for ${column}` : ''}`);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const current = tables.find((t) => t.table_name === selected);
  const previewCols = preview[0] ? Object.keys(preview[0]) : [];

  return (
    <div className="space-y-4">
      <section aria-label="Catalog location" className="rounded-xl border border-primary/20 bg-accent p-5 space-y-2">
        <h2 className="text-2xl font-semibold">Catalog</h2>
        {context ? (
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div><dt className="text-muted-foreground">Catalog</dt><dd className="font-semibold break-all">{context.catalog}</dd></div>
            <div><dt className="text-muted-foreground">Schema</dt><dd className="font-semibold break-all">{context.schema}</dd></div>
          </dl>
        ) : contextError ? (
          <p role="alert" className="text-sm text-destructive">Could not load catalog location: {contextError} Reload the page to retry.</p>
        ) : (
          <div role="status" aria-label="Loading catalog and schema"><Skeleton className="h-10 w-48" /></div>
        )}
      </section>
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <Card className="border-t-4 border-t-primary/50 self-start">
        <CardHeader>
          <CardTitle>Explore the catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {tables.map((t) => (
            <button
              key={t.table_name}
              onClick={() => select(t.table_name!)}
              className={`block w-full text-left px-2 py-1 rounded text-sm ${
                selected === t.table_name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {t.table_name}
              {t.classification && (
                <span className="ml-2 text-xs opacity-70">[{t.classification}]</span>
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {error && <p role="alert" className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">{error}</p>}
        {notice && (
          <p role="status" className="text-sm text-foreground rounded-lg border border-success/40 bg-success/10 p-3">
            ✓ {notice}
          </p>
        )}
        {!selected && <div className="rounded-xl border border-primary/20 bg-accent p-6 space-y-2">
          <h2 className="text-2xl font-semibold">Give your data context</h2>
          <p className="text-muted-foreground">Select a table or view to explore its columns and preview its data.</p>
          <p className="text-sm text-muted-foreground">Descriptions use the Save button. Classification changes save immediately.</p>
        </div>}
        {selected && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{selected} — description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CommentEditor
                  value={current?.comment ?? ''}
                  onSave={(v) => saveComment(selected, v)}
                />
                <div className="flex items-center gap-2 text-sm">
                  Classification
                  <ClassificationSelect
                    value={current?.classification ?? ''}
                    levels={levels}
                    onChange={(v) => saveClassification(selected, v)}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Columns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {columns.map((c) => (
                  <div
                    key={c.column_name}
                    className="grid md:grid-cols-[180px_90px_150px_1fr] gap-2 items-center"
                  >
                    <span className="text-sm font-medium">{c.column_name}</span>
                    <span className="text-xs text-muted-foreground">{c.data_type}</span>
                    <ClassificationSelect
                      value={c.classification ?? ''}
                      levels={levels}
                      onChange={(v) => saveClassification(selected, v, c.column_name!)}
                    />
                    <CommentEditor
                      value={c.comment ?? ''}
                      onSave={(v) => saveComment(selected, v, c.column_name!)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Data preview (20 rows)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto">
                <table className="text-xs">
                  <thead>
                    <tr>
                      {previewCols.map((c) => (
                        <th key={c} className="text-left pr-4 pb-1">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        {previewCols.map((c) => (
                          <td key={c} className="pr-4 py-0.5 whitespace-nowrap">
                            {r[c]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
