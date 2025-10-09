// src/lib/auth.ts
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function saveTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    localStorage.setItem('auth_token', token);
    window.history.replaceState({}, '', window.location.pathname);
  }
}

export async function api<T = any>(
  path: string,
  opts: RequestInit & { json?: any } = {}
): Promise<T> {
  if (!API_BASE) throw new Error('Missing VITE_API_BASE_URL');
  const headers: Record<string, string> = { ...(opts.headers as any) };
  if (opts.json) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.json ? JSON.stringify(opts.json) : opts.body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed ${res.status}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : ((await res.text()) as any);
}
