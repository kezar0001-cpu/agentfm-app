
import React from 'react';
import { Grid } from '@mui/material';
import { FormTextField, FormSelect } from '../form';

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

const PropertyBasicInfo = ({ control }) => (
  <Grid container spacing={2}>
    <Grid item xs={12}>
      <FormTextField
        name="name"
        control={control}
        label="Property Name"
        required
      />
    </Grid>
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
    <Grid item xs={12}>
      <FormTextField
        name="description"
        control={control}
        label="Description"
        multiline
        rows={3}
      />
    </Grid>
  </Grid>
);

export default PropertyBasicInfo;
