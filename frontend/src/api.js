// Use environment variable for API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://agentfm-backend.onrender.com/api' : 'http://localhost:3000/api');

async function apiCall(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    credentials: 'include', // Important for CORS with credentials
  };

  try {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const response = await fetch(fullUrl, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

export const api = {
  get: (url) => apiCall(url),
  post: (url, data) => apiCall(url, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (url, data) => apiCall(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (url) => apiCall(url, {
    method: 'DELETE',
  }),
};

export default api;