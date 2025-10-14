// frontend/src/lib/auth.js

// Authentication utility functions
// Use env base only (no stale fallbacks)
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Make API request with proper error handling.
 * - Always sends cookies (cross-site auth).
 * - Builds absolute URL against API_BASE.
 * - Handles JSON and non-JSON responses safely.
 */
export async function api(endpoint, options = {}) {
  const { json, ...fetchOptions } = options;

  // Build URL with proper /api prefix when a relative path is given
  let url = endpoint;
  if (!endpoint?.startsWith('http')) {
    const path = endpoint.startsWith('/api')
      ? endpoint
      : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    url = API_BASE ? `${API_BASE}${path}` : path;
  }

  // Headers
  const headers = {
    ...(fetchOptions.headers || {}),
  };

  // JSON body handling (keep FormData untouched)
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Add auth token if it exists
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = {
    ...fetchOptions,
    headers,
    credentials: 'include', // required for cookie auth across domains
  };

  if (json !== undefined) {
    config.body = JSON.stringify(json);
  }

  try {
    const response = await fetch(url, config);

    // Robust parse
    const text = await response.text();
    const tryJson = () => {
      try { return text ? JSON.parse(text) : undefined; } catch { return undefined; }
    };
    const data = tryJson();

    if (!response.ok) {
      const message =
        (data && (data.message || data.error)) ||
        (text || `HTTP ${response.status}`);
      throw new Error(message);
    }

    // Prefer JSON if possible, otherwise return text
    return data !== undefined ? data : text;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('API Error:', error);
    throw error;
  }
}

// Map a role to its portal base path
export function portalPathForRole(role) {
  switch (role) {
    case 'ADMIN':             return '/admin/dashboard';
    case 'PROPERTY_MANAGER':  return '/dashboard';
    case 'OWNER':             return '/owner/dashboard';
    case 'TECHNICIAN':        return '/tech/dashboard';
    case 'TENANT':            return '/tenant/dashboard';
    default:                  return '/dashboard';
  }
}

/**
 * Save token from URL (for OAuth redirects)
 * - Persists token
 * - Best-effort fetch of user profile
 * - Cleans query params from the URL bar
 * - Optional auto-redirect to `next`
 */
export function saveTokenFromUrl(autoRedirect = true) {
  try {
    const u = new URL(window.location.href);
    const token = u.searchParams.get('token');
    const next = u.searchParams.get('next') || '/dashboard';
    const userParam = u.searchParams.get('user');

    if (!token) return false;

    // Persist token
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token); // legacy key

    // If backend sends user payload inline
    if (userParam) {
      try { localStorage.setItem('user', decodeURIComponent(userParam)); } catch {}
    } else if (!localStorage.getItem('user')) {
      // Populate user in background
      const meUrl = API_BASE ? `${API_BASE}/api/auth/me` : '/api/auth/me';
      fetch(meUrl, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
        .then(r => (r.ok ? r.text() : null))
        .then(t => {
          if (!t) return;
          let payload;
          try { payload = JSON.parse(t); } catch { return; }
          if (payload?.user) {
            localStorage.setItem('user', JSON.stringify(payload.user));
            // Correct portal after first redirect if needed
            const target = portalPathForRole(payload.user.role);
            const here = window.location.pathname;
            if (autoRedirect && !here.startsWith(target)) {
              window.location.replace(target);
            }
          }
        })
        .catch(() => {});
    }

    // Clean URL (remove token/next/user)
    u.searchParams.delete('token');
    u.searchParams.delete('next');
    u.searchParams.delete('user');
    const cleanedQuery = u.searchParams.toString();
    const cleaned = `${u.pathname}${cleanedQuery ? `?${cleanedQuery}` : ''}${u.hash || ''}`;
    window.history.replaceState({}, '', cleaned);

    if (autoRedirect) window.location.replace(next);
    return true;
  } catch {
    return false;
  }
}

// keep your minimal token-only auth check
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Get current user data from localStorage
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error parsing user data:', e);
    return null;
  }
}

/**
 * Logout user
 * - Best-effort server logout (cookie session)
 * - Always clears client state
 */
export async function logout() {
  try {
    const url = API_BASE ? `${API_BASE}/api/auth/logout` : '/api/auth/logout';
    await fetch(url, {
      method: 'POST',
      credentials: 'include', // send cookie to invalidate server session
    });
  } catch (e) {
    // ignore — client state cleared below
    // eslint-disable-next-line no-console
    console.warn('Server logout failed (continuing):', e);
  }

  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('token'); // legacy key
  sessionStorage.clear();
}

/**
 * Get auth token
 */
export function getAuthToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}
