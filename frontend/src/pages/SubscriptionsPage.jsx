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
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';
import { normaliseArray } from '../utils/error.js';

const STATUSES = ['active', 'pending', 'suspended', 'cancelled'];

export default function SubscriptionsPage() {
  const { t } = useTranslation();

  // Your existing queries/mutations
  const query = useApiQuery({
    queryKey: ['subscriptions'],
    url: '/api/subscriptions',
  });
  const mutation = useApiMutation({
    url: '/api/subscriptions/:id',
    method: 'patch',
    invalidateKeys: [['subscriptions']],
  });

  // NEW: mutation to start Stripe Checkout
  const checkoutMutation = useApiMutation({
    url: '/api/billing/checkout',
    method: 'post',
  });

  const subscriptions = normaliseArray(query.data);

  const handleStatusChange = async (subscriptionId, status) => {
    await mutation.mutateAsync({
      url: `/api/subscriptions/${subscriptionId}`,
      method: 'patch',
      data: { status },
    });
  };

  // NEW: read query params for success/cancel banners
  const params = new URLSearchParams(window.location.search);
  const showSuccess = params.get('success') === '1';
  const showCanceled = params.get('canceled') === '1';

  // NEW: start Stripe checkout for a plan
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
      // error shown below via checkoutMutation.error
    }
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('subscriptions.title')}
        </Typography>
      </Box>

      {/* NEW: banners */}
      {showSuccess && (
        <Alert severity="success">
          Payment successful! Your subscription will activate shortly.
        </Alert>
      )}
      {showCanceled && (
        <Alert severity="warning">
          Checkout canceled. You can try again anytime.
        </Alert>
      )}
      {checkoutMutation.isError && (
        <Alert severity="error">
          {checkoutMutation.error?.message || 'Checkout failed'}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        {/* NEW: Stripe CTA (minimal, non-invasive) */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={() => startCheckout('STARTER')}
            disabled={checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? 'Opening Stripe…' : 'Start Starter Plan'}
          </Button>

          {/* Uncomment if/when you add more plans
          <Button variant="outlined" onClick={() => startCheckout('PROFESSIONAL')} disabled={checkoutMutation.isPending}>
            Upgrade to Professional
          </Button>
          */}
        </Stack>

        {/* Your existing table remains unchanged */}
        {mutation.isError && (
          <Alert severity="error" sx={{ mx: 2, mt: 2 }}>
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
                <TableCell>ID</TableCell>
                <TableCell>{t('subscriptions.plan')}</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>{t('subscriptions.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>{subscription.id}</TableCell>
                  <TableCell>{subscription.planName || subscription.planId}</TableCell>
                  <TableCell>{subscription.customerName || subscription.customerId}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={subscription.status || ''}
                      onChange={(event) => handleStatusChange(subscription.id, event.target.value)}
                      disabled={mutation.isPending}
                    >
                      {STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
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
    </Stack>
  );
}
