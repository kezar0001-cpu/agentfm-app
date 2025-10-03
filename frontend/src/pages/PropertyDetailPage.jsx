import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TextField,
  Button,
  Alert,
  Grid,
  MenuItem,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';
import { normaliseArray } from '../utils/error.js';
import MetricCard from '../components/MetricCard.jsx';

const unitSchema = z.object({
  name: z.string().min(1, 'forms.required'),
  floor: z.string().min(1, 'forms.required'),
  area: z.coerce.number().positive('forms.required'),
});

const requestSchema = z.object({
  unitId: z.string().optional(),
  title: z.string().min(1, 'forms.required'),
  description: z.string().min(1, 'forms.required'),
  priority: z.string().min(1, 'forms.required'),
  dueAt: z.string().optional(),
});

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();

  const query = useApiQuery({
    queryKey: ['properties', id],
    url: `/properties/${id}`,
    enabled: Boolean(id),
  });

  const mutation = useApiMutation({
    url: `/properties/${id}/units`,
    method: 'post',
    invalidateKeys: [['properties', id], ['properties']],
  });

  const requestMutation = useApiMutation({
    url: '/service-requests',
    method: 'post',
    invalidateKeys: [['properties', id], ['service-requests'], ['dashboard', 'overview']],
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: '', floor: '', area: '' },
  });

  const {
    register: registerRequest,
    handleSubmit: handleRequestSubmit,
    reset: resetRequest,
    formState: { errors: requestErrors, isSubmitting: isSubmittingRequest },
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: { unitId: '', title: '', description: '', priority: 'MEDIUM', dueAt: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({ data: values });
      reset();
    } catch (error) {
      // The error is surfaced via mutation state.
    }
  });

  const onRequestSubmit = handleRequestSubmit(async (values) => {
    try {
      await requestMutation.mutateAsync({
        data: {
          propertyId: id,
          unitId: values.unitId || undefined,
          title: values.title,
          description: values.description,
          priority: values.priority,
          dueAt: values.dueAt || undefined,
        },
      });
      resetRequest();
    } catch (error) {
      // handled by mutation state
    }
  });

  const property = query.data;
  const units = normaliseArray(property?.units);
  const tags = normaliseArray(property?.tags);
  const serviceRequests = normaliseArray(property?.serviceRequests);
  const recentJobs = normaliseArray(property?.recentJobs);
  const metrics = property?.metrics;

  return (
    <DataState
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      isEmpty={!query.isLoading && !query.isError && !property}
      onRetry={query.refetch}
    >
      {property && (
        <Stack spacing={4}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {property.name}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {[property.type, property.city, property.country].filter(Boolean).join(' • ')}
              </Typography>
              {tags.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                  {tags.map((tag) => (
                    <Chip key={tag} label={tag} />
                  ))}
                </Stack>
              )}
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard label={t('propertyDetail.metrics.units')} value={metrics?.unitCount ?? '—'} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard label={t('propertyDetail.metrics.openJobs')} value={metrics?.openJobs ?? '—'} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard label={t('propertyDetail.metrics.activeRequests')} value={metrics?.activeRequests ?? '—'} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard label={t('propertyDetail.metrics.health')} value={property.healthScore ?? '—'} />
              </Grid>
            </Grid>
          </Stack>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('propertyDetail.addUnit')}
            </Typography>
            <form onSubmit={onSubmit} noValidate>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label={t('propertyDetail.unitName')}
                    fullWidth
                    {...register('name')}
                    error={Boolean(errors.name)}
                    helperText={errors.name && t(errors.name.message)}
                  />
                  <TextField
                    label={t('propertyDetail.floor')}
                    fullWidth
                    {...register('floor')}
                    error={Boolean(errors.floor)}
                    helperText={errors.floor && t(errors.floor.message)}
                  />
                  <TextField
                    label={t('propertyDetail.area')}
                    fullWidth
                    {...register('area')}
                    error={Boolean(errors.area)}
                    helperText={errors.area && t(errors.area.message)}
                  />
                </Stack>
                {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
                <Stack direction="row" justifyContent="flex-end">
                  <Button type="submit" variant="contained" disabled={isSubmitting || mutation.isPending}>
                    {t('actions.save')}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('propertyDetail.newRequest')}
            </Typography>
            <form onSubmit={onRequestSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  select
                  label={t('propertyDetail.requestUnit')}
                  fullWidth
                  {...registerRequest('unitId')}
                >
                  <MenuItem value="">{t('propertyDetail.requestUnitNone')}</MenuItem>
                  {units.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('serviceRequests.columns.request')}
                  fullWidth
                  {...registerRequest('title')}
                  error={Boolean(requestErrors.title)}
                  helperText={requestErrors.title && t(requestErrors.title.message)}
                />
                <TextField
                  label={t('propertyDetail.requestDescription')}
                  fullWidth
                  multiline
                  minRows={3}
                  {...registerRequest('description')}
                  error={Boolean(requestErrors.description)}
                  helperText={requestErrors.description && t(requestErrors.description.message)}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    select
                    label={t('serviceRequests.columns.priority')}
                    {...registerRequest('priority')}
                    error={Boolean(requestErrors.priority)}
                    helperText={requestErrors.priority && t(requestErrors.priority.message)}
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        {priority}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    type="date"
                    label={t('serviceRequests.columns.due')}
                    InputLabelProps={{ shrink: true }}
                    {...registerRequest('dueAt')}
                    error={Boolean(requestErrors.dueAt)}
                    helperText={requestErrors.dueAt && t(requestErrors.dueAt.message)}
                  />
                </Stack>
                {requestMutation.isError && <Alert severity="error">{requestMutation.error.message}</Alert>}
                <Stack direction="row" justifyContent="flex-end">
                  <Button type="submit" variant="contained" disabled={isSubmittingRequest || requestMutation.isPending}>
                    {t('actions.save')}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Paper>

          <Paper sx={{ p: 0 }}>
            <Typography variant="h6" sx={{ px: 3, pt: 3 }}>
              {t('propertyDetail.units')}
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('propertyDetail.unitName')}</TableCell>
                  <TableCell>{t('propertyDetail.floor')}</TableCell>
                  <TableCell>{t('propertyDetail.area')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id || unit.name}>
                    <TableCell>{unit.name}</TableCell>
                    <TableCell>{unit.floor}</TableCell>
                    <TableCell>{unit.area}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {units.length === 0 && (
              <Box sx={{ px: 3, py: 2 }}>
                <Typography color="text.secondary">{t('feedback.empty')}</Typography>
              </Box>
            )}
          </Paper>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 0 }}>
                <Typography variant="h6" sx={{ px: 3, pt: 3 }}>
                  {t('propertyDetail.serviceRequests')}
                </Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('serviceRequests.columns.request')}</TableCell>
                      <TableCell>{t('serviceRequests.columns.priority')}</TableCell>
                      <TableCell>{t('serviceRequests.columns.status')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {serviceRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.title}</TableCell>
                        <TableCell>{request.priority}</TableCell>
                        <TableCell>{request.status}</TableCell>
                      </TableRow>
                    ))}
                    {serviceRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography color="text.secondary" sx={{ px: 3, py: 2 }}>
                            {t('feedback.empty')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 0 }}>
                <Typography variant="h6" sx={{ px: 3, pt: 3 }}>
                  {t('propertyDetail.recentJobs')}
                </Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('adminDashboard.columns.job')}</TableCell>
                      <TableCell>{t('adminDashboard.columns.status')}</TableCell>
                      <TableCell>{t('adminDashboard.columns.scheduled')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.title}</TableCell>
                        <TableCell>{job.status}</TableCell>
                        <TableCell>
                          {job.scheduledFor ? new Date(job.scheduledFor).toLocaleDateString() : t('adminDashboard.unscheduled')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentJobs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography color="text.secondary" sx={{ px: 3, py: 2 }}>
                            {t('feedback.empty')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      )}
    </DataState>
  );
}
