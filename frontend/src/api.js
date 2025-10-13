// frontend/src/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://agentfm-backend.onrender.com';

function getAuthToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

async function apiCall(url, options = {}) {
  const token = getAuthToken();

  const defaultHeaders = {
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  // Do NOT set Content-Type for FormData, let the browser do it
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  try {
    let fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const response = await fetch(fullUrl, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
      credentials: 'include',
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/signin';
      throw new Error('Unauthorized');
    }

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'An API error occurred');
    }

    return responseData;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

export const api = {
  get: (url) => apiCall(url, { method: 'GET' }),
  post: (url, data) => apiCall(url, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) }),
  patch: (url, data) => apiCall(url, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (url) => apiCall(url, { method: 'DELETE' }),
};

export default api;