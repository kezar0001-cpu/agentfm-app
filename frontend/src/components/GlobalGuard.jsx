import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE, getAuthToken } from '../lib/auth.js';

/**
 * Minimal global guard:
 * - Skips public routes
 * - If no token -> do nothing (AuthGate handles redirect to /signin)
 * - Refreshes /api/auth/me to get latest subscriptionStatus
 * - Redirects to /subscriptions when inactive; to /dashboard when active & stuck on /subscriptions
 */
const PUBLIC_PATHS = new Set(['/signin', '/signup']);
const SUBS_PATH = '/subscriptions';
const DASHBOARD_PATH = '/dashboard';

export default function GlobalGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const inFlight = useRef(false);

  useEffect(() => {
    const path = location.pathname;
    const token = getAuthToken();

    // Never interfere on public routes
    if (PUBLIC_PATHS.has(path)) return;

    // If logged out, let AuthGate do its job
    if (!token) return;

    // Quick local check to reduce flicker
    const userStr = localStorage.getItem('user');
    let activeLocal = false;
    try {
      const u = userStr ? JSON.parse(userStr) : null;
      activeLocal = u?.subscriptionStatus === 'ACTIVE';
    } catch {}

    if (activeLocal && path === SUBS_PATH) {
      navigate(DASHBOARD_PATH, { replace: true });
      return;
    }

    // Avoid repeated fetches while a check is already running
    if (inFlight.current) return;
    inFlight.current = true;

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const u = data?.user;
        if (u) localStorage.setItem('user', JSON.stringify(u));

        const active = u?.subscriptionStatus === 'ACTIVE';
        if (!active && path !== SUBS_PATH) {
          navigate(SUBS_PATH, { replace: true });
        } else if (active && path === SUBS_PATH) {
          navigate(DASHBOARD_PATH, { replace: true });
        }
      })
      .finally(() => {
        inFlight.current = false;
      });
  // re-check on location change
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
