// Production-ready API client
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://agentfm-backend.onrender.com';

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

// Main API call function
async function apiCall(url, options = {}) {
  const token = getAuthToken();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    credentials: 'include',
  };

  try {
    // Build full URL - handle /api prefix properly
    let fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    // Ensure /api prefix if not present
    if (!fullUrl.includes('/api/') && !url.startsWith('http')) {
      fullUrl = fullUrl.replace(API_BASE_URL, `${API_BASE_URL}/api`);
    }
    
    const response = await fetch(fullUrl, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    // Handle 401 Unauthorized - redirect to signin
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
      throw new Error('Unauthorized - please sign in again');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// API methods compatible with both direct calls and react-query
export const api = {
  get: (url) => apiCall(url, { method: 'GET' }),
  
  post: (url, data) => apiCall(url, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  put: (url, data) => apiCall(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  patch: (url, data) => apiCall(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  delete: (url) => apiCall(url, {
    method: 'DELETE',
  }),

  // Generic request method for hooks compatibility
  request: ({ url, method = 'GET', data, params, headers }) => {
    let fullUrl = url;
    
    // Add query params if provided
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    }

    const options = {
      method: method.toUpperCase(),
      headers: headers || {},
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      options.body = JSON.stringify(data);
    }

    return apiCall(fullUrl, options);
  },
};

export default api;