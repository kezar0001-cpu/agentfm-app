// frontend/src/components/GlobalGuard.jsx
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken, setCurrentUser } from '../lib/auth.js';
import { api } from '../api.js';

const PUBLIC_PATHS = new Set(['/signin', '/signup']);
const SUBS_PATH = '/subscriptions';

export default function GlobalGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const inFlight = useRef(false);

  useEffect(() => {
    const path = location.pathname;
    const token = getAuthToken();
    if (PUBLIC_PATHS.has(path) || !token || inFlight.current) return;

    inFlight.current = true;

    api.get('/api/auth/me')
      .then((data) => {
        const user = data?.user;
        if (!user) return;

        setCurrentUser(user);
        const trialEndDate = user.trialEndDate ? new Date(user.trialEndDate) : null;
        const trialActive =
          user.subscriptionStatus === 'TRIAL' && (!trialEndDate || trialEndDate.getTime() > Date.now());
        const isActive = user.subscriptionStatus === 'ACTIVE' || trialActive;

        if (!isActive && path !== SUBS_PATH) {
          navigate(SUBS_PATH, { replace: true });
        }
      })
      .finally(() => { inFlight.current = false; });
  }, [location.key, navigate]);

  return null;
}
