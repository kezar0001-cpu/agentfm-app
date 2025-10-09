import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Paper, Alert, Divider,
  ToggleButtonGroup, ToggleButton, IconButton, InputAdornment, FormControl, Select, MenuItem
} from '@mui/material';
import { Visibility, VisibilityOff, Google as GoogleIcon, Apple as AppleIcon,
  Business as BusinessIcon, Home as HomeIcon } from '@mui/icons-material';
import { API_BASE, api, saveTokenFromUrl } from '../lib/auth';

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name:'', email:'', password:'', confirmPassword:'', phone:'', company:'', role:'tenant'
  });
  const [subscriptionPlan, setSubscriptionPlan] = useState('starter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { saveTokenFromUrl(); }, []);

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setError(''); };
  const handleRoleChange = (_e, newRole) => { if (newRole) setFormData({ ...formData, role: newRole }); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setError('Please fill in all required fields'); return;
    }
    if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.role === 'client' && !formData.company) { setError('Company name is required for business accounts'); return; }

    setLoading(true);
    try {
      const res = await api('/auth/register', {
        method: 'POST',
        json: { ...formData, subscriptionPlan: formData.role === 'client' ? subscriptionPlan : null },
      });

      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));

      navigate(formData.role === 'client' ? '/dashboard' : '/tenant/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!API_BASE) { setError('Missing VITE_API_BASE_URL'); return; }
    const url = new URL('/auth/google', API_BASE);
    url.searchParams.set('role', formData.role);
    url.searchParams.set('action', 'signup');
    window.location.href = url.toString();
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h3" component="h1" sx={{
              fontWeight: 700, background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1
            }}>AgentFM</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: .5 }}>Create Account</Typography>
            <Typography variant="body2" color="text.secondary">Join AgentFM to streamline your property management</Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              I want to sign up as a
            </Typography>
            <ToggleButtonGroup value={formData.role} exclusive onChange={handleRoleChange} fullWidth sx={{ mb: 1 }}>
              <ToggleButton value="tenant">
                <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', py:1 }}>
                  <HomeIcon sx={{ mb:.5 }}/> <Typography variant="caption" sx={{ fontWeight: 600 }}>Tenant (Free)</Typography>
                </Box>
              </ToggleButton>
              <ToggleButton value="client">
                <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', py:1 }}>
                  <BusinessIcon sx={{ mb:.5 }}/> <Typography variant="caption" sx={{ fontWeight: 600 }}>Business</Typography>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              {formData.role === 'tenant' ? 'For residents and tenants - Free forever'
                : 'For property managers - Starting at $99/month'}
            </Typography>
          </Box>

          {formData.role === 'client' && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'blue.50', borderRadius: 1, border: '1px solid', borderColor: 'blue.200' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Choose Your Plan</Typography>
              <FormControl fullWidth>
                <Select value={subscriptionPlan} onChange={(e) => setSubscriptionPlan(e.target.value)} size="small">
                  <MenuItem value="starter"><Typography variant="body2" sx={{ fontWeight: 600 }}>Starter - $99/month</Typography></MenuItem>
                  <MenuItem value="professional"><Typography variant="body2" sx={{ fontWeight: 600 }}>Professional - $249/month</Typography></MenuItem>
                  <MenuItem value="enterprise"><Typography variant="body2" sx={{ fontWeight: 600 }}>Enterprise - $499/month</Typography></MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Button fullWidth variant="outlined" onClick={handleGoogle} disabled={loading}
              startIcon={<GoogleIcon />} sx={{ textTransform:'none', borderColor:'#e0e0e0', color:'#757575',
              '&:hover':{ borderColor:'#bdbdbd', backgroundColor:'#f5f5f5' } }}>
              Google
            </Button>
            <Button fullWidth variant="outlined" disabled
              startIcon={<AppleIcon />} sx={{ textTransform:'none', borderColor:'#e0e0e0', color:'#000',
              '&:hover':{ borderColor:'#bdbdbd', backgroundColor:'#f5f5f5' } }}>
              Apple (soon)
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">or sign up with email</Typography>
          </Divider>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField margin="normal" required fullWidth id="name" label="Full Name" name="name"
              autoComplete="name" autoFocus value={formData.name} onChange={handleChange} disabled={loading} />

            {formData.role === 'client' && (
              <TextField margin="normal" required fullWidth id="company" label="Company Name" name="company"
                value={formData.company} onChange={handleChange} disabled={loading} />
            )}

            <TextField margin="normal" required fullWidth id="email" label="Email Address" name="email"
              autoComplete="email" value={formData.email} onChange={handleChange} disabled={loading} />

            <TextField margin="normal" required fullWidth id="phone" label="Phone Number" name="phone"
              autoComplete="tel" value={formData.phone} onChange={handleChange} disabled={loading} />

            <TextField margin="normal" required fullWidth name="password" label="Password"
              type={showPassword ? 'text' : 'password'} id="password" autoComplete="new-password"
              value={formData.password} onChange={handleChange} disabled={loading} helperText="Minimum 8 characters"
              InputProps={{ endAdornment:
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }} />

            <TextField margin="normal" required fullWidth name="confirmPassword" label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword"
              autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} disabled={loading}
              InputProps={{ endAdornment:
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }} />

            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '1rem' }}>
              {loading ? 'Creating Account...'
                : formData.role === 'client' ? 'Continue to Payment' : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Button component={Link} to="/signin" variant="text" size="small"
                  sx={{ textTransform: 'none', fontWeight: 600 }}>
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
