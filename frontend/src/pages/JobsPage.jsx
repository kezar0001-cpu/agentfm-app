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
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';
import { normaliseArray } from '../utils/error.js';

const STATUSES = ['OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function JobsPage() {
  const { t } = useTranslation();
  const query = useApiQuery({ queryKey: ['jobs'], url: '/jobs' });
  const mutation = useApiMutation({
    url: '/jobs/:id',
    method: 'patch',
    invalidateKeys: [['jobs'], ['dashboard', 'overview']],
  });

  const jobs = normaliseArray(query.data);

  const handleStatusChange = async (jobId, status) => {
    try {
      await mutation.mutateAsync({ url: `/jobs/${jobId}`, method: 'patch', data: { status } });
    } catch (error) {
      // Handled via mutation state.
    }
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('jobs.title')}
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
          isEmpty={!query.isLoading && !query.isError && jobs.length === 0}
          onRetry={query.refetch}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>{t('reports.property')}</TableCell>
                <TableCell>{t('jobs.assignedTo')}</TableCell>
                <TableCell>{t('jobs.status')}</TableCell>
                <TableCell>Priority</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.id}</TableCell>
                  <TableCell>{job.property?.name || job.propertyName || job.propertyId}</TableCell>
                  <TableCell>{job.assignee?.name || job.assignedTo}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={job.status || ''}
                      onChange={(event) => handleStatusChange(job.id, event.target.value)}
                      disabled={mutation.isPending}
                    >
                      {STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    {job.priority && (
                      <Chip
                        size="small"
                        label={job.priority}
                        color={job.priority === 'URGENT' || job.priority === 'HIGH' ? 'error' : 'default'}
                      />
                    )}
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
