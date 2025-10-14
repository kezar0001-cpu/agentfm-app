// frontend/src/pages/AddPropertyPage.jsx
import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useApiMutation from '../hooks/useApiMutation';

const PROPERTY_TYPES = [
  'residential',
  'commercial',
  'industrial',
  'retail',
  'hospitality',
  'office',
];

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const { mutateAsync, isPending, isError, error } = useApiMutation({
    url: '/api/properties',
    method: 'post',
  });

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    postcode: '',
    country: '',
    type: '',
    status: 'Active',
  });
  const [images, setImages] = useState([]); // FileList -> Array<File>
  const [coverImage, setCoverImage] = useState(null); // File | null
  const [formError, setFormError] = useState('');

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setFormError('');
  };

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(files);
  };

  const onCoverFile = (e) => {
    const files = Array.from(e.target.files || []);
    setCoverImage(files[0] || null);
  };

  const validate = () => {
    if (!form.name.trim()) {
      setFormError('Name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    const fd = new FormData();
    fd.append('name', form.name.trim());
    if (form.address) fd.append('address', form.address.trim());
    if (form.city) fd.append('city', form.city.trim());
    if (form.postcode) fd.append('postcode', form.postcode.trim());
    if (form.country) fd.append('country', form.country.trim());
    if (form.type) fd.append('type', form.type.trim());
    if (form.status) fd.append('status', form.status);

    // Cover image: backend accepts in the same "images" array or as coverImage string.
    if (coverImage) fd.append('images', coverImage);

    // Additional images
    images.forEach((file) => fd.append('images', file));

    try {
      await mutateAsync({ data: fd, headers: { /* let browser set Content-Type */ } });
      navigate('/properties');
    } catch {
      // errors are shown via isError/error alert
    }
  };

  return (
    <Container maxWidth="md" component="main" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
          Add Property
        </Typography>

        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error?.message || 'Failed to create property'}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="name"
                label="Property Name"
                value={form.name}
                onChange={onChange}
                disabled={isPending}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                name="address"
                label="Address"
                value={form.address}
                onChange={onChange}
                disabled={isPending}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="city"
                label="City"
                value={form.city}
                onChange={onChange}
                disabled={isPending}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="postcode"
                label="Postcode"
                value={form.postcode}
                onChange={onChange}
                disabled={isPending}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="country"
                label="Country"
                value={form.country}
                onChange={onChange}
                disabled={isPending}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                name="type"
                label="Property Type"
                value={form.type}
                onChange={onChange}
                disabled={isPending}
              >
                {PROPERTY_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                name="status"
                label="Status"
                value={form.status}
                onChange={onChange}
                disabled={isPending}
              >
                {['Active', 'Inactive'].map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Cover Image (optional)
                </Typography>
                <Button variant="outlined" component="label" disabled={isPending}>
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onCoverFile}
                  />
                </Button>
                {coverImage && (
                  <Typography variant="caption">{coverImage.name}</Typography>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Additional Images
                </Typography>
                <Button variant="outlined" component="label" disabled={isPending}>
                  Choose Files
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={onFiles}
                  />
                </Button>
                {images.length > 0 && (
                  <Typography variant="caption">
                    {images.length} file{images.length > 1 ? 's' : ''} selected
                  </Typography>
                )}
              </Stack>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isPending}
            >
              {isPending ? 'Saving…' : 'Save Property'}
            </Button>
            <Button
              type="button"
              variant="outlined"
              disabled={isPending}
              onClick={() => navigate('/properties')}
            >
              Cancel
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
