import { useState, useEffect } from 'react';

// Mock data for development
const mockDashboardData = {
  openJobs: 12,
  overdueJobs: 3,
  completedJobs30d: 45,
  averagePci: 78.5,
  pendingRecommendations: 7,
  updatedAt: new Date().toISOString()
};

const useApiQuery = ({ queryKey, url }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchData = async () => {
    if (isFetching) return; // Prevent multiple simultaneous requests
    
    setIsFetching(true);
    setIsError(false);
    setError(null);

    try {
      // For development, use mock data and simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful response with mock data
      setData(mockDashboardData);
      
      // If you want to try actual API call later, uncomment this:
      /*
      const response = await fetch(`http://localhost:3000/api${url}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setData(result);
      */
      
    } catch (err) {
      console.warn('API call failed:', err.message);
      setIsError(true);
      setError(err);
      // Even on error, set some mock data for development
      setData(mockDashboardData);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]); // Only depend on url

  const refetch = () => {
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