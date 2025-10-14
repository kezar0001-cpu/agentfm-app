// frontend/src/api.js
// Production-ready API client
import { API_BASE } from './lib/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || API_BASE;

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

// Main API call function
async function apiCall(url, options = {}) {
  const token = getAuthToken();
  
  const headers = {
    // This will be populated below
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  // 👇 MINIMAL CHANGE START: Conditionally set Content-Type
  // Do NOT set Content-Type for FormData; the browser must handle it to include the boundary.
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  // 👆 MINIMAL CHANGE END

  try {
    // Build full URL with proper /api prefix
    let fullUrl = url;

    if (!url.startsWith('http')) {
      const path = url.startsWith('/api')
        ? url
        : `/api${url.startsWith('/') ? url : '/' + url}`;
      fullUrl = `${API_BASE_URL}${path}`;
    }

    // Only send cookies when explicitly requested or when making a
    // same-origin request.  Some hosting providers reject cross-origin
    // requests that include credentials, which previously surfaced as a
    // generic "Failed to fetch" error in the UI.
    let shouldSendCredentials = options.credentials;
    if (shouldSendCredentials === undefined && typeof window !== 'undefined') {
      try {
        const requestOrigin = new URL(fullUrl, window.location.href).origin;
        shouldSendCredentials = requestOrigin === window.location.origin ? 'include' : 'omit';
      } catch {
        shouldSendCredentials = 'omit';
      }
    }

    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      credentials: shouldSendCredentials ?? 'omit',
    });

    // Handle 401 Unauthorized - redirect to signin
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
      throw new Error('Unauthorized - please sign in again');
    }

    // 👇 MINIMAL CHANGE START: Better error handling for non-JSON server responses
    const text = await response.text();
    let responseData;
    try {
        responseData = JSON.parse(text);
    } catch (e) {
        // If parsing fails, it's not a valid JSON response.
        if (!response.ok) {
            throw new Error(text || `HTTP ${response.status} Error`);
        }
        // It could be a non-JSON success response, which we don't expect but handle gracefully.
        return text; 
    }
    // 👆 MINIMAL CHANGE END

    if (!response.ok) {
      const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return responseData;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// 👇 MINIMAL CHANGE START: Pass FormData directly without stringifying
export const api = {
  get: (url) => apiCall(url, { method: 'GET' }),
  
  post: (url, data) => apiCall(url, {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  }),

  put: (url, data) => apiCall(url, {
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data),
  }),

  patch: (url, data) => apiCall(url, {
    method: 'PATCH',
    body: data instanceof FormData ? data : JSON.stringify(data),
  }),
  
  delete: (url) => apiCall(url, {
    method: 'DELETE',
  }),

  request: ({ url, method = 'GET', data, params, headers }) => {
    // ... (rest of your existing request function)
  },
};
// 👆 MINIMAL CHANGE END

export default api;