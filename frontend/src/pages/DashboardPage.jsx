import { useMemo } from 'react';
import { Box, Grid, Paper, Typography, Stack, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery.js';
import DataState from '../components/DataState.jsx';

const CARD_SX = {
  p: 3,
  borderRadius: 3,
  boxShadow: '0px 10px 30px rgba(30, 136, 229, 0.08)',
};

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function DashboardPage() {
  const { t } = useTranslation();
  const query = useApiQuery({
    queryKey: ['dashboard', 'summary'],
    url: '/dashboard/summary',
  });

  const metrics = useMemo(() => {
    const data = query.data || {};
    return [
      { label: t('dashboard.kpiOpenJobs'), value: data.openJobs },
      { label: t('dashboard.kpiOverdueJobs'), value: data.overdueJobs },
      { label: t('dashboard.kpiCompletedJobs'), value: data.completedJobs30d },
      { label: t('dashboard.kpiAvgPci'), value: data.averagePci?.toFixed?.(1) ?? data.averagePci },
      { label: t('dashboard.kpiPendingRecommendations'), value: data.pendingRecommendations },
    ];
  }, [query.data, t]);

  const lastUpdated = query.data?.updatedAt
    ? DATE_FORMATTER.format(new Date(query.data.updatedAt))
    : null;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t('dashboard.title')}
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
        isEmpty={!query.isLoading && !query.isError && metrics.every((metric) => metric.value == null)}
        onRetry={query.refetch}
      >
        <Grid container spacing={3}>
          {metrics.map((metric) => (
            <Grid item xs={12} sm={6} md={4} key={metric.label}>
              <Paper sx={CARD_SX}>
                <Typography variant="subtitle2" color="text.secondary">
                  {metric.label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                  {metric.value ?? '—'}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DataState>
    </Box>
  );
}
