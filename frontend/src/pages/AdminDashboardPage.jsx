import { useMemo } from 'react';
import {
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery.js';
import DataState from '../components/DataState.jsx';
import MetricCard from '../components/MetricCard.jsx';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const query = useApiQuery({ queryKey: ['dashboard', 'overview'], url: '/dashboard/overview' });

  const formatDays = (value) => {
    if (value == null) return '—';
    const formatted = Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
    return t('adminDashboard.labels.ageDays', { value: formatted });
  };

  const metrics = useMemo(() => {
    const overview = query.data?.admin?.metrics;
    return [
      {
        key: 'openJobs',
        label: t('adminDashboard.metrics.openJobs'),
        value: overview?.openJobs ?? '—',
      },
      {
        key: 'jobsDueSoon',
        label: t('adminDashboard.metrics.jobsDueSoon'),
        value: overview?.jobsDueSoon ?? '—',
      },
      {
        key: 'serviceQueue',
        label: t('adminDashboard.metrics.serviceQueue'),
        value: overview?.serviceQueue ?? '—',
      },
      {
        key: 'completedThisMonth',
        label: t('adminDashboard.metrics.completedThisMonth'),
        value: overview?.completedThisMonth ?? '—',
      },
      {
        key: 'overdueRequests',
        label: t('adminDashboard.metrics.overdueRequests'),
        value: overview?.overdueRequests ?? '—',
      },
      {
        key: 'avgRequestAgeDays',
        label: t('adminDashboard.metrics.avgRequestAge'),
        value: formatDays(overview?.avgRequestAgeDays),
        helper: overview?.avgRequestAgeDays != null ? t('adminDashboard.metrics.avgRequestAgeHelper') : undefined,
      },
    ];
  }, [query.data, t]);

  const lastUpdated = query.data?.updatedAt
    ? DATE_FORMATTER.format(new Date(query.data.updatedAt))
    : null;

  const serviceRequests = query.data?.admin?.highlights?.serviceRequests ?? [];
  const jobs = query.data?.admin?.highlights?.jobs ?? [];
  const prioritySummary = query.data?.admin?.metrics?.activeRequestsByPriority ?? {};

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t('adminDashboard.title')}
          </Typography>
          {lastUpdated && (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.lastUpdated')}: {lastUpdated}
            </Typography>
          )}
        </div>
        <Button variant="outlined" onClick={() => query.refetch()} disabled={query.isFetching}>
          {t('actions.refresh')}
        </Button>
      </Stack>

      <DataState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        isEmpty={!query.isLoading && !query.isError && !query.data}
        onRetry={query.refetch}
      >
        <Grid container spacing={3}>
          {metrics.map((metric) => (
            <Grid item xs={12} sm={6} md={4} key={metric.key}>
              <MetricCard label={metric.label} value={metric.value} helper={metric.helper} />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('adminDashboard.tables.serviceRequests')}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {Object.entries(prioritySummary).map(([priority, count]) => (
                    <Chip key={priority} size="small" label={`${priority}: ${count}`} color={priority === 'URGENT' || priority === 'HIGH' ? 'error' : 'default'} />
                  ))}
                </Stack>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('adminDashboard.columns.request')}</TableCell>
                    <TableCell>{t('adminDashboard.columns.property')}</TableCell>
                    <TableCell>{t('adminDashboard.columns.priority')}</TableCell>
                    <TableCell>{t('adminDashboard.columns.age')}</TableCell>
                    <TableCell>{t('adminDashboard.columns.status')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {serviceRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary">
                          {t('feedback.empty')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {serviceRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.title}</TableCell>
                      <TableCell>{request.propertyName}</TableCell>
                      <TableCell>
                        <Chip size="small" label={request.priority} color={request.priority === 'URGENT' ? 'error' : 'default'} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {formatDays(request.ageDays)}
                          </Typography>
                          {request.isOverdue && (
                            <Chip size="small" color="error" label={t('adminDashboard.badges.overdue')} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{request.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {t('adminDashboard.tables.jobs')}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('adminDashboard.columns.job')}</TableCell>
                    <TableCell>{t('adminDashboard.columns.property')}</TableCell>
                    <TableCell>{t('adminDashboard.columns.status')}</TableCell>
                    <TableCell>{t('adminDashboard.columns.scheduled')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary">
                          {t('feedback.empty')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{job.title}</TableCell>
                      <TableCell>{job.propertyName}</TableCell>
                      <TableCell>
                        <Chip size="small" label={job.status} color={job.status === 'IN_PROGRESS' ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell>
                        {job.scheduledFor ? DATE_FORMATTER.format(new Date(job.scheduledFor)) : t('adminDashboard.unscheduled')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      </DataState>
    </Stack>
  );
}
