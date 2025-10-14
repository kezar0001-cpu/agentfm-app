/* =========================================================
   File: frontend/src/components/PropertyWizard.jsx
   Purpose: In-place wizard to create a property (modal)
   ========================================================= */
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  Grid,
  TextField,
  MenuItem,
  Typography,
  Stack,
  Alert,
  LinearProgress,
  Divider,
  Chip,
} from '@mui/material';
import useApiMutation from '../hooks/useApiMutation';

const PROPERTY_TYPES = [
  'residential',
  'commercial',
  'industrial',
  'retail',
  'hospitality',
  'office',
];

const STATUS_OPTIONS = ['Active', 'Inactive'];

export default function PropertyWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    postcode: '',
    country: '',
    type: '',
    status: 'Active',
  });

  const [coverFile, setCoverFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [error, setError] = useState('');

  const { mutateAsync, isPending } = useApiMutation({
    url: '/api/properties',
    method: 'post',
  });

  const steps = useMemo(
    () => ['Basic', 'Location', 'Images', 'Review'],
    []
  );

  const canNext = () => {
    if (step === 0) return Boolean(form.name.trim());
    if (step === 1) return true; // all optional
    if (step === 2) return true; // images optional
    return true;
  };

  const next = () => {
    if (!canNext()) {
      setError('Please complete required fields to continue.');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const resetAndClose = () => {
    setStep(0);
    setForm({
      name: '',
      address: '',
      city: '',
      postcode: '',
      country: '',
      type: '',
      status: 'Active',
    });
    setCoverFile(null);
    setGalleryFiles([]);
    setError('');
    onClose?.();
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setError('');
  };

  const onPickCover = (e) => {
    const f = e.target.files?.[0] || null;
    setCoverFile(f);
  };

  const onPickGallery = (e) => {
    const files = Array.from(e.target.files || []);
    setGalleryFiles(files);
  };

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

      // Server accepts multiple "images" – cover first
      if (coverFile) fd.append('images', coverFile);
      galleryFiles.forEach((file) => fd.append('images', file));

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
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {isPending && <LinearProgress sx={{ mb: 2 }} />}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 0 && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Property Name"
                  name="name"
                  required
                  fullWidth
                  value={form.name}
                  onChange={onChange}
                  disabled={isPending}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Property Type"
                  name="type"
                  fullWidth
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
                  label="Status"
                  name="status"
                  fullWidth
                  value={form.status}
                  onChange={onChange}
                  disabled={isPending}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  name="address"
                  fullWidth
                  value={form.address}
                  onChange={onChange}
                  disabled={isPending}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="City"
                  name="city"
                  fullWidth
                  value={form.city}
                  onChange={onChange}
                  disabled={isPending}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Postcode"
                  name="postcode"
                  fullWidth
                  value={form.postcode}
                  onChange={onChange}
                  disabled={isPending}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Country"
                  name="country"
                  fullWidth
                  value={form.country}
                  onChange={onChange}
                  disabled={isPending}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Cover Image (optional)
                </Typography>
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
                <Typography variant="subtitle2" color="text.secondary">
                  Additional Images (optional)
                </Typography>
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
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Review
            </Typography>
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
                  <Typography variant="body2">
                    <strong>{k}:</strong> {v}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary">
              {coverFile ? 'Cover image selected' : 'No cover image'}
              {' · '}
              {galleryFiles.length
                ? `${galleryFiles.length} additional image${galleryFiles.length > 1 ? 's' : ''}`
                : 'No additional images'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={resetAndClose} disabled={isPending}>Cancel</Button>
        {step > 0 && (
          <Button onClick={back} disabled={isPending} variant="outlined">
            Back
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button onClick={next} disabled={!canNext() || isPending} variant="contained">
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending || !canNext()} variant="contained">
            {isPending ? 'Saving…' : 'Create Property'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}


/* =========================================================
   File: frontend/src/pages/PropertiesPage.jsx
   Purpose: List + open PropertyWizard (modal)
   ========================================================= */
import { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Search,
  LocationOn,
  Apartment,
  Business,
  Factory,
  Storefront,
  Hotel,
  Domain,
  Edit,
  Visibility,
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
    : type
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

const PropertyCard = ({ property, onView, onEdit }) => {
  const images = Array.isArray(property.images) ? property.images : [];
  const typeKey = property.type?.toLowerCase().trim();
  const { icon: TypeIcon = Apartment, color: typeColor = 'primary.main' } =
    (typeKey && typeIcons[typeKey]) || {};
  const formattedType = formatTypeName(property.type);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        boxShadow: 2,
        transition: 'transform 0.2s, box-shadow 0.2s',
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
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {property.name}
        </Typography>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocationOn fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary">
              {property.address || 'No address'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TypeIcon fontSize="small" sx={{ color: typeColor }} />
            <Typography variant="body2" color="text.secondary">
              {formattedType}
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      <Stack direction="row" spacing={1} sx={{ p: 2, pb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Visibility />}
          onClick={() => onView(property.id)}
          fullWidth
          aria-label={`View property ${property.name}`}
        >
          View
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => onEdit(property.id)}
          fullWidth
          aria-label={`Edit property ${property.name}`}
        >
          Edit
        </Button>
      </Stack>
    </Card>
  );
};

export default function PropertiesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [openWizard, setOpenWizard] = useState(false);

  const debouncedSearch = useMemo(
    () => debounce((v) => setSearchTerm(v), 300),
    []
  );

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  const handleSearchChange = (e) => {
    const { value } = e.target;
    setSearchInput(value);
    debouncedSearch(value);
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useApiQuery({ queryKey: ['properties'], url: '/api/properties' });

  const properties = data?.properties || [];

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        p.name?.toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q);
      const matchesFilter =
        filterType === 'all' ||
        (p.type && p.type.toLowerCase() === filterType);
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filterType, properties]);

  const propertyTypes = useMemo(() => {
    const types = new Set(
      properties.map((p) => p.type?.toLowerCase()).filter(Boolean)
    );
    return ['all', ...Array.from(types)];
  }, [properties]);

  const resetFilters = () => {
    debouncedSearch.cancel();
    setSearchTerm('');
    setSearchInput('');
    setFilterType('all');
  };

  const hasFiltersApplied = searchTerm.trim() !== '' || filterType !== 'all';
  const isPropertiesEmpty = !isLoading && properties.length === 0;
  const isFilteredEmpty =
    !isLoading && filteredProperties.length === 0 && properties.length > 0;

  const emptyMessage = isFilteredEmpty
    ? 'No properties match your filters. Try resetting or adding a new property.'
    : 'No properties yet. Use “Add Property” to create one.';

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1200px', margin: '0 auto' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 4, flexWrap: 'wrap', gap: 2 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Properties
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenWizard(true)}
          sx={{ px: 3, py: 1, borderRadius: 2 }}
        >
          Add Property
        </Button>
      </Stack>

      <Card sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 1 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by name or address…"
              value={searchInput}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'grey.500' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 },
              }}
              inputProps={{ 'aria-label': 'Search properties by name or address' }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setSearchInput('');
                  setSearchTerm('');
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: 'primary.main' } } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {propertyTypes.map((type) => {
                const label =
                  type === 'all'
                    ? 'All Properties'
                    : type.charAt(0).toUpperCase() + type.slice(1);
                return (
                  <Chip
                    key={type}
                    label={label}
                    variant={filterType === type ? 'filled' : 'outlined'}
                    onClick={() => setFilterType(type)}
                    color={filterType === type ? 'primary' : 'default'}
                    sx={{ fontWeight: filterType === type ? 600 : 400 }}
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
        onAddProperty={() => setOpenWizard(true)}
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
