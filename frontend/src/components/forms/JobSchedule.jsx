
import React from 'react';
import { Grid, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';

const JobSchedule = ({ control }) => (
  <Grid item xs={12} sm={6}>
    <Controller
      name="scheduledDate"
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          fullWidth
          type="datetime-local"
          label="Scheduled Date (Optional)"
          error={!!error}
          helperText={error?.message}
          InputLabelProps={{ shrink: true }}
          inputProps={{
            'aria-invalid': !!error,
            'aria-describedby': error ? 'scheduledDate-error' : undefined,
          }}
          FormHelperTextProps={{
            id: error ? 'scheduledDate-error' : undefined,
            role: error ? 'alert' : undefined,
            'aria-live': error ? 'polite' : undefined,
          }}
        />
      )}
    />
  </Grid>
);

export default JobSchedule;
