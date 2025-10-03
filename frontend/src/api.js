// src/api.js
const BASE = import.meta.env.VITE_API_BASE_URL;

export async function api(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    credentials: 'include',           // send/receive HttpOnly cookies
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}
