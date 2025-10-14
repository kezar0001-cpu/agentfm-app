// frontend/src/pages/PropertyDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Stack, Typography, Paper, Button, Chip, Divider, Grid, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import { Edit, ArrowBack, Domain, LocationOn, Delete } from '@mui/icons-material';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/properties/${id}`);
      navigate('/properties');
    } catch (err) {
      setState((s) => ({ ...s, error: err?.message || 'Failed to delete property' }));
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

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
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={p.status || 'Active'} color={p.status === 'Active' ? 'success' : 'default'} />
          {p.type && <Chip label={p.type.charAt(0).toUpperCase() + p.type.slice(1)} color="primary" variant="outlined" />}
          <Button
            component={RouterLink}
            to={`/properties/${p.id}/edit`}
            startIcon={<Edit />}
            variant="contained"
          >
            Edit
          </Button>
          <Button
            startIcon={<Delete />}
            variant="outlined"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
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

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Property</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{p.name}&quot;? This action cannot be undone.
            {p.units && p.units.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This property has {p.units.length} unit(s). Deleting it may affect related data.
              </Alert>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
