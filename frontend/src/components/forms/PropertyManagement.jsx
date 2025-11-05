
import React from 'react';
import { Grid } from '@mui/material';
import { FormTextField } from '../form';

const PropertyManagement = ({ control }) => (
  <Grid container spacing={2}>
    <Grid item xs={12}>
      <FormTextField
        name="imageUrl"
        control={control}
        label="Image URL (optional)"
        helperText="Enter a URL to an image of the property"
      />
    </Grid>
  </Grid>
);

export default PropertyManagement;
