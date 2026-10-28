import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardContent, Skeleton } from '@databricks/appkit-ui/react';
import Markdown from 'react-markdown';
import { apiErrorSchema, identitySchema, genieResponseSchema, type GenieResponse } from '../../../../shared/genie-one';

type Turn = { question: string; response?: GenieResponse; error?: string };

async function request(body: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch('/api/ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal,
  });
  const data: unknown = await res.json();
  if (!res.ok) throw new Error(apiErrorSchema.parse(data).error);
  return data;
}

function safeLink(value?: string | null) {
  if (!value) return undefined;
  try { return new URL(value).protocol === 'https:' ? value : undefined; }
  catch { return undefined; }
}

export function AskPage() {
  const [identity, setIdentity] = useState<string>();
  const [identityError, setIdentityError] = useState('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState<unknown>();
  const [queryError, setQueryError] = useState('');
  const [queryBusy, setQueryBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const last = useRef<GenieResponse | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ask/identity', { signal: controller.signal }).then(async (res) => {
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(apiErrorSchema.parse(data).error);
      const me = identitySchema.parse(data);
      setIdentity(me.email ?? me.user);
    }).catch((e: Error) => { if (!controller.signal.aborted) setIdentityError(e.message); });
    return () => { controller.abort(); active.current?.abort(); };
  }, []);

  const send = async () => {
    if (!question.trim() || busy) return;
    const text = question.trim();
    setQuestion('');
    setBusy(true);
    setQuery(undefined);
    setQueryError('');
    setTurns((t) => [...t, { question: text }]);
    const controller = new AbortController();
    active.current = controller;
    const update = (patch: Partial<Turn>) => setTurns((t) => t.map((turn, i) => i === t.length - 1 ? { ...turn, ...patch } : turn));
    try {
      let response = genieResponseSchema.parse(await request({
        action: 'ask', question: text, ...(last.current ? { conversation_id: last.current.conversation_id } : {}),
      }, controller.signal));
      last.current = response;
      update({ response });
      const deadline = Date.now() + 10 * 60 * 1000;
      while (response.status === 'in_progress') {
        if (Date.now() > deadline) throw new Error('Genie One is taking longer than 10 minutes. Open the conversation in Databricks to check its status.');
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(new Error('Stopped waiting.')); };
          const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(); }, 3000);
          controller.signal.addEventListener('abort', abort, { once: true });
          if (controller.signal.aborted) abort();
        });
        response = genieResponseSchema.parse(await request({
          action: 'poll', conversation_id: response.conversation_id, response_id: response.response_id,
        }, controller.signal));
        last.current = response;
        update({ response });
      }
      if (response.status !== 'completed') update({ error: `Genie One response is ${response.status}. Review any partial answer below.` });
      else if (!response.final_answer?.trim()) update({ error: 'Genie One completed without answer text. Open the conversation in Databricks.' });
    } catch (e) {
      update({ error: controller.signal.aborted ? 'Stopped waiting. The conversation remains available in Databricks.' : (e instanceof Error ? e.message : 'Genie One failed.') });
    } finally {
      active.current = null;
      setBusy(false);
    }
  };

  const cancel = async () => {
    active.current?.abort();
    if (last.current?.status === 'in_progress') {
      try { await request({ action: 'cancel', conversation_id: last.current.conversation_id }); }
      catch (e) { setQueryError(e instanceof Error ? e.message : 'Could not cancel Genie One.'); }
    }
  };

  const getQuery = async (response: GenieResponse, item: Record<string, unknown>) => {
    setQueryBusy(true);
    setQueryError('');
    try {
      setQuery(await request({
        action: 'query', conversation_id: response.conversation_id,
        response_id: response.response_id, item_id: item.item_id,
      }));
    } catch (e) { setQueryError(e instanceof Error ? e.message : 'Could not load query results.'); }
    finally { setQueryBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Ask your data</h2>
        <p className="text-sm text-muted-foreground">
          Ask Genie One about your data and published business definitions. Answers can use Genie Ontology,
          including Pages and domains you can access.
        </p>
      </div>
      {identity ? <Badge variant="secondary">Querying as {identity}</Badge> : identityError
        ? <p role="alert" className="text-destructive">{identityError}</p> : <Skeleton className="h-6 w-64" />}
      <p className="text-xs text-muted-foreground">
        Service: system.ai.genie_one_mcp. Uses your signed-in permissions; never falls back to the app service principal.
        Pages must be published and accessible. Glossary edits do not automatically publish Pages.
      </p>
      {!turns.length && <p>Try: “What does Concentration of transfers mean in the Financial Crime domain? Cite its published Page.”</p>}
      {turns.map((turn, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-3">
            <p className="font-semibold">{turn.question}</p>
            {turn.error && <p role="alert" className="text-destructive">{turn.error}</p>}
            <p role="status" className="text-sm text-muted-foreground">{turn.response?.status ?? (turn.error ? 'Request failed' : 'Starting Genie One...')}</p>
            {turn.response?.progress_steps?.map((step, n) => <p key={n} className="text-sm">{typeof step === 'string' ? step : JSON.stringify(step)}</p>)}
            {turn.response?.final_answer && <div className="space-y-2 break-words">
              <Markdown components={{ a: ({ href, children }) => safeLink(href)
                ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{children}</a> : <span>{children}</span> }}>{turn.response.final_answer}</Markdown>
            </div>}
            {safeLink(turn.response?.deep_link) && <a className="underline" href={turn.response?.deep_link ?? undefined} target="_blank" rel="noopener noreferrer">Explore in Databricks</a>}
            {!!turn.response?.query_items?.length && <details>
              <summary>Generated SQL / query details</summary>
              <pre className="overflow-auto text-xs">{JSON.stringify(turn.response.query_items, null, 2)}</pre>
              {turn.response.query_items.map((item, n) => <Button key={n} variant="outline" disabled={queryBusy || typeof item.item_id !== 'string'} onClick={() => void getQuery(turn.response!, item)}>Load query {n + 1} results</Button>)}
            </details>}
            <p className="text-xs text-muted-foreground">AI-generated — verify the definition, Page citations and generated SQL before acting.</p>
          </CardContent>
        </Card>
      ))}
      {queryError && <p role="alert" className="text-destructive">{queryError}</p>}
      {queryBusy && <p role="status">Loading query results...</p>}
      {query !== undefined && <details open><summary>Query results</summary><pre className="text-xs overflow-auto">{JSON.stringify(query, null, 2)}</pre></details>}
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <label className="block" htmlFor="ask-question">Your question</label>
        <textarea id="ask-question" className="w-full border rounded p-3 bg-background" rows={3} value={question} maxLength={10000} onChange={(e) => setQuestion(e.target.value)} disabled={busy} />
        <div className="flex gap-2">
          <Button type="submit" disabled={!identity || busy || !question.trim()}>Ask Genie One</Button>
          {busy && <Button type="button" variant="outline" onClick={() => void cancel()}>Stop</Button>}
          <Button type="button" variant="outline" disabled={busy} onClick={() => { setTurns([]); last.current = undefined; setQuery(undefined); setQueryError(''); }}>New conversation</Button>
        </div>
      </form>
    </div>
  );
}
