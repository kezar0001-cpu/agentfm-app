import axios from 'axios';

// Choose your API base URL (env wins; fallback to same-origin /api)
const baseURL =
  import.meta.env.VITE_API_BASE ||
  `${window.location.origin.replace(/\/$/, '')}/api`;

const apiClient = axios.create({
  baseURL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

// Export BOTH ways so all imports work
export default apiClient;
export { apiClient };
