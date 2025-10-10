import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { isAuthenticated } from './lib/auth.js';

function AuthGate({ children }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authenticated = isAuthenticated();
        
        console.log('AuthGate checking authentication:', authenticated);

        if (!authenticated) {
          console.log('Not authenticated, redirecting to signin');
          navigate('/signin', { replace: true });
        } else {
          console.log('Authentication valid, proceeding');
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/signin', { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  if (isChecking) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f5f5f5'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return children;
}

export default AuthGate;