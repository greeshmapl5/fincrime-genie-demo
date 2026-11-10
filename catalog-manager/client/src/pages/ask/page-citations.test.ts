import { describe, expect, test } from 'vitest';
import { extractPageCitations } from './page-citations';

const host = 'https://dbc-417d24d1-5086.cloud.databricks.com';
const page = `${host}/one/discover/pages/901ecc5d-b8ea-4997-a022-305bdec418f5?isDbOne=true&o=7474649527621307`;
const deepLink = `${host}/one/chat/threads/abc?o=7474649527621307`;

describe('extractPageCitations', () => {
  test('returns each cited Discover Page once, in answer order', () => {
    const answer = [
      `Concentration is a share. [Concentration of transfers](${page})`,
      `Also see [Structuring](${host}/one/discover/pages/page-2?o=1).`,
      `Repeated: [Concentration of transfers](${page})`,
    ].join('\n');

    expect(extractPageCitations(answer, deepLink)).toEqual([
      { id: '901ecc5d-b8ea-4997-a022-305bdec418f5', title: 'Concentration of transfers', url: page },
      { id: 'page-2', title: 'Structuring', url: `${host}/one/discover/pages/page-2?o=1` },
    ]);
  });

  test('ignores non-Page, non-HTTPS and other-host links', () => {
    const answer = [
      `[Genie thread](${deepLink})`,
      '[Insecure](http://dbc-417d24d1-5086.cloud.databricks.com/one/discover/pages/a)',
      '[Elsewhere](https://example.com/one/discover/pages/b)',
      '[Broken](not-a-url)',
    ].join(' ');

    expect(extractPageCitations(answer, deepLink)).toEqual([]);
  });

  test('handles answers without citations or a deep link', () => {
    expect(extractPageCitations(undefined)).toEqual([]);
    expect(extractPageCitations('No sources.', null)).toEqual([]);
    expect(extractPageCitations(`[Page](${page})`, null)).toHaveLength(1);
  });
});
