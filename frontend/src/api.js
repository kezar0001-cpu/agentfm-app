// src/api.js
// Robust API helper that safely joins the base URL + path,
// always sends/receives cookies, and surfaces useful errors.

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = RAW_BASE.replace(/\/+$/, ''); // strip trailing slash(es)

if (!BASE) {
  console.error(
    'VITE_API_BASE_URL is not set. Create frontend/.env with:\n' +
    'VITE_API_BASE_URL=https://<your-backend>-3000.app.github.dev'
  );
} else {
  console.log('API BASE ->', BASE);
}

/**
 * Call your backend API.
 * @param {string} path - e.g. '/auth/login'
 * @param {object} [opts]
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [opts.method='GET']
 * @param {object} [opts.body] - JSON body
 * @param {object} [opts.headers] - extra headers
 * @returns {Promise<any>} parsed JSON (or {} if no body)
 * @throws {Error} on non-2xx with best-guess message
 */
export async function api(path, { method = 'GET', body, headers } = {}) {
  // ensure path has exactly one leading slash
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE}${p}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    credentials: 'include', // send/receive HttpOnly cookies
    body: body ? JSON.stringify(body) : undefined,
  });

  // Try to parse JSON, but don't explode if there's no body
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse errors (e.g., 204 No Content)
  }

  if (!res.ok) {
    // Prefer server-provided message, else status
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed: ${res.status} ${res.statusText}` ||
      'Request failed';
    throw new Error(msg);
  }

  return data ?? {};
}

// (Optional) Convenience helpers, if you like:
// export const get  = (p, opts) => api(p, { ...opts, method: 'GET' });
// export const post = (p, body, opts) => api(p, { ...opts, method: 'POST', body });
// export const del  = (p, opts) => api(p, { ...opts, method: 'DELETE' });
