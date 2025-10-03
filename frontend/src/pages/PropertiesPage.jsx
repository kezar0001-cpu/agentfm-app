import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  TextField,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink } from 'react-router-dom';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';
import { normaliseArray } from '../utils/error.js';

const propertySchema = z.object({
  name: z.string().min(1, 'forms.required'),
  type: z.string().min(1, 'forms.required'),
  city: z.string().min(1, 'forms.required'),
  country: z.string().min(1, 'forms.required'),
});

export default function PropertiesPage() {
  const { t } = useTranslation();
  const query = useApiQuery({ queryKey: ['properties'], url: '/properties' });
  const mutation = useApiMutation({ url: '/properties', method: 'post', invalidateKeys: [['properties']] });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: '',
      type: '',
      city: '',
      country: '',
    },
  });

  const properties = useMemo(() => normaliseArray(query.data), [query.data]);

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
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t('properties.title')}
        </Typography>
        <Typography color="text.secondary">{t('properties.createTitle')}</Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('properties.name')}
                fullWidth
                {...register('name')}
                error={Boolean(errors.name)}
                helperText={errors.name && t(errors.name.message)}
              />
              <TextField
                label={t('properties.type')}
                fullWidth
                {...register('type')}
                error={Boolean(errors.type)}
                helperText={errors.type && t(errors.type.message)}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('properties.city')}
                fullWidth
                {...register('city')}
                error={Boolean(errors.city)}
                helperText={errors.city && t(errors.city.message)}
              />
              <TextField
                label={t('properties.country')}
                fullWidth
                {...register('country')}
                error={Boolean(errors.country)}
                helperText={errors.country && t(errors.country.message)}
              />
            </Stack>
            {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button type="submit" variant="contained" disabled={isSubmitting || mutation.isPending}>
                {t('actions.create')}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>

      <Divider />

      <Paper sx={{ p: 0 }}>
        <DataState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!query.isLoading && !query.isError && properties.length === 0}
          onRetry={query.refetch}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('properties.name')}</TableCell>
                <TableCell>{t('properties.type')}</TableCell>
                <TableCell>{t('properties.city')}</TableCell>
                <TableCell>{t('properties.country')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {properties.map((property) => (
                <TableRow
                  key={property.id || property.name}
                  hover
                  component={RouterLink}
                  to={`/properties/${property.id || property.slug || property.name}`}
                  sx={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <TableCell>{property.name}</TableCell>
                  <TableCell>{property.type}</TableCell>
                  <TableCell>{property.city}</TableCell>
                  <TableCell>{property.country}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </Paper>
    </Stack>
  );
}
