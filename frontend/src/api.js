// frontend/src/api.js
// Production-ready API client (absolute base + auth header + safe /api prefixing)

const defaultBase =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:3000'
    : 'https://api.buildstate.com.au';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || defaultBase).replace(/\/+$/, '');
const BASE_HAS_API = /\/api$/i.test(API_BASE);

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn('Neither VITE_API_BASE_URL nor a default API_BASE could be determined; API calls may fail.');
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

  // Build a full URL:
  // - If absolute (http/https), use as-is
  // - Else, ensure exactly one '/api' prefix unless API_BASE already ends with '/api'
  let fullUrl;
  if (/^https?:\/\//i.test(url)) {
    fullUrl = url;
  } else {
    const clean = url.replace(/^\/+/, '');
    const prefix = (clean.startsWith('api') || clean.startsWith('api/')) || BASE_HAS_API ? '' : 'api/';
    fullUrl = joinUrl(`/${prefix}${clean}`);
  }

  const isFormData = options.body instanceof FormData || options.data instanceof FormData;

  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const req = {
    method: options.method || 'GET',
    headers,
    // Use cookie auth only when requested at call-site to reduce CORS friction:
    ...(options.credentials ? { credentials: options.credentials } : {}),
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
  request: ({ url, method = 'GET', data, params, headers, credentials }) => {
    const p = params
      ? url + (url.includes('?') ? '&' : '?') + new URLSearchParams(params).toString()
      : url;
    return apiCall(p, { method, data, headers, credentials });
  },
};

export default api;
