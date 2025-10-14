// =======================================
// File: frontend/src/components/PropertyWizard.jsx
// Wizard modal to create a property via FormData
// =======================================
import { useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel,
  Button, Box, Grid, TextField, MenuItem,
  Typography, Stack, Alert, LinearProgress, Divider, Chip,
} from '@mui/material';
import useApiMutation from '../hooks/useApiMutation';

const PROPERTY_TYPES = ['residential','commercial','industrial','retail','hospitality','office'];
const STATUS_OPTIONS = ['Active','Inactive'];

export default function PropertyWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', address: '', city: '', postcode: '', country: '',
    type: '', status: 'Active',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [error, setError] = useState('');
  const { mutateAsync, isPending } = useApiMutation({ url: '/api/properties', method: 'post' });
  const steps = useMemo(() => ['Basic','Location','Images','Review'], []);

  const onChange = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setError(''); };
  const onPickCover = (e) => setCoverFile(e.target.files?.[0] || null);
  const onPickGallery = (e) => setGalleryFiles(Array.from(e.target.files || []));

  const canNext = () => (step === 0 ? !!form.name.trim() : true);
  const next = () => { if (!canNext()) return setError('Please complete required fields.'); setError(''); setStep((s) => Math.min(s+1, steps.length-1)); };
  const back = () => { setError(''); setStep((s) => Math.max(s-1, 0)); };

  const reset = () => {
    setStep(0);
    setForm({ name:'', address:'', city:'', postcode:'', country:'', type:'', status:'Active' });
    setCoverFile(null); setGalleryFiles([]); setError('');
  };
  const resetAndClose = () => { reset(); onClose?.(); };

  const handleSubmit = async () => {
    try {
      setError('');
      const fd = new FormData();
      fd.append('name', form.name.trim());
      if (form.address) fd.append('address', form.address.trim());
      if (form.city) fd.append('city', form.city.trim());
      if (form.postcode) fd.append('postcode', form.postcode.trim());
      if (form.country) fd.append('country', form.country.trim());
      if (form.type) fd.append('type', form.type.trim());
      if (form.status) fd.append('status', form.status);

      if (coverFile) fd.append('images', coverFile);
      galleryFiles.forEach((f) => fd.append('images', f));

      const res = await mutateAsync({ data: fd });
      onCreated?.(res?.property || null);
      resetAndClose();
    } catch (e) {
      setError(e?.message || 'Failed to create property');
    }
  };

  const CoverPreview = () => {
    if (!coverFile) return null;
    const url = URL.createObjectURL(coverFile);
    return (
      <Box sx={{ mt: 1 }}>
        <img
          src={url}
          alt="cover preview"
          style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8 }}
          onLoad={() => URL.revokeObjectURL(url)}
        />
      </Box>
    );
  };

  const GalleryPreview = () => {
    if (!galleryFiles.length) return null;
    return (
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
        {galleryFiles.map((f, i) => {
          const url = URL.createObjectURL(f);
          return (
            <img
              key={`${f.name}-${i}`}
              src={url}
              alt={f.name}
              style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 6 }}
              onLoad={() => URL.revokeObjectURL(url)}
            />
          );
        })}
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={isPending ? undefined : resetAndClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Property</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
          {steps.map((label) => (<Step key={label}><StepLabel>{label}</StepLabel></Step>))}
        </Stepper>

        {isPending && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 0 && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField required fullWidth name="name" label="Property Name" value={form.name} onChange={onChange} disabled={isPending} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth name="type" label="Property Type" value={form.type} onChange={onChange} disabled={isPending}>
                  {PROPERTY_TYPES.map((t) => (<MenuItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth name="status" label="Status" value={form.status} onChange={onChange} disabled={isPending}>
                  {STATUS_OPTIONS.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
                </TextField>
              </Grid>
            </Grid>
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth name="address" label="Address" value={form.address} onChange={onChange} disabled={isPending} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth name="city" label="City" value={form.city} onChange={onChange} disabled={isPending} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth name="postcode" label="Postcode" value={form.postcode} onChange={onChange} disabled={isPending} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth name="country" label="Country" value={form.country} onChange={onChange} disabled={isPending} />
              </Grid>
            </Grid>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Cover Image (optional)</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Button component="label" variant="outlined" disabled={isPending}>
                    Choose File
                    <input hidden type="file" accept="image/*" onChange={onPickCover} />
                  </Button>
                  {coverFile && <Chip label={coverFile.name} onDelete={isPending ? undefined : () => setCoverFile(null)} />}
                </Stack>
                <CoverPreview />
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Additional Images (optional)</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Button component="label" variant="outlined" disabled={isPending}>
                    Choose Files
                    <input hidden multiple type="file" accept="image/*" onChange={onPickGallery} />
                  </Button>
                  {galleryFiles.length > 0 && (
                    <Typography variant="caption">
                      {galleryFiles.length} file{galleryFiles.length > 1 ? 's' : ''} selected
                    </Typography>
                  )}
                </Stack>
                <GalleryPreview />
              </Box>
            </Stack>
          </Box>
        )}

        {step === 3 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Review</Typography>
            <Grid container spacing={1}>
              {[
                ['Name', form.name || '—'],
                ['Type', form.type || '—'],
                ['Status', form.status || '—'],
                ['Address', form.address || '—'],
                ['City', form.city || '—'],
                ['Postcode', form.postcode || '—'],
                ['Country', form.country || '—'],
              ].map(([k, v]) => (
                <Grid key={k} item xs={12} md={6}>
                  <Typography variant="body2"><strong>{k}:</strong> {v}</Typography>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {coverFile ? 'Cover image selected' : 'No cover image'}
              {' · '}
              {galleryFiles.length ? `${galleryFiles.length} additional image${galleryFiles.length > 1 ? 's' : ''}` : 'No additional images'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={resetAndClose} disabled={isPending}>Cancel</Button>
        {step > 0 && <Button onClick={back} disabled={isPending} variant="outlined">Back</Button>}
        {step < steps.length - 1
          ? <Button onClick={next} disabled={!canNext() || isPending} variant="contained">Next</Button>
          : <Button onClick={handleSubmit} disabled={isPending || !canNext()} variant="contained">{isPending ? 'Saving…' : 'Create Property'}</Button>}
      </DialogActions>
    </Dialog>
  );
}


// =======================================
// File: frontend/src/pages/PropertiesPage.jsx
// Replaces "Add Property" route with wizard modal
// =======================================
import { useState, useMemo, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Stack, Chip, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import {
  Add, Search, LocationOn, Apartment, Business, Factory, Storefront, Hotel, Domain, Edit, Visibility,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import { useNavigate } from 'react-router-dom';
import useApiQuery from '../hooks/useApiQuery';
import DataState from '../components/DataState';
import PropertyImageCarousel from '../components/PropertyImageCarousel.jsx';
import PropertyWizard from '../components/PropertyWizard.jsx';

const typeIcons = {
  residential: { icon: Apartment, color: 'primary.main' },
  commercial: { icon: Business, color: 'secondary.main' },
  industrial: { icon: Factory, color: 'warning.main' },
  retail: { icon: Storefront, color: 'success.main' },
  hospitality: { icon: Hotel, color: 'info.main' },
  office: { icon: Domain, color: 'secondary.main' },
};

const formatTypeName = (type) =>
  !type
    ? 'N/A'
    : type.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const PropertyCard = ({ property, onView, onEdit }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const images = Array.isArray(property.images) && property.images.length > 0 ? property.images : [];
  const typeKey = property.type?.toLowerCase().trim();
  const { icon: TypeIcon = Apartment, color: typeColor = 'primary.main' } = (typeKey && typeIcons[typeKey]) || {};
  const formattedType = formatTypeName(property.type);

  return (
    <>
      <Card
        sx={{
          height: '100%', display: 'flex', flexDirection: 'column',
          borderRadius: 2, boxShadow: 2, transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
        }}
      >
        <Box sx={{ position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <PropertyImageCarousel
            images={images}
            fallbackText={property.name}
            placeholderSize="300x200"
            height={200}
            containerSx={{ borderRadius: '8px 8px 0 0' }}
          />
        </Box>
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{property.name}</Typography>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocationOn fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">{property.address || 'No address'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TypeIcon fontSize="small" sx={{ color: typeColor }} />
              <Typography variant="body2" color="text.secondary">{formattedType}</Typography>
            </Box>
          </Stack>
        </CardContent>
        <Stack direction="row" spacing={1} sx={{ p: 2, pb: 2 }}>
          <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={() => onView(property.id)} fullWidth>
            View
          </Button>
          <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => setIsConfirmOpen(true)} fullWidth>
            Edit
          </Button>
        </Stack>
      </Card>

      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} aria-labelledby="edit-confirmation-title">
        <DialogTitle id="edit-confirmation-title">Confirm Edit</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to edit this property?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
          <Button onClick={() => { setIsConfirmOpen(false); onEdit(property.id); }} variant="contained" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default function PropertiesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [openWizard, setOpenWizard] = useState(false);

  const debouncedSearch = useMemo(() => debounce((v) => setSearchTerm(v), 300), []);
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  const handleSearchChange = (e) => { const v = e.target.value; setSearchInput(v); debouncedSearch(v); };

  const { data, isLoading, isError, error, refetch } =
    useApiQuery({ queryKey: ['properties'], url: '/api/properties' });

  const properties = data?.properties || [];

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = p.name?.toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q);
      const matchesFilter = filterType === 'all' || (p.type && p.type.toLowerCase() === filterType);
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filterType, properties]);

  const propertyTypes = useMemo(() => {
    const types = new Set(properties.map((p) => p.type?.toLowerCase()).filter(Boolean));
    return ['all', ...Array.from(types)];
  }, [properties]);

  const resetFilters = () => {
    debouncedSearch.cancel();
    setSearchTerm(''); setSearchInput(''); setFilterType('all');
  };

  const hasFiltersApplied = searchTerm.trim() !== '' || filterType !== 'all';
  const isPropertiesEmpty = !isLoading && properties.length === 0;
  const isFilteredEmpty = !isLoading && filteredProperties.length === 0 && properties.length > 0;
  const emptyMessage = isFilteredEmpty
    ? 'No properties match your filters. Try resetting or adding a new property.'
    : 'No properties available yet. Try adding a new property to get started.';

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1200px', margin: '0 auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>Properties</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenWizard(true)}   // OPEN WIZARD INSTEAD OF ROUTE
          sx={{ px: 3, py: 1, borderRadius: 2, '&:hover': { backgroundColor: 'primary.dark' } }}
        >
          Add Property
        </Button>
      </Stack>

      <Card sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 1 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth placeholder="Search by name or address..."
              value={searchInput} onChange={handleSearchChange}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Search sx={{ color: 'grey.500' }} /></InputAdornment>),
                sx: { borderRadius: 2 },
              }}
              inputProps={{ 'aria-label': 'Search properties by name or address' }}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setSearchInput(''); setSearchTerm(''); } }}
              sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: 'primary.main' } } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {propertyTypes.map((type) => {
                const chipLabel = type === 'all' ? 'All Properties' : type.charAt(0).toUpperCase() + type.slice(1);
                const chipFilterTarget = type === 'all' ? 'all properties' : type;
                return (
                  <Chip
                    key={type}
                    label={chipLabel}
                    variant={filterType === type ? 'filled' : 'outlined'}
                    onClick={() => setFilterType(type)}
                    color={filterType === type ? 'primary' : 'default'}
                    sx={{ fontWeight: filterType === type ? 600 : 400 }}
                    aria-label={`Filter by ${chipFilterTarget}`}
                  />
                );
              })}
            </Stack>
          </Grid>
        </Grid>
      </Card>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={isPropertiesEmpty || isFilteredEmpty}
        emptyMessage={emptyMessage}
        onResetFilters={resetFilters}
        onAddProperty={() => setOpenWizard(true)}   // OPEN WIZARD FROM EMPTY STATE ACTION
        showResetButton={hasFiltersApplied}
      >
        <Grid container spacing={4}>
          {filteredProperties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <PropertyCard
                property={property}
                onView={(id) => navigate(`/properties/${id}`)}
                onEdit={(id) => navigate(`/properties/${id}/edit`)}
              />
            </Grid>
          ))}
        </Grid>
      </DataState>

      {/* Wizard modal */}
      <PropertyWizard
        open={openWizard}
        onClose={() => setOpenWizard(false)}
        onCreated={() => refetch()}
      />
    </Box>
  );
}
