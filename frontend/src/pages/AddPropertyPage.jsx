import { useState } from 'react';
import { Box, Button, TextField, Typography, Stack, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import useApiMutation from '../hooks/useApiMutation.js';

const AddPropertyPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [imageFiles, setImageFiles] = useState([]);

  const addPropertyMutation = useApiMutation({
    url: '/api/properties',
    method: 'post',
    onSuccess: () => {
      navigate('/properties');
    },
  });

  const onSubmit = async (data) => {
    console.log('Form data:', data);
    const formData = new FormData();
    formData.append('name', data.name || '');
    formData.append('address', data.address || '');
    formData.append('city', data.city || '');
    formData.append('postcode', data.postcode || '');
    formData.append('country', data.country || '');
    formData.append('type', data.type || '');
    formData.append('status', data.status || 'Active');
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });
    console.log('FormData entries:', Array.from(formData.entries()));

    try {
      await addPropertyMutation.mutateAsync({ data: formData });
    } catch (err) {
      console.error('Add property error:', err);
    }
  };

  const handleImageChange = (event) => {
    setImageFiles(Array.from(event.target.files));
    console.log('Selected images:', Array.from(event.target.files));
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
              accept="image/*"
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
            disabled={addPropertyMutation.isPending}
          >
            {addPropertyMutation.isPending ? 'Adding...' : 'Add Property'}
          </Button>
          {addPropertyMutation.isError && (
            <Typography color="error">
              {addPropertyMutation.error?.message || 'Failed to add property'}
            </Typography>
          )}
        </Stack>
      </form>
    </Box>
  );
};

export default AddPropertyPage;