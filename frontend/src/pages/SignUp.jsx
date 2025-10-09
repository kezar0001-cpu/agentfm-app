import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  InputAdornment,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Apple as AppleIcon,
  Business as BusinessIcon,
  Home as HomeIcon
} from '@mui/icons-material';

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    role: 'tenant'
  });
  const [subscriptionPlan, setSubscriptionPlan] = useState('starter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setFormData({ ...formData, role: newRole });
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.role === 'client' && !formData.company) {
      setError('Company name is required for business accounts');
      return;
    }

    setLoading(true);

    try {
      // For business accounts, show subscription confirmation
      if (formData.role === 'client') {
        const planPrices = {
          starter: '$99',
          professional: '$249',
          enterprise: '$499'
        };
        const price = planPrices[subscriptionPlan];
        
        const confirm = window.confirm(
          `Confirm subscription:\n\nPlan: ${subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1)}\nPrice: ${price}/month\n\nThis is a demo - no payment will be processed.\n\nContinue to create account?`
        );
        
        if (!confirm) {
          setLoading(false);
          return;
        }
      }

      // Replace with actual API call:
      // const response = await api('/auth/register', {
      //   method: 'POST',
      //   body: {
      //     ...formData,
      //     subscriptionPlan: formData.role === 'client' ? subscriptionPlan : null
      //   }
      // });

      const user = {
        id: Math.floor(Math.random() * 1000),
        email: formData.email,
        name: formData.name,
        role: formData.role,
        ...(formData.role === 'client' && { 
          company: formData.company,
          subscriptionPlan: subscriptionPlan 
        })
      };

      // Store authentication data
      localStorage.setItem('token', 'mock-jwt-token-' + Date.now());
      localStorage.setItem('user', JSON.stringify(user));

      setTimeout(() => {
        if (formData.role === 'client') {
          navigate('/dashboard');
        } else {
          navigate('/tenant/dashboard');
        }
      }, 500);

    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSocialSignup = async (provider) => {
    setLoading(true);
    setError('');
    
    try {
      // Replace with actual OAuth implementation:
      // window.location.href = `${API_URL}/auth/${provider.toLowerCase()}?action=signup&role=${formData.role}`;
      
      alert(`${provider} signup will be implemented with OAuth 2.0.\n\nSelected role: ${formData.role}\n\nThis will redirect to ${provider}'s authentication page.`);
      setLoading(false);
    } catch (err) {
      setError(`${provider} signup failed.`);
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box 
        sx={{ 
          marginTop: 8, 
          marginBottom: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            padding: 4, 
            width: '100%', 
            borderRadius: 2 
          }}
        >
          {/* Logo/Brand */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
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
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Join AgentFM to streamline your property management
            </Typography>
          </Box>

          {/* Role Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary" 
              align="center" 
              sx={{ mb: 2 }}
            >
              I want to sign up as a
            </Typography>
            <ToggleButtonGroup
              value={formData.role}
              exclusive
              onChange={handleRoleChange}
              fullWidth
              sx={{ mb: 1 }}
            >
              <ToggleButton value="tenant">
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  py: 1 
                }}>
                  <HomeIcon sx={{ mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Tenant (Free)
                  </Typography>
                </Box>
              </ToggleButton>
              <ToggleButton value="client">
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  py: 1 
                }}>
                  <BusinessIcon sx={{ mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Business
                  </Typography>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              align="center" 
              display="block"
            >
              {formData.role === 'tenant' 
                ? 'For residents and tenants - Free forever' 
                : 'For property managers - Starting at $99/month'}
            </Typography>
          </Box>

          {/* Subscription Plan Selection for Business */}
          {formData.role === 'client' && (
            <Box 
              sx={{ 
                mb: 3, 
                p: 2, 
                bgcolor: 'blue.50', 
                borderRadius: 1, 
                border: '1px solid', 
                borderColor: 'blue.200' 
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Choose Your Plan
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={subscriptionPlan}
                  onChange={(e) => setSubscriptionPlan(e.target.value)}
                  size="small"
                >
                  <MenuItem value="starter">
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Starter - $99/month
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Up to 10 properties
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="professional">
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Professional - $249/month
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Up to 50 properties
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="enterprise">
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Enterprise - $499/month
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Unlimited properties
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Social Signup Buttons */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleSocialSignup('Google')}
              disabled={loading}
              startIcon={<GoogleIcon />}
              sx={{ 
                textTransform: 'none', 
                borderColor: '#e0e0e0', 
                color: '#757575',
                '&:hover': {
                  borderColor: '#bdbdbd',
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              Google
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleSocialSignup('Apple')}
              disabled={loading}
              startIcon={<AppleIcon />}
              sx={{ 
                textTransform: 'none', 
                borderColor: '#e0e0e0', 
                color: '#000',
                '&:hover': {
                  borderColor: '#bdbdbd',
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              Apple
            </Button>
          </Box>

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

            {formData.role === 'client' && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="company"
                label="Company Name"
                name="company"
                value={formData.company}
                onChange={handleChange}
                disabled={loading}
              />
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
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
              autoComplete="tel"
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
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => setShowPassword(!showPassword)} 
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
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
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
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
              {loading 
                ? 'Creating Account...' 
                : formData.role === 'client' 
                  ? 'Continue to Payment' 
                  : 'Create Account'
              }
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