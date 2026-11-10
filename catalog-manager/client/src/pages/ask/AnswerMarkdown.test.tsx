import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnswerMarkdown } from './AnswerMarkdown';

const render = (markdown: string) => renderToStaticMarkup(<AnswerMarkdown markdown={markdown} />);

describe('AnswerMarkdown', () => {
  it('renders Genie One Markdown tables in a scrollable, focusable region', () => {
    const html = render([
      'There are **29 Open alerts** and **20 Escalated alerts**.',
      '',
      '| status | alert_count |',
      '| --- | --- |',
      '| Open | 29 |',
      '| Escalated | 20 |',
    ].join('\n'));

    expect(html).toContain('<div class="answer-table" role="region" aria-label="Answer table" tabindex="0"><table>');
    expect(html).toContain('<thead><tr><th>status</th><th style="text-align:right">alert_count</th></tr></thead>');
    expect(html).toContain('<tr><td>Open</td><td style="text-align:right">29</td></tr>');
    expect(html).not.toContain('|');
  });

  it('right-aligns only all-numeric columns and keeps explicit alignment', () => {
    const html = render([
      '| customer_id | expected_monthly_volume | share | segment | as_of | rank |',
      '| --- | --- | --- | --- | --- | :---: |',
      '| C0172 | 21800.00 | 94% | Retail | 2026-11-05 | 1 |',
      '| C0285 | 598,500.00 |  | Corporate | 2026-11-05 | 2 |',
    ].join('\n'));

    expect(html).toContain([
      '<th>customer_id</th>',
      '<th style="text-align:right">expected_monthly_volume</th>',
      '<th style="text-align:right">share</th>',
      '<th>segment</th>',
      '<th>as_of</th>',
      '<th style="text-align:center">rank</th>',
    ].join(''));
    expect(html).toContain('<td>C0285</td><td style="text-align:right">598,500.00</td><td style="text-align:right"></td>');
  });

  it('links only HTTPS targets and opens them in a new tab', () => {
    const html = render('[Page](https://example.com/p) [Snippet](#snippet-1) [Plain](http://example.com) [Script](javascript:alert(1))');

    expect(html).toContain('<a href="https://example.com/p" target="_blank" rel="noopener noreferrer" class="underline">Page</a>');
    expect(html).toContain('<span>Snippet</span> <span>Plain</span> <span>Script</span>');
    expect(html.match(/<a /g)).toHaveLength(1);
  });
});
