// frontend/src/components/GlobalGuard.jsx
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken } from '../lib/auth.js';
import { api } from '../api.js'; // central client (handles base URL + credentials)

const PUBLIC_PATHS = new Set(['/signin', '/signup']);
const SUBS_PATH = '/subscriptions';

export default function GlobalGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const inFlight = useRef(false);

  useEffect(() => {
    const path = location.pathname;
    const token = getAuthToken();

    // Only guard protected routes when a token exists
    if (PUBLIC_PATHS.has(path) || !token || inFlight.current) return;

    inFlight.current = true;

    // Why: rely on api client to attach cookies/headers & parse JSON
    api
      .get('/api/auth/me')
      .then((data) => {
        const user = data?.user;
        if (!user) return;

        localStorage.setItem('user', JSON.stringify(user));

        const isActive =
          user.subscriptionStatus === 'ACTIVE' ||
          user.subscriptionStatus === 'TRIAL';

        if (!isActive && path !== SUBS_PATH) {
          navigate(SUBS_PATH, { replace: true });
        }
      })
      .catch(() => {
        // If token invalid, push to signin
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!PUBLIC_PATHS.has(path)) navigate('/signin', { replace: true });
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [location.key, navigate]);

  return null;
}
