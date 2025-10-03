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
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';
import { normaliseArray } from '../utils/error.js';

const STATUSES = ['active', 'pending', 'suspended', 'cancelled'];

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const query = useApiQuery({ queryKey: ['subscriptions'], url: '/subscriptions' });
  const mutation = useApiMutation({ url: '/subscriptions/:id', method: 'patch', invalidateKeys: [['subscriptions']] });

  const subscriptions = normaliseArray(query.data);

  const handleStatusChange = async (subscriptionId, status) => {
    await mutation.mutateAsync({ url: `/subscriptions/${subscriptionId}`, method: 'patch', data: { status } });
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('subscriptions.title')}
        </Typography>
      </Box>

      <Paper>
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
