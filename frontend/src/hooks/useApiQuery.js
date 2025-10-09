import { useState, useEffect } from 'react';
import { api } from '../api.js';

const useApiQuery = ({ queryKey, url, enabled = true }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchData = async () => {
    // Prevent multiple simultaneous requests
    if (isFetching) return;
    
    setIsFetching(true);
    setIsError(false);
    setError(null);

    try {
      console.log('useApiQuery fetching:', url);
      const result = await api.get(url);
      console.log('useApiQuery result:', result);
      
      // Handle both { data: [...] } and direct array responses
      const responseData = result.data || result;
      setData(responseData);
      
    } catch (err) {
      console.error('useApiQuery error:', err);
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [url, enabled]); // Re-fetch when URL changes

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