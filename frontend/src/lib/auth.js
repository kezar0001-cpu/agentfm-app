// Authentication utility functions
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://agentfm-backend.onrender.com';

/**
 * Make API request with proper error handling
 */
export async function api(endpoint, options = {}) {
  const { json, ...fetchOptions } = options;
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
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
export function saveTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const user = params.get('user');
  
  if (token) {
    localStorage.setItem('auth_token', token);
    if (user) {
      try {
        localStorage.setItem('user', decodeURIComponent(user));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }
  return false;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');
  return !!(token && user);
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