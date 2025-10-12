import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useApiQuery from '../hooks/useApiQuery.js';
import { getAuthToken, saveTokenFromUrl, logout } from '../lib/auth';

const OPEN_ROUTES = new Set(['/signin', '/signup', '/forgot-password']);

export default function GlobalGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  // capture ?token=... if present, but don't redirect here
  useEffect(() => { saveTokenFromUrl(false); }, []);

  const token = getAuthToken();

  // if no token and not on an open route, send to /signin with next=
  useEffect(() => {
    if (!token && !OPEN_ROUTES.has(location.pathname)) {
      const q = new URLSearchParams();
      q.set('next', location.pathname + location.search);
      navigate(`/signin?${q.toString()}`, { replace: true });
    }
  }, [token, location, navigate]);

  const skipChecks = !token || OPEN_ROUTES.has(location.pathname);

  // validate token + get user (source of truth)
  const meQuery = useApiQuery({
    queryKey: ['me'],
    url: '/api/auth/me',
    enabled: !skipChecks,
    retry: false,
  });

  // invalid/expired token → log out → /signin
  useEffect(() => {
    if (!skipChecks && meQuery.isError) {
      logout();
      navigate('/signin', { replace: true });
    }
  }, [skipChecks, meQuery.isError, navigate]);

  // gate PROPERTY_MANAGER without ACTIVE sub → /subscriptions
  useEffect(() => {
    const u = meQuery.data?.user;
    if (!u) return;
    if (u.role === 'PROPERTY_MANAGER') {
      const status = u.subscriptionStatus;
      if (status !== 'ACTIVE' && location.pathname !== '/subscriptions') {
        navigate('/subscriptions', { replace: true });
      }
    }
  }, [meQuery.data, location.pathname, navigate]);

  return null; // no UI, just guards
}
