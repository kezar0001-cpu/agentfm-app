import {
  Box,
  Typography,
  Paper,
  Table,
  TableContainer,
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
  name: z.string().min(1, 'forms.required'),
  frequency: z.string().min(1, 'forms.required'),
  description: z.string().optional(),
});

export default function PlansPage() {
  const { t } = useTranslation();
  const query = useApiQuery({ queryKey: ['plans'], url: '/api/plans' });
  const mutation = useApiMutation({ url: '/api/plans', method: 'post', invalidateKeys: [['plans']] });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', frequency: '', description: '' },
  });

  const plans = normaliseArray(query.data);

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
          {t('plans.title')}
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('actions.create')} {t('plans.title')}
        </Typography>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              id="plans-form-name"
              name="name"
              label={t('plans.name')}
              fullWidth
              autoComplete="off"
              {...register('name')}
              error={Boolean(errors.name)}
              helperText={errors.name && t(errors.name.message)}
            />
            <TextField
              id="plans-form-frequency"
              name="frequency"
              label={t('plans.frequency')}
              fullWidth
              autoComplete="off"
              {...register('frequency')}
              error={Boolean(errors.frequency)}
              helperText={errors.frequency && t(errors.frequency.message)}
            />
            <TextField
              id="plans-form-description"
              name="description"
              label="Description"
              multiline
              minRows={3}
              fullWidth
              autoComplete="off"
              {...register('description')}
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

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <DataState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!query.isLoading && !query.isError && plans.length === 0}
          onRetry={query.refetch}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('plans.name')}</TableCell>
                  <TableCell>{t('plans.frequency')}</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id || plan.name}>
                    <TableCell>{plan.name}</TableCell>
                    <TableCell>{plan.frequency}</TableCell>
                    <TableCell>{plan.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>
      </Paper>
    </Stack>
  );
}
