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

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function PropertyForm({ open, onClose, property, onSuccess }) {
  const isEdit = !!property;

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    propertyType: '',
    yearBuilt: '',
    totalUnits: '0',
    totalArea: '',
    status: 'ACTIVE',
    description: '',
    imageUrl: '',
  });

  const [errors, setErrors] = useState({});

  // Create/Update mutation
  const mutation = useApiMutation({
    url: isEdit ? `/api/properties/${property?.id}` : '/api/properties',
    method: isEdit ? 'patch' : 'post',
    invalidateKeys: [['properties']],
  });

  // Initialize form with property data if editing
  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || '',
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: property.zipCode || '',
        country: property.country || 'USA',
        propertyType: property.propertyType || '',
        yearBuilt: property.yearBuilt?.toString() || '',
        totalUnits: property.totalUnits?.toString() || '0',
        totalArea: property.totalArea?.toString() || '',
        status: property.status || 'ACTIVE',
        description: property.description || '',
        imageUrl: property.imageUrl || '',
      });
    } else {
      // Reset form for new property
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
        propertyType: '',
        yearBuilt: '',
        totalUnits: '0',
        totalArea: '',
        status: 'ACTIVE',
        description: '',
        imageUrl: '',
      });
    }
    setErrors({});
  }, [property, open]);

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

    if (!formData.name.trim()) newErrors.name = 'Property name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!formData.propertyType) newErrors.propertyType = 'Property type is required';

    // Validate year built if provided
    if (formData.yearBuilt) {
      const year = parseInt(formData.yearBuilt);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        newErrors.yearBuilt = `Year must be between 1800 and ${currentYear}`;
      }
    }

    // Validate numbers
    if (formData.totalUnits && isNaN(parseInt(formData.totalUnits))) {
      newErrors.totalUnits = 'Must be a valid number';
    }
    if (formData.totalArea && isNaN(parseFloat(formData.totalArea))) {
      newErrors.totalArea = 'Must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await mutation.mutateAsync({
        data: {
          name: formData.name.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state,
          zipCode: formData.zipCode.trim(),
          country: formData.country,
          propertyType: formData.propertyType,
          yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
          totalUnits: parseInt(formData.totalUnits) || 0,
          totalArea: formData.totalArea ? parseFloat(formData.totalArea) : null,
          status: formData.status,
          description: formData.description.trim() || null,
          imageUrl: formData.imageUrl.trim() || null,
        },
      });

      onSuccess();
    } catch (error) {
      // Error is shown via mutation.error
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? 'Edit Property' : 'Add New Property'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {mutation.error?.message || 'Failed to save property'}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Property Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                id="property-form-name"
                name="name"
                label="Property Name"
                value={formData.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
              />
            </Grid>

            {/* Address */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                id="property-form-address"
                name="address"
                label="Street Address"
                value={formData.address}
                onChange={handleChange('address')}
                error={!!errors.address}
                helperText={errors.address}
              />
            </Grid>

            {/* City, State, ZIP */}
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                required
                id="property-form-city"
                name="city"
                label="City"
                value={formData.city}
                onChange={handleChange('city')}
                error={!!errors.city}
                helperText={errors.city}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                id="property-form-state"
                name="state"
                select
                label="State"
                value={formData.state}
                onChange={handleChange('state')}
                error={!!errors.state}
                helperText={errors.state}
              >
                {STATES.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                required
                id="property-form-zip-code"
                name="zipCode"
                label="ZIP Code"
                value={formData.zipCode}
                onChange={handleChange('zipCode')}
                error={!!errors.zipCode}
                helperText={errors.zipCode}
              />
            </Grid>

            {/* Property Type & Status */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                id="property-form-type"
                name="propertyType"
                select
                label="Property Type"
                value={formData.propertyType}
                onChange={handleChange('propertyType')}
                error={!!errors.propertyType}
                helperText={errors.propertyType}
              >
                {PROPERTY_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="property-form-status"
                name="status"
                select
                label="Status"
                value={formData.status}
                onChange={handleChange('status')}
              >
                {PROPERTY_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Year Built & Total Units */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="property-form-year-built"
                name="yearBuilt"
                label="Year Built"
                type="number"
                value={formData.yearBuilt}
                onChange={handleChange('yearBuilt')}
                error={!!errors.yearBuilt}
                helperText={errors.yearBuilt}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="property-form-total-units"
                name="totalUnits"
                label="Total Units"
                type="number"
                value={formData.totalUnits}
                onChange={handleChange('totalUnits')}
                error={!!errors.totalUnits}
                helperText={errors.totalUnits}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="property-form-total-area"
                name="totalArea"
                label="Total Area (sq ft)"
                type="number"
                value={formData.totalArea}
                onChange={handleChange('totalArea')}
                error={!!errors.totalArea}
                helperText={errors.totalArea}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                id="property-form-description"
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
              />
            </Grid>

            {/* Image URL */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="property-form-image-url"
                name="imageUrl"
                label="Image URL (optional)"
                value={formData.imageUrl}
                onChange={handleChange('imageUrl')}
                helperText="Enter a URL to an image of the property"
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
            ? 'Update Property'
            : 'Create Property'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
