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

const unitSchema = z.object({
  name: z.string().min(1, 'forms.required'),
  floor: z.string().min(1, 'forms.required'),
  area: z.coerce.number().positive('forms.required'),
});

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
    invalidateKeys: [['properties', id]],
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({ data: values });
      reset();
    } catch (error) {
      // The error is surfaced via mutation state.
    }
  });

  const property = query.data;
  const units = normaliseArray(property?.units);
  const tags = normaliseArray(property?.tags);

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
        </Stack>
      )}
    </DataState>
  );
}
