import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, Email } from '@mui/icons-material';
import api from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setSuccess(false);

    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });

      if (response.data.success) {
        setSuccess(true);
        setEmail(''); // Clear the form
      } else {
        setError(response.data.message || 'An error occurred. Please try again.');
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);

      // Handle different error responses
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 429) {
        setError('Too many requests. Please try again later.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Forgot Password?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No worries! Enter your email address and we'll send you instructions to reset your password.
            </Typography>
          </Box>

          {/* Success Message */}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Check your email!
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                If an account exists with this email, you will receive password reset instructions shortly.
                Please check your spam folder if you don't see it within a few minutes.
              </Typography>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                error={!!emailError}
                helperText={emailError}
                disabled={isLoading}
                placeholder="your.email@example.com"
                InputProps={{
                  startAdornment: (
                    <Email sx={{ color: 'action.active', mr: 1 }} />
                  ),
                }}
                sx={{ mb: 3 }}
                autoFocus
                autoComplete="email"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{
                  mb: 2,
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}

          {/* Back to Sign In Link */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link
              to="/signin"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                color: '#1976d2',
                fontWeight: 500,
              }}
            >
              <ArrowBack sx={{ fontSize: 18, mr: 0.5 }} />
              Back to Sign In
            </Link>
          </Box>

          {/* Additional Help */}
          {success && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Didn't receive the email?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                • Check your spam or junk folder
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Make sure you entered the correct email address
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Wait a few minutes and try again
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Additional Information */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="white">
            Need help? Contact support at{' '}
            <a
              href="mailto:support@buildtstate.com.au"
              style={{ color: 'white', fontWeight: 600 }}
            >
              support@buildtstate.com.au
            </a>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
