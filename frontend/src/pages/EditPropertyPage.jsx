// frontend/src/pages/EditPropertyPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, Delete, Close } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import useApiQuery from '../hooks/useApiQuery';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState';
import { resolvePropertyImageUrl } from '../utils/propertyImages.js';

const propertyTypes = [
  { label: 'Residential', value: 'Residential' },
  { label: 'Commercial', value: 'Commercial' },
  { label: 'Industrial', value: 'Industrial' },
];

const statusOptions = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
];

export default function EditPropertyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: ['property', id],
    url: `/api/properties/${id}`,
  });

  const property = data?.property;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      address: '',
      city: '',
      postcode: '',
      country: '',
      type: '',
      status: 'Active',
    },
  });

  useEffect(() => {
    if (property) {
      reset({
        name: property.name || '',
        address: property.address || '',
        city: property.city || '',
        postcode: property.postcode || '',
        country: property.country || '',
        type: property.type || '',
        status: property.status || 'Active',
      });
      setExistingImages(property.images || []);
    }
  }, [property, reset]);

  useEffect(() => {
    const urls = newImages.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviewImages(urls);
    return () => {
      urls.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [newImages]);

  const updatePropertyMutation = useApiMutation({
    url: `/api/properties/${id}`,
    method: 'patch',
    onSuccess: (response) => {
      const updated = response?.property;
      if (updated) {
        reset({
          name: updated.name || '',
          address: updated.address || '',
          city: updated.city || '',
          postcode: updated.postcode || '',
          country: updated.country || '',
          type: updated.type || '',
          status: updated.status || 'Active',
        });
        setExistingImages(updated.images || []);
      }
      setNewImages([]);
      navigate(`/properties/${id}`);
    },
  });

  const deletePropertyMutation = useApiMutation({
    url: `/api/properties/${id}`,
    method: 'delete',
    onSuccess: () => {
      navigate('/properties');
    },
  });

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setNewImages((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const handleRemoveExisting = (index) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRemoveNew = (index) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const onSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append('name', values.name || '');
      formData.append('address', values.address || '');
      formData.append('city', values.city || '');
      formData.append('postcode', values.postcode || '');
      formData.append('country', values.country || '');
      formData.append('type', values.type || '');
      formData.append('status', values.status || '');
      formData.append('existingImages', JSON.stringify(existingImages));
      newImages.forEach((file) => formData.append('images', file));
      await updatePropertyMutation.mutateAsync({ data: formData });
    } catch (mutationError) {
      console.error('Update property error:', mutationError);
    }
  };

  const handleDeleteProperty = async () => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }
    try {
      await deletePropertyMutation.mutateAsync();
    } catch (mutationError) {
      console.error('Delete property error:', mutationError);
    }
  };

  const existingImagePreviews = useMemo(() => existingImages || [], [existingImages]);

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/properties')} sx={{ mb: 3 }}>
        Back to Properties
      </Button>

      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        {property && (
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 3 }}>Edit Property</Typography>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Name"
                        fullWidth
                        {...register('name', { required: 'Name is required' })}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Type"
                        select
                        fullWidth
                        defaultValue=""
                        {...register('type')}
                      >
                        <MenuItem value="">Select type</MenuItem>
                        {propertyTypes.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Status"
                        select
                        fullWidth
                        defaultValue="Active"
                        {...register('status')}
                      >
                        {statusOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Address"
                        fullWidth
                        {...register('address')}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="City"
                        fullWidth
                        {...register('city')}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Postcode"
                        fullWidth
                        {...register('postcode')}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Country"
                        fullWidth
                        {...register('country')}
                      />
                    </Grid>
                  </Grid>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="subtitle1">Existing Images</Typography>
                    {existingImagePreviews.length > 0 ? (
                      <Grid container spacing={2}>
                        {existingImagePreviews.map((image, index) => (
                          <Grid item xs={12} sm={6} md={4} key={`${image}-${index}`}>
                            <Box
                              sx={{
                                position: 'relative',
                                borderRadius: 2,
                                overflow: 'hidden',
                                height: 180,
                                boxShadow: 1,
                              }}
                            >
                              <Box
                                component="img"
                                src={resolvePropertyImageUrl(image, property.name, '400x240')}
                                alt={`Property image ${index + 1}`}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveExisting(index)}
                                sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                                aria-label="Remove image"
                              >
                                <Close fontSize="small" />
                              </IconButton>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography color="text.secondary">No images uploaded yet.</Typography>
                    )}
                  </Stack>

                  <Stack spacing={1}>
                    <Typography variant="subtitle1">Add Images</Typography>
                    <Button variant="contained" component="label" sx={{ alignSelf: 'flex-start' }}>
                      Upload Images
                      <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
                    </Button>
                    {previewImages.length > 0 && (
                      <Grid container spacing={2}>
                        {previewImages.map(({ url, file }, index) => (
                          <Grid item xs={12} sm={6} md={4} key={`${file.name}-${index}`}>
                            <Box
                              sx={{
                                position: 'relative',
                                borderRadius: 2,
                                overflow: 'hidden',
                                height: 180,
                                boxShadow: 1,
                              }}
                            >
                              <Box
                                component="img"
                                src={url}
                                alt={file.name}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveNew(index)}
                                sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                                aria-label="Remove new image"
                              >
                                <Close fontSize="small" />
                              </IconButton>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                    {newImages.length > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {newImages.length} new file{newImages.length === 1 ? '' : 's'} selected
                      </Typography>
                    )}
                  </Stack>

                  {updatePropertyMutation.isError && (
                    <Alert severity="error">
                      {updatePropertyMutation.error?.message || 'Failed to update property'}
                    </Alert>
                  )}

                  <Stack direction="row" spacing={2}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={updatePropertyMutation.isPending}
                    >
                      {updatePropertyMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={handleDeleteProperty}
                      disabled={deletePropertyMutation.isPending}
                    >
                      {deletePropertyMutation.isPending ? 'Deleting...' : 'Delete Property'}
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </CardContent>
          </Card>
        )}
      </DataState>
    </Box>
  );
}

