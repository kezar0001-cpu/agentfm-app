// frontend/src/api.js
// Production-ready API client (absolute base + credentials included)

// Determine an appropriate API base URL. Use the environment variable when
// available; otherwise fall back to a sensible default. In development we
// assume a local backend on port 3000; in production we point to the
// hosted API subdomain. Without this fallback, API_BASE would be an empty
// string and fetch calls would incorrectly target the front-end domain.
const defaultBase =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:3000'
    : 'https://api.buildstate.com.au';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || defaultBase).replace(
  /\/+$/,
  ''
);
if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn(
    'Neither VITE_API_BASE_URL nor a default API_BASE could be determined; API calls may fail.'
  );
}

function joinUrl(path) {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return new URL(p, API_BASE + '/').toString();
}

function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

async function apiCall(url, options = {}) {
  const token = getAuthToken();

  const path =
    url.startsWith('/api') || url.startsWith('api')
      ? url
      : `/api${url.startsWith('/') ? url : '/' + url}`;
  const fullUrl = url.startsWith('http') ? url : joinUrl(path);

  const isFormData = options.body instanceof FormData || options.data instanceof FormData;
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const req = {
    method: options.method || 'GET',
    headers,
    credentials: 'include', // required for cookie auth
    body:
      options.body ??
      (options.data instanceof FormData
        ? options.data
        : options.data !== undefined
        ? JSON.stringify(options.data)
        : undefined),
  };

  try {
    const res = await fetch(fullUrl, req);
    const text = await res.text();

    if (!res.ok) {
      let data;
      try { data = text ? JSON.parse(text) : undefined; } catch {}
      const serverMsg = data?.message || data?.error || text || 'Request failed';
      const err = new Error(serverMsg);
      err.status = res.status;
      err.body = data ?? text;
      // eslint-disable-next-line no-console
      console.error('API ERROR', { url: fullUrl, status: res.status, body: err.body });
      throw err;
    }

    try { return text ? JSON.parse(text) : undefined; } catch { return text; }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('API call failed:', e);
    throw e;
  }
}

export const api = {
  get: (url, opts) => apiCall(url, { ...(opts || {}), method: 'GET' }),
  post: (url, data, opts) => apiCall(url, { ...(opts || {}), method: 'POST', data }),
  put: (url, data, opts) => apiCall(url, { ...(opts || {}), method: 'PUT', data }),
  patch: (url, data, opts) => apiCall(url, { ...(opts || {}), method: 'PATCH', data }),
  delete: (url, opts) => apiCall(url, { ...(opts || {}), method: 'DELETE' }),
  request: ({ url, method = 'GET', data, params, headers }) => {
    const p = params
      ? url + (url.includes('?') ? '&' : '?') + new URLSearchParams(params).toString()
      : url;
    return apiCall(p, { method, data, headers });
  },
};

export default api;
