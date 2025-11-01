import React, { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import ensureArray from '../utils/ensureArray';
import { queryKeys } from '../utils/queryKeys.js';

const InspectionForm = ({ inspection, onSuccess, onCancel }) => {
  const isEditing = Boolean(inspection);

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
    tags: inspection?.tags || [],
  });

  const [errors, setErrors] = useState({});

  const { data: propertiesData, isLoading: loadingProperties } = useQuery({
    queryKey: queryKeys.properties.selectOptions(),
    queryFn: async () => {
      const response = await apiClient.get('/properties');
      return response.data;
    },
  });

  const properties = ensureArray(propertiesData, ['properties', 'data', 'items', 'results']);

  const { data: unitsData } = useQuery({
    queryKey: queryKeys.properties.units(formData.propertyId),
    queryFn: async () => {
      if (!formData.propertyId) return [];
      const response = await apiClient.get('/units', { params: { propertyId: formData.propertyId } });
      return response.data;
    },
    enabled: Boolean(formData.propertyId),
  });

  const units = ensureArray(unitsData, ['units', 'data', 'items', 'results']);

  const { data: inspectorData = { inspectors: [] } } = useQuery({
    queryKey: queryKeys.inspections.inspectors(),
    queryFn: async () => {
      const response = await apiClient.get('/inspections/inspectors');
      return response.data;
    },
  });

  const inspectorOptions = useMemo(() => inspectorData.inspectors || [], [inspectorData.inspectors]);

  const { data: tagData = { tags: [] } } = useQuery({
    queryKey: queryKeys.inspections.tags(),
    queryFn: async () => {
      const response = await apiClient.get('/inspections/tags');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/inspections', payload);
      return response.data;
    },
    onSuccess,
    onError: (error) => {
      setErrors({ submit: error.response?.data?.message || 'Failed to create inspection' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch(`/inspections/${inspection.id}`, payload);
      return response.data;
    },
    onSuccess,
    onError: (error) => {
      setErrors({ submit: error.response?.data?.message || 'Failed to update inspection' });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleChange = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (field === 'propertyId') {
      setFormData((previous) => ({ ...previous, unitId: '' }));
    }
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.title.trim()) nextErrors.title = 'Title is required';
    if (!formData.type) nextErrors.type = 'Type is required';
    if (!formData.scheduledDate) nextErrors.scheduledDate = 'Scheduled date is required';
    if (!formData.propertyId) nextErrors.propertyId = 'Property is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      title: formData.title.trim(),
      type: formData.type,
      scheduledDate: new Date(formData.scheduledDate).toISOString(),
      propertyId: formData.propertyId,
      unitId: formData.unitId || undefined,
      assignedToId: formData.assignedToId || undefined,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags,
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>{isEditing ? 'Edit inspection' : 'Schedule inspection'}</DialogTitle>
      <DialogContent dividers>
        {errors.submit && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.submit}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Title"
              fullWidth
              value={formData.title}
              onChange={(event) => handleChange('title', event.target.value)}
              required
              error={Boolean(errors.title)}
              helperText={errors.title}
              placeholder="e.g. Quarterly fire safety inspection"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Inspection type"
              fullWidth
              value={formData.type}
              onChange={(event) => handleChange('type', event.target.value)}
              error={Boolean(errors.type)}
              helperText={errors.type}
            >
              <MenuItem value="ROUTINE">Routine</MenuItem>
              <MenuItem value="MOVE_IN">Move-in</MenuItem>
              <MenuItem value="MOVE_OUT">Move-out</MenuItem>
              <MenuItem value="EMERGENCY">Emergency</MenuItem>
              <MenuItem value="COMPLIANCE">Compliance</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Scheduled date and time"
              type="datetime-local"
              fullWidth
              value={formData.scheduledDate}
              onChange={(event) => handleChange('scheduledDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
              error={Boolean(errors.scheduledDate)}
              helperText={errors.scheduledDate}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Property"
              fullWidth
              value={formData.propertyId}
              onChange={(event) => handleChange('propertyId', event.target.value)}
              error={Boolean(errors.propertyId)}
              helperText={errors.propertyId}
              disabled={loadingProperties}
              required
            >
              {properties.map((property) => (
                <MenuItem key={property.id} value={property.id}>
                  {property.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Unit (optional)"
              fullWidth
              value={formData.unitId}
              onChange={(event) => handleChange('unitId', event.target.value)}
              disabled={!formData.propertyId || !units.length}
            >
              <MenuItem value="">Common areas</MenuItem>
              {units.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  Unit {unit.unitNumber}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              size="small"
              options={inspectorOptions}
              value={inspectorOptions.find((option) => option.id === formData.assignedToId) || null}
              onChange={(_event, value) => handleChange('assignedToId', value?.id || '')}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
              renderInput={(params) => <TextField {...params} label="Assign to" helperText="Leave blank to assign later" />}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Notes"
              multiline
              minRows={3}
              fullWidth
              value={formData.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              placeholder="Add specific instructions or context for the inspector"
            />
          </Grid>

          <Grid item xs={12}>
            <Autocomplete
              multiple
              freeSolo
              size="small"
              options={tagData.tags || []}
              value={formData.tags}
              onChange={(_event, value) => handleChange('tags', value)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip {...getTagProps({ index })} label={option} key={option} size="small" />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags such as safety, compliance, urgent"
                />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          {isEditing ? 'Update inspection' : 'Schedule inspection'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default InspectionForm;
