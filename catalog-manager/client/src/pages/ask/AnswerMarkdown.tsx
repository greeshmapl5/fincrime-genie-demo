import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { safeLink } from './safe-link';

type MarkdownNode = { type: string; value?: string; align?: (string | null)[] | null; children?: MarkdownNode[] };

const numberCell = /^[-+−]?\d[\d\s,\u00a0\u202f]*(\.\d+)?\s?%?$/;
const textOf = (node?: MarkdownNode): string => node?.value ?? node?.children?.map(textOf).join('') ?? '';

// Genie One tables carry no column alignment, so right-align columns whose values are all numbers.
function alignNumericColumns() {
  const visit = (node: MarkdownNode) => {
    if (node.type === 'table') {
      const [header, ...rows] = node.children ?? [];
      node.align = (header?.children ?? []).map((_, i) => {
        const values = rows.map((row) => textOf(row.children?.[i]).trim()).filter(Boolean);
        const numeric = values.length > 0 && values.every((value) => numberCell.test(value));
        return node.align?.[i] ?? (numeric ? 'right' : null);
      });
    }
    node.children?.forEach(visit);
  };
  return visit;
}

const components: Components = {
  a: ({ href, children }) => {
    const link = safeLink(href);
    return link
      ? <a href={link} target="_blank" rel="noopener noreferrer" className="underline">{children}</a>
      : <span>{children}</span>;
  },
  table: ({ children }) => (
    <div className="answer-table" role="region" aria-label="Answer table" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
};

export function AnswerMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="answer-markdown space-y-2 break-words leading-relaxed">
      <Markdown remarkPlugins={[remarkGfm, alignNumericColumns]} components={components}>{markdown}</Markdown>
    </div>
  );
}
