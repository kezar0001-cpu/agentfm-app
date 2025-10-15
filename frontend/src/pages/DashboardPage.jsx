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
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import {
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard summary
  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/summary');
      return response.data;
    },
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false, // 5 minutes
  });

  // Fetch recent activity
  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/activity?limit=10');
      return response.data;
    },
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false,
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <DataState type="loading" message="Loading dashboard..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <DataState
          type="error"
          message="Failed to load dashboard"
          onRetry={refetch}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here's what's happening with your properties.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/properties/new')}
          >
            Add Property
          </Button>
        </Stack>
      </Box>

      {/* Alerts Section */}
      {summary?.alerts && summary.alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {summary.alerts.map((alert, index) => (
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Properties Card */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Properties"
            value={summary?.properties?.total || 0}
            icon={<HomeIcon />}
            color="primary"
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
            color="success"
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
            color="warning"
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
            color="info"
            details={[
              { label: 'Scheduled', value: summary?.inspections?.scheduled || 0 },
              { label: 'Upcoming', value: summary?.inspections?.upcoming || 0 },
            ]}
            onClick={() => navigate('/inspections')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {!activity || activity.length === 0 ? (
              <DataState
                type="empty"
                message="No recent activity"
                icon={<InfoIcon />}
              />
            ) : (
              <Stack spacing={2}>
                {activity.map((item) => (
                  <ActivityItem key={item.id} item={item} />
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => navigate('/properties/new')}
              >
                Add Property
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AssignmentIcon />}
                onClick={() => navigate('/inspections/new')}
              >
                Schedule Inspection
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<BuildIcon />}
                onClick={() => navigate('/jobs/new')}
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
            <Paper sx={{ p: 3 }}>
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
  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="overline" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" component="div" sx={{ mb: 2 }}>
              {value}
            </Typography>
            {details && (
              <Stack spacing={0.5}>
                {details.map((detail, index) => (
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
              bgcolor: `${color}.main`,
              color: 'white',
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
    const statusColors = {
      COMPLETED: 'success',
      IN_PROGRESS: 'info',
      SCHEDULED: 'default',
      OPEN: 'warning',
      ASSIGNED: 'info',
    };
    return statusColors[status] || 'default';
  };

  const getIcon = (type) => {
    const icons = {
      inspection: <AssignmentIcon fontSize="small" />,
      job: <BuildIcon fontSize="small" />,
    };
    return icons[type] || <InfoIcon fontSize="small" />;
  };

  const getRoute = (type, id) => {
    const routes = {
      inspection: `/inspections/${id}`,
      job: `/jobs/${id}`,
    };
    return routes[type];
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        p: 2,
        borderRadius: 1,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
      onClick={() => navigate(getRoute(item.type, item.id))}
    >
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: 1,
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {getIcon(item.type)}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2">{item.title}</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {item.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
          <Chip
            label={item.status}
            size="small"
            color={getStatusColor(item.status)}
          />
          {item.priority && (
            <Chip label={item.priority} size="small" variant="outlined" />
          )}
          <Typography variant="caption" color="text.secondary">
            {new Date(item.date).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;
