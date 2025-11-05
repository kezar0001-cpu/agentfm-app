import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Chip,
  IconButton,
  Paper,
  Divider,
  Stack,
} from '@mui/material';
import {
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon, // Import clock icon for trial
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import { useCurrentUser } from '../context/UserContext.jsx'; // Hook to reactively read user data
import { calculateDaysRemaining } from '../utils/date.js';
import { redirectToBillingPortal } from '../utils/billing.js';
import { queryKeys } from '../utils/queryKeys.js';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user: currentUser } = useCurrentUser();

  useEffect(() => {
    // Update the time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, []);


  // Fetch dashboard summary
  const {
    data: summary = { properties: {}, units: {}, jobs: {}, inspections: {}, serviceRequests: {} },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/summary');
      // Backend returns { success: true, summary: {...} }
      return response.data?.summary || response.data;
    },
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false, // 5 minutes
  });

  // Fetch recent activity
  const { data: activity } = useQuery({
    queryKey: queryKeys.dashboard.activity(),
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/activity?limit=10');
      // Backend returns { success: true, items: [...] }
      return response.data?.items || response.data;
    },
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false,
  });

  const handleRefresh = () => {
    refetch();
  };

  // --- Subscription Status Logic ---
  const subscriptionStatus = currentUser?.subscriptionStatus;
  const trialEndDate = currentUser?.trialEndDate;
  const trialDaysRemaining = calculateDaysRemaining(trialEndDate);
  
  const isTrialActive = subscriptionStatus === 'TRIAL' && trialDaysRemaining > 0;
  const isSubscribed = subscriptionStatus === 'ACTIVE';
  
  // We want to show an alert if the user is NOT actively subscribed.
  // This covers cases where the trial has expired, or the status is null/cancelled/suspended.
  const showSubscriptionAlert = !isSubscribed;

  const renderSubscriptionAlert = () => {
    if (isTrialActive) {
      return (
        <Alert
          severity="info"
          icon={<AccessTimeIcon fontSize="inherit" />}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/subscriptions')}>
              Subscribe Now
            </Button>
          }
          sx={{ mb: 3 }}
        >
          <AlertTitle>Trial Period</AlertTitle>
          You have <strong>{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left</strong> in your free trial. Subscribe to keep access to all features.
        </Alert>
      );
    }
    
    // This will show if the trial is over, or status is anything other than ACTIVE or a valid TRIAL.
    return (
      <Alert
        severity="warning"
        icon={<WarningIcon fontSize="inherit" />}
        action={
          <Button color="inherit" size="small" onClick={() => navigate('/subscriptions')}>
            Subscribe
          </Button>
        }
        sx={{ mb: 3 }}
      >
        <AlertTitle>No Active Subscription</AlertTitle>
        Your trial has ended or your subscription is inactive. Please subscribe to restore full functionality.
      </Alert>
    );
  };
  // --- End Subscription Status Logic ---

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <DataState type="loading" message="Loading dashboard..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <DataState
          type="error"
          message="Failed to load dashboard"
          onRetry={refetch}
        />
      </Container>
    );
  }
  
  // Filter out the generic "no subscription" alert if we are handling it separately
  const backendAlerts = Array.isArray(summary?.alerts) ? summary.alerts.filter(alert => alert.id !== 'no_subscription') : [];
  const activityItems = Array.isArray(activity) ? activity : [];

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 2, md: 0 }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        sx={{
          mb: { xs: 3, md: 4 },
          gap: { xs: 2, md: 0 },
          animation: 'fade-in-down 0.5s ease-out',
        }}
      >
        <Box>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
            Welcome back! Here's what's happening with your properties.
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}
        >
          <IconButton
            onClick={handleRefresh}
            color="primary"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(185, 28, 28, 0.08)',
                transform: 'rotate(180deg)',
              },
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/properties', { state: { openCreateDialog: true } })}
            fullWidth
            sx={{
              maxWidth: { xs: '100%', md: 'none' },
              background: 'linear-gradient(135deg, #f97316 0%, #b91c1c 100%)',
              boxShadow: '0 4px 14px 0 rgb(185 28 28 / 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
                boxShadow: '0 6px 20px 0 rgb(185 28 28 / 0.4)',
              },
            }}
          >
            Add Property
          </Button>
        </Stack>
      </Stack>

      {/* --- Dynamic Subscription Status Display --- */}
      {showSubscriptionAlert && renderSubscriptionAlert()}
      
      {isSubscribed && (
         <Alert
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{ mb: 3, display: 'flex', alignItems: 'center' }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <AlertTitle>Subscription Active</AlertTitle>
            You have full access to all features.
          </Box>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {currentTime.toLocaleTimeString()}
          </Typography>
          <Button color="inherit" size="small" onClick={redirectToBillingPortal}>
            Manage
          </Button>
        </Alert>
      )}
      {/* --- End Subscription Status Display --- */}


      {/* Backend-driven Alerts Section */}
      {backendAlerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {backendAlerts.map((alert, index) => (
            <Alert
              key={index}
              severity={alert.type}
              action={
                alert.action && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate(alert.action.link)}
                  >
                    {alert.action.label}
                  </Button>
                )
              }
              sx={{ mb: 2 }}
            >
              <AlertTitle>{alert.title}</AlertTitle>
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4, animation: 'fade-in-up 0.6s ease-out' }}>
        {/* Properties Card */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Properties"
            value={summary?.properties?.total || 0}
            icon={<HomeIcon />}
            color="#3b82f6"
            details={[
              { label: 'Active', value: summary?.properties?.active || 0 },
              { label: 'Inactive', value: summary?.properties?.inactive || 0 },
            ]}
            onClick={() => navigate('/properties')}
          />
        </Grid>

        {/* Units Card */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Units"
            value={summary?.units?.total || 0}
            icon={<HomeIcon />}
            color="#10b981"
            details={[
              { label: 'Occupied', value: summary?.units?.occupied || 0 },
              { label: 'Available', value: summary?.units?.available || 0 },
            ]}
            onClick={() => navigate('/properties')}
          />
        </Grid>

        {/* Jobs Card */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Jobs"
            value={summary?.jobs?.total || 0}
            icon={<BuildIcon />}
            color="#f59e0b"
            details={[
              { label: 'Open', value: summary?.jobs?.open || 0 },
              { label: 'In Progress', value: summary?.jobs?.inProgress || 0 },
              { label: 'Overdue', value: summary?.jobs?.overdue || 0, alert: true },
            ]}
            onClick={() => navigate('/jobs')}
          />
        </Grid>

        {/* Inspections Card */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Inspections"
            value={summary?.inspections?.total || 0}
            icon={<AssignmentIcon />}
            color="#8b5cf6"
            details={[
              { label: 'Scheduled', value: summary?.inspections?.scheduled || 0 },
              { label: 'Upcoming', value: summary?.inspections?.upcoming || 0 },
            ]}
            onClick={() => navigate('/inspections')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ animation: 'fade-in 0.7s ease-out' }}>
        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 12px 0 rgb(0 0 0 / 0.1)',
              },
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight={700}>
              Recent Activity
            </Typography>
            <Divider sx={{ mb: 2.5 }} />
            
            {activityItems.length === 0 ? (
              <DataState
                type="empty"
                message="No recent activity"
                icon={<InfoIcon />}
              />
            ) : (
              <Stack spacing={2}>
                {activityItems.map((item) => (
                  <ActivityItem key={item.id} item={item} />
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: { xs: 2.5, md: 3.5 },
              mb: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 12px 0 rgb(0 0 0 / 0.1)',
              },
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight={700}>
              Quick Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => navigate('/properties', { state: { openCreateDialog: true } })}
              >
                Add Property
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AssignmentIcon />}
                onClick={() => navigate('/inspections', { state: { openCreateDialog: true } })}
              >
                Schedule Inspection
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<BuildIcon />}
                onClick={() => navigate('/jobs', { state: { openCreateDialog: true } })}
              >
                Create Job
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/service-requests')}
              >
                View Requests
              </Button>
            </Stack>
          </Paper>

          {/* Service Requests Summary (if applicable) */}
          {summary?.serviceRequests && summary.serviceRequests.total > 0 && (
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom>
                Service Requests
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Submitted
                  </Typography>
                  <Chip
                    label={summary.serviceRequests.submitted}
                    size="small"
                    color="warning"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Under Review
                  </Typography>
                  <Chip
                    label={summary.serviceRequests.underReview}
                    size="small"
                    color="info"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Approved
                  </Typography>
                  <Chip
                    label={summary.serviceRequests.approved}
                    size="small"
                    color="success"
                  />
                </Box>
                <Button
                  fullWidth
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/service-requests')}
                >
                  View All
                </Button>
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, details, onClick }) => {
  const detailItems = Array.isArray(details) ? details : [];

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'flex-start' },
            gap: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography color="text.secondary" variant="overline" gutterBottom sx={{ letterSpacing: 0.8 }}>
              {title}
            </Typography>
            <Typography
              variant="h3"
              component="div"
              sx={{ mb: 1.5, fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700 }}
            >
              {value}
            </Typography>
            {detailItems.length > 0 && (
              <Stack spacing={0.5}>
                {detailItems.map((detail, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {detail.label}:
                    </Typography>
                    <Chip
                      label={detail.value}
                      size="small"
                      color={detail.alert && detail.value > 0 ? 'error' : 'default'}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: color,
              color: 'white',
              borderRadius: 2,
              p: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              alignSelf: { xs: 'flex-start', sm: 'center' },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Activity Item Component
const ActivityItem = ({ item }) => {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    const normalizedStatus = status ? status.toUpperCase() : '';
    const statusColors = {
      COMPLETED: 'success',
      IN_PROGRESS: 'info',
      SCHEDULED: 'default',
      OPEN: 'warning',
      ASSIGNED: 'info',
      ACTIVE: 'success',
      INACTIVE: 'default',
      UNDER_MAINTENANCE: 'warning',
      AVAILABLE: 'success',
      OCCUPIED: 'info',
      MAINTENANCE: 'warning',
      SUBMITTED: 'warning',
      UNDER_REVIEW: 'info',
      APPROVED: 'success',
      CONVERTED_TO_JOB: 'primary',
      REJECTED: 'error',
      CANCELLED: 'default',
      SYSTEM: 'info',
      NOTIFICATION: 'info',
      INSPECTION_SCHEDULED: 'info',
      INSPECTION_REMINDER: 'info',
      JOB_ASSIGNED: 'info',
      JOB_COMPLETED: 'success',
      SERVICE_REQUEST_UPDATE: 'info',
      SUBSCRIPTION_EXPIRING: 'warning',
      PAYMENT_DUE: 'warning',
    };
    return statusColors[normalizedStatus] || 'default';
  };

  const getIcon = (type) => {
    const icons = {
      inspection: <AssignmentIcon fontSize="small" />,
      job: <BuildIcon fontSize="small" />,
      property: <HomeIcon fontSize="small" />,
      unit: <HomeIcon fontSize="small" />,
      service_request: <BuildIcon fontSize="small" />,
      notification: <InfoIcon fontSize="small" />,
    };
    return icons[type] || <InfoIcon fontSize="small" />;
  };

  const getRoute = (type, id, currentItem) => {
    const routes = {
      inspection: '/inspections',
      job: '/jobs',
      service_request: '/service-requests',
    };
    if (type === 'unit' || type === 'property' || type === 'notification') {
      return currentItem?.link;
    }
    return routes[type];
  };

  const route = item.link || getRoute(item.type, item.id, item);
  const isClickable = Boolean(route);
  const statusLabel = item.status ? item.status.replace(/_/g, ' ') : null;
  const priorityLabel = item.priority ? item.priority.replace(/_/g, ' ') : null;
  const formattedDate = item.date
    ? new Date(item.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Date unavailable';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        gap: { xs: 1.5, sm: 2 },
        p: 2,
        borderRadius: 1,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
        '&:hover': isClickable
          ? {
              bgcolor: 'action.hover',
            }
          : undefined,
      }}
      onClick={isClickable ? () => navigate(route) : undefined}
    >
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: 1,
          p: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
        }}
      >
        {getIcon(item.type)}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {item.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          gutterBottom
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description || 'No additional details provided.'}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            rowGap: 0.5,
            mt: 0.5,
          }}
        >
          {statusLabel && (
            <Chip
              label={statusLabel}
              size="small"
              color={getStatusColor(item.status)}
            />
          )}
          {priorityLabel && (
            <Chip label={priorityLabel} size="small" variant="outlined" />
          )}
          <Typography variant="caption" color="text.secondary">
            {formattedDate}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;