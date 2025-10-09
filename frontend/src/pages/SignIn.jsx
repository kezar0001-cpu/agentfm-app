import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  InputAdornment
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Apple as AppleIcon,
  Business as BusinessIcon,
  AdminPanelSettings as AdminIcon,
  Home as HomeIcon
} from '@mui/icons-material';

export default function SignIn() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('client');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setSelectedRole(newRole);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Demo credentials for different roles
      const demoUsers = {
        client: { 
          email: 'client@demo.com', 
          password: 'demo123', 
          name: 'John Smith', 
          company: 'Smith Properties' 
        },
        admin: { 
          email: 'admin@demo.com', 
          password: 'demo123', 
          name: 'Sarah Admin', 
          company: 'AgentFM' 
        },
        tenant: { 
          email: 'tenant@demo.com', 
          password: 'demo123', 
          name: 'Emily Chen', 
          unit: '4B' 
        }
      };

      const demoUser = demoUsers[selectedRole];

      // Replace this with actual API call:
      // const response = await api('/auth/login', {
      //   method: 'POST',
      //   body: { email: formData.email, password: formData.password, role: selectedRole }
      // });

      if (formData.email === demoUser.email && formData.password === demoUser.password) {
        const user = {
          id: Math.floor(Math.random() * 1000),
          email: formData.email,
          name: demoUser.name,
          role: selectedRole,
          ...(selectedRole === 'client' && { company: demoUser.company }),
          ...(selectedRole === 'tenant' && { unit: demoUser.unit })
        };
        
        // Store authentication data
        localStorage.setItem('token', 'mock-jwt-token-' + Date.now());
        localStorage.setItem('user', JSON.stringify(user));
        
        // Route to appropriate dashboard based on role
        const dashboardRoutes = {
          client: '/dashboard',
          admin: '/admin/dashboard',
          tenant: '/tenant/dashboard'
        };
        
        setTimeout(() => {
          navigate(dashboardRoutes[selectedRole]);
        }, 500);
      } else {
        setError(`Invalid credentials. Demo login:\nEmail: ${demoUser.email}\nPassword: demo123`);
        setLoading(false);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setError('');
    
    try {
      // Replace with actual OAuth implementation:
      // window.location.href = `${API_URL}/auth/${provider.toLowerCase()}?role=${selectedRole}`;
      
      alert(`${provider} login will be implemented with OAuth 2.0.\n\nSelected role: ${selectedRole}\n\nThis will redirect to ${provider}'s authentication page.`);
      setLoading(false);
    } catch (err) {
      setError(`${provider} login failed.`);
      setLoading(false);
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'client':
        return 'Property Managers & Business Accounts';
      case 'admin':
        return 'System Administrators & Support';
      case 'tenant':
        return 'Tenants & Residents';
      default:
        return '';
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box 
        sx={{ 
          marginTop: 8, 
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
            <Typography variant="body2" color="text.secondary">
              Facilities & Property Management Platform
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
              Select your account type
            </Typography>
            <ToggleButtonGroup
              value={selectedRole}
              exclusive
              onChange={handleRoleChange}
              fullWidth
              sx={{ mb: 1 }}
            >
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
              <ToggleButton value="admin">
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  py: 1 
                }}>
                  <AdminIcon sx={{ mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Admin
                  </Typography>
                </Box>
              </ToggleButton>
              <ToggleButton value="tenant">
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  py: 1 
                }}>
                  <HomeIcon sx={{ mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Tenant
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
              {getRoleDescription(selectedRole)}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
          )}

          {/* Social Login Buttons */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleSocialLogin('Google')}
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
              onClick={() => handleSocialLogin('Apple')}
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
              or continue with email
            </Typography>
          </Divider>

          {/* Email/Password Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <Box sx={{ textAlign: 'right', mb: 2 }}>
              <Button
                component={Link}
                to="/forgot-password"
                variant="text"
                size="small"
                sx={{ textTransform: 'none' }}
              >
                Forgot password?
              </Button>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ 
                mt: 1, 
                mb: 2,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Button 
                  component={Link}
                  to="/signup"
                  variant="text" 
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Sign Up
                </Button>
              </Typography>
            </Box>
          </Box>

          {/* Demo Credentials */}
          <Box 
            sx={{ 
              mt: 3, 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1 
            }}
          >
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ fontWeight: 600, display: 'block', mb: 1 }}
            >
              Demo Credentials:
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              component="div" 
              sx={{ fontFamily: 'monospace' }}
            >
              <strong>Client:</strong> client@demo.com / demo123<br />
              <strong>Admin:</strong> admin@demo.com / demo123<br />
              <strong>Tenant:</strong> tenant@demo.com / demo123
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}