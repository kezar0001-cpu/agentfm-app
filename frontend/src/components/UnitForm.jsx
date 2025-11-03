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
} from '@mui/material';
import useApiMutation from '../hooks/useApiMutation';
import { queryKeys } from '../utils/queryKeys.js';
import { unitSchema, unitDefaultValues } from '../schemas/unitSchema';
import { FormTextField, FormSelect } from './form';

const UNIT_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'MAINTENANCE', label: 'Under Maintenance' },
  { value: 'VACANT', label: 'Vacant' },
];

export default function UnitForm({ open, onClose, propertyId, unit, onSuccess }) {
  const isEdit = !!unit;

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(unitSchema),
    defaultValues: unitDefaultValues,
    mode: 'onBlur',
  });

  // Create/Update mutation
  const mutation = useApiMutation({
    url: isEdit ? `/units/${unit?.id}` : '/units',
    method: isEdit ? 'patch' : 'post',
    invalidateKeys: [queryKeys.properties.units(propertyId)],
  });

  // Initialize form with unit data if editing
  useEffect(() => {
    if (unit) {
      reset({
        unitNumber: unit.unitNumber || '',
        floor: unit.floor?.toString() || '',
        bedrooms: unit.bedrooms?.toString() || '',
        bathrooms: unit.bathrooms?.toString() || '',
        area: unit.area?.toString() || '',
        rentAmount: unit.rentAmount?.toString() || '',
        status: unit.status || 'AVAILABLE',
        description: unit.description || '',
        imageUrl: unit.imageUrl || '',
      });
    } else {
      reset(unitDefaultValues);
    }
  }, [unit, open, reset]);

  // Auto-focus on first error field
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      setFocus(firstErrorField);
    }
  }, [errors, setFocus]);

  const onSubmit = async (data) => {
    const payload = {
      unitNumber: data.unitNumber,
      floor: data.floor,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      area: data.area,
      rentAmount: data.rentAmount,
      status: data.status,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
    };

    // Add propertyId only for creation
    if (!isEdit) {
      payload.propertyId = propertyId;
    }

    try {
      await mutation.mutateAsync({ data: payload });
      onSuccess();
    } catch (error) {
      // Error is shown via mutation.error
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? 'Edit Unit' : 'Add New Unit'}
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }} role="alert">
              {mutation.error?.message || 'Failed to save unit'}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Unit Number */}
            <Grid item xs={12} sm={6}>
              <FormTextField
                name="unitNumber"
                control={control}
                label="Unit Number"
                required
                helperText="e.g., 101, A1, Suite 205"
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <FormSelect
                name="status"
                control={control}
                label="Status"
                options={UNIT_STATUSES}
              />
            </Grid>

            {/* Floor */}
            <Grid item xs={12} sm={4}>
              <FormTextField
                name="floor"
                control={control}
                label="Floor"
                type="number"
              />
            </Grid>

            {/* Bedrooms */}
            <Grid item xs={12} sm={4}>
              <FormTextField
                name="bedrooms"
                control={control}
                label="Bedrooms"
                type="number"
              />
            </Grid>

            {/* Bathrooms */}
            <Grid item xs={12} sm={4}>
              <FormTextField
                name="bathrooms"
                control={control}
                label="Bathrooms"
                type="number"
                inputProps={{ step: 0.5 }}
              />
            </Grid>

            {/* Area */}
            <Grid item xs={12} sm={6}>
              <FormTextField
                name="area"
                control={control}
                label="Area (sq ft)"
                type="number"
              />
            </Grid>

            {/* Rent Amount */}
            <Grid item xs={12} sm={6}>
              <FormTextField
                name="rentAmount"
                control={control}
                label="Monthly Rent ($)"
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
                helperText="Additional details about the unit"
              />
            </Grid>

            {/* Image URL */}
            <Grid item xs={12}>
              <FormTextField
                name="imageUrl"
                control={control}
                label="Image URL (optional)"
                helperText="Enter a URL to an image of the unit"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting || mutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || mutation.isPending}
        >
          {mutation.isPending
            ? 'Saving...'
            : isEdit
            ? 'Update Unit'
            : 'Create Unit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
