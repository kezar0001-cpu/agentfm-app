import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Grid,
  TextField,
  Button,
  MenuItem,
  Typography,
  Alert,
  Stack,
  IconButton,
  Card,
  CardMedia,
  CardActions,
  FormHelperText,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Image as ImageIcon,
  Save,
  Cancel,
} from '@mui/icons-material';

const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'office', label: 'Office' },
];

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(200, 'Name is too long'),
  address: z.string().max(500, 'Address is too long').optional().or(z.literal('')),
  city: z.string().max(100, 'City name is too long').optional().or(z.literal('')),
  postcode: z.string().max(20, 'Postcode is too long').optional().or(z.literal('')),
  country: z.string().max(100, 'Country name is too long').optional().or(z.literal('')),
  type: z.string().optional().or(z.literal('')),
  status: z.string().default('Active'),
});

export default function PropertyForm({
  initialData = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = null,
  mode = 'create',
}) {
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      postcode: initialData?.postcode || '',
      country: initialData?.country || '',
      type: initialData?.type || '',
      status: initialData?.status || 'Active',
    },
  });

  useEffect(() => {
    if (initialData?.images && Array.isArray(initialData.images)) {
      setExistingImages(initialData.images);
    }
  }, [initialData]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        return false;
      }
      return true;
    });

    const newPreviews = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setImageFiles((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onFormSubmit = async (data) => {
    const formData = new FormData();
    
    formData.append('name', data.name.trim());
    if (data.address) formData.append('address', data.address.trim());
    if (data.city) formData.append('city', data.city.trim());
    if (data.postcode) formData.append('postcode', data.postcode.trim());
    if (data.country) formData.append('country', data.country.trim());
    if (data.type) formData.append('type', data.type);
    formData.append('status', data.status);

    if (mode === 'edit') {
      formData.append('existingImages', JSON.stringify(existingImages));
    }

    imageFiles.forEach((file) => {
      formData.append('images', file);
    });

    await onSubmit(formData);
  };

  const handleCancel = () => {
    reset();
    setImageFiles([]);
    setImagePreviews([]);
    if (initialData?.images) {
      setExistingImages(initialData.images);
    }
    onCancel?.();
  };

  const totalImages = existingImages.length + imagePreviews.length;

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)} noValidate>
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Property Name"
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={isSubmitting}
                autoFocus
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Property Type"
                fullWidth
                error={!!errors.type}
                helperText={errors.type?.message}
                disabled={isSubmitting}
              >
                <MenuItem value="">
                  <em>Select type</em>
                </MenuItem>
                {PROPERTY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Status"
                fullWidth
                error={!!errors.status}
                helperText={errors.status?.message}
                disabled={isSubmitting}
              >
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Location Details
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Address"
                fullWidth
                error={!!errors.address}
                helperText={errors.address?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="City"
                fullWidth
                error={!!errors.city}
                helperText={errors.city?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Controller
            name="postcode"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Postcode"
                fullWidth
                error={!!errors.postcode}
                helperText={errors.postcode?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Country"
                fullWidth
                error={!!errors.country}
                helperText={errors.country?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Images
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload property images (max 5MB per image, up to 10 images)
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUpload />}
            disabled={isSubmitting || totalImages >= 10}
            fullWidth
            sx={{ py: 2 }}
          >
            Upload Images
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={handleImageSelect}
              disabled={isSubmitting || totalImages >= 10}
            />
          </Button>
          {totalImages >= 10 && (
            <FormHelperText>Maximum 10 images allowed</FormHelperText>
          )}
        </Grid>

        {(existingImages.length > 0 || imagePreviews.length > 0) && (
          <Grid item xs={12}>
            <Stack spacing={2}>
              {existingImages.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Existing Images
                  </Typography>
                  <Grid container spacing={2}>
                    {existingImages.map((image, index) => (
                      <Grid item xs={6} sm={4} md={3} key={`existing-${index}`}>
                        <Card>
                          <CardMedia
                            component="img"
                            height="140"
                            image={image}
                            alt={`Property image ${index + 1}`}
                            sx={{ objectFit: 'cover' }}
                          />
                          <CardActions>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveExistingImage(index)}
                              disabled={isSubmitting}
                              aria-label="Remove image"
                            >
                              <Delete />
                            </IconButton>
                            {index === 0 && (
                              <Chip label="Cover" size="small" color="primary" />
                            )}
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {imagePreviews.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    New Images
                  </Typography>
                  <Grid container spacing={2}>
                    {imagePreviews.map((preview, index) => (
                      <Grid item xs={6} sm={4} md={3} key={`new-${index}`}>
                        <Card>
                          <CardMedia
                            component="img"
                            height="140"
                            image={preview.url}
                            alt={preview.name}
                            sx={{ objectFit: 'cover' }}
                          />
                          <CardActions>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveNewImage(index)}
                              disabled={isSubmitting}
                              aria-label="Remove image"
                            >
                              <Delete />
                            </IconButton>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Stack>
          </Grid>
        )}

        <Grid item xs={12}>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={isSubmitting || (!isDirty && imageFiles.length === 0 && mode === 'edit')}
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Property' : 'Save Changes'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
