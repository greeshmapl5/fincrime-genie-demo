import { useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@databricks/appkit-ui/react';

type Row = Record<string, string | null>;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body as T;
}

function CommentEditor({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setText(value), [value]);
  return (
    <div className="flex gap-2">
      <input
        className="border rounded px-2 py-1 text-sm flex-1 bg-background"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        size="sm"
        disabled={saving || text === value}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(text);
          } finally {
            setSaving(false);
          }
        }}
      >
        Save
      </Button>
    </div>
  );
}

function ClassificationSelect({
  value,
  levels,
  onChange,
}: {
  value: string;
  levels: string[];
  onChange: (v: string) => Promise<void>;
}) {
  return (
    <select
      className="border rounded px-2 py-1 text-sm bg-background"
      value={value}
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
  const [tables, setTables] = useState<Row[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [columns, setColumns] = useState<Row[]>([]);
  const [preview, setPreview] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTables = () => api<Row[]>('/api/catalog/tables').then(setTables).catch((e) => setError(e.message));
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
    try {
      await api(`/api/catalog/tables/${table}/classification`, {
        method: 'PUT',
        body: JSON.stringify({ column, level }),
      });
      await Promise.all([loadTables(), select(table)]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveComment = async (table: string, comment: string, column?: string) => {
    try {
      await api(`/api/catalog/tables/${table}/comment`, {
        method: 'PUT',
        body: JSON.stringify({ column, comment }),
      });
      await Promise.all([loadTables(), select(table)]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const current = tables.find((t) => t.table_name === selected);
  const previewCols = preview[0] ? Object.keys(preview[0]) : [];

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Tables</CardTitle>
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!selected && <p className="text-muted-foreground">Select a table to view and edit its metadata.</p>}
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
  );
}
