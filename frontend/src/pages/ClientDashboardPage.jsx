import { useMemo } from 'react';
import {
  Grid,
  Stack,
  Typography,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery.js';
import DataState from '../components/DataState.jsx';
import MetricCard from '../components/MetricCard.jsx';

const CURRENCY = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AED', maximumFractionDigits: 0 });
const PERCENT = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 });
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function formatNumber(value) {
  if (value == null) return '—';
  return value;
}

export default function ClientDashboardPage() {
  const { t } = useTranslation();
  const query = useApiQuery({ queryKey: ['dashboard', 'overview'], url: '/dashboard/overview' });

  const metrics = useMemo(() => {
    const overview = query.data?.client?.metrics;
    return [
      {
        key: 'propertiesManaged',
        label: t('clientDashboard.metrics.propertiesManaged'),
        value: formatNumber(overview?.propertiesManaged),
      },
      {
        key: 'portfolioValue',
        label: t('clientDashboard.metrics.portfolioValue'),
        value: overview?.portfolioValue != null ? CURRENCY.format(overview.portfolioValue) : '—',
      },
      {
        key: 'averageOccupancy',
        label: t('clientDashboard.metrics.averageOccupancy'),
        value: overview?.averageOccupancy != null ? PERCENT.format(overview.averageOccupancy) : '—',
      },
      {
        key: 'averageHealth',
        label: t('clientDashboard.metrics.averageHealth'),
        value: overview?.averageHealth != null ? `${overview.averageHealth}` : '—',
        helper: overview?.averageHealth != null ? t('clientDashboard.pciHelper') : undefined,
      },
      {
        key: 'inspectionsDue',
        label: t('clientDashboard.metrics.inspectionsDue'),
        value: formatNumber(overview?.inspectionsDue),
      },
      {
        key: 'pendingRecommendations',
        label: t('clientDashboard.metrics.pendingRecommendations'),
        value: formatNumber(overview?.pendingRecommendations),
      },
      {
        key: 'activeSubscriptions',
        label: t('clientDashboard.metrics.activeSubscriptions'),
        value: formatNumber(overview?.activeSubscriptions),
      },
    ];
  }, [query.data, t]);

  const topProperties = query.data?.client?.topProperties ?? [];
  const inspections = query.data?.client?.upcomingInspections ?? [];
  const portfolioMix = query.data?.client?.portfolioMix ?? [];
  const activity = query.data?.client?.activity ?? [];

  return (
    <Stack spacing={4}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {t('clientDashboard.title')}
      </Typography>

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
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {t('clientDashboard.cards.topProperties')}
              </Typography>
              <List dense disablePadding>
                {topProperties.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary={t('feedback.empty')}
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
                {topProperties.map((property) => (
                  <ListItem key={property.id} sx={{ alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {property.name}
                          </Typography>
                          {property.tags?.map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {property.city}, {property.country}
                          </Typography>
                          {property.healthScore != null && (
                            <Typography variant="body2" color={property.healthScore < 60 ? 'error.main' : 'text.secondary'}>
                              {t('clientDashboard.labels.pci')}: {property.healthScore}
                            </Typography>
                          )}
                          {property.occupancyRate != null && (
                            <Typography variant="body2" color="text.secondary">
                              {t('clientDashboard.labels.occupancy')}: {PERCENT.format(property.occupancyRate)}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {t('clientDashboard.cards.upcomingInspections')}
              </Typography>
              <List dense disablePadding>
                {inspections.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary={t('clientDashboard.labels.noInspections')}
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
                {inspections.map((inspection) => (
                  <ListItem key={inspection.id}>
                    <ListItemText
                      primary={inspection.propertyName}
                      secondary={DATE_FORMATTER.format(new Date(inspection.scheduledAt))}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {t('clientDashboard.cards.portfolioMix')}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('clientDashboard.labels.type')}</TableCell>
                    <TableCell>{t('clientDashboard.labels.properties')}</TableCell>
                    <TableCell>{t('clientDashboard.labels.occupancy')}</TableCell>
                    <TableCell>{t('clientDashboard.labels.value')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {portfolioMix.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary">
                          {t('feedback.empty')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {portfolioMix.map((segment) => (
                    <TableRow key={segment.type}>
                      <TableCell>{segment.type}</TableCell>
                      <TableCell>{formatNumber(segment.propertyCount)}</TableCell>
                      <TableCell>
                        {segment.averageOccupancy != null ? PERCENT.format(segment.averageOccupancy) : '—'}
                      </TableCell>
                      <TableCell>
                        {segment.totalValue != null ? CURRENCY.format(segment.totalValue) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {t('clientDashboard.cards.activity')}
              </Typography>
              <List dense disablePadding>
                {activity.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary={t('feedback.empty')}
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
                {activity.map((item) => {
                  const typeLabel =
                    item.type === 'serviceRequest'
                      ? t('clientDashboard.activity.serviceRequest')
                      : t('clientDashboard.activity.job');
                  return (
                    <ListItem key={`${item.type}-${item.id}`} sx={{ alignItems: 'flex-start' }}>
                      <ListItemText
                        primary={
                          <Stack spacing={0.75}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                label={typeLabel}
                                size="small"
                                color={item.type === 'serviceRequest' ? 'primary' : 'default'}
                              />
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {item.title}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography variant="body2" color="text.secondary">
                                {item.propertyName}
                              </Typography>
                              <Chip size="small" variant="outlined" label={item.status} />
                              {item.priority && (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  color={item.priority === 'URGENT' ? 'error' : 'default'}
                                  label={item.priority}
                                />
                              )}
                            </Stack>
                          </Stack>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {DATE_TIME_FORMATTER.format(new Date(item.createdAt))}
                          </Typography>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </DataState>
    </Stack>
  );
}
