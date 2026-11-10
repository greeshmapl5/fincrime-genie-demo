export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  const body: unknown = await res.json();
  if (!res.ok) {
    const error = (body as { error?: unknown } | null)?.error;
    throw new Error(typeof error === 'string' ? error : res.statusText);
  }
  return body as T;
}
