// frontend/src/lib/auth.js
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

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
      try { localStorage.setItem('user', decodeURIComponent(userParam)); } catch {}
    } else if (!localStorage.getItem('user')) {
      const meUrl = API_BASE ? `${API_BASE}/api/auth/me` : '/api/auth/me';
      fetch(meUrl, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
        .then(r => (r.ok ? r.text() : null))
        .then(t => {
          if (!t) return;
          let payload; try { payload = JSON.parse(t); } catch { return; }
          if (payload?.user) {
            localStorage.setItem('user', JSON.stringify(payload.user));
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
export async function logout() {
  try {
    const url = API_BASE ? `${API_BASE}/api/auth/logout` : '/api/auth/logout';
    await fetch(url, { method: 'POST', credentials: 'include' });
  } catch (e) { console.warn('Server logout failed (continuing):', e); }
  localStorage.removeItem('auth_token'); localStorage.removeItem('user'); localStorage.removeItem('token'); sessionStorage.clear();
}
export function getAuthToken() { return localStorage.getItem('auth_token') || localStorage.getItem('token'); }
