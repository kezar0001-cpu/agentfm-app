// frontend/src/api.js
// Production-ready API client (absolute base + credentials included)

// Base URL from env, sanitized (no trailing slash)
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn('VITE_API_BASE_URL is not set; API calls may fail.');
}

// Safe URL join: accepts '/api/...'(preferred) or 'api/...'
function joinUrl(path) {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return new URL(p, API_BASE + '/').toString();
}

// Read bearer token if you still use it anywhere (cookies are primary)
function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

// Core caller
async function apiCall(url, options = {}) {
  const token = getAuthToken();

  // Build absolute URL against API_BASE
  const path =
    url.startsWith('/api') || url.startsWith('api')
      ? url
      : `/api${url.startsWith('/') ? url : '/' + url}`;
  const fullUrl = url.startsWith('http') ? url : joinUrl(path);

  // Headers: JSON by default; let browser set FormData boundaries
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  // Compose request
  const req = {
    method: options.method || 'GET',
    headers,
    credentials: 'include', // crucial for cross-site cookie auth
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
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = undefined;
      }
      const serverMsg = data?.message || data?.error || text || 'Request failed';
      const err = new Error(serverMsg);
      err.status = res.status;
      err.body = data ?? text;
      // eslint-disable-next-line no-console
      console.error('API ERROR', { url: fullUrl, status: res.status, body: err.body });
      throw err;
    }

    // Prefer JSON if parsable; otherwise return raw text
    try {
      return text ? JSON.parse(text) : undefined;
    } catch {
      return text;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('API call failed:', e);
    throw e;
  }
}

// Public helpers
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
