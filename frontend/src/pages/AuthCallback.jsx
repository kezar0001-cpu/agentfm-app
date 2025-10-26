import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * OAuth Callback Handler
 * Receives token from OAuth providers (Google, etc.) and stores it
 * then redirects to the appropriate dashboard
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const next = searchParams.get('next');
    const error = searchParams.get('error');

    // Handle error case
    if (error) {
      console.error('OAuth error:', error);
      navigate(`/signin?error=${error}`);
      return;
    }

    // Handle success case
    if (token) {
      // Store the token in localStorage
      localStorage.setItem('token', token);

      // Redirect to the next page or dashboard
      const redirectPath = next || '/dashboard';
      navigate(redirectPath, { replace: true });
    } else {
      // No token provided
      console.error('No token received from OAuth');
      navigate('/signin?error=no_token');
    }
  }, [searchParams, navigate]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        Completing sign in...
      </Typography>
    </Box>
  );
}
