import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Alert,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import useApiMutation from '../hooks/useApiMutation';
import PropertyBasicInfo from './forms/PropertyBasicInfo';
import PropertyLocation from './forms/PropertyLocation';
import PropertyManagement from './forms/PropertyManagement';
import { propertySchema, propertyDefaultValues } from '../schemas/propertySchema';
import { queryKeys } from '../utils/queryKeys';

const PROPERTY_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
];

// Helper function to normalize country values from backend
const normaliseCountryValue = (country) => {
  return country || '';
};

export default function PropertyForm({ open, onClose, property, onSuccess }) {
  const isEdit = !!property;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(propertySchema),
    defaultValues: propertyDefaultValues,
    mode: 'onBlur',
  });

  // Create/Update mutation
  const mutation = useApiMutation({
    url: isEdit ? `/properties/${property?.id}` : '/properties',
    method: isEdit ? 'patch' : 'post',
    invalidateKeys: [queryKeys.properties.all()],
  });

  // Initialize form with property data if editing
  useEffect(() => {
    if (property) {
      reset({
        name: property.name || '',
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: property.zipCode || '',
        country: normaliseCountryValue(property.country),
        propertyType: property.propertyType || '',
        yearBuilt: property.yearBuilt?.toString() || '',
        totalUnits: property.totalUnits?.toString() || '0',
        totalArea: property.totalArea?.toString() || '',
        status: property.status || 'ACTIVE',
        description: property.description || '',
        imageUrl: property.imageUrl || '',
      });
    } else {
      reset(propertyDefaultValues);
    }
  }, [property, open, reset]);

  // Auto-focus on first error field
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      setFocus(firstErrorField);
    }
  }, [errors, setFocus]);

  const onSubmit = async (data) => {
    try {
      await mutation.mutateAsync({
        data: {
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state || null,
          zipCode: data.zipCode || null,
          country: data.country,
          propertyType: data.propertyType,
          yearBuilt: data.yearBuilt,
          totalUnits: data.totalUnits,
          totalArea: data.totalArea,
          status: data.status,
          description: data.description || null,
          imageUrl: data.imageUrl || null,
        },
      });

      onSuccess();
    } catch (error) {
      // Error is shown via mutation.error
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        {isEdit ? 'Edit Property' : 'Add New Property'}
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }} role="alert">
              {mutation.error?.message || 'Failed to save property'}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <PropertyBasicInfo control={control} />
            </Grid>
            <Grid item xs={12}>
              <PropertyLocation control={control} />
            </Grid>
            <Grid item xs={12}>
              <PropertyManagement control={control} />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, md: 3 },
          pb: { xs: 2, md: 2 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}
      >
        <Button
          onClick={onClose}
          disabled={isSubmitting || mutation.isPending}
          fullWidth={isMobile}
          sx={{ minHeight: { xs: 48, md: 36 } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || mutation.isPending}
          fullWidth={isMobile}
          sx={{ minHeight: { xs: 48, md: 36 } }}
        >
          {mutation.isPending
            ? 'Saving...'
            : isEdit
            ? 'Update Property'
            : 'Create Property'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
