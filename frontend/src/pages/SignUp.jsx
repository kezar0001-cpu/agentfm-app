import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Paper, Alert, Divider,
  IconButton, InputAdornment
} from '@mui/material';
import {
  Visibility, VisibilityOff, Google as GoogleIcon
} from '@mui/icons-material';
import { API_BASE, api, saveTokenFromUrl } from '../lib/auth';

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { 
    // Check if already authenticated
    const token = localStorage.getItem('auth_token');
    if (token) {
      navigate('/dashboard');
    }
    // Check for OAuth redirect token
    saveTokenFromUrl(); 
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setError('Please fill in all required fields');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Password validation
    if (formData.password.length < 8) { 
      setError('Password must be at least 8 characters'); 
      return false; 
    }
    
    if (formData.password !== formData.confirmPassword) { 
      setError('Passwords do not match'); 
      return false; 
    }
    
    // Phone validation (basic)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid phone number');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await api('/api/auth/register', {
        method: 'POST',
        json: { 
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phone: formData.phone.trim()
        },
      });

      if (!res.token || !res.user) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));

      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!API_BASE) { 
      setError('Google sign-up is not configured'); 
      return; 
    }
    const url = new URL('/api/auth/google', API_BASE);
    url.searchParams.set('action', 'signup');
    window.location.href = url.toString();
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          {/* Header */}
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
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Join AgentFM to streamline your property management
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Google Sign Up */}
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={handleGoogle} 
            disabled={loading}
            startIcon={<GoogleIcon />} 
            sx={{ 
              mb: 2,
              textTransform:'none', 
              borderColor:'#e0e0e0', 
              color:'#757575',
              '&:hover':{ 
                borderColor:'#bdbdbd', 
                backgroundColor:'#f5f5f5' 
              } 
            }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              or sign up with email
            </Typography>
          </Divider>

          {/* Registration Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField 
              margin="normal" 
              required 
              fullWidth 
              id="name" 
              label="Full Name" 
              name="name"
              autoComplete="name" 
              autoFocus 
              value={formData.name} 
              onChange={handleChange} 
              disabled={loading} 
            />

            <TextField 
              margin="normal" 
              required 
              fullWidth 
              id="email" 
              label="Email Address" 
              name="email"
              type="email"
              autoComplete="email" 
              value={formData.email} 
              onChange={handleChange} 
              disabled={loading} 
            />

            <TextField 
              margin="normal" 
              required 
              fullWidth 
              id="phone" 
              label="Phone Number" 
              name="phone"
              type="tel"
              autoComplete="tel" 
              placeholder="+1 234 567 8900"
              value={formData.phone} 
              onChange={handleChange} 
              disabled={loading} 
            />

            <TextField 
              margin="normal" 
              required 
              fullWidth 
              name="password" 
              label="Password"
              type={showPassword ? 'text' : 'password'} 
              id="password" 
              autoComplete="new-password"
              value={formData.password} 
              onChange={handleChange} 
              disabled={loading} 
              helperText="Minimum 8 characters"
              InputProps={{ 
                endAdornment:
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => setShowPassword(!showPassword)} 
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
              }} 
            />

            <TextField 
              margin="normal" 
              required 
              fullWidth 
              name="confirmPassword" 
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'} 
              id="confirmPassword"
              autoComplete="new-password" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              disabled={loading}
              InputProps={{ 
                endAdornment:
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                      edge="end"
                      disabled={loading}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
              }} 
            />

            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              size="large" 
              disabled={loading}
              sx={{ 
                mt: 3, 
                mb: 2, 
                py: 1.5, 
                fontWeight: 600, 
                textTransform: 'none', 
                fontSize: '1rem' 
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Button 
                  component={Link} 
                  to="/signin" 
                  variant="text" 
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                  disabled={loading}
                >
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