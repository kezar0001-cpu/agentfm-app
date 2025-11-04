import React from 'react';
import { Box, Typography, Button, Paper, Stack, TextField, MenuItem, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import ensureArray from '../utils/ensureArray';
import { queryKeys } from '../utils/queryKeys';

const financialReportSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  fromDate: z.string().min(1, 'Start date is required'),
  toDate: z.string().min(1, 'End date is required'),
});

const occupancyReportSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
});

const maintenanceReportSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().optional(),
  fromDate: z.string().min(1, 'Start date is required'),
  toDate: z.string().min(1, 'End date is required'),
});

const tenantReportSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
});

const getReportSchema = (reportType) => {
  switch (reportType) {
    case 'Financial':
      return financialReportSchema;
    case 'Occupancy':
      return occupancyReportSchema;
    case 'Maintenance':
      return maintenanceReportSchema;
    case 'Tenant':
      return tenantReportSchema;
    default:
      return z.object({});
  }
};

export default function ReportGenerator() {
  const { reportType } = useParams();
  const reportSchema = getReportSchema(reportType);

  const { data: propertiesData = [], isLoading: isLoadingProperties } = useQuery({
    queryKey: queryKeys.properties.selectOptions(),
    queryFn: async () => {
      const res = await apiClient.get('/properties');
      return ensureArray(res.data, ['items', 'data.items', 'properties']);
    },
  });

  const mutation = useMutation({
    mutationFn: (newReport) => {
      return apiClient.post(`/new-reports/${reportType.toLowerCase()}`, newReport);
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      propertyId: '',
      unitId: '',
      fromDate: '',
      toDate: '',
    },
  });

  const propertyId = watch('propertyId');

  const { data: unitsData = [], isLoading: isLoadingUnits } = useQuery({
    queryKey: queryKeys.units.listByProperty(propertyId),
    queryFn: async () => {
      const res = await apiClient.get(`/units?propertyId=${propertyId}`);
      return ensureArray(res.data, ['items', 'data.items', 'units']);
    },
    enabled: !!propertyId,
  });

  const onSubmit = (data) => {
    const payload = {
      ...data,
      fromDate: data.fromDate ? new Date(data.fromDate).toISOString() : undefined,
      toDate: data.toDate ? new Date(data.toDate).toISOString() : undefined,
    };
    mutation.mutate(payload);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Generate {reportType} Report
      </Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Controller
              name="propertyId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Property"
                  disabled={isLoadingProperties}
                  error={!!errors.propertyId}
                  helperText={errors.propertyId?.message}
                >
                  {propertiesData.map((prop) => (
                    <MenuItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            {reportType === 'Maintenance' && (
              <Controller
                name="unitId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Unit (Optional)"
                    disabled={!propertyId || isLoadingUnits}
                    error={!!errors.unitId}
                    helperText={errors.unitId?.message}
                  >
                    <MenuItem value="">
                      <em>All Units</em>
                    </MenuItem>
                    {unitsData.map((unit) => (
                      <MenuItem key={unit.id} value={unit.id}>
                        {unit.unitNumber}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}
            {(reportType === 'Financial' || reportType === 'Maintenance') && (
              <Stack direction="row" spacing={2}>
                <Controller
                  name="fromDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="From"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      error={!!errors.fromDate}
                      helperText={errors.fromDate?.message}
                    />
                  )}
                />
                <Controller
                  name="toDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="To"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      error={!!errors.toDate}
                      helperText={errors.toDate?.message}
                    />
                  )}
                />
              </Stack>
            )}
            {mutation.isError && (
              <Alert severity="error">{mutation.error.message}</Alert>
            )}
            {mutation.isSuccess && (
              <Alert severity="success">Report generation has been successful.</Alert>
            )}
            <Button type="submit" variant="contained" disabled={isSubmitting || mutation.isPending}>
              Generate Report
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
