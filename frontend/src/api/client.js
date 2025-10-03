// base URL forced to /api in dev via Vite proxy
import axios from 'axios';
import { buildApiError } from '../utils/error.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(buildApiError(error))
);

export default api;
