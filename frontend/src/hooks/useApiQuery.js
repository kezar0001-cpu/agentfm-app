// frontend/src/useApiQuery.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api.js';

const useApiQuery = ({ queryKey, url, enabled = true }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

  const abortRef = useRef(null);
  const didInitRef = useRef(false); // avoid StrictMode double-invoke in dev

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;
    if (isFetching) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsFetching(true);
    setIsError(false);
    setError(null);

    try {
      // Use api.request so we can pass AbortController signal
      const result = await api.request({
        url,
        method: 'GET',
        // headers: { ... } // add if needed
        // params: { ... }  // add if needed
        // data: undefined
        signal: controller.signal,
      });

      const responseData = (result && result.data) || result;
      setData(responseData);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      // eslint-disable-next-line no-console
      console.error('useApiQuery error:', err);
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [enabled, url]); // <- do NOT depend on isFetching to avoid churn

  useEffect(() => {
    // Guard: prevent duplicate fetch in React 18 StrictMode dev double-mount
    if (didInitRef.current) {
      // Still refetch if url/enabled changes later
      fetchData();
      return () => {
        if (abortRef.current) abortRef.current.abort();
      };
    }
    didInitRef.current = true;
    fetchData();

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData]);

  const refetch = () => {
    setIsLoading(true);
    fetchData();
  };

  return {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  };
};

export default useApiQuery;
