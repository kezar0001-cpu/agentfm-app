import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack, MenuItem, Grid, Stepper, Step, StepLabel, Alert, CircularProgress, IconButton
} from '@mui/material';
import { Save, ArrowBack, CloudUpload, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useApiMutation from '../hooks/useApiMutation';
import { api } from '../api';
import { API_BASE } from '../lib/auth';
import * as Yup from 'yup';

const steps = ['Basic Information', 'Upload Images', 'Review & Submit'];

const validationSchema = Yup.object({
  name: Yup.string().required('Property name is required'),
  address: Yup.string(),
  city: Yup.string(),
  postcode: Yup.string().matches(/^\d{4}$/, 'Must be a 4-digit postcode'),
  type: Yup.string().oneOf(['Commercial', 'Residential', 'Retail', 'Industrial', 'Mixed Use']),
  description: Yup.string(),
  images: Yup.array().of(Yup.string()).nullable(),
});

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postcode: '',
    type: 'Residential',
    description: '',
    images: [],
  });

  const mutation = useApiMutation({ url: '/api/properties', method: 'post' });

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    if (files.some(file => file.size > 5 * 1024 * 1024)) {
      setUploadError('Files must be under 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    const uploadFormData = new FormData();
    files.forEach(file => uploadFormData.append('files', file));

    try {
      const res = await api.post('/api/uploads/multiple', uploadFormData);
      setFormData(prev => ({ ...prev, images: [...prev.images, ...res.urls] }));
      alert(`Successfully uploaded ${res.urls.length} image(s)`);
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

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const validateForm = async () => {
    try {
      await validationSchema.validate(formData, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      const newErrors = err.inner.reduce((acc, { path, message }) => ({ ...acc, [path]: message }), {});
      setErrors(newErrors);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (await validateForm()) {
      try {
        const response = await mutation.mutateAsync({ data: formData });
        alert('Property added successfully!');
        navigate('/properties');
      } catch (error) {
        setErrors({ submit: error.message || 'Failed to add property' });
      }
    }
  };

  const propertyTypes = ['Commercial', 'Residential', 'Retail', 'Industrial', 'Mixed Use'];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Add New Property</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/properties')}>Back</Button>
      </Stack>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}><Typography variant="h6">Basic Information</Typography></Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Property Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={formData.address}
                  onChange={handleInputChange('address')}
                  error={!!errors.address}
                  helperText={errors.address}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city}
                  onChange={handleInputChange('city')}
                  error={!!errors.city}
                  helperText={errors.city}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postcode"
                  value={formData.postcode}
                  onChange={handleInputChange('postcode')}
                  error={!!errors.postcode}
                  helperText={errors.postcode}
                />
              </Grid>
            </Grid>
          )}

          {activeStep === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}><Typography variant="h6">Property Details & Image</Typography></Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Property Type"
                  value={formData.type}
                  onChange={handleInputChange('type')}
                  error={!!errors.type}
                  helperText={errors.type}
                >
                  {propertyTypes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  error={!!errors.description}
                  helperText={errors.description}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Upload Images</Typography>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<CloudUpload />}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Choose Images'}
                  <input type="file" hidden multiple accept="image/*" onChange={handleFileUpload} />
                </Button>
                {isUploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
                {uploadError && <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>}
                {formData.images.length > 0 && (
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    {formData.images.map((url, index) => (
                      <Grid item key={index} xs={6} sm={4} md={3}>
                        <Box sx={{ position: 'relative' }}>
                          <img src={`${API_BASE}${url}`} alt={`Preview ${index}`} style={{ width: '100%', borderRadius: '8px' }} />
                          <IconButton
                            size="small"
                            sx={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.7)' }}
                            onClick={() => handleDeleteImage(index)}
                          >
                            <Delete fontSize="small" color="error" />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Grid>
            </Grid>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Review & Submit</Typography>
              {Object.entries(formData).map(([key, value]) => (
                <Typography key={key}><strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value || 'N/A'}</Typography>
              ))}
              {mutation.isError && <Alert severity="error" sx={{ mt: 2 }}>{mutation.error.message}</Alert>}
              {errors.submit && <Alert severity="error" sx={{ mt: 2 }}>{errors.submit}</Alert>}
            </Box>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>Back</Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSubmit}
                disabled={mutation.isPending}
              >
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