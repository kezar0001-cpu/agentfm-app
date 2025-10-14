// frontend/src/api.js
// Production-ready API client (absolute base + credentials included)

// 1) REMOVE any import of API_BASE; we derive it from Vite env
//    import { API_BASE } from './lib/auth.js';  <-- delete this if present

// Base URL from env, sanitized (no trailing slash)
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
if (!API_BASE) {
  // Visible warning if misconfigured in prod
  // eslint-disable-next-line no-console
  console.warn('VITE_API_BASE_URL is not set; API calls will fail in prod.');
}

// Safe URL join: accepts '/api/...'(preferred) or 'api/...'
function joinUrl(path) {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return new URL(p, API_BASE + '/').toString();
}

// Read bearer token if you still use it anywhere (cookies are primary)
function getAuthToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

// Main API call function
async function apiCall(url, options = {}) {
  const token = getAuthToken();

  // Headers: set JSON by default; let browser set multipart boundaries for FormData
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    // Build absolute URL against API_BASE
    const path = url.startsWith('/api') || url.startsWith('api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
    const fullUrl = url.startsWith('http') ? url : joinUrl(path);

    // Always include credentials for cross-site cookie auth
    const response = await fetch(fullUrl, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
      credentials: 'include', // <<< required for auth cookies on https://api.buildstate.com.au
    });

    // Handle 401 Unauthorized - redirect to signin
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') window.location.href = '/signin';
      throw new Error('Unauthorized - please sign in again');
    }

    // Robust body parsing (works for JSON and non-JSON)
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      if (!response.ok) throw new Error(text || `HTTP ${response.status} Error`);
      return text; // non-JSON success (rare)
    }

    if (!response.ok) {
      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      const err = new Error(msg);
      err.status = response.status;
      err.body = data;
      throw err;
    }

    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('API call failed:', error);
    throw error;
  }
}

// Thin helpers (support FormData or JSON seamlessly)
export const api = {
  get: (url) => apiCall(url, { method: 'GET' }),

  post: (url, data) =>
    apiCall(url, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  put: (url, data) =>
    apiCall(url, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  patch: (url, data) =>
    apiCall(url, {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  delete: (url) => apiCall(url, { method: 'DELETE' }),

  // Optional generic request shape; keep if callers use it
  request: ({ url, method = 'GET', data, params, headers }) => {
    const p = params
      ? url +
        (url.includes('?') ? '&' : '?') +
        new URLSearchParams(params).toString()
      : url;

    return apiCall(p, {
      method,
      headers,
      body:
        data instanceof FormData
          ? data
          : data !== undefined
          ? JSON.stringify(data)
          : undefined,
    });
  },
};

export default api;
