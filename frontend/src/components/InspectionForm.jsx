import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const InspectionForm = ({ inspection, onSuccess, onCancel }) => {
  const isEditing = !!inspection;
  
  const [formData, setFormData] = useState({
    title: inspection?.title || '',
    type: inspection?.type || 'ROUTINE',
    scheduledDate: inspection?.scheduledDate
      ? new Date(inspection.scheduledDate).toISOString().slice(0, 16)
      : '',
    propertyId: inspection?.propertyId || '',
    unitId: inspection?.unitId || '',
    assignedToId: inspection?.assignedToId || '',
    notes: inspection?.notes || '',
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

  // Fetch technicians
  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await apiClient.get('/users?role=TECHNICIAN');
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/inspections', data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.error || 'Failed to create inspection' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.patch(`/inspections/${inspection.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.error || 'Failed to update inspection' });
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

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required';
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
      type: formData.type,
      scheduledDate: new Date(formData.scheduledDate).toISOString(),
      propertyId: formData.propertyId,
      unitId: formData.unitId || undefined,
      assignedToId: formData.assignedToId || undefined,
      notes: formData.notes.trim() || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>
        {isEditing ? 'Edit Inspection' : 'Schedule Inspection'}
      </DialogTitle>

      <DialogContent dividers>
        {errors.submit && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.submit}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="inspection-title"
              name="title"
              label="Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              required
              placeholder="e.g., Quarterly Inspection - Building A"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              id="inspection-type"
              name="type"
              label="Type"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              error={!!errors.type}
              helperText={errors.type}
              required
            >
              <MenuItem value="ROUTINE">Routine</MenuItem>
              <MenuItem value="MOVE_IN">Move-In</MenuItem>
              <MenuItem value="MOVE_OUT">Move-Out</MenuItem>
              <MenuItem value="EMERGENCY">Emergency</MenuItem>
              <MenuItem value="COMPLIANCE">Compliance</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="inspection-scheduled-date"
              name="scheduledDate"
              label="Scheduled Date & Time"
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => handleChange('scheduledDate', e.target.value)}
              error={!!errors.scheduledDate}
              helperText={errors.scheduledDate}
              required
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              id="inspection-property"
              name="propertyId"
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
              id="inspection-unit"
              name="unitId"
              label="Unit (Optional)"
              value={formData.unitId}
              onChange={(e) => handleChange('unitId', e.target.value)}
              disabled={!formData.propertyId || !units?.length}
            >
              <MenuItem value="">No specific unit</MenuItem>
              {units?.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  Unit {unit.unitNumber}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              id="inspection-assigned-to"
              name="assignedToId"
              label="Assign to Technician (Optional)"
              value={formData.assignedToId}
              onChange={(e) => handleChange('assignedToId', e.target.value)}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {technicians?.map((tech) => (
                <MenuItem key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName} ({tech.email})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              id="inspection-notes"
              name="notes"
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              multiline
              rows={3}
              placeholder="Add any special instructions or notes..."
            />
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
          {isEditing ? 'Update' : 'Schedule'} Inspection
        </Button>
      </DialogActions>
    </Box>
  );
};

export default InspectionForm;
