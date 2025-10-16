import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Paper, Alert, Divider,
  IconButton, InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff, Google as GoogleIcon } from '@mui/icons-material';
import { saveTokenFromUrl } from '../lib/auth';
import { api } from '../api.js';

export default function SignIn() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    saveTokenFromUrl?.();
    const token = localStorage.getItem('auth_token');
    if (token) navigate('/dashboard');
  }, [navigate]);

  const googleUrl = useMemo(() => {
    const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
    if (!BASE) return null;
    const url = new URL('/api/auth/google', BASE + '/');
    url.searchParams.set('role', 'PROPERTY_MANAGER');
    return url.toString();
  }, []);

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (!res?.token || !res?.user) throw new Error(res?.message || 'Invalid response from server');

      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      navigate('/dashboard');
    } catch (err) {
      // Try to extract server message
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Please try again.';
      setError(msg);
      // eslint-disable-next-line no-console
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!googleUrl) {
      setError('Google sign-in is not configured');
      return;
    }
    window.location.href = googleUrl;
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}
            >
              AgentFM
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to manage your properties
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogle}
            disabled={loading || !googleUrl}
            startIcon={<GoogleIcon />}
            sx={{
              mb: 2, textTransform: 'none', borderColor: '#e0e0e0', color: '#757575',
              '&:hover': { borderColor: '#bdbdbd', backgroundColor: '#f5f5f5' }
            }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">or sign in with email</Typography>
          </Divider>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal" required fullWidth id="email" label="Email Address" name="email"
              type="email" autoComplete="email" autoFocus value={formData.email}
              onChange={handleChange} disabled={loading} sx={{ mb: 2 }}
            />

            <TextField
              margin="normal" required fullWidth name="password" label="Password"
              type={showPassword ? 'text' : 'password'} id="password" autoComplete="current-password"
              value={formData.password} onChange={handleChange} disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" disabled={loading}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Box sx={{ textAlign: 'right', mb: 2 }}>
              <Button component={Link} to="/forgot-password" variant="text" size="small" sx={{ textTransform: 'none' }} disabled={loading}>
                Forgot password?
              </Button>
            </Box>

            <Button
              type="submit" fullWidth variant="contained" size="large" disabled={loading}
              sx={{ mt: 1, mb: 2, py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '1rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Don&apos;t have an account?{' '}
                <Button component={Link} to="/signup" variant="text" size="small"
                  sx={{ textTransform: 'none', fontWeight: 600 }} disabled={loading}>
                  Sign Up
                </Button>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
