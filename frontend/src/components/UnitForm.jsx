import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Alert,
  Box,
} from '@mui/material';
import useApiMutation from '../hooks/useApiMutation';

const UNIT_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'MAINTENANCE', label: 'Under Maintenance' },
  { value: 'VACANT', label: 'Vacant' },
];

export default function UnitForm({ open, onClose, propertyId, unit, onSuccess }) {
  const isEdit = !!unit;

  const [formData, setFormData] = useState({
    unitNumber: '',
    floor: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    rentAmount: '',
    status: 'AVAILABLE',
    description: '',
    imageUrl: '',
  });

  const [errors, setErrors] = useState({});

  // Create/Update mutation
  const mutation = useApiMutation({
    url: isEdit ? `/api/units/${unit?.id}` : '/api/units',
    method: isEdit ? 'patch' : 'post',
    invalidateKeys: [['units', propertyId]],
  });

  // Initialize form with unit data if editing
  useEffect(() => {
    if (unit) {
      setFormData({
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
      // Reset form for new unit
      setFormData({
        unitNumber: '',
        floor: '',
        bedrooms: '',
        bathrooms: '',
        area: '',
        rentAmount: '',
        status: 'AVAILABLE',
        description: '',
        imageUrl: '',
      });
    }
    setErrors({});
  }, [unit, open]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.unitNumber.trim()) {
      newErrors.unitNumber = 'Unit number is required';
    }

    // Validate numbers if provided
    if (formData.floor && isNaN(parseInt(formData.floor))) {
      newErrors.floor = 'Must be a valid number';
    }
    if (formData.bedrooms && isNaN(parseInt(formData.bedrooms))) {
      newErrors.bedrooms = 'Must be a valid number';
    }
    if (formData.bathrooms && isNaN(parseFloat(formData.bathrooms))) {
      newErrors.bathrooms = 'Must be a valid number';
    }
    if (formData.area && isNaN(parseFloat(formData.area))) {
      newErrors.area = 'Must be a valid number';
    }
    if (formData.rentAmount && isNaN(parseFloat(formData.rentAmount))) {
      newErrors.rentAmount = 'Must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const data = {
      unitNumber: formData.unitNumber.trim(),
      floor: formData.floor ? parseInt(formData.floor) : null,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
      area: formData.area ? parseFloat(formData.area) : null,
      rentAmount: formData.rentAmount ? parseFloat(formData.rentAmount) : null,
      status: formData.status,
      description: formData.description.trim() || null,
      imageUrl: formData.imageUrl.trim() || null,
    };

    // Add propertyId only for creation
    if (!isEdit) {
      data.propertyId = propertyId;
    }

    try {
      await mutation.mutateAsync({ data });
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
        <Box sx={{ mt: 2 }}>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {mutation.error?.message || 'Failed to save unit'}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Unit Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                id="unit-form-unit-number"
                name="unitNumber"
                inputProps={{ id: 'unit-form-unit-number', name: 'unitNumber' }}
                InputLabelProps={{ htmlFor: 'unit-form-unit-number' }}
                label="Unit Number"
                value={formData.unitNumber}
                onChange={handleChange('unitNumber')}
                error={!!errors.unitNumber}
                helperText={errors.unitNumber || 'e.g., 101, A1, Suite 205'}
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="unit-form-status"
                name="status"
                inputProps={{ id: 'unit-form-status', name: 'status' }}
                InputLabelProps={{ htmlFor: 'unit-form-status' }}
                select
                label="Status"
                value={formData.status}
                onChange={handleChange('status')}
              >
                {UNIT_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Floor */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="unit-form-floor"
                name="floor"
                inputProps={{ id: 'unit-form-floor', name: 'floor' }}
                InputLabelProps={{ htmlFor: 'unit-form-floor' }}
                label="Floor"
                type="number"
                value={formData.floor}
                onChange={handleChange('floor')}
                error={!!errors.floor}
                helperText={errors.floor}
              />
            </Grid>

            {/* Bedrooms */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="unit-form-bedrooms"
                name="bedrooms"
                inputProps={{ id: 'unit-form-bedrooms', name: 'bedrooms' }}
                InputLabelProps={{ htmlFor: 'unit-form-bedrooms' }}
                label="Bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={handleChange('bedrooms')}
                error={!!errors.bedrooms}
                helperText={errors.bedrooms}
              />
            </Grid>

            {/* Bathrooms */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="unit-form-bathrooms"
                name="bathrooms"
                inputProps={{ id: 'unit-form-bathrooms', name: 'bathrooms', step: 0.5 }}
                InputLabelProps={{ htmlFor: 'unit-form-bathrooms' }}
                label="Bathrooms"
                type="number"
                value={formData.bathrooms}
                onChange={handleChange('bathrooms')}
                error={!!errors.bathrooms}
                helperText={errors.bathrooms}
              />
            </Grid>

            {/* Area */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="unit-form-area"
                name="area"
                inputProps={{ id: 'unit-form-area', name: 'area' }}
                InputLabelProps={{ htmlFor: 'unit-form-area' }}
                label="Area (sq ft)"
                type="number"
                value={formData.area}
                onChange={handleChange('area')}
                error={!!errors.area}
                helperText={errors.area}
              />
            </Grid>

            {/* Rent Amount */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="unit-form-rent-amount"
                name="rentAmount"
                inputProps={{ id: 'unit-form-rent-amount', name: 'rentAmount' }}
                InputLabelProps={{ htmlFor: 'unit-form-rent-amount' }}
                label="Monthly Rent ($)"
                type="number"
                value={formData.rentAmount}
                onChange={handleChange('rentAmount')}
                error={!!errors.rentAmount}
                helperText={errors.rentAmount}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                id="unit-form-description"
                name="description"
                inputProps={{ id: 'unit-form-description', name: 'description' }}
                InputLabelProps={{ htmlFor: 'unit-form-description' }}
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
                helperText="Additional details about the unit"
              />
            </Grid>

            {/* Image URL */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="unit-form-image-url"
                name="imageUrl"
                inputProps={{ id: 'unit-form-image-url', name: 'imageUrl' }}
                InputLabelProps={{ htmlFor: 'unit-form-image-url' }}
                label="Image URL (optional)"
                value={formData.imageUrl}
                onChange={handleChange('imageUrl')}
                helperText="Enter a URL to an image of the unit"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
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
