// frontend/src/pages/EditPropertyPage.jsx
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Stack, Paper, Typography, TextField, Button, Grid, Alert, CircularProgress, Chip,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { Save, ArrowBack } from '@mui/icons-material';
import { api } from '../api.js';

const TYPES = ['residential', 'commercial', 'industrial', 'retail', 'hospitality', 'office'];

export default function EditPropertyPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    postcode: '',
    country: '',
    type: '',
    status: 'Active',
    images: [],
  });

  const load = async () => {
    setLoading(true);
    setError('');
    setNotFound(false);
    try {
      const res = await api.get(`/api/properties/${id}`);
      const p = res?.property ?? res;
      if (!p) throw new Error('Unexpected response');
      setForm({
        name: p.name || '',
        address: p.address || '',
        city: p.city || '',
        postcode: p.postcode || '',
        country: p.country || '',
        type: p.type || '',
        status: p.status || 'Active',
        images: Array.isArray(p.images) ? p.images : [],
      });
    } catch (err) {
      const msg = err?.message || 'Failed to fetch property';
      if (/404|not found/i.test(msg)) {
        setNotFound(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleTypeChange = (_e, v) => {
    if (v !== null) setForm((s) => ({ ...s, type: v }));
  };

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      // We’re editing metadata only here; if you add image file editing later,
      // switch to FormData and include existingImages similar to your POST.
      const payload = {
        name: form.name.trim(),
        address: form.address || null,
        city: form.city || null,
        postcode: form.postcode || null,
        country: form.country || null,
        type: form.type || null,
        status: form.status || 'Active',
        images: form.images || [],
        // If you later keep some and upload new:
        // existingImages: JSON.stringify(form.images || []),
      };
      const res = await api.patch(`/api/properties/${id}`, payload);
      const ok = res?.success !== false;
      if (!ok) throw new Error(res?.message || 'Update failed');
      navigate(`/properties/${id}`);
    } catch (err) {
      setError(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound) {
    return (
      <Box sx={{ p: 4 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Property not found</Typography>
          <Button variant="contained" onClick={() => navigate('/properties')}>Back to Properties</Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Back</Button>
        <Stack direction="row" spacing={1}>
          <Chip label={form.status || 'Active'} />
          {form.type && <Chip label={form.type} variant="outlined" />}
        </Stack>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Edit Property</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Name" name="name" value={form.name} onChange={onChange}
              required fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address" name="address" value={form.address} onChange={onChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="City" name="city" value={form.city} onChange={onChange} fullWidth />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Postcode" name="postcode" value={form.postcode} onChange={onChange} fullWidth />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Country" name="country" value={form.country} onChange={onChange} fullWidth />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Type</Typography>
            <ToggleButtonGroup
              exclusive
              value={form.type || ''}
              onChange={handleTypeChange}
              size="small"
            >
              {TYPES.map((t) => (
                <ToggleButton key={t} value={t} aria-label={t}>
                  {t}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button variant="contained" startIcon={<Save />} onClick={save} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="text" onClick={() => navigate(`/properties/${id}`)}>Cancel</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
