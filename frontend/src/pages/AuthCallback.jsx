import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveTokenFromUrl } from '../lib/auth';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // saveTokenFromUrl() reads ?token=... from the URL, stores it, and cleans up
    try { saveTokenFromUrl(); } catch (_) {}
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return null; // or a tiny spinner if you prefer
}
