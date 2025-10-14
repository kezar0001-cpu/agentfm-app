// frontend/src/components/PropertyWizard.jsx
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
    name: '', address: '', city: '', postcode: '', country: '', type: '', status: 'Active',
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
              {coverFile ? 'Cover image selected' : 'No cover image'} · {galleryFiles.length ? `${galleryFiles.length} additional image${galleryFiles.length > 1 ? 's' : ''}` : 'No additional images'}
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
