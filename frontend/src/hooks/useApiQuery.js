// frontend/src/hooks/useApiQuery.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api.js';

const useApiQuery = ({ queryKey, url, enabled = true }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

  const didInitRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;
    if (isFetching) return;

    setIsFetching(true);
    setIsError(false);
    setError(null);

    try {
      const result = await api.get(url);
      const responseData = (result && result.data) || result;
      setData(responseData);
    } catch (err) {
      console.error('useApiQuery error:', err);
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [enabled, url, isFetching]);

  useEffect(() => {
    if (didInitRef.current) {
      fetchData();
      return;
    }
    didInitRef.current = true;
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    return fetchData();
  }, [fetchData]);

  return { data, isLoading, isError, error, isFetching, refetch };
};

export default useApiQuery;
