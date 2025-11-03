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
import { COUNTRIES } from '../lib/countries';
import { queryKeys } from '../utils/queryKeys.js';
import { propertySchema, propertyDefaultValues } from '../schemas/propertySchema';
import { FormTextField, FormSelect } from './form';

const COUNTRY_ALIASES = {
  USA: 'United States',
  US: 'United States',
  'U.S.A': 'United States',
  UAE: 'United Arab Emirates',
  'U.A.E.': 'United Arab Emirates',
  UK: 'United Kingdom',
  GB: 'United Kingdom',
  'U.K.': 'United Kingdom',
  KSA: 'Saudi Arabia',
};

const normaliseCountryValue = (input) => {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const alias = COUNTRY_ALIASES[trimmed.toUpperCase()];
  if (alias) return alias;

  const match = COUNTRIES.find(
    (country) => country.name.toLowerCase() === trimmed.toLowerCase(),
  );

  return match ? match.name : trimmed;
};

const PROPERTY_TYPES = [
  'Residential',
  'Commercial',
  'Mixed-Use',
  'Industrial',
  'Retail',
  'Office',
];

const PROPERTY_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
];

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

  const countryOptions = COUNTRIES.map((country) => ({
    value: country.name,
    label: country.name,
  }));

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
            {/* Property Name */}
            <Grid item xs={12}>
              <FormTextField
                name="name"
                control={control}
                label="Property Name"
                required
              />
            </Grid>

            {/* Address */}
            <Grid item xs={12}>
              <FormTextField
                name="address"
                control={control}
                label="Street Address"
                required
              />
            </Grid>

            {/* City, Region, Postal Code, Country */}
            <Grid item xs={12} sm={6} md={3}>
              <FormTextField
                name="city"
                control={control}
                label="City"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormTextField
                name="state"
                control={control}
                label="State / Province / Region"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormTextField
                name="zipCode"
                control={control}
                label="Postal Code"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormSelect
                name="country"
                control={control}
                label="Country"
                options={countryOptions}
                required
              />
            </Grid>

            {/* Property Type & Status */}
            <Grid item xs={12} sm={6}>
              <FormSelect
                name="propertyType"
                control={control}
                label="Property Type"
                options={PROPERTY_TYPES}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect
                name="status"
                control={control}
                label="Status"
                options={PROPERTY_STATUSES}
              />
            </Grid>

            {/* Year Built & Total Units */}
            <Grid item xs={12} sm={4}>
              <FormTextField
                name="yearBuilt"
                control={control}
                label="Year Built"
                type="number"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormTextField
                name="totalUnits"
                control={control}
                label="Total Units"
                type="number"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormTextField
                name="totalArea"
                control={control}
                label="Total Area"
                type="number"
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <FormTextField
                name="description"
                control={control}
                label="Description"
                multiline
                rows={3}
              />
            </Grid>

            {/* Image URL */}
            <Grid item xs={12}>
              <FormTextField
                name="imageUrl"
                control={control}
                label="Image URL (optional)"
                helperText="Enter a URL to an image of the property"
              />
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
