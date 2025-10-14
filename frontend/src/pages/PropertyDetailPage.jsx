// frontend/src/pages/PropertyDetailPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Stack, Typography, Paper, Button, Chip, Divider, Grid, Alert, CircularProgress,
} from '@mui/material';
import { Edit, ArrowBack, Domain, LocationOn } from '@mui/icons-material';
import { api } from '../api.js';
import PropertyImageCarousel from '../components/PropertyImageCarousel.jsx';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [state, setState] = useState({
    loading: true,
    error: null,
    notFound: false,
    property: null,
  });

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null, notFound: false }));
    try {
      const res = await api.get(`/api/properties/${id}`);
      // backend returns { success, property }
      const property = res?.property ?? res;
      if (!property) throw new Error('Unexpected response');
      setState({ loading: false, error: null, notFound: false, property });
    } catch (err) {
      // differentiate 404 vs 500 when possible
      const msg = err?.message || 'Failed to fetch property';
      const notFound = /404|not found/i.test(msg);
      setState({ loading: false, error: notFound ? null : msg, notFound, property: null });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (state.loading) {
    return (
      <Box sx={{ p: 4, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (state.notFound) {
    return (
      <Box sx={{ p: 4 }}>
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="h5">Property not found</Typography>
          <Button variant="contained" onClick={() => navigate('/properties')}>
            Back to Properties
          </Button>
        </Stack>
      </Box>
    );
  }

  if (state.error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
        <Stack direction="row" spacing={2}>
          <Button onClick={load} variant="outlined">Retry</Button>
          <Button onClick={() => navigate('/properties')} variant="contained">Back</Button>
        </Stack>
      </Box>
    );
  }

  const p = state.property;
  const images = Array.isArray(p.images) ? p.images : [];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/properties')}>Back</Button>
        <Stack direction="row" spacing={1}>
          <Chip label={p.status || 'Active'} />
          {p.type && <Chip label={p.type} color="primary" variant="outlined" />}
          <Button
            component={RouterLink}
            to={`/properties/${p.id}/edit`}
            startIcon={<Edit />}
            variant="contained"
          >
            Edit
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <PropertyImageCarousel images={images} fallbackText={p.name} height={340} />
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          <Domain sx={{ mr: 1, verticalAlign: 'bottom' }} />
          {p.name}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Stack spacing={1.2}>
              <Typography variant="body1">
                <LocationOn sx={{ mr: 1, verticalAlign: 'bottom' }} />
                {p.address || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {p.city || '—'} {p.postcode || ''} {p.country || ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created: {new Date(p.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Updated: {new Date(p.updatedAt).toLocaleString()}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Units</Typography>
            <Divider sx={{ mb: 1 }} />
            {Array.isArray(p.units) && p.units.length > 0 ? (
              <Stack spacing={0.5}>
                {p.units.map((u) => (
                  <Typography key={u.id} variant="body2">
                    • {u.unitCode} {u.address ? `— ${u.address}` : ''} {u.bedrooms != null ? `(${u.bedrooms} br)` : ''}
                  </Typography>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">No units yet.</Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
