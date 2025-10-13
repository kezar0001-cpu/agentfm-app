import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken, API_BASE } from '../lib/auth.js';

const PUBLIC_PATHS = new Set(['/signin', '/signup']);
const SUBS_PATH = '/subscriptions';

export default function GlobalGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const inFlight = useRef(false);

  useEffect(() => {
    const path = location.pathname;
    const token = getAuthToken();

    if (PUBLIC_PATHS.has(path) || !token || inFlight.current) {
      return;
    }

    inFlight.current = true;

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const user = data?.user;
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          const isActive = user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIAL';
          if (!isActive && path !== SUBS_PATH) {
            navigate(SUBS_PATH, { replace: true });
          }
        }
      })
      .finally(() => {
        inFlight.current = false;
      });

  }, [location.key, navigate]);

  return null;
}