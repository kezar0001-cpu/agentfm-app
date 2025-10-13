import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack, MenuItem, Grid, Stepper, Step, StepLabel, Alert, CircularProgress,
} from '@mui/material';
import { Save, ArrowBack, CloudUpload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useApiMutation from '../hooks/useApiMutation';
import api from '../api';

const steps = ['Basic Information', 'Upload Images', 'Review & Submit'];

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [formData, setFormData] = useState({
    name: '', address: '', city: '', postcode: '', type: 'Residential', images: [],
  });

  const mutation = useApiMutation({ url: '/api/properties', method: 'POST' });

  const handleInputChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError('');
    const uploadFormData = new FormData();
    for (const file of files) {
      uploadFormData.append('files', file);
    }

    try {
      const res = await api.post('/api/uploads/multiple', uploadFormData);
      setFormData(prev => ({ ...prev, images: [...prev.images, ...res.urls] }));
    } catch (err) {
      setUploadError(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => setActiveStep(p => p + 1);
  const handleBack = () => setActiveStep(p => p - 1);

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
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth name="name" label="Property Name" value={formData.name} onChange={handleInputChange} required /></Grid>
            <Grid item xs={12}><TextField fullWidth name="address" label="Street Address" value={formData.address} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth name="city" label="City" value={formData.city} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth name="postcode" label="Postcode" value={formData.postcode} onChange={handleInputChange} /></Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>Upload Property Images</Typography>
            <Button variant="contained" component="label" startIcon={<CloudUpload />} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Choose Images'}
              <input type="file" hidden multiple accept="image/*" onChange={handleFileUpload} />
            </Button>
            {isUploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
            {uploadError && <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>}
            {formData.images.length > 0 && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {formData.images.map(url => (
                  <Grid item key={url} xs={6} sm={4} md={3}>
                    <img src={url} alt="Preview" style={{ width: '100%', height: 'auto', borderRadius: '8px' }} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Review & Submit</Typography>
            {Object.entries(formData).map(([key, value]) => (
              <Typography key={key}><strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value || 'N/A'}</Typography>
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