import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { saveAuthToken, setCurrentUser } from '../lib/auth';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

export default function AdminSetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await apiClient.get('/auth/setup/check');
      setSetupRequired(response.data.setupRequired);
      if (!response.data.setupRequired) {
        setError('Admin account already exists. Please sign in instead.');
      }
    } catch (err) {
      setError('Failed to check setup status. Please try again.');
      console.error('Setup check error:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/setup', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone || undefined,
      });

      if (response.data.success) {
        // Save auth token and user
        saveAuthToken(response.data.accessToken);
        setCurrentUser(response.data.user);

        // Redirect to blog admin
        navigate('/admin/blog');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Setup failed. Please try again.';
      setError(message);
      console.error('Setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Checking setup status...
        </Typography>
      </Container>
    );
  }

  if (!setupRequired) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <AdminPanelSettingsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Setup Complete
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              Admin account already exists. Please sign in to continue.
            </Alert>
          </Box>
          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate('/admin/blog/login')}
            sx={{ mt: 2 }}
          >
            Go to Admin Sign In
          </Button>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <MuiLink
              component="button"
              variant="body2"
              onClick={() => navigate('/')}
              sx={{ cursor: 'pointer' }}
            >
              Back to Home
            </MuiLink>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <AdminPanelSettingsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Admin Setup
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create the first admin account for Buildstate FM
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            required
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            margin="normal"
            disabled={loading}
          />
          <TextField
            fullWidth
            required
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            margin="normal"
            disabled={loading}
          />
          <TextField
            fullWidth
            required
            type="email"
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Phone (Optional)"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            margin="normal"
            placeholder="+1 234 567 8900"
            disabled={loading}
          />
          <TextField
            fullWidth
            required
            type="password"
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            disabled={loading}
            helperText="Minimum 8 characters"
          />
          <TextField
            fullWidth
            required
            type="password"
            label="Confirm Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            disabled={loading}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Admin Account'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <MuiLink
              component="button"
              variant="body2"
              onClick={() => navigate('/')}
              sx={{ cursor: 'pointer' }}
              disabled={loading}
            >
              Back to Home
            </MuiLink>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
