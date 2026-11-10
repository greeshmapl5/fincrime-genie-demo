import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardContent, Skeleton } from '@databricks/appkit-ui/react';
import { BookOpen, CheckCircle2, ExternalLink, FileText, LoaderCircle, MessageSquare, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { apiErrorSchema, identitySchema, genieResponseSchema, type GenieResponse } from '../../../../shared/genie-one';
import { AnswerMarkdown } from './AnswerMarkdown';
import { safeLink } from './safe-link';
import { extractPageCitations } from './page-citations';

type Turn = { question: string; response?: GenieResponse; error?: string };
const starters = [
  'How many alerts are open, by status?',
  'Which customers have the most alerts?',
  'What is the policy for escalating an investigation?',
];

async function request(body: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch('/api/ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal,
  });
  const data: unknown = await res.json();
  if (!res.ok) throw new Error(apiErrorSchema.parse(data).error);
  return data;
}

function PageSources({ answer, deepLink, headingId }: { answer?: string | null; deepLink?: string | null; headingId: string }) {
  const pages = extractPageCitations(answer, deepLink);
  if (!pages.length) return null;
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-primary/20 bg-accent/60 p-3 space-y-2">
      <h3 id={headingId} className="text-sm font-semibold flex items-center gap-2">
        <BookOpen size={16} className="text-primary" aria-hidden="true" /> Discover Pages used in this answer
      </h3>
      <ul className="grid sm:grid-cols-2 gap-2">
        {pages.map((page) => <li key={page.id}>
          <a href={page.url} target="_blank" rel="noopener noreferrer" className="flex h-full items-start gap-2 rounded-md border bg-background p-3 hover:border-primary">
            <FileText size={18} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-medium break-words">{page.title}</span>
              <span className="flex items-center gap-1 text-xs text-primary">Open Page in Databricks <ExternalLink size={12} aria-hidden="true" /></span>
            </span>
          </a>
        </li>)}
      </ul>
      <p className="text-xs text-muted-foreground">Shows only Pages Genie One cited for this answer, not every Page in the workspace.</p>
    </section>
  );
}

export function AskPage() {
  const [identity, setIdentity] = useState<string>();
  const [identityError, setIdentityError] = useState('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const last = useRef<GenieResponse | undefined>(undefined);
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const chooseQuestion = (text: string) => {
    setQuestion(text);
    questionInput.current?.focus();
  };

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
      <div className="rounded-xl border border-primary/20 bg-accent p-6 space-y-3">
        <p className="flex items-center gap-2 text-primary text-sm font-semibold"><Sparkles size={18} aria-hidden="true" /> Genie One</p>
        <h2 className="text-3xl font-semibold">Ask your data</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Explore the data and published business definitions available to you with Genie One.
          Ask is no longer restricted to the Investigations Analyst space.
        </p>
      </div>
      {identity ? <Badge variant="secondary" className="max-w-full whitespace-normal break-all"><ShieldCheck size={14} aria-hidden="true" /> Querying as {identity}</Badge> : identityError
        ? <p role="alert" className="text-destructive">{identityError}</p> : <Skeleton className="h-6 w-64" />}
      <p className="text-xs text-muted-foreground">
        Service: Genie One MCP. Uses your signed-in permissions and accessible data and Pages; never falls back to the app service principal.
      </p>
      {!turns.length && <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><MessageSquare size={18} className="text-primary" aria-hidden="true" /> Where would you like to start?</h3>
          <p className="text-sm text-muted-foreground">Choose a question to edit, or write your own below.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {starters.map((text) => <Button key={text} variant="outline" className="h-auto whitespace-normal text-left justify-start p-4 hover:bg-accent" disabled={busy} onClick={() => chooseQuestion(text)}>{text}</Button>)}
          </div>
        </CardContent>
      </Card>}
      {turns.map((turn, i) => (
        <Card key={i} className="border-t-4 border-t-primary/40 min-w-0">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs font-medium text-primary uppercase tracking-wide">Your question</p>
            <p className="font-semibold break-words">{turn.question}</p>
            {turn.error && <p role="alert" className="text-destructive">{turn.error}</p>}
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              {!turn.error && turn.response?.status === 'completed' && <CheckCircle2 size={16} className="text-primary" aria-hidden="true" />}
              {!turn.error && (!turn.response || turn.response.status === 'in_progress') && <LoaderCircle size={16} className="motion-safe:animate-spin text-primary" aria-hidden="true" />}
              {turn.error ? 'Request needs attention' : turn.response?.status === 'completed' ? 'Answer ready' : turn.response?.status === 'in_progress' ? 'Genie is analyzing your question...' : turn.response?.status ?? 'Starting Genie...'}
            </p>
            {turn.response?.final_answer && <AnswerMarkdown markdown={turn.response.final_answer} />}
            <PageSources answer={turn.response?.final_answer} deepLink={turn.response?.deep_link} headingId={`page-sources-${i}`} />
            {!!turn.response?.query_items?.length && <details className="rounded-lg border bg-muted/40 p-3">
              <summary className="cursor-pointer font-medium text-sm text-primary">Generated SQL and results</summary>
              {turn.response.query_items.map((item, n) => <div key={typeof item.item_id === 'string' || typeof item.item_id === 'number' ? item.item_id : `query-${n}`} className="space-y-1">
                <pre className="overflow-auto text-xs">{typeof item.sql === 'string' ? item.sql : ''}</pre>
                {item.statement_response !== undefined && <pre className="overflow-auto text-xs">{JSON.stringify(item.statement_response, null, 2)}</pre>}
              </div>)}
            </details>}
            {!!turn.response?.suggested_questions?.length && <div className="flex flex-wrap gap-2">
              {turn.response.suggested_questions.map((s) => <Button key={s} variant="outline" size="sm" className="h-auto whitespace-normal text-left" disabled={busy} onClick={() => chooseQuestion(s)}>{s}</Button>)}
            </div>}
            <p className="text-xs text-muted-foreground">AI-generated — verify answers and the generated SQL before acting.</p>
            {safeLink(turn.response?.deep_link) && <a className="text-sm text-primary underline" href={safeLink(turn.response?.deep_link)} target="_blank" rel="noopener noreferrer">Open in Genie One</a>}
          </CardContent>
        </Card>
      ))}
      <form className="space-y-3 rounded-xl border bg-card p-4 md:p-6 shadow-sm" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <label className="block font-medium" htmlFor="ask-question">Your question</label>
        <textarea ref={questionInput} id="ask-question" aria-describedby="question-help" placeholder="For example: How many alerts are open, by status?" className="w-full border rounded-lg p-3 bg-background resize-y min-h-28" rows={3} value={question} maxLength={10000} onChange={(e) => setQuestion(e.target.value)} disabled={busy} />
        <p id="question-help" className="text-xs text-muted-foreground">Include a time period or customer when relevant. Review the answer and SQL before taking action.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!identity || busy || !question.trim()}><Send size={16} aria-hidden="true" /> {busy ? 'Asking Genie...' : 'Ask Genie'}</Button>
          {busy && <Button type="button" variant="outline" onClick={cancel}>Stop</Button>}
          <Button type="button" variant="outline" disabled={busy || !turns.length} onClick={() => { setTurns([]); setQuestion(''); last.current = undefined; questionInput.current?.focus(); }}>New conversation</Button>
        </div>
      </form>
    </div>
  );
}
