import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GovernedTagsView } from './GovernedTagsCard';
import type { GovernedTagOptions, TableTags } from './governed-tags';

// AppKit's React entry also loads the chart bundle, which Node cannot resolve outside Vite.
vi.mock('@databricks/appkit-ui/react', async () => {
  const { createElement } = await import('react');
  const stub = (tag: string) => (props: Record<string, unknown>) => createElement(tag, props);
  return {
    Button: stub('button'),
    Card: stub('div'),
    CardContent: stub('div'),
    CardHeader: stub('div'),
    CardTitle: stub('div'),
    Skeleton: stub('div'),
  };
});

const options: GovernedTagOptions = {
  table: [
    { key: 'system.certification_status', description: '', values: ['certified', 'deprecated'] },
    { key: 'Financial Crime', description: '', values: [] },
  ],
  column: [
    { key: 'class.iban_code', description: '', values: [] },
    { key: 'class.us_ssn', description: '', values: [] },
    { key: 'class.vin', description: '', values: [] },
  ],
};

const tags: TableTags = {
  table: [
    { key: 'Financial Crime', value: '', kind: 'governed' },
    { key: 'certified', value: 'true', kind: 'free-form' },
    { key: 'system.certification_status', value: 'certified', kind: 'system' },
  ],
  columns: [
    {
      column: 'national_id',
      tags: [
        { key: 'class.us_ssn', value: '', kind: 'system' },
        { key: 'sensitivity', value: 'pii', kind: 'free-form' },
      ],
    },
  ],
};

const noop = () => undefined;
const render = (value: TableTags = tags) =>
  renderToStaticMarkup(
    <GovernedTagsView
      tags={value}
      options={options}
      columns={['customer_id', 'national_id']}
      busy={false}
      onAssign={noop}
      onRemove={noop}
    />,
  );

describe('GovernedTagsView', () => {
  it('labels every tag with its kind in text, not only colour', () => {
    const html = render();
    expect(html).toMatch(/>Governed<\/span><span class="break-all">Financial Crime<\/span>/);
    expect(html).toMatch(/>Free-form<\/span><span class="break-all">certified = true<\/span>/);
    expect(html).toMatch(/>System<\/span><span class="break-all">system.certification_status = certified<\/span>/);
    expect(html).toMatch(/>System<\/span><span class="break-all">class.us_ssn<\/span>/);
  });

  it('reflects current certification and domain tag in the controls', () => {
    const html = render();
    expect(html).toContain('<option value="certified" selected="">Certified</option>');
    expect(html).toMatch(/<input type="checkbox"[^>]*checked=""[^>]*\/>Tag with “Financial Crime”/);
  });

  it('offers removal only for governed classification tags on columns', () => {
    const html = render();
    expect(html).toContain('aria-label="Remove class.us_ssn from national_id"');
    expect(html).not.toContain('Remove sensitivity');
    expect(html).not.toContain('Remove certified');
  });

  it('lists common financial classification tags first', () => {
    const html = render();
    expect(html).toContain(
      '<optgroup label="Common in financial data"><option value="class.iban_code">iban_code</option><option value="class.us_ssn">us_ssn</option></optgroup><optgroup label="All other classification tags"><option value="class.vin">vin</option></optgroup>',
    );
  });

  it('keeps controls focusable while a change is saving', () => {
    const html = renderToStaticMarkup(
      <GovernedTagsView
        tags={tags}
        options={options}
        columns={['customer_id', 'national_id']}
        busy
        onAssign={noop}
        onRemove={noop}
      />,
    );
    expect(html).toMatch(/<select class="[^"]*" aria-disabled="true">/);
    expect(html).toMatch(/<input type="checkbox"[^>]*aria-disabled="true"[^>]*\/>/);
    expect(html).not.toMatch(/<(select|input)[^>]*disabled=""/);
    expect(html).toContain('<h3 id="');
    expect(html).toMatch(/tabindex="-1"[^>]*>On columns<\/h3>/);
  });

  it('shows empty states when nothing is tagged', () => {
    const html = render({ table: [], columns: [] });
    expect(html).toContain('No tags on this object yet.');
    expect(html).toContain('No column tags yet.');
    expect(html).toContain('<option value="" selected="">Not set</option>');
  });
});
