import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  MenuItem,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Alert
} from '@mui/material';
import { Save, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useApiMutation from '../hooks/useApiMutation';

const steps = ['Basic Information', 'Property Details', 'Review'];

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    type: 'Residential',
    description: '',
  });

  const mutation = useApiMutation({
    url: '/api/properties',
    method: 'post',
  });

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    try {
      await mutation.mutateAsync({ data: formData });
      alert('Property added successfully!');
      navigate('/properties');
    } catch (error) {
      // Error is handled by the mutation hook state
    }
  };
  
  const propertyTypes = ['Commercial', 'Residential', 'Retail', 'Industrial', 'Mixed Use'];
  const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Add New Property</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/properties')}>
          Back to Properties
        </Button>
      </Stack>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}><Typography variant="h6">Basic Information</Typography></Grid>
              <Grid item xs={12}><TextField fullWidth label="Property Name" value={formData.name} onChange={handleInputChange('name')} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Street Address" value={formData.address} onChange={handleInputChange('address')} /></Grid>
              <Grid item xs={12} sm={4}><TextField fullWidth label="City" value={formData.city} onChange={handleInputChange('city')} /></Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select label="State" value={formData.state} onChange={handleInputChange('state')}>
                  {states.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}><TextField fullWidth label="Postcode" value={formData.postcode} onChange={handleInputChange('postcode')} /></Grid>
            </Grid>
          )}

          {activeStep === 1 && (
             <Grid container spacing={3}>
                <Grid item xs={12}><Typography variant="h6">Property Details</Typography></Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth select label="Property Type" value={formData.type} onChange={handleInputChange('type')}>
                    {propertyTypes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth multiline rows={4} label="Description" value={formData.description} onChange={handleInputChange('description')} />
                </Grid>
             </Grid>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Review & Submit</Typography>
              {Object.entries(formData).map(([key, value]) => (
                <Box key={key} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" component="span" sx={{ textTransform: 'capitalize', mr: 1 }}>{key}:</Typography>
                  <Typography component="span">{value || 'N/A'}</Typography>
                </Box>
              ))}
              {mutation.isError && <Alert severity="error" sx={{ mt: 2 }}>{mutation.error.message}</Alert>}
            </Box>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>Back</Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep === steps.length - 1 ? (
              <Button variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={mutation.isPending}>
                Add Property
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>Next</Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}