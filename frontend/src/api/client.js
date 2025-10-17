import axios from 'axios';
import { getAuthToken } from '../lib/auth.js';

// Choose your API base URL (env wins; fallback to same-origin /api)
const envBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE;
const baseURL = envBase
  ? envBase.replace(/\/$/, '')
  : `${window.location.origin.replace(/\/$/, '')}/api`;

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach the auth token (if we have one) to every request
apiClient.interceptors.request.use((config) => {
  try {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    // If localStorage is unavailable for some reason we still want the call to proceed
    console.warn('Unable to attach auth token:', error);
  }
  return config;
});

// Export BOTH ways so all imports work
export default apiClient;
export { apiClient };
