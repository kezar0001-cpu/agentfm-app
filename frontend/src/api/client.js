// frontend/src/api/client.js
import axios from 'axios';
import { getAuthToken, removeAuthToken, saveAuthToken } from '../lib/auth.js';

// Determine the base URL. Use the environment variable if it exists, otherwise use the current page's origin.
const envBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE;
const baseURL = envBase
  ? envBase.replace(/\/$/, '') // Use env variable and remove any trailing slash
  : `${window.location.origin.replace(/\/$/, '')}`; // Default to the current host

const apiClient = axios.create({
  baseURL,
  // Don't use withCredentials when using Bearer tokens - it can cause CORS issues
  withCredentials: false,
});

let refreshRequest = null;

function redirectToSignin() {
  if (typeof window === 'undefined') return;
  const { pathname } = window.location;
  if (!pathname.startsWith('/signin') && !pathname.startsWith('/signup')) {
    window.location.href = '/signin';
  }
}

function handleUnauthorized({ error, forceLogout = false }) {
  if (import.meta.env.DEV && error?.config) {
    console.error('[API Client] 401 Unauthorized:', {
      url: error.config.url,
      method: error.config.method,
      response: error.response?.data,
    });
  }

  if (forceLogout) {
    removeAuthToken();
    if (typeof window !== 'undefined') {
      window._401ErrorCount = 0;
      window._last401Error = Date.now();
    }
    redirectToSignin();
    return;
  }

  if (typeof window === 'undefined') return;

  const now = Date.now();
  const lastError = window._last401Error || 0;
  const errorCount = window._401ErrorCount || 0;

  if (now - lastError < 5000) {
    window._401ErrorCount = errorCount + 1;

    if (window._401ErrorCount >= 3) {
      removeAuthToken();
      redirectToSignin();
    }
  } else {
    window._401ErrorCount = 1;
  }

  window._last401Error = now;
}

async function requestNewAccessToken() {
  if (!refreshRequest) {
    refreshRequest = apiClient
      .post('/auth/refresh', {}, {
        withCredentials: true,
        __isRefreshRequest: true,
        _skipAuth: true,
      })
      .then((response) => {
        const newToken = response.data?.token || response.data?.accessToken;
        if (!newToken) {
          throw new Error('Refresh response did not include an access token');
        }
        saveAuthToken(newToken);
        return newToken;
      })
      .catch((error) => {
        removeAuthToken();
        throw error;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

// Request interceptor: Attach auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    // If the URL is relative (doesn't start with http), ensure it's prefixed with /api.
    if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api')) {
      config.url = `/api${config.url}`;
    }

    if (config.__isRefreshRequest || config._skipAuth) {
      if (config.headers?.Authorization) {
        delete config.headers.Authorization;
      }
      return config;
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

// Response interceptor: Handle 401 errors with refresh flow
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      const originalRequest = error.config || {};

      if (originalRequest.__isRefreshRequest) {
        handleUnauthorized({ error, forceLogout: true });
        return Promise.reject(error);
      }

      const url = originalRequest.url || '';
      const skipRefresh =
        originalRequest._retry === true ||
        ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some((path) => url.includes(path));

      if (!skipRefresh) {
        originalRequest._retry = true;
        try {
          const newToken = await requestNewAccessToken();
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          handleUnauthorized({ error: refreshError, forceLogout: true });
          return Promise.reject(refreshError);
        }
      }

      handleUnauthorized({ error });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { apiClient };