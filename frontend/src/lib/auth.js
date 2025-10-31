// frontend/src/lib/auth.js
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const USER_UPDATED_EVENT = 'agentfm:user-updated';

export function broadcastUserUpdate(user) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  let event;
  if (typeof window.CustomEvent === 'function') {
    event = new window.CustomEvent(USER_UPDATED_EVENT, { detail: user });
  } else {
    event = new Event(USER_UPDATED_EVENT);
    try {
      Object.defineProperty(event, 'detail', {
        configurable: true,
        enumerable: true,
        value: user,
      });
    } catch {
      event.detail = user;
    }
  }

  window.dispatchEvent(event);
}

export async function api(endpoint, options = {}) {
  const { json, ...fetchOptions } = options;

  let url = endpoint;
  if (!endpoint?.startsWith('http')) {
    const path = endpoint.startsWith('/api')
      ? endpoint
      : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    url = API_BASE ? `${API_BASE}${path}` : path;
  }

  const headers = { ...(fetchOptions.headers || {}) };
  if (json !== undefined) headers['Content-Type'] = 'application/json';

  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { ...fetchOptions, headers, credentials: 'include' };
  if (json !== undefined) config.body = JSON.stringify(json);

  try {
    const response = await fetch(url, config);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : undefined; } catch {}
    if (!response.ok) {
      const message = data?.message || data?.error || text || `HTTP ${response.status}`;
      throw new Error(message);
    }
    return data ?? text;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export function portalPathForRole(role) {
  switch (role) {
    case 'ADMIN': return '/admin/dashboard';
    case 'PROPERTY_MANAGER': return '/dashboard';
    case 'OWNER': return '/owner/dashboard';
    case 'TECHNICIAN': return '/tech/dashboard';
    case 'TENANT': return '/tenant/dashboard';
    default: return '/dashboard';
  }
}

export function saveTokenFromUrl(autoRedirect = true) {
  try {
    const u = new URL(window.location.href);
    const token = u.searchParams.get('token');
    const next = u.searchParams.get('next') || '/dashboard';
    const userParam = u.searchParams.get('user');
    if (!token) return false;

    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);

    if (userParam) {
      try {
        const decoded = decodeURIComponent(userParam);
        localStorage.setItem('user', decoded);
        try {
          broadcastUserUpdate(JSON.parse(decoded));
        } catch {
          broadcastUserUpdate(getCurrentUser());
        }
      } catch {
        broadcastUserUpdate(getCurrentUser());
      }
    } else if (!localStorage.getItem('user')) {
      const meUrl = API_BASE ? `${API_BASE}/api/auth/me` : '/api/auth/me';
      fetch(meUrl, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
        .then(r => (r.ok ? r.text() : null))
        .then(t => {
          if (!t) return;
          let payload; try { payload = JSON.parse(t); } catch { return; }
          if (payload?.user) {
            localStorage.setItem('user', JSON.stringify(payload.user));
            broadcastUserUpdate(payload.user);
            const target = portalPathForRole(payload.user.role);
            const here = window.location.pathname;
            if (autoRedirect && !here.startsWith(target)) window.location.replace(target);
          }
        })
        .catch(() => {});
    }

    u.searchParams.delete('token'); u.searchParams.delete('next'); u.searchParams.delete('user');
    const cleanedQuery = u.searchParams.toString();
    const cleaned = `${u.pathname}${cleanedQuery ? `?${cleanedQuery}` : ''}${u.hash || ''}`;
    window.history.replaceState({}, '', cleaned);

    if (autoRedirect) window.location.replace(next);
    return true;
  } catch {
    return false;
  }
}

export function isAuthenticated() { return !!getAuthToken(); }
export function getCurrentUser() {
  const userStr = localStorage.getItem('user'); if (!userStr) return null;
  try { return JSON.parse(userStr); } catch (e) { console.error('Error parsing user data:', e); return null; }
}

export function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem('user');
  } else {
    localStorage.setItem('user', JSON.stringify(user));
  }
  broadcastUserUpdate(user);
}

export function saveAuthToken(token) {
  if (!token) return;
  localStorage.setItem('auth_token', token);
  localStorage.setItem('token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.clear();
  broadcastUserUpdate(null);
}

export async function logout() {
  try {
    // Using the api helper function for consistency, though fetch works too
    await api('/auth/logout', { method: 'POST' });
  } catch (e) { console.warn('Server logout failed (continuing):', e); }
  removeAuthToken();
}
export function getAuthToken() { return localStorage.getItem('auth_token') || localStorage.getItem('token'); }

/**
 * Fetches the latest user data from the server and updates localStorage.
 * This is useful after events like subscription changes.
 */
export async function refreshCurrentUser() {
  try {
    const data = await api('/auth/me'); // Use the api helper
    if (data?.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      broadcastUserUpdate(data.user);
      return data.user;
    }
    return null;
  } catch (error) {
    console.error("Failed to refresh user data:", error);
    // If token is invalid, the api helper might throw an error.
    // A 401 status would indicate we should log the user out.
    if (error.message.includes('401')) {
      await logout();
      window.location.href = '/signin';
    }
    return null;
  }
}

