import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';
import { normaliseArray } from '../utils/error.js';

const schema = z.object({
  propertyId: z.string().min(1, 'forms.required'),
  inspector: z.string().min(1, 'forms.required'),
  scheduledAt: z.string().min(1, 'forms.required'),
});

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function InspectionsPage() {
  const { t } = useTranslation();
  const query = useApiQuery({ queryKey: ['inspections'], url: '/api/inspections' });
  const mutation = useApiMutation({ url: '/api/inspections', method: 'post', invalidateKeys: [['inspections']] });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { propertyId: '', inspector: '', scheduledAt: '' },
  });

  const inspections = normaliseArray(query.data);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({ data: values });
      reset();
    } catch (error) {
      // The error is surfaced via mutation state.
    }
  });

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('inspections.title')}
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('actions.create')} {t('inspections.title')}
        </Typography>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('reports.property')}
                fullWidth
                {...register('propertyId')}
                error={Boolean(errors.propertyId)}
                helperText={errors.propertyId && t(errors.propertyId.message)}
              />
              <TextField
                label={t('inspections.inspector')}
                fullWidth
                {...register('inspector')}
                error={Boolean(errors.inspector)}
                helperText={errors.inspector && t(errors.inspector.message)}
              />
            </Stack>
            <TextField
              type="datetime-local"
              label={t('inspections.scheduledOn')}
              InputLabelProps={{ shrink: true }}
              {...register('scheduledAt')}
              error={Boolean(errors.scheduledAt)}
              helperText={errors.scheduledAt && t(errors.scheduledAt.message)}
            />
            {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
            <Stack direction="row" justifyContent="flex-end">
              <Button type="submit" variant="contained" disabled={isSubmitting || mutation.isPending}>
                {t('actions.save')}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>

      <Paper>
        <DataState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!query.isLoading && !query.isError && inspections.length === 0}
          onRetry={query.refetch}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('reports.property')}</TableCell>
                <TableCell>{t('inspections.inspector')}</TableCell>
                <TableCell>{t('inspections.scheduledOn')}</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inspections.map((inspection) => (
                <TableRow key={inspection.id || inspection.scheduledAt}>
                  <TableCell>{inspection.propertyName || inspection.propertyId}</TableCell>
                  <TableCell>{inspection.inspector}</TableCell>
                  <TableCell>
                    {inspection.scheduledAt
                      ? DATE_FORMATTER.format(new Date(inspection.scheduledAt))
                      : '—'}
                  </TableCell>
                  <TableCell>{inspection.status || 'Scheduled'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </Paper>
    </Stack>
  );
}
