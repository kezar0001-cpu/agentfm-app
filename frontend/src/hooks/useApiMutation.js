// frontend/src/hooks/useApiMutation.js
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
      const resp = await api.request({
        url: variables.url || url,
        method: String(variables.method || method).toUpperCase(),
        data: variables.data,
        headers: variables.headers,
        params: variables.params,
      });

      if (onSuccess) onSuccess(resp, variables);
      return resp;
    } catch (err) {
      console.error('useApiMutation error:', err);
      setIsError(true);
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending, isError, error };
}
