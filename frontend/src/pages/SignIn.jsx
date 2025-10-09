import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Paper, Alert, Divider,
  ToggleButtonGroup, ToggleButton, IconButton, InputAdornment
} from '@mui/material';
import {
  Visibility, VisibilityOff, Google as GoogleIcon, Apple as AppleIcon,
  Business as BusinessIcon, AdminPanelSettings as AdminIcon, Home as HomeIcon
} from '@mui/icons-material';
import { API_BASE, api, saveTokenFromUrl } from '../lib/auth';

export default function SignIn() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('client');

  useEffect(() => { saveTokenFromUrl(); }, []);

    const googleUrl = useMemo(() => {
    if (!API_BASE) return null;
    const url = new URL('/auth/google', API_BASE);
    url.searchParams.set('role', selectedRole);
    url.searchParams.set('action', 'signin');
    return url.toString();
  }, [selectedRole]);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRoleChange = (_e, newRole) => {
    if (newRole) { setSelectedRole(newRole); setError(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        json: { email: formData.email, password: formData.password, role: selectedRole },
      });
      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      const routes = { client: '/dashboard', admin: '/admin/dashboard', tenant: '/tenant/dashboard' };
      navigate(routes[selectedRole] || '/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!googleUrl) { setError('Missing VITE_API_BASE_URL'); return; }
    window.location.href = googleUrl;
  };

  const getRoleDescription = (role) =>
    role === 'client' ? 'Property Managers & Business Accounts'
      : role === 'admin' ? 'System Administrators & Support'
      : 'Tenants & Residents';

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h3" component="h1" sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1
            }}>AgentFM</Typography>
            <Typography variant="body2" color="text.secondary">
              Facilities & Property Management Platform
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              Select your account type
            </Typography>
            <ToggleButtonGroup value={selectedRole} exclusive onChange={handleRoleChange} fullWidth sx={{ mb: 1 }}>
              <ToggleButton value="client">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                  <BusinessIcon sx={{ mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Business</Typography>
                </Box>
              </ToggleButton>
              <ToggleButton value="admin">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                  <AdminIcon sx={{ mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Admin</Typography>
                </Box>
              </ToggleButton>
              <ToggleButton value="tenant">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                  <HomeIcon sx={{ mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Tenant</Typography>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              {getRoleDescription(selectedRole)}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{error}</Alert>}

          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Button
              fullWidth variant="outlined" onClick={handleGoogle} disabled={loading}
              startIcon={<GoogleIcon />} sx={{
                textTransform: 'none', borderColor: '#e0e0e0', color: '#757575',
                '&:hover': { borderColor: '#bdbdbd', backgroundColor: '#f5f5f5' }
              }}>
              Google
            </Button>
            <Button fullWidth variant="outlined" disabled startIcon={<AppleIcon />} sx={{
              textTransform: 'none', borderColor: '#e0e0e0', color: '#000',
              '&:hover': { borderColor: '#bdbdbd', backgroundColor: '#f5f5f5' }
            }}>
              Apple (soon)
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">or continue with email</Typography>
          </Divider>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField margin="normal" required fullWidth id="email" label="Email Address" name="email"
              autoComplete="email" autoFocus value={formData.email} onChange={handleChange} disabled={loading} sx={{ mb: 2 }} />
            <TextField margin="normal" required fullWidth name="password" label="Password"
              type={showPassword ? 'text' : 'password'} id="password" autoComplete="current-password"
              value={formData.password} onChange={handleChange} disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Box sx={{ textAlign: 'right', mb: 2 }}>
              <Button component={Link} to="/forgot-password" variant="text" size="small" sx={{ textTransform: 'none' }}>
                Forgot password?
              </Button>
            </Box>

            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}
              sx={{ mt: 1, mb: 2, py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '1rem' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Button component={Link} to="/signup" variant="text" size="small"
                  sx={{ textTransform: 'none', fontWeight: 600 }}>
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
