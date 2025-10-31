// frontend/src/api.js
// Production-ready API client (absolute base + auth header + safe /api prefixing)

const defaultBase =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:3000'
    : 'https://api.buildstate.com.au';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || defaultBase).replace(/\/+$/, '');
const BASE_HAS_API = /\/api$/i.test(API_BASE);

const REFRESH_EXCLUDED_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshRequest = null;

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn('Neither VITE_API_BASE_URL nor a default API_BASE could be determined; API calls may fail.');
}

function joinUrl(path) {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return new URL(p, API_BASE + '/').toString();
}

function resolveApiUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const clean = url.replace(/^\/+/, '');
  const prefix = clean.startsWith('api') || clean.startsWith('api/') || BASE_HAS_API ? '' : 'api/';
  return joinUrl(`/${prefix}${clean}`);
}

function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

async function persistAuthToken(token) {
  try {
    const authModule = await import('./lib/auth.js');
    if (typeof authModule.saveAuthToken === 'function') {
      authModule.saveAuthToken(token);
      return token;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Falling back to local token storage:', error);
  }

  try {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
  } catch (storageError) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist refreshed auth token:', storageError);
  }

  return token;
}

async function clearAuthState() {
  try {
    const authModule = await import('./lib/auth.js');
    if (typeof authModule.removeAuthToken === 'function') {
      authModule.removeAuthToken();
      return;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Falling back to clearing auth token locally:', error);
  }

  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (storageError) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear auth state:', storageError);
  }
}

async function requestNewAccessToken() {
  if (!refreshRequest) {
    const refreshUrl = resolveApiUrl('/auth/refresh');
    refreshRequest = fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }

        if (!res.ok) {
          const message = data?.message || data?.error || text || 'Token refresh failed';
          const error = new Error(message);
          error.status = res.status;
          error.body = data ?? text;
          throw error;
        }

        const newToken = data?.token || data?.accessToken;
        if (!newToken) {
          throw new Error('Refresh response did not include an access token');
        }

        await persistAuthToken(newToken);
        return newToken;
      })
      .catch(async (error) => {
        await clearAuthState();
        throw error;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

async function apiCall(url, options = {}) {
  const token = getAuthToken();

  // Build a full URL:
  // - If absolute (http/https), use as-is
  // - Else, ensure exactly one '/api' prefix unless API_BASE already ends with '/api'
  const fullUrl = resolveApiUrl(url);

  const isFormData = options.body instanceof FormData || options.data instanceof FormData;

  const buildRequest = (authToken) => {
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    };

    if (authToken && !headers.Authorization) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    return {
      method: options.method || 'GET',
      headers,
      ...(options.credentials ? { credentials: options.credentials } : {}),
      body:
        options.body ??
        (options.data instanceof FormData
          ? options.data
          : options.data !== undefined
          ? JSON.stringify(options.data)
          : undefined),
    };
  };

  const shouldSkipRefresh =
    options.skipAuthRefresh === true ||
    REFRESH_EXCLUDED_PATHS.some((path) => fullUrl.includes(path));

  const execute = async (authToken) => {
    const response = await fetch(fullUrl, buildRequest(authToken));
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }
    return { response, text, data };
  };

  let attempt = 0;
  let lastError;

  while (attempt < 2) {
    const currentToken = getAuthToken();

    try {
      const { response, text, data } = await execute(currentToken);

      if (response.ok) {
        return data !== undefined ? data : text;
      }

      const serverMsg = data?.message || data?.error || text || 'Request failed';
      const err = new Error(serverMsg);
      err.status = response.status;
      err.body = data ?? text;

      if (response.status === 401 && attempt === 0 && !shouldSkipRefresh) {
        try {
          await requestNewAccessToken();
          attempt += 1;
          continue;
        } catch (refreshError) {
          // eslint-disable-next-line no-console
          console.error('Token refresh failed:', refreshError);
          throw err;
        }
      }

      throw err;
    } catch (error) {
      lastError = error;
      break;
    }
  }

  // eslint-disable-next-line no-console
  console.error('API call failed:', lastError);
  throw lastError;
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

// Legacy export for compatibility
export const apiRequest = apiCall;

export default api;
