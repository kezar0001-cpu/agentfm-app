
import React from 'react';
import { Grid } from '@mui/material';
import { FormSelect } from '../form';

const JobAssignment = ({ control, technicianOptions }) => (
  <Grid item xs={12}>
    <FormSelect
      name="assignedToId"
      control={control}
      label="Assign to Technician (Optional)"
      options={technicianOptions}
    />
  </Grid>
);

export default JobAssignment;
