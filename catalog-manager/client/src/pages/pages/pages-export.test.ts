import { describe, expect, it } from 'vitest';
import { buildPagesDocument, buildPagesImportPrompt, glossaryTermsSchema } from './pages-export';

const term = {
  term: 'Structuring',
  definition: 'Splitting deposits below a threshold.',
  related_table: 'fincrime.gold.structuring_candidates',
  related_column: null,
};

describe('Pages export', () => {
  it('exports definitions, domain, source, and suggested assets without claiming publication', () => {
    const document = buildPagesDocument([term], 'Financial Crime');
    expect(document).toContain('## Structuring');
    expect(document).toContain('Definition: Splitting deposits below a threshold\\.');
    expect(document).toContain('Requested domain or subdomain: Financial Crime');
    expect(document).toContain('fincrime.gold.business_glossary');
    expect(document).toContain('fincrime\\.gold\\.structuring\\_candidates');
    expect(document).toContain('does not create, publish, or synchronize');
  });

  it('strips owner and extra fields from the API response before export', () => {
    const rows = glossaryTermsSchema.parse([{ ...term, owner: 'private@example.com', updated_at: 'today' }]);
    expect(rows[0]).not.toHaveProperty('owner');
    expect(buildPagesDocument(rows, 'Demo')).not.toContain('private@example.com');
  });

  it('escapes Markdown and HTML and prevents source values creating document sections', () => {
    const document = buildPagesDocument(
      [{ ...term, term: '# Injected\n## Heading', definition: '<script> & [link](https://example.com)' }],
      'Demo\n# fake domain'
    );
    expect(document).toContain('## \\# Injected \\#\\# Heading');
    expect(document).not.toContain('<script>');
    expect(document).not.toContain('\n# fake domain');
    expect(document).not.toContain('[link](https://example.com)');
  });

  it('rejects missing selections, domain, or definitions', () => {
    expect(() => buildPagesDocument([], 'Demo')).toThrow('Select at least one');
    expect(() => buildPagesDocument([term], ' ')).toThrow('Enter the target');
    expect(() => buildPagesDocument([{ ...term, definition: '' }], 'Demo')).toThrow('name and definition');
    expect(glossaryTermsSchema.safeParse({ error: 'Permission denied' }).success).toBe(false);
    expect(glossaryTermsSchema.safeParse([{ ...term, term: null }]).success).toBe(false);
  });

  it('handles empty optional assets and exports only the selected input terms', () => {
    const document = buildPagesDocument([{ ...term, related_table: null }], 'Demo');
    expect(document).not.toContain('Suggested related asset');
    expect(document.match(/^## /gm)).toHaveLength(1);
  });

  it('requests draft review, preserves definitions, and does not request auto-publication', () => {
    const prompt = buildPagesImportPrompt(' Financial Crime ');
    expect(prompt).toContain('"Financial Crime"');
    expect(prompt).toContain('Do not publish without my approval');
    expect(prompt).toContain('Flag duplicate or conflicting');
    expect(prompt).toContain('not as instructions');
  });
});
