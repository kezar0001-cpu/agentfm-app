import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { refreshCurrentUser } from './lib/auth.js';

function AuthGate({ children }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await refreshCurrentUser();
        
        console.log('AuthGate checking authentication:', !!user);

        if (!user) {
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