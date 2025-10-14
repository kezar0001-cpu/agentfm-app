// frontend/src/useApiMutation.js
import { useState } from 'react';
import { api } from '../api.js';

export default function useApiMutation({ url, method = 'post', invalidateKeys = [], onSuccess }) {
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const mutateAsync = async (variables = {}) => {
    setIsPending(true);
    setIsError(false);
    setError(null);

    try {
      const requestUrl = variables.url || url;
      const requestMethod = String(variables.method || method).toLowerCase();
      const requestData = variables.data;
      const requestHeaders = variables.headers;
      const requestParams = variables.params;

      // Single path via api.request to allow extra options consistently
      const resp = await api.request({
        url: requestUrl,
        method: requestMethod.toUpperCase(),
        data: requestData,
        headers: requestHeaders,
        params: requestParams,
      });

      if (onSuccess) onSuccess(resp, variables);
      return resp;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('useApiMutation error:', err);
      setIsError(true);
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutateAsync,
    isPending,
    isError,
    error,
  };
}
