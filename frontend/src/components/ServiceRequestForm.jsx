import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Grid,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const ServiceRequestForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIUM',
    propertyId: '',
    unitId: '',
    photos: [],
  });

  const [errors, setErrors] = useState({});

  // Fetch properties
  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const response = await apiClient.get('/properties');
      return response.data;
    },
  });

  // Fetch units for selected property
  const { data: units } = useQuery({
    queryKey: ['units', formData.propertyId],
    queryFn: async () => {
      if (!formData.propertyId) return [];
      const response = await apiClient.get(`/units?propertyId=${formData.propertyId}`);
      return response.data;
    },
    enabled: !!formData.propertyId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/service-requests', data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.error || 'Failed to submit service request' });
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear unit if property changes
    if (field === 'propertyId') {
      setFormData((prev) => ({ ...prev, unitId: '' }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.propertyId) {
      newErrors.propertyId = 'Property is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      priority: formData.priority,
      propertyId: formData.propertyId,
      unitId: formData.unitId || undefined,
      photos: formData.photos.length > 0 ? formData.photos : undefined,
    };

    createMutation.mutate(payload);
  };

  const isLoading = createMutation.isPending;

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>
        Submit Service Request
      </DialogTitle>

      <DialogContent dividers>
        {errors.submit && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.submit}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          Please provide detailed information about your maintenance request. A property manager will review it shortly.
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              required
              placeholder="e.g., Leaking Faucet in Kitchen"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              required
              multiline
              rows={4}
              placeholder="Please describe the issue in detail. Include when it started, how often it occurs, and any other relevant information..."
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              error={!!errors.category}
              helperText={errors.category}
              required
            >
              <MenuItem value="PLUMBING">Plumbing</MenuItem>
              <MenuItem value="ELECTRICAL">Electrical</MenuItem>
              <MenuItem value="HVAC">HVAC (Heating/Cooling)</MenuItem>
              <MenuItem value="APPLIANCE">Appliance</MenuItem>
              <MenuItem value="STRUCTURAL">Structural</MenuItem>
              <MenuItem value="PEST_CONTROL">Pest Control</MenuItem>
              <MenuItem value="LANDSCAPING">Landscaping</MenuItem>
              <MenuItem value="GENERAL">General Maintenance</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Priority"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              required
            >
              <MenuItem value="LOW">Low - Can wait a few days</MenuItem>
              <MenuItem value="MEDIUM">Medium - Normal priority</MenuItem>
              <MenuItem value="HIGH">High - Needs attention soon</MenuItem>
              <MenuItem value="URGENT">Urgent - Immediate attention needed</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Property"
              value={formData.propertyId}
              onChange={(e) => handleChange('propertyId', e.target.value)}
              error={!!errors.propertyId}
              helperText={errors.propertyId}
              required
              disabled={loadingProperties}
            >
              {properties?.map((property) => (
                <MenuItem key={property.id} value={property.id}>
                  {property.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Unit"
              value={formData.unitId}
              onChange={(e) => handleChange('unitId', e.target.value)}
              disabled={!formData.propertyId || !units?.length}
              required={!!units?.length}
            >
              {units?.length === 0 && (
                <MenuItem value="">No units available</MenuItem>
              )}
              {units?.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  Unit {unit.unitNumber}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Photos (Optional)
            </Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              Photo upload will be available soon. For now, you can add photo URLs in the description or contact your property manager directly to send photos.
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading && <CircularProgress size={16} />}
        >
          Submit Request
        </Button>
      </DialogActions>
    </Box>
  );
};

export default ServiceRequestForm;
