import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardContent, Skeleton } from '@databricks/appkit-ui/react';
import Markdown from 'react-markdown';
import { apiErrorSchema, identitySchema, genieResponseSchema, type GenieResponse } from '../../../../shared/genie-space';

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
        if (Date.now() > deadline) throw new Error('Genie is taking longer than 10 minutes. Try again or open the space in Databricks.');
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
      if (response.status !== 'completed') update({ error:       `Genie response is ${response.status}. Review any partial answer below.` });
            else if (!response.final_answer?.trim() && !response.query_items?.length) update({ error: 'Genie completed without an answer. Rephrase the question.' });
    } catch (e) {
      update({ error: controller.signal.aborted ? 'Stopped waiting. The conversation remains available in Databricks.' : (e instanceof Error ? e.message : 'Genie failed.') });
    } finally {
      active.current = null;
      setBusy(false);
    }
  };

  const cancel = () => active.current?.abort();

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Ask your data</h2>
        <p className="text-sm text-muted-foreground">
          Ask the Investigations Analyst Genie space about alerts, customers, transactions, glossary terms or policies.
          Questions are answered only from this space's tables and instructions.
        </p>
      </div>
      {identity ? <Badge variant="secondary">Querying as {identity}</Badge> : identityError
        ? <p role="alert" className="text-destructive">{identityError}</p> : <Skeleton className="h-6 w-64" />}
      <p className="text-xs text-muted-foreground">
        Service: Genie space MCP, restricted to one space. Uses your signed-in permissions; never falls back to the app service principal.
      </p>
      {!turns.length && <p>Try: “How many alerts are open, by status?”</p>}
      {turns.map((turn, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-3">
            <p className="font-semibold">{turn.question}</p>
            {turn.error && <p role="alert" className="text-destructive">{turn.error}</p>}
            <p role="status" className="text-sm text-muted-foreground">{turn.response?.status ?? (turn.error ? 'Request failed' : 'Starting Genie...')}</p>
            {turn.response?.final_answer && <div className="space-y-2 break-words">
              <Markdown components={{ a: ({ href, children }) => safeLink(href)
                ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{children}</a> : <span>{children}</span> }}>{turn.response.final_answer}</Markdown>
            </div>}
            {!!turn.response?.query_items?.length && <details>
              <summary>Generated SQL and results</summary>
              {turn.response.query_items.map((item, n) => <div key={String(item.item_id ?? n)} className="space-y-1">
                <pre className="overflow-auto text-xs">{typeof item.sql === 'string' ? item.sql : ''}</pre>
                {item.statement_response !== undefined && <pre className="overflow-auto text-xs">{JSON.stringify(item.statement_response, null, 2)}</pre>}
              </div>)}
            </details>}
            {!!turn.response?.suggested_questions?.length && <div className="flex flex-wrap gap-2">
              {turn.response.suggested_questions.map((s) => <Button key={s} variant="outline" size="sm" disabled={busy} onClick={() => setQuestion(s)}>{s}</Button>)}
            </div>}
            <p className="text-xs text-muted-foreground">AI-generated — verify answers and the generated SQL before acting.</p>
          </CardContent>
        </Card>
      ))}
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <label className="block" htmlFor="ask-question">Your question</label>
        <textarea id="ask-question" className="w-full border rounded p-3 bg-background" rows={3} value={question} maxLength={10000} onChange={(e) => setQuestion(e.target.value)} disabled={busy} />
        <div className="flex gap-2">
          <Button type="submit" disabled={!identity || busy || !question.trim()}>Ask Genie</Button>
          {busy && <Button type="button" variant="outline" onClick={cancel}>Stop</Button>}
          <Button type="button" variant="outline" disabled={busy} onClick={() => { setTurns([]); last.current = undefined; }}>New conversation</Button>
        </div>
      </form>
    </div>
  );
}
