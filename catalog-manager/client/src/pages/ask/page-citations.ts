export type PageCitation = { id: string; title: string; url: string };

const markdownLink = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const pagePath = /\/discover\/pages\/([A-Za-z0-9_-]+)\/?$/;

// Genie One cites Discover Pages as Markdown links; there is no MCP tool to list Pages.
export function extractPageCitations(markdown?: string | null, workspaceLink?: string | null): PageCitation[] {
  if (!markdown) return [];
  let workspaceHost: string | undefined;
  try { workspaceHost = workspaceLink ? new URL(workspaceLink).hostname : undefined; }
  catch { workspaceHost = undefined; }
  const pages = new Map<string, PageCitation>();
  for (const match of markdown.matchAll(markdownLink)) {
    let url: URL;
    try { url = new URL(match[2] ?? ''); }
    catch { continue; }
    if (url.protocol !== 'https:' || (workspaceHost && url.hostname !== workspaceHost)) continue;
    const id = pagePath.exec(url.pathname)?.[1];
    if (!id || pages.has(id)) continue;
    pages.set(id, { id, title: (match[1] ?? '').trim() || 'Discover Page', url: url.toString() });
  }
  return [...pages.values()];
}
