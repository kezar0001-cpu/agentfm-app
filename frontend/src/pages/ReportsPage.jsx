import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import useApiMutation from '../hooks/useApiMutation.js';

const schema = z.object({
  propertyId: z.string().min(1, 'forms.required'),
  from: z.string().min(1, 'forms.required'),
  to: z.string().min(1, 'forms.required'),
});

export default function ReportsPage() {
  const { t } = useTranslation();
  const [success, setSuccess] = useState(false);
  const mutation = useApiMutation({ url: '/reports', method: 'post' });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { propertyId: '', from: '', to: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSuccess(false);
    try {
      await mutation.mutateAsync({ data: values });
      setSuccess(true);
      reset();
    } catch (error) {
      setSuccess(false);
    }
  });

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('reports.title')}
        </Typography>
        <Typography color="text.secondary">{t('reports.description')}</Typography>
      </Box>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              label={t('reports.property')}
              fullWidth
              {...register('propertyId')}
              error={Boolean(errors.propertyId)}
              helperText={errors.propertyId && t(errors.propertyId.message)}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="date"
                label={t('reports.from')}
                InputLabelProps={{ shrink: true }}
                fullWidth
                {...register('from')}
                error={Boolean(errors.from)}
                helperText={errors.from && t(errors.from.message)}
              />
              <TextField
                type="date"
                label={t('reports.to')}
                InputLabelProps={{ shrink: true }}
                fullWidth
                {...register('to')}
                error={Boolean(errors.to)}
                helperText={errors.to && t(errors.to.message)}
              />
            </Stack>
            {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
            {success && <Alert severity="success">{t('reports.success')}</Alert>}
            <Stack direction="row" justifyContent="flex-end">
              <Button type="submit" variant="contained" disabled={isSubmitting || mutation.isPending}>
                {t('reports.submit')}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}
