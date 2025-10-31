// frontend/src/api/client.js
import axios from 'axios';
import { getAuthToken } from '../lib/auth.js';

// Determine the base URL. Use the environment variable if it exists, otherwise use the current page's origin.
const envBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE;
const baseURL = envBase
  ? envBase.replace(/\/$/, '') // Use env variable and remove any trailing slash
  : `${window.location.origin.replace(/\/$/, '')}`; // Default to the current host

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// This is the crucial part: An interceptor that modifies every request before it's sent.
apiClient.interceptors.request.use((config) => {
  // If the URL is relative (doesn't start with http), ensure it's prefixed with /api.
  if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api')) {
    config.url = `/api${config.url}`;
  }

  // This part attaches your login token to the request.
  try {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Unable to attach auth token:', error);
  }
  return config;
});

export default apiClient;
export { apiClient };