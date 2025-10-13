// frontend/src/pages/AddPropertyPage.jsx
import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack, MenuItem, Grid, Stepper, Step, StepLabel, Alert, CircularProgress,
} from '@mui/material';
import { Save, ArrowBack, CloudUpload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useApiMutation from '../hooks/useApiMutation';
import { api } from '../lib/auth';

const steps = ['Basic Information', 'Upload Image', 'Review & Submit'];

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postcode: '',
    type: 'Residential',
    coverImage: '',
  });

  const mutation = useApiMutation({ url: '/api/properties', method: 'post' });

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const res = await api('/api/uploads/single', { method: 'POST', body: uploadFormData });
      setFormData(prev => ({ ...prev, coverImage: res.url }));
    } catch (err) {
      setUploadError(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    try {
      await mutation.mutateAsync({ data: formData });
      navigate('/properties');
    } catch (error) {}
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Add New Property</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/properties')}>Back</Button>
      </Stack>

      <Card sx={{ mb: 4 }}><CardContent><Stepper activeStep={activeStep} alternativeLabel>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper></CardContent></Card>

      <Card><CardContent>
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}><Typography variant="h6">Basic Information</Typography></Grid>
            <Grid item xs={12}><TextField fullWidth label="Property Name" value={formData.name} onChange={handleInputChange('name')} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Street Address" value={formData.address} onChange={handleInputChange('address')} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="City" value={formData.city} onChange={handleInputChange('city')} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Postcode" value={formData.postcode} onChange={handleInputChange('postcode')} /></Grid>
            <Grid item xs={12}>
              <TextField fullWidth select label="Property Type" value={formData.type} onChange={handleInputChange('type')}>
                {['Residential', 'Commercial', 'Industrial', 'Retail'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>Upload Cover Image</Typography>
            <Button variant="contained" component="label" startIcon={<CloudUpload />} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Choose Image'}
              <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
            </Button>
            {isUploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
            {uploadError && <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>}
            {formData.coverImage && (
              <Box sx={{ mt: 3, border: '1px dashed grey', p: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Image Preview:</Typography>
                <img src={formData.coverImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px' }} />
              </Box>
            )}
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Review & Submit</Typography>
            {Object.entries(formData).map(([key, value]) => (
              <Typography key={key}><strong>{key}:</strong> {value || 'N/A'}</Typography>
            ))}
            {mutation.isError && <Alert severity="error" sx={{ mt: 2 }}>{mutation.error.message}</Alert>}
          </Box>
        )}

        <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
          <Button disabled={activeStep === 0} onClick={handleBack}>Back</Button>
          <Box sx={{ flex: '1 1 auto' }} />
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={mutation.isPending}>Add Property</Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>Next</Button>
          )}
        </Stack>
      </CardContent></Card>
    </Box>
  );
}