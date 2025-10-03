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
  Stack,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';
import { normaliseArray } from '../utils/error.js';

const STATUS_OPTIONS = ['NEW', 'TRIAGED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function ServiceRequestsPage() {
  const { t } = useTranslation();
  const query = useApiQuery({ queryKey: ['service-requests'], url: '/service-requests' });
  const mutation = useApiMutation({
    url: '/service-requests/:id',
    method: 'patch',
    invalidateKeys: [['service-requests'], ['dashboard', 'overview']],
  });

  const requests = normaliseArray(query.data);

  const handleUpdate = async (id, field, value) => {
    try {
      await mutation.mutateAsync({ url: `/service-requests/${id}`, method: 'patch', data: { [field]: value } });
    } catch (error) {
      // surfaced in mutation state
    }
  };

  const formatDays = (value) => {
    if (value == null) return '—';
    return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${t('serviceRequests.days')}`;
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('serviceRequests.title')}
        </Typography>
        <Typography color="text.secondary">{t('serviceRequests.subtitle')}</Typography>
      </Box>

      <Paper>
        {mutation.isError && (
          <Alert severity="error" sx={{ m: 2 }}>
            {mutation.error.message}
          </Alert>
        )}
        <DataState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!query.isLoading && !query.isError && requests.length === 0}
          onRetry={query.refetch}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('serviceRequests.columns.request')}</TableCell>
                <TableCell>{t('serviceRequests.columns.property')}</TableCell>
                <TableCell>{t('serviceRequests.columns.priority')}</TableCell>
                <TableCell>{t('serviceRequests.columns.age')}</TableCell>
                <TableCell>{t('serviceRequests.columns.status')}</TableCell>
                <TableCell>{t('serviceRequests.columns.due')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id} hover>
                  <TableCell>{request.title}</TableCell>
                  <TableCell>{request.property?.name || request.propertyName || request.propertyId}</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <Select
                      size="small"
                      value={request.priority || ''}
                      onChange={(event) => handleUpdate(request.id, 'priority', event.target.value)}
                      disabled={mutation.isPending}
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <MenuItem key={priority} value={priority}>
                          {priority}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {formatDays(request.ageDays)}
                      </Typography>
                      {request.isOverdue && <Chip size="small" color="error" label={t('serviceRequests.overdue')} />}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <Select
                      size="small"
                      value={request.status || ''}
                      onChange={(event) => handleUpdate(request.id, 'status', event.target.value)}
                      disabled={mutation.isPending}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    {request.dueAt ? new Date(request.dueAt).toLocaleDateString() : t('serviceRequests.noDueDate')}
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
