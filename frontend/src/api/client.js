// frontend/src/api/client.js
import axios from 'axios';

// Determine the backend base URL
const baseURL =
  import.meta.env.VITE_API_BASE ||
  `${window.location.origin.replace(/\/$/, '')}/api`;

const client = axios.create({
  baseURL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;
