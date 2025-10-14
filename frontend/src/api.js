// frontend/src/api.js  (minimal patch to improve error visibility)
... // keep the top part as you have it

async function apiCall(url, options = {}) {
  const token = getAuthToken();

  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const path = url.startsWith('/api') || url.startsWith('api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
    const fullUrl = url.startsWith('http') ? url : joinUrl(path);

    const response = await fetch(fullUrl, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
      credentials: 'include',
    });

    // read text once so we can show detailed errors
    const text = await response.text();

    if (!response.ok) {
      // try to parse JSON then fall back to text
      let data;
      try { data = text ? JSON.parse(text) : undefined; } catch {}
      const serverMsg = data?.message || data?.error || text || 'Request failed';
      const err = new Error(serverMsg);
      err.status = response.status;
      err.body = data ?? text;
      // helpful console for 500s
      // eslint-disable-next-line no-console
      console.error('API ERROR', { url: fullUrl, status: response.status, body: err.body });
      throw err;
    }

    try { return text ? JSON.parse(text) : undefined; } catch { return text; }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('API call failed:', error);
    throw error;
  }
}

export const api = {
  get: (url) => apiCall(url, { method: 'GET' }),
  post: (url, data) => apiCall(url, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) }),
  put:  (url, data) => apiCall(url, { method: 'PUT',  body: data instanceof FormData ? data : JSON.stringify(data) }),
  patch:(url, data) => apiCall(url, { method: 'PATCH',body: data instanceof FormData ? data : JSON.stringify(data) }),
  delete:(url) => apiCall(url, { method: 'DELETE' }),
  request: ({ url, method = 'GET', data, params, headers }) => {
    const p = params ? url + (url.includes('?') ? '&' : '?') + new URLSearchParams(params).toString() : url;
    return apiCall(p, {
      method,
      headers,
      body: data instanceof FormData ? data : (data !== undefined ? JSON.stringify(data) : undefined),
    });
  },
};

export default api;
