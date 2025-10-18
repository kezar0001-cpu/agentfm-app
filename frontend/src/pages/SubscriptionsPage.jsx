import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  MenuItem,
  Stack,
  Button,
  Card,
  CardContent,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';
import { normaliseArray } from '../utils/error.js';
import { refreshCurrentUser } from '../lib/auth.js'; // Import the refresh function

const STATUSES = ['active', 'pending', 'suspended', 'cancelled'];

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const query = useApiQuery({
    queryKey: ['subscriptions'],
    url: '/api/subscriptions',
  });
  const mutation = useApiMutation({
    url: '/api/subscriptions/:id',
    method: 'patch',
    invalidateKeys: [['subscriptions']],
  });

  const checkoutMutation = useApiMutation({
    url: '/api/billing/checkout',
    method: 'post',
  });
  
  const params = new URLSearchParams(location.search);
  const showSuccess = params.get('success') === '1';
  const showCanceled = params.get('canceled') === '1';

  // Effect to refresh user data on successful subscription
  useEffect(() => {
    if (showSuccess) {
      refreshCurrentUser().then(() => {
        // Remove success param from URL to prevent message on reload
        navigate(location.pathname, { replace: true });
        // Optional: you could show a more persistent success message here
        // using a snackbar or notification context.
      });
    }
  }, [showSuccess, navigate, location.pathname]);


  const subscriptions = normaliseArray(query.data);
  const hasActiveSubscription = subscriptions.some(
    (sub) => sub.status === 'active'
  );

  const handleStatusChange = async (subscriptionId, status) => {
    await mutation.mutateAsync({
      url: `/api/subscriptions/${subscriptionId}`,
      method: 'patch',
      data: { status },
    });
  };


  const startCheckout = async (plan = 'STARTER') => {
    try {
      const res = await checkoutMutation.mutateAsync({
        data: {
          plan,
          successUrl: `${window.location.origin}/subscriptions?success=1`,
          cancelUrl: `${window.location.origin}/subscriptions?canceled=1`,
        },
      });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (_) {
      // error shown via checkoutMutation.error
    }
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          {/* Header */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              {hasActiveSubscription ? 'Your Subscription' : 'Get Started with AgentFM'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {hasActiveSubscription
                ? 'Manage your subscription and billing'
                : 'Unlock full access to manage your properties, units, and team'}
            </Typography>
          </Box>

          {/* Banners */}
          {showSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>Payment successful!</strong> Your subscription is now active. Welcome to AgentFM!
            </Alert>
          )}
          {showCanceled && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Checkout was canceled. No charges were made. You can subscribe anytime.
            </Alert>
          )}
          {checkoutMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {checkoutMutation.error?.message || 'Checkout failed. Please try again.'}
            </Alert>
          )}

          {/* Pricing Card - Only show if no active subscription */}
          {!hasActiveSubscription && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Card
                sx={{
                  maxWidth: 500,
                  width: '100%',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  boxShadow: 3,
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={3}>
                    {/* Plan Header */}
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip
                        label="MOST POPULAR"
                        color="primary"
                        size="small"
                        sx={{ mb: 2, fontWeight: 600 }}
                      />
                      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Starter Plan
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
                        <Typography variant="h2" sx={{ fontWeight: 700 }}>
                          $29
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                          /month
                        </Typography>
                      </Box>
                    </Box>

                    <Divider />

                    {/* Features List */}
                    <List sx={{ py: 0 }}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Unlimited properties & units" />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Assign owners, tenants & technicians" />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Inspection & job management" />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Maintenance plans & scheduling" />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Reports & analytics dashboard" />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Service requests & recommendations" />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Email support" />
                      </ListItem>
                    </List>

                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={() => startCheckout('STARTER')}
                      disabled={checkoutMutation.isPending}
                      sx={{
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                      }}
                    >
                      {checkoutMutation.isPending ? 'Processing...' : 'Subscribe Now'}
                    </Button>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textAlign: 'center', display: 'block' }}
                    >
                      Secure payment powered by Stripe • Cancel anytime
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Active Subscriptions Table */}
          {hasActiveSubscription && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                Active Subscriptions
              </Typography>

              {mutation.isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {mutation.error.message}
                </Alert>
              )}

              <DataState
                isLoading={query.isLoading}
                isError={query.isError}
                error={query.error}
                isEmpty={!query.isLoading && !query.isError && subscriptions.length === 0}
                onRetry={query.refetch}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>{subscription.id}</TableCell>
                        <TableCell>
                          <Chip
                            label={subscription.planName || subscription.planId}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{subscription.customerName || subscription.customerId}</TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            id={`subscription-${subscription.id}-status`}
                            name="status"
                            value={subscription.status || ''}
                            onChange={(event) =>
                              handleStatusChange(subscription.id, event.target.value)
                            }
                            disabled={mutation.isPending}
                          >
                            {STATUSES.map((status) => (
                              <MenuItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataState>
            </Paper>
          )}

          {/* FAQ or Additional Info Section */}
          {!hasActiveSubscription && (
            <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Why subscribe to AgentFM?
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    🏢 Streamline Your Operations
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage all your properties, units, and team members from one unified platform.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    ✅ Stay Compliant
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track inspections, maintenance plans, and generate reports for compliance and decision-making.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    👥 Collaborate Better
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Invite owners, tenants, and technicians to collaborate seamlessly on jobs and service requests.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

