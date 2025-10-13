import { useState } from 'react';
import { Box, Button, TextField, Typography, Stack, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import useApiQuery from '../hooks/useApiQuery';

const AddPropertyPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [imageFiles, setImageFiles] = useState([]);
  const { mutate: addProperty, isLoading, error } = useApiQuery({ url: '/properties', method: 'POST' });

  const onSubmit = async (data) => {
    console.log('Form data:', data); // Debug log
    const formData = new FormData();
    formData.append('name', data.name || '');
    formData.append('address', data.address || '');
    formData.append('city', data.city || '');
    formData.append('postcode', data.postcode || '');
    formData.append('country', data.country || '');
    formData.append('type', data.type || '');
    formData.append('status', data.status || 'Active');
    imageFiles.forEach((file, index) => {
      formData.append(`images[${index}]`, file);
    });
    console.log('FormData entries:', Array.from(formData.entries())); // Debug form data

    try {
      await addProperty(formData, {
        onSuccess: () => {
          console.log('Property added successfully');
          alert('Property added successfully!');
          navigate('/properties');
        },
        onError: (err) => {
          console.error('Add property error:', err);
          alert('Failed to add property: ' + (err.message || 'Unknown error'));
        },
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error adding property');
    }
  };

  const handleImageChange = (event) => {
    setImageFiles(Array.from(event.target.files));
    console.log('Selected images:', Array.from(event.target.files)); // Debug log
  };

  return (
    <Box sx={{ p: 4, maxWidth: '600px', margin: '0 auto' }}>
      <Typography variant="h4" sx={{ mb: 4 }}>Add New Property</Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
          <TextField
            label="Name"
            {...register('name', { required: 'Name is required' })}
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
          />
          <TextField
            label="Address"
            {...register('address')}
            fullWidth
          />
          <TextField
            label="City"
            {...register('city')}
            fullWidth
          />
          <TextField
            label="Postcode"
            {...register('postcode')}
            fullWidth
          />
          <TextField
            label="Country"
            {...register('country')}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              {...register('type')}
              defaultValue=""
            >
              <MenuItem value="Residential">Residential</MenuItem>
              <MenuItem value="Commercial">Commercial</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              {...register('status')}
              defaultValue="Active"
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" component="label">
            Upload Images
            <input
              type="file"
              hidden
              multiple
              onChange={handleImageChange}
              accept="image/*" // Restrict to images
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            {imageFiles.length > 0 ? `${imageFiles.length} file(s) selected` : 'No files selected'}
          </Typography>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Property'}
          </Button>
          {error && <Typography color="error">{error.message}</Typography>}
        </Stack>
      </form>
    </Box>
  );
};

export default AddPropertyPage;