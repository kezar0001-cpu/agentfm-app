import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Paper, Alert, Divider,
  IconButton, InputAdornment, Grid
} from '@mui/material';
import { Visibility, VisibilityOff, Google as GoogleIcon } from '@mui/icons-material';
import { saveTokenFromUrl } from '../lib/auth';
import { api } from '../api.js';

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', company: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword, phone } = formData;
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('Please enter a valid email address'); return false; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return false; }
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (phone && !phoneRegex.test(phone)) { setError('Please enter a valid phone number'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Aligns with your Prisma schema: firstName + lastName
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        role: 'PROPERTY_MANAGER',          // self-signup role
        // company: formData.company.trim() // optional: send only if you’ll store it server-side
      };

      const res = await api.post('/api/auth/register', payload);

      if (!res?.token || !res?.user) throw new Error(res?.message || 'Invalid response from server');

      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      navigate('/dashboard');
    } catch (err) {
      // Try to pick the first Zod error message if available
      const msg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please try again.';
      setError(msg);
      // eslint-disable-next-line no-console
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!googleUrl) { setError('Google sign-up is not configured'); return; }
    window.location.href = googleUrl;
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" component="h1" sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}>
              AgentFM
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Create Account</Typography>
            <Typography variant="body2" color="text.secondary">Join AgentFM to streamline your property management</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Button
            fullWidth variant="outlined" onClick={handleGoogle}
            disabled={loading || !googleUrl} startIcon={<GoogleIcon />}
            sx={{ mb: 2, textTransform: 'none', borderColor: '#e0e0e0', color: '#757575',
              '&:hover': { borderColor: '#bdbdbd', backgroundColor: '#f5f5f5' } }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">or sign up with email</Typography>
          </Divider>

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="normal" required fullWidth id="firstName" label="First Name" name="firstName"
                  autoComplete="given-name" autoFocus value={formData.firstName}
                  onChange={handleChange} disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="normal" required fullWidth id="lastName" label="Last Name" name="lastName"
                  autoComplete="family-name" value={formData.lastName}
                  onChange={handleChange} disabled={loading}
                />
              </Grid>
            </Grid>

            <TextField
              margin="normal" required fullWidth id="email" label="Email Address" name="email"
              type="email" autoComplete="email" value={formData.email}
              onChange={handleChange} disabled={loading}
            />

            <TextField
              margin="normal" fullWidth id="phone" label="Phone Number" name="phone"
              type="tel" autoComplete="tel" placeholder="+61 400 000 000"
              value={formData.phone} onChange={handleChange} disabled={loading}
            />

            {/* Optional field for your UI — not required by schema */}
            <TextField
              margin="normal" fullWidth id="company" label="Company / Organization" name="company"
              autoComplete="organization" value={formData.company}
              onChange={handleChange} disabled={loading}
            />

            <TextField
              margin="normal" required fullWidth name="password" label="Password"
              type={showPassword ? 'text' : 'password'} id="password" autoComplete="new-password"
              value={formData.password} onChange={handleChange} disabled={loading} helperText="Minimum 8 characters"
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" disabled={loading}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}}
            />

            <TextField
              margin="normal" required fullWidth name="confirmPassword" label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" autoComplete="new-password"
              value={formData.confirmPassword} onChange={handleChange} disabled={loading}
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" disabled={loading}>
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}}
            />

            <Button
              type="submit" fullWidth variant="contained" size="large" disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '1rem' }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Button component={Link} to="/signin" variant="text" size="small"
                  sx={{ textTransform: 'none', fontWeight: 600 }} disabled={loading}>
                  Sign In
                </Button>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
