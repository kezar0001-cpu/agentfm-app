// frontend/src/api/client.js
import axios from 'axios';
import { getAuthToken, removeAuthToken } from '../lib/auth.js';

// Determine the base URL. Use the environment variable if it exists, otherwise use the current page's origin.
const envBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE;
const baseURL = envBase
  ? envBase.replace(/\/$/, '') // Use env variable and remove any trailing slash
  : `${window.location.origin.replace(/\/$/, '')}`; // Default to the current host

const apiClient = axios.create({
  baseURL,
  // Don't use withCredentials when using Bearer tokens - it can cause CORS issues
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: Attach auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    // If the URL is relative (doesn't start with http), ensure it's prefixed with /api.
    if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api')) {
      config.url = `/api${config.url}`;
    }

    // Attach the auth token to the request
    try {
      const token = getAuthToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        
        // Debug logging in development
        if (import.meta.env.DEV) {
          console.log('[API Client] Request:', {
            url: config.url,
            method: config.method,
            hasToken: !!token,
            tokenPreview: token ? `${token.substring(0, 20)}...` : null
          });
        }
      } else {
        console.warn('[API Client] No auth token found for request:', config.url);
      }
    } catch (error) {
      console.error('[API Client] Error attaching auth token:', error);
    }
    return config;
  },
  (error) => {
    console.error('[API Client] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors by clearing auth
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401, the token is invalid - clear it and redirect to login
    if (error.response?.status === 401) {
      console.warn('Received 401 Unauthorized - clearing auth token');
      removeAuthToken();
      // Only redirect if not already on auth pages
      if (!window.location.pathname.startsWith('/signin') && 
          !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { apiClient };