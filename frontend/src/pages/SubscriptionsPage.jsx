import {
  Alert,
  Box,
  Typography,
  Paper,
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
import { useEffect } from 'react';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';

export default function SubscriptionsPage() {
  const { t } = useTranslation();

  const meQuery = useApiQuery({
    queryKey: ['me'],
    url: '/api/auth/me',
  });

  const confirmMutation = useApiMutation({
    url: '/api/billing/confirm',
    method: 'post',
    onSuccess: () => {
      meQuery.refetch();
    },
  });

  const checkoutMutation = useApiMutation({
    url: '/api/billing/checkout',
    method: 'post',
  });

  const hasActiveSubscription = meQuery.data?.user?.subscriptionStatus === 'ACTIVE';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const showSuccess = params.get('success') === '1';
    const sessionId = params.get('session_id');

    if (showSuccess && sessionId) {
      confirmMutation.mutateAsync({ data: { sessionId } });
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, [location.key]);

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
    } catch {}
  };

  const params = new URLSearchParams(window.location.search);
  const showSuccess = params.get('success') === '1';
  const showCanceled = params.get('canceled') === '1';

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
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

          {showSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>Payment successful!</strong> Your subscription is now active.
            </Alert>
          )}
          {showCanceled && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Checkout was canceled. No charges were made.
            </Alert>
          )}
          {checkoutMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {checkoutMutation.error?.message || 'Checkout failed.'}
            </Alert>
          )}

          <DataState
            isLoading={meQuery.isLoading || confirmMutation.isPending}
            isError={meQuery.isError}
            error={meQuery.error}
            onRetry={meQuery.refetch}
          >
            {hasActiveSubscription ? (
              <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                  Subscription Details
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Plan</Typography>
                    <Chip
                      label={meQuery.data?.user?.subscriptionPlan || 'Unknown'}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip
                      label={meQuery.data?.user?.subscriptionStatus || 'Unknown'}
                      color="success"
                    />
                  </Box>
                  {meQuery.data?.user?.trialEndDate && meQuery.data?.user?.subscriptionStatus === 'TRIAL' && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Trial Ends</Typography>
                      <Typography>
                        {new Date(meQuery.data.user.trialEndDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Button variant="outlined">Manage Billing</Button>
                  </Box>
                </Stack>
              </Paper>
            ) : (
              <>
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
                        <List sx={{ py: 0 }}>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="success" /></ListItemIcon>
                            <ListItemText primary="Unlimited properties & units" />
                          </ListItem>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="success" /></ListItemIcon>
                            <ListItemText primary="Assign owners, tenants & technicians" />
                          </ListItem>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="success" /></ListItemIcon>
                            <ListItemText primary="Inspection & job management" />
                          </ListItem>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="success" /></ListItemIcon>
                            <ListItemText primary="Maintenance plans & scheduling" />
                          </ListItem>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="success" /></ListItemIcon>
                            <ListItemText primary="Reports & analytics dashboard" />
                          </ListItem>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="success" /></ListItemIcon>
                            <ListItemText primary="Service requests & recommendations" />
                          </ListItem>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon color="success" /></ListItemIcon>
                            <ListItemText primary="Email support" />
                          </ListItem>
                        </List>
                        <Button
                          variant="contained"
                          size="large"
                          fullWidth
                          onClick={() => startCheckout('STARTER')}
                          disabled={checkoutMutation.isPending}
                          sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 600, textTransform: 'none' }}
                        >
                          {checkoutMutation.isPending ? 'Processing...' : 'Subscribe Now'}
                        </Button>
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                          Secure payment powered by Stripe • Cancel anytime
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
                
                <Stack spacing={4} sx={{ maxWidth: 800, mx: 'auto' }}>
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

                  <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Frequently Asked Questions
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Can I cancel my subscription at any time?
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Yes, you can cancel your subscription at any time. Your access will continue until the end of the current billing period.
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          What happens when my free trial ends?
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          You will be prompted to subscribe to a paid plan to continue using the service. Your data will be saved, and you can pick up right where you left off after subscribing.
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Stack>
              </>
            )}
          </DataState>
        </Stack>
      </Container>
    </Box>
  );
}