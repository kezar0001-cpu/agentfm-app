import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import useApiMutation from '../hooks/useApiMutation.js';

const MAX_IMAGE_COUNT = 10;

const AddPropertyPage = () => {
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
  const navigate = useNavigate();
  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [hasHitImageLimit, setHasHitImageLimit] = useState(false);

  const addPropertyMutation = useApiMutation({
    url: '/api/properties',
    method: 'post',
    onSuccess: () => {
      reset();
      setImageFiles([]);
      setHasHitImageLimit(false);
      navigate('/properties');
    },
  });

  useEffect(() => {
    const previews = imageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviewImages(previews);

    return () => {
      previews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  const onSubmit = async (data) => {
    const formData = new FormData();
    const appendIfPresent = (key, value) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) return;
        formData.append(key, trimmed);
        return;
      }
      formData.append(key, value);
    };

    appendIfPresent('name', data.name);
    appendIfPresent('address', data.address);
    appendIfPresent('city', data.city);
    appendIfPresent('postcode', data.postcode);
    appendIfPresent('country', data.country);
    appendIfPresent('type', data.type);
    appendIfPresent('status', data.status || 'Active');
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });

    try {
      await addPropertyMutation.mutateAsync({ data: formData });
    } catch (err) {
      console.error('Add property error:', err);
    }
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setImageFiles((prev) => {
      const next = [...prev, ...files];
      if (next.length > MAX_IMAGE_COUNT) {
        setHasHitImageLimit(true);
      } else if (hasHitImageLimit) {
        setHasHitImageLimit(false);
      }
      return next.slice(0, MAX_IMAGE_COUNT);
    });
    event.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setImageFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length < MAX_IMAGE_COUNT && hasHitImageLimit) {
        setHasHitImageLimit(false);
      }
      return next;
    });
  };

  const handleClearImages = () => {
    setImageFiles([]);
    setHasHitImageLimit(false);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '900px', margin: '0 auto' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Add New Property
          </Typography>
          <Typography color="text.secondary">
            Provide the key details of the property and upload photos to help your team identify it quickly.
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={4}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Property name"
                      placeholder="e.g. Riverside Apartments"
                      {...register('name', {
                        required: 'Name is required',
                        validate: (value) => value?.trim().length > 0 || 'Name is required',
                      })}
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Property type"
                      select
                      fullWidth
                      defaultValue=""
                      {...register('type')}
                    >
                      <MenuItem value="">Select type</MenuItem>
                      <MenuItem value="Residential">Residential</MenuItem>
                      <MenuItem value="Commercial">Commercial</MenuItem>
                      <MenuItem value="Industrial">Industrial</MenuItem>
                      <MenuItem value="Mixed use">Mixed use</MenuItem>
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
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Street address"
                      placeholder="123 Example Street"
                      {...register('address')}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="City"
                      {...register('city')}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Postcode"
                      {...register('postcode')}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Country"
                      {...register('country')}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Photos
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upload JPEG or PNG images (max {MAX_IMAGE_COUNT} files).
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Button variant="contained" component="label">
                      Upload images
                      <input
                        type="file"
                        hidden
                        multiple
                        onChange={handleImageChange}
                        accept="image/*"
                      />
                    </Button>
                    {imageFiles.length > 0 && (
                      <Button variant="text" color="inherit" onClick={handleClearImages}>
                        Clear selection
                      </Button>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {imageFiles.length === 0
                        ? 'No files selected'
                        : `${imageFiles.length} file${imageFiles.length === 1 ? '' : 's'} ready to upload`}
                    </Typography>
                  </Stack>
                  {previewImages.length === 0 ? (
                    <Typography color="text.secondary">
                      Add up to {MAX_IMAGE_COUNT} photos to showcase the property.
                    </Typography>
                  ) : (
                    <Grid container spacing={2}>
                      {previewImages.map(({ file, url }, index) => (
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
                              onClick={() => handleRemoveImage(index)}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: 'rgba(0,0,0,0.55)',
                                color: '#fff',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                              }}
                              aria-label={`Remove ${file.name}`}
                            >
                              <Close fontSize="small" />
                            </IconButton>
                            <Box
                              sx={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)',
                                color: '#fff',
                                px: 1.5,
                                py: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {file.name}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                  {hasHitImageLimit && (
                    <Alert severity="info" variant="outlined">
                      Only the first {MAX_IMAGE_COUNT} images will be uploaded.
                    </Alert>
                  )}
                </Stack>

                {addPropertyMutation.isError && (
                  <Alert severity="error">
                    {addPropertyMutation.error?.message || 'Failed to add property. Please check the details and try again.'}
                  </Alert>
                )}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={addPropertyMutation.isPending}
                    sx={{ minWidth: 160 }}
                  >
                    {addPropertyMutation.isPending ? 'Adding property...' : 'Create property'}
                  </Button>
                  <Button variant="outlined" color="inherit" onClick={() => navigate('/properties')} sx={{ minWidth: 160 }}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default AddPropertyPage;
