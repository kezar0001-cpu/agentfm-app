
import React from 'react';
import { Grid } from '@mui/material';
import { FormTextField, FormSelect } from '../form';
import { COUNTRIES } from '../../lib/countries';

const countryOptions = COUNTRIES.map((country) => ({
  value: country.name,
  label: country.name,
}));

const PropertyLocation = ({ control }) => (
  <Grid container spacing={2}>
    <Grid item xs={12}>
      <FormTextField
        name="address"
        control={control}
        label="Street Address"
        required
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <FormTextField
        name="city"
        control={control}
        label="City"
        required
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <FormTextField
        name="state"
        control={control}
        label="State / Province / Region"
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <FormTextField
        name="zipCode"
        control={control}
        label="Postal Code"
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <FormSelect
        name="country"
        control={control}
        label="Country"
        options={countryOptions}
        required
      />
    </Grid>
  </Grid>
);

export default PropertyLocation;
