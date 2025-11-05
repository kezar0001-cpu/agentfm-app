
import React from 'react';
import { Grid } from '@mui/material';
import { FormTextField } from './form';

const JobCostEstimate = ({ control }) => (
  <Grid item xs={12} sm={6}>
    <FormTextField
      name="estimatedCost"
      control={control}
      label="Estimated Cost (Optional)"
      type="number"
      inputProps={{
        min: 0,
        step: 0.01,
      }}
    />
  </Grid>
);

export default JobCostEstimate;
