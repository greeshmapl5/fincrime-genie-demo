export function safeLink(value?: string | null) {
  if (!value) return undefined;
  try { return new URL(value).protocol === 'https:' ? value : undefined; }
  catch { return undefined; }
}
