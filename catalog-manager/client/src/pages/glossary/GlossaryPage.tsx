import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@databricks/appkit-ui/react';

type Row = Record<string, string | null>;
const empty = { term: '', definition: '', related_table: '', related_column: '', owner: '' };

export function GlossaryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/glossary');
    const body = await res.json();
    if (!res.ok) setError(body.error);
    else setRows(body);
  };
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setError(null);
    const res = await fetch('/api/glossary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) return setError((await res.json()).error);
    setForm(empty);
    await load();
  };

  const remove = async (term: string) => {
    await fetch(`/api/glossary/${encodeURIComponent(term)}`, { method: 'DELETE' });
    await load();
  };

  const field = (key: keyof typeof empty, label: string) => (
    <label className="text-sm block">
      {label}
      <input
        className="border rounded px-2 py-1 w-full bg-background"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Add or update a term</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {field('term', 'Term')}
          {field('definition', 'Business definition')}
          {field('related_table', 'Related table')}
          {field('related_column', 'Related column')}
          {field('owner', 'Owner')}
          <Button onClick={save} disabled={!form.term || !form.definition}>
            Save to lakehouse
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Business glossary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Saving here updates the lakehouse glossary, not Discover Pages.{' '}
            <NavLink to="/pages" className="underline">Prepare terms for Pages import</NavLink>.
          </p>
          {rows.length === 0 && <p className="text-muted-foreground text-sm">No terms yet.</p>}
          {rows.map((r) => (
            <div key={r.term} className="border-b pb-2 flex justify-between gap-4">
              <div>
                <div className="font-medium">{r.term}</div>
                <div className="text-sm">{r.definition}</div>
                <div className="text-xs text-muted-foreground">
                  {[r.related_table, r.related_column].filter(Boolean).join('.')} {r.owner && `· ${r.owner}`}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r.term!)}>
                Delete
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
