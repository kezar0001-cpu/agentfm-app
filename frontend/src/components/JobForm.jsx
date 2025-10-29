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
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import ensureArray from '../utils/ensureArray';

const JobForm = ({ job, onSuccess, onCancel }) => {
  const isEditing = !!job;
  
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    priority: job?.priority || 'MEDIUM',
    status: job?.status || 'OPEN',
    propertyId: job?.propertyId || '',
    unitId: job?.unitId || '',
    assignedToId: job?.assignedToId || '',
    scheduledDate: job?.scheduledDate
      ? new Date(job.scheduledDate).toISOString().slice(0, 16)
      : '',
    estimatedCost: job?.estimatedCost || '',
    notes: job?.notes || '',
  });

  const [errors, setErrors] = useState({});

  // Fetch properties
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const response = await apiClient.get('/properties');
      return response.data;
    },
  });

  // Fetch units for selected property
  const { data: units = [] } = useQuery({
    queryKey: ['units', formData.propertyId],
    queryFn: async () => {
      if (!formData.propertyId) return [];
      const response = await apiClient.get(`/units?propertyId=${formData.propertyId}`);
      return response.data;
    },
    enabled: !!formData.propertyId,
  });

  // Fetch technicians
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await apiClient.get('/users?role=TECHNICIAN');
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/jobs', data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.error || 'Failed to create job' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.patch(`/jobs/${job.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.error || 'Failed to update job' });
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
      priority: formData.priority,
      propertyId: formData.propertyId,
      unitId: formData.unitId || undefined,
      assignedToId: formData.assignedToId || undefined,
      scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : undefined,
      estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
      notes: formData.notes.trim() || undefined,
    };

    // Only send status if editing
    if (isEditing) {
      payload.status = formData.status;
    }

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
        {isEditing ? 'Edit Job' : 'Create Job'}
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
              id="job-form-title"
              name="title"
              label="Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              required
              placeholder="e.g., Fix HVAC System"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              id="job-form-description"
              name="description"
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              required
              multiline
              rows={3}
              placeholder="Describe the job in detail..."
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              id="job-form-priority"
              name="priority"
              label="Priority"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              required
            >
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="URGENT">Urgent</MenuItem>
            </TextField>
          </Grid>

          {isEditing && (
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                id="job-form-status"
                name="status"
                label="Status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                required
              >
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="ASSIGNED">Assigned</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </TextField>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              id="job-form-property"
              name="propertyId"
              label="Property"
              value={formData.propertyId}
              onChange={(e) => handleChange('propertyId', e.target.value)}
              error={!!errors.propertyId}
              helperText={errors.propertyId}
              required
              disabled={loadingProperties}
            >
              {Array.isArray(properties) && properties.map((property) => (
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
              id="job-form-unit"
              name="unitId"
              label="Unit (Optional)"
              value={formData.unitId}
              onChange={(e) => handleChange('unitId', e.target.value)}
              disabled={!formData.propertyId || !units?.length}
            >
              <MenuItem value="">No specific unit</MenuItem>
              {Array.isArray(units) && units.map((unit) => (
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
              id="job-form-assigned-to"
              name="assignedToId"
              label="Assign to Technician (Optional)"
              value={formData.assignedToId}
              onChange={(e) => handleChange('assignedToId', e.target.value)}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {Array.isArray(technicians) && technicians.map((tech) => (
                <MenuItem key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName} ({tech.email})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="job-form-scheduled-date"
              name="scheduledDate"
              label="Scheduled Date (Optional)"
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => handleChange('scheduledDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="job-form-estimated-cost"
              name="estimatedCost"
              label="Estimated Cost (Optional)"
              type="number"
              value={formData.estimatedCost}
              onChange={(e) => handleChange('estimatedCost', e.target.value)}
              InputProps={{
                startAdornment: '$',
              }}
              inputProps={{
                min: 0,
                step: 0.01,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              id="job-form-notes"
              name="notes"
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              multiline
              rows={2}
              placeholder="Add any additional notes..."
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
          {isEditing ? 'Update' : 'Create'} Job
        </Button>
      </DialogActions>
    </Box>
  );
};

export default JobForm;
