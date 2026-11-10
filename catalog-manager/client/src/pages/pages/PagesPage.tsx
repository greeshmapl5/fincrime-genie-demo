import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@databricks/appkit-ui/react';
import { buildPagesDocument, buildPagesImportPrompt, glossaryTermsSchema, type PageTerm } from './pages-export';

export function PagesPage() {
  const [terms, setTerms] = useState<PageTerm[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [domain, setDomain] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      setSelected(new Set());
      setReviewed(false);
      setDownloaded(false);
      try {
        const response = await fetch('/api/glossary', { signal: controller.signal });
        if (!response.ok) throw new Error(`Cannot load glossary (HTTP ${response.status}). Check app data access.`);
        const body: unknown = await response.json();
        const parsed = glossaryTermsSchema.safeParse(body);
        if (!parsed.success) throw new Error('The glossary response has invalid or incomplete terms.');
        if (!controller.signal.aborted) {
          setTerms(parsed.data);
          setLoadedAt(new Date().toLocaleString());
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load the glossary.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [reload]);

  const chosen = terms.filter((term) => selected.has(term.term));
  const document = chosen.length && domain.trim() ? buildPagesDocument(chosen, domain) : '';

  function download() {
    if (!document || !reviewed) return;
    const url = URL.createObjectURL(new Blob([document], { type: 'text/markdown;charset=utf-8' }));
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'proposed-business-pages.md';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="rounded-xl border border-primary/20 bg-accent p-6 space-y-2">
        <h2 className="text-3xl font-semibold">Prepare Pages export</h2>
        <p className="text-sm text-muted-foreground">
          Prepare glossary definitions for reviewed import into Databricks Discover. This is a manual handoff, not live
          Pages browsing, automatic publishing, or two-way synchronization.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>1. Select and review source terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Pages is an account-level Beta feature and may replicate content globally. Do not include PII, regulated
            data, or sensitive information. Owner values and data rows are excluded from the export, but you must also
            review the definitions and asset names.
          </p>
          <label className="block text-sm">
            Existing Discover domain or subdomain
            <input
              className="block border rounded px-2 py-1 w-full bg-background"
              value={domain}
              onChange={(event) => {
                setDomain(event.target.value);
                setReviewed(false);
                setDownloaded(false);
              }}
              placeholder="For example: Financial Crime"
            />
          </label>
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={loading} onClick={() => setReload((value) => value + 1)}>
              Refresh glossary
            </Button>
            {loadedAt && !loading && !error && (
              <span className="text-xs text-muted-foreground">Source: lakehouse glossary. Loaded {loadedAt}.</span>
            )}
          </div>
          {loading && (
            <div role="status" aria-label="Loading glossary">
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error} Use Refresh glossary to retry.
            </p>
          )}
          {!loading && !error && terms.length === 0 && (
            <p>
              No terms available.{' '}
              <NavLink className="underline" to="/glossary">
                Add a glossary term
              </NavLink>{' '}
              first.
            </p>
          )}
          {!loading &&
            !error &&
            terms.map((term) => (
              <label key={term.term} className="flex gap-3 border-b pb-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${term.term}`}
                  checked={selected.has(term.term)}
                  onChange={(event) => {
                    const next = new Set(selected);
                    if (event.target.checked) next.add(term.term);
                    else next.delete(term.term);
                    setSelected(next);
                    setReviewed(false);
                    setDownloaded(false);
                  }}
                />
                <span>
                  <span className="block font-medium">{term.term}</span>
                  <span className="block text-sm">{term.definition}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[term.related_table, term.related_column].filter(Boolean).join('.')}
                  </span>
                </span>
              </label>
            ))}
          {document && !loading && !error && (
            <>
              <label className="block text-sm">
                Export preview ({chosen.length} terms)
                <textarea
                  readOnly
                  value={document}
                  rows={10}
                  className="block w-full border rounded p-2 font-mono text-xs bg-background"
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />I
                reviewed the selected content and confirm it contains no PII, regulated data, or sensitive information.
              </label>
            </>
          )}
          <Button disabled={!document || !reviewed || loading || !!error} onClick={download}>
            Download for Pages import
          </Button>
          {downloaded && (
            <p role="status">Download requested. No Page has been created or published. Continue below.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>2. Import, review, and publish in Databricks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <a
              className="underline"
              href="https://dbc-417d24d1-5086.cloud.databricks.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open dario-ws
            </a>{' '}
            and navigate to <strong>Discover &gt; Pages &gt; Create page</strong>.
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>If Pages is missing, ask an account admin to enable the Pages Beta and grant access to a domain.</li>
            <li>
              Open the Genie Code pane and choose <strong>Bulk import pages</strong>. Attach the downloaded document, or
              paste its contents as source context.
            </li>
            <li>
              Specify the existing domain. Review duplicates, conflicts, proposed definitions, owners, and related
              assets before creating drafts.
            </li>
            <li>Open the resulting drafts in Pages. Review and publish as the Page owner or a domain curator.</li>
          </ol>
          {domain.trim() && (
            <label className="block">
              Suggested Genie Code import prompt (copy into Databricks)
              <textarea
                readOnly
                rows={5}
                value={buildPagesImportPrompt(domain)}
                className="block w-full border rounded p-2 bg-background"
              />
            </label>
          )}
          <a
            className="inline-block underline"
            href="https://docs.databricks.com/aws/en/uc-semantics/pages"
            target="_blank"
            rel="noopener noreferrer"
          >
            Official Pages documentation and permissions
          </a>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>3. Verify in Genie One</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            In Databricks Genie One, ask what your published term means. Check that the answer uses the Page definition
            and cites the Page. Published Pages are available to users with domain access; drafts are only available to
            their owner.
          </p>
          <p>
            Catalog Manager&apos;s Ask tab now uses Genie One MCP with your permissions, so you can also verify
            published Page definitions there. Pages cited by an answer appear as source cards below it; Ask cannot list
            every workspace Page. This export workflow does not publish them. Editing a
            glossary term later requires a separate review and update of its Page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
