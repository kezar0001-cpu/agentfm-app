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
  StepLabel
} from '@mui/material';
import { Save, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const steps = ['Basic Information', 'Property Details', 'Review'];

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    
    // Property Details
    type: '',
    units: '',
    area: '',
    yearBuilt: '',
    description: '',
    
    // Additional Details
    ownerName: '',
    ownerEmail: '',
    ownerPhone: ''
  });

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    console.log('Property data to submit:', formData);
    // Here you would typically make an API call to save the property
    alert('Property added successfully!');
    navigate('/properties');
  };

  const propertyTypes = [
    'Commercial',
    'Residential',
    'Retail',
    'Industrial',
    'Mixed Use'
  ];

  const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Add New Property
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Add a new property to your portfolio
          </Typography>
        </div>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/properties')}
        >
          Back to Properties
        </Button>
      </Stack>

      {/* Stepper */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent>
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Property Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  placeholder="e.g., Downtown Office Tower"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={formData.address}
                  onChange={handleInputChange('address')}
                  placeholder="e.g., 123 Main Street"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city}
                  onChange={handleInputChange('city')}
                  placeholder="e.g., Sydney"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="State"
                  value={formData.state}
                  onChange={handleInputChange('state')}
                >
                  {states.map((state) => (
                    <MenuItem key={state} value={state}>
                      {state}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Postcode"
                  value={formData.postcode}
                  onChange={handleInputChange('postcode')}
                  placeholder="e.g., 2000"
                />
              </Grid>
            </Grid>
          )}

          {activeStep === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Property Details
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Property Type"
                  value={formData.type}
                  onChange={handleInputChange('type')}
                >
                  {propertyTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Number of Units"
                  type="number"
                  value={formData.units}
                  onChange={handleInputChange('units')}
                  placeholder="e.g., 24"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Area"
                  value={formData.area}
                  onChange={handleInputChange('area')}
                  placeholder="e.g., 15,000 sq ft"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Year Built"
                  type="number"
                  value={formData.yearBuilt}
                  onChange={handleInputChange('yearBuilt')}
                  placeholder="e.g., 2015"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  placeholder="Describe the property features, amenities, etc."
                />
              </Grid>
            </Grid>
          )}

          {activeStep === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Review & Submit
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Please review all information before submitting.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Property Name</Typography>
                <Typography>{formData.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Property Type</Typography>
                <Typography>{formData.type}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Address</Typography>
                <Typography>
                  {formData.address}, {formData.city} {formData.state} {formData.postcode}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Units</Typography>
                <Typography>{formData.units}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Area</Typography>
                <Typography>{formData.area}</Typography>
              </Grid>
            </Grid>
          )}

          {/* Navigation Buttons */}
          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSubmit}
              >
                Add Property
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}