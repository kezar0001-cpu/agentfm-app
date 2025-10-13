// frontend/src/pages/AddPropertyPage.jsx
import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack, MenuItem, Grid, Stepper, Step, StepLabel, Alert, CircularProgress, IconButton
} from '@mui/material';
import { Save, ArrowBack, CloudUpload, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useApiMutation from '../hooks/useApiMutation';
import { api } from '../api'; // Use the corrected api helper
import { API_BASE } from '../lib/auth'; // 👈 MINIMAL CHANGE: Import API_BASE for previews

const steps = ['Basic Information', 'Upload Images', 'Review & Submit'];

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    type: 'Residential',
    description: '',
    images: [], // 👈 MINIMAL CHANGE: Initialize as 'images' array
  });

  const mutation = useApiMutation({ url: '/api/properties', method: 'post' });

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  // 👇 MINIMAL CHANGE: Updated function to handle multiple files
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setIsUploading(true);
    setUploadError('');
    const uploadFormData = new FormData();
    files.forEach(file => uploadFormData.append('files', file));

    try {
      const res = await api.post('/api/uploads/multiple', uploadFormData);
      setFormData(prev => ({ ...prev, images: [...prev.images, ...res.urls] }));
    } catch (err) {
      setUploadError(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
      event.target.value = null;
    }
  };

  const handleDeleteImage = (indexToDelete) => {
    setFormData(prev => ({
      ...prev, images: prev.images.filter((_, index) => index !== indexToDelete),
    }));
  };
  // ---

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
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/properties')}>Back</Button>
      </Stack>

      <Card sx={{ mb: 4 }}><CardContent><Stepper activeStep={activeStep} alternativeLabel>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper></CardContent></Card>

      <Card><CardContent>
        {activeStep === 0 && (
          // ... (Your Step 0 form remains the same)
          <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Property Name" value={formData.name} onChange={handleInputChange('name')} placeholder="e.g., Downtown Office Tower"/>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Street Address" value={formData.address} onChange={handleInputChange('address')} placeholder="e.g., 123 Main Street"/>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="City" value={formData.city} onChange={handleInputChange('city')} placeholder="e.g., Sydney"/>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select label="State" value={formData.state} onChange={handleInputChange('state')}>
                  {states.map((state) => (<MenuItem key={state} value={state}>{state}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Postcode" value={formData.postcode} onChange={handleInputChange('postcode')} placeholder="e.g., 2000"/>
              </Grid>
            </Grid>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>Upload Property Images</Typography>
            <Button variant="contained" component="label" startIcon={<CloudUpload />} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Choose Images'}
              {/* 👇 MINIMAL CHANGE: Added 'multiple' attribute */}
              <input type="file" hidden multiple accept="image/*" onChange={handleFileUpload} />
            </Button>
            {isUploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
            {uploadError && <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>}
            {formData.images.length > 0 && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {formData.images.map((url, index) => (
                  <Grid item key={index} xs={6} sm={4} md={3}><Box sx={{ position: 'relative' }}>
                    {/* 👇 MINIMAL CHANGE: Prepend API_BASE to show image */}
                    <img src={`${API_BASE}${url}`} alt={`Preview ${index}`} style={{ width: '100%', borderRadius: '8px' }} />
                    <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.7)' }} onClick={() => handleDeleteImage(index)}>
                      <Delete fontSize="small" color="error" />
                    </IconButton>
                  </Box></Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {activeStep === 2 && (
          // ... (Your Step 2 review section remains the same)
          <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Review & Submit</Typography>
              </Grid>
              {/* ... form data display ... */}
            </Grid>
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