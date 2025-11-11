import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Person, Lock, Save, Edit, Article as ArticleIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../context/UserContext';
import { apiClient } from '../api/client.js';
import { queryKeys } from '../utils/queryKeys.js';
import { formatDate } from '../utils/date';

export default function ProfilePage() {
  const { user: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: queryKeys.auth.profile(currentUser?.id),
    queryFn: async () => {
      const response = await apiClient.get('/users/me');
      return response.data?.data ?? response.data;
    },
    enabled: !!currentUser?.id,
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update profile when data loads
  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        company: profile.company || '',
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.patch(`/users/${currentUser.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile(currentUser?.id) });
      toast.success('Profile updated successfully');
      setEditingProfile(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/users/${currentUser.id}/change-password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setEditingPassword(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to change password');
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    changePasswordMutation.mutate(passwordForm);
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 800,
          background: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          animation: 'fade-in-down 0.5s ease-out',
        }}
      >
        Profile Settings
      </Typography>

      {/* Profile Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 80, height: 80, mr: 2, bgcolor: 'primary.main' }}>
            <Person sx={{ fontSize: 40 }} />
          </Avatar>
          <Box>
            <Typography variant="h6">
              {profile?.firstName} {profile?.lastName}
            </Typography>
            <Typography color="text.secondary">{profile?.email}</Typography>
            <Typography variant="body2" color="text.secondary">
              Role: {profile?.role}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Personal Information</Typography>
          {!editingProfile && (
            <Button
              startIcon={<Edit />}
              onClick={() => setEditingProfile(true)}
            >
              Edit
            </Button>
          )}
        </Box>

        <form onSubmit={handleProfileSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                disabled={!editingProfile}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                disabled={!editingProfile}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                disabled={!editingProfile}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company"
                value={profileForm.company}
                onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                disabled={!editingProfile}
              />
            </Grid>
          </Grid>

          {editingProfile && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditingProfile(false);
                  setProfileForm({
                    firstName: profile.firstName || '',
                    lastName: profile.lastName || '',
                    phone: profile.phone || '',
                    company: profile.company || '',
                  });
                }}
              >
                Cancel
              </Button>
            </Box>
          )}
        </form>
      </Paper>

      {/* Change Password */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Change Password</Typography>
          {!editingPassword && (
            <Button
              startIcon={<Lock />}
              onClick={() => setEditingPassword(true)}
            >
              Change
            </Button>
          )}
        </Box>

        {editingPassword ? (
          <form onSubmit={handlePasswordSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  helperText="Must be at least 8 characters"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Lock />}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditingPassword(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
              >
                Cancel
              </Button>
            </Box>
          </form>
        ) : (
          <Typography color="text.secondary">
            Click "Change" to update your password
          </Typography>
        )}
      </Paper>

      {/* Subscription Info */}
      {profile && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Subscription
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography color="text.secondary">Plan</Typography>
              <Typography variant="body1">{profile.subscriptionPlan}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography color="text.secondary">Status</Typography>
              <Typography variant="body1">{profile.subscriptionStatus}</Typography>
            </Grid>
            {profile.trialEndDate && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Trial ends on {formatDate(profile.trialEndDate)}
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Blog Admin Link (only for ADMIN users) */}
      {profile?.role === 'ADMIN' && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Blog Administration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage blog posts, categories, tags, and AI automation
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<ArticleIcon />}
              onClick={() => navigate('/admin/blog')}
              sx={{
                textTransform: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6941a0 100%)',
                },
              }}
            >
              Go to Blog Admin
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
