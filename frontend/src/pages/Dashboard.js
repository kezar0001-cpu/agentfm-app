import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState({});
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchData = async () => {
      try {
        const summary = await api.get('/dashboard/summary');
        const activity = await api.get('/activity?limit=10');
        setData({ summary: summary.data, activity: activity.data });
      } catch (err) {
        console.error(err);
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading]);

  if (authLoading || fetchLoading) return <div>Loading...</div>;
  return <div>Dashboard Content</div>;
};

export default Dashboard;
