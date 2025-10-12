// Authentication utility functions
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://agentfm-backend.onrender.com';

/**
 * Make API request with proper error handling
 */
export async function api(endpoint, options = {}) {
  const { json, ...fetchOptions } = options;
  
  // Build URL with proper /api prefix
  let url = endpoint;
  if (!endpoint.startsWith('http')) {
    const path = endpoint.startsWith('/api') 
      ? endpoint 
      : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    url = `${API_BASE}${path}`;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add auth token if it exists
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...fetchOptions,
    headers,
  };

  if (json) {
    config.body = JSON.stringify(json);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Save token from URL (for OAuth redirects)
 */
export function saveTokenFromUrl(autoRedirect = true) {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const next = url.searchParams.get('next') || '/dashboard';
    const userParam = url.searchParams.get('user');

    if (!token) return false;

    // persist token
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token); // keep old key for compatibility

    // if backend ever sends a user payload, store it
    if (userParam) {
      try { localStorage.setItem('user', decodeURIComponent(userParam)); } catch {}
    } else if (!localStorage.getItem('user')) {
      // best-effort: populate user in background so pages that read localStorage still work
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data?.user) localStorage.setItem('user', JSON.stringify(data.user));
        })
        .catch(() => {});
    }

    // clean URL (remove token/next/user from the bar)
    url.searchParams.delete('token');
    url.searchParams.delete('next');
    url.searchParams.delete('user');
    const cleaned = `${url.pathname}${url.search ? `?${url.searchParams.toString()}` : ''}${url.hash || ''}`;
    window.history.replaceState({}, '', cleaned);

    if (autoRedirect) window.location.replace(next);
    return true;
  } catch {
    return false;
  }
}

export function isAuthenticated() {
  // minimal change: token alone is enough; we fetch /me to fill user later
  return !!getAuthToken();
}


/**
 * Get current user data
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (e) {
    console.error('Error parsing user data:', e);
    return null;
  }
}

/**
 * Logout user
 */
export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('token'); // Old token key for compatibility
  sessionStorage.clear();
}

/**
 * Get auth token
 */
export function getAuthToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}


