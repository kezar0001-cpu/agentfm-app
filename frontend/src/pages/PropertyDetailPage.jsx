// frontend/src/pages/PropertyDetailPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import useApiQuery from '../hooks/useApiQuery';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState';
import PropertyImageCarousel from '../components/PropertyImageCarousel.jsx';

const unitStatusOptions = [
  { value: 'Vacant', label: 'Vacant' },
  { value: 'Occupied', label: 'Occupied' },
  { value: 'Maintenance', label: 'Maintenance' },
];

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: ['property', id],
    url: `/api/properties/${id}`,
  });

  const property = data?.property;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      unitCode: '',
      address: '',
      bedrooms: '',
      status: 'Vacant',
    },
  });

  const addUnitMutation = useApiMutation({
    url: `/api/properties/${id}/units`,
    method: 'post',
    onSuccess: () => {
      refetch();
      reset({ unitCode: '', address: '', bedrooms: '', status: 'Vacant' });
      setIsDialogOpen(false);
    },
  });

  const onSubmitUnit = async (values) => {
    try {
      const payload = {
        unitCode: values.unitCode,
        status: values.status,
      };

      const trimmedAddress = values.address?.trim();
      if (trimmedAddress) {
        payload.address = trimmedAddress;
      }

      if (values.bedrooms !== undefined && values.bedrooms !== null && values.bedrooms !== '') {
        payload.bedrooms = Number(values.bedrooms);
      }

      await addUnitMutation.mutateAsync({ data: payload });
    } catch (mutationError) {
      console.error('Add unit error:', mutationError);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Property Details
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(`/properties/${id}/edit`)}>
            Edit Property
          </Button>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/properties')}>
            Back to Properties
          </Button>
        </Stack>
      </Stack>

      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        {property && (
          <Stack spacing={3}>
            <Card>
              <PropertyImageCarousel
                images={property.images}
                fallbackText={property.name}
                placeholderSize="800x360"
                height={320}
                containerSx={{ borderRadius: '12px 12px 0 0' }}
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h5" gutterBottom>{property.name}</Typography>
                        <Typography color="text.secondary">
                          {[property.address, property.city, property.postcode].filter(Boolean).join(', ') || 'No address recorded'}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {property.type && <Chip label={property.type} />}
                        {property.status && (
                          <Chip
                            label={property.status}
                            color={property.status === 'Active' ? 'success' : 'default'}
                          />
                        )}
                        <Chip
                          label={`${property.units?.length || 0} unit${property.units?.length === 1 ? '' : 's'}`}
                          color="info"
                        />
                      </Stack>
                      <Divider sx={{ my: 1 }} />
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="h6">Units</Typography>
                          <Button variant="contained" onClick={() => setIsDialogOpen(true)}>
                            Add Unit
                          </Button>
                        </Stack>
                        {property.units?.length > 0 ? (
                          <Stack spacing={1.5}>
                            {property.units.map((unit) => (
                              <Paper
                                key={unit.id}
                                variant="outlined"
                                sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
                              >
                                <Stack spacing={0.5}>
                                  <Typography variant="subtitle2">Unit {unit.unitCode}</Typography>
                                  {unit.address && (
                                    <Typography variant="body2" color="text.secondary">{unit.address}</Typography>
                                  )}
                                  {typeof unit.bedrooms === 'number' && (
                                    <Typography variant="body2" color="text.secondary">{unit.bedrooms} bedroom{unit.bedrooms === 1 ? '' : 's'}</Typography>
                                  )}
                                </Stack>
                                <Chip
                                  label={unit.status || 'Unknown'}
                                  color={unit.status === 'Vacant' ? 'warning' : 'info'}
                                  size="small"
                                />
                              </Paper>
                            ))}
                          </Stack>
                        ) : (
                          <Typography color="text.secondary" sx={{ mt: 1 }}>
                            No units have been added to this property yet.
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle1" gutterBottom>Property metadata</Typography>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">Created: {new Date(property.createdAt).toLocaleString()}</Typography>
                          <Typography variant="body2" color="text.secondary">Updated: {new Date(property.updatedAt).toLocaleString()}</Typography>
                          <Typography variant="body2" color="text.secondary">Property ID: {property.id}</Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        )}
      </DataState>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit(onSubmitUnit)}>
          <DialogTitle>Add Unit</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Unit Code"
                fullWidth
                {...register('unitCode', { required: 'Unit code is required' })}
                error={!!errors.unitCode}
                helperText={errors.unitCode?.message}
              />
              <TextField
                label="Address"
                fullWidth
                {...register('address')}
              />
              <TextField
                label="Bedrooms"
                type="number"
                inputProps={{ min: 0 }}
                fullWidth
                {...register('bedrooms', {
                  min: { value: 0, message: 'Bedrooms must be 0 or more' },
                })}
                error={!!errors.bedrooms}
                helperText={errors.bedrooms?.message}
              />
              <TextField
                label="Status"
                select
                fullWidth
                defaultValue="Vacant"
                {...register('status')}
              >
                {unitStatusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              {addUnitMutation.isError && (
                <Alert severity="error">
                  {addUnitMutation.error?.message || 'Failed to add unit'}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={addUnitMutation.isPending}>
              {addUnitMutation.isPending ? 'Saving...' : 'Save Unit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
