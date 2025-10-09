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
      // Extract URL override if provided
      const requestUrl = variables.url || url;
      const requestMethod = variables.method || method;
      const requestData = variables.data;

      console.log('useApiMutation:', requestMethod.toUpperCase(), requestUrl, requestData);

      let response;
      switch (requestMethod.toLowerCase()) {
        case 'post':
          response = await api.post(requestUrl, requestData);
          break;
        case 'put':
          response = await api.put(requestUrl, requestData);
          break;
        case 'patch':
          response = await api.patch(requestUrl, requestData);
          break;
        case 'delete':
          response = await api.delete(requestUrl);
          break;
        default:
          throw new Error(`Unsupported method: ${requestMethod}`);
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(response, variables);
      }

      return response;
    } catch (err) {
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