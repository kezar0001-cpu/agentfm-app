// frontend/src/pages/PropertyDetailPage.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Stack, Divider, Chip, Grid, CardMedia, Paper } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import useApiQuery from '../hooks/useApiQuery';
import DataState from '../components/DataState';
import { API_BASE } from '../lib/auth';

const buildImageUrl = (value, fallbackText, size = '600x320') => {
  const placeholder = `https://via.placeholder.com/${size}?text=${encodeURIComponent(fallbackText || 'Property')}`;
  if (!value) return placeholder;
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }
  if (/^\d+x\d+\?text=/i.test(value)) {
    return `https://via.placeholder.com/${value}`;
  }
  const normalised = value.startsWith('/') ? value : `/${value}`;
  return `${API_BASE}${normalised}`;
};

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: ['property', id],
    url: `/api/properties/${id}`,
  });

  const property = data?.property;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Property Details
        </Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/properties')}>
          Back to Properties
        </Button>
      </Stack>

      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        {property && (
          <Card>
            {(property.coverImage || property.images?.length) && (
              <CardMedia
                component="img"
                height="300"
                image={buildImageUrl(property.coverImage || property.images?.[0], property.name, '800x360')}
                alt={property.name}
              />
            )}
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="h5" gutterBottom>{property.name}</Typography>
                  <Typography color="text.secondary">{property.address}, {property.city} {property.postcode}</Typography>
                  <Stack direction="row" spacing={1} sx={{ my: 2 }}>
                    <Chip label={property.type} />
                    <Chip label={property.status} color={property.status === 'Active' ? 'success' : 'default'} />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6">Units</Typography>
                  {property.units?.length > 0 ? (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {property.units.map(unit => (
                        <Paper key={unit.id} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                          <Typography>Unit Code: <strong>{unit.unitCode}</strong></Typography>
                          <Chip label={unit.status} size="small" color={unit.status === 'Vacant' ? 'warning' : 'info'}/>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary" sx={{ mt: 1 }}>No units have been added to this property yet.</Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button fullWidth variant="contained">Add Unit</Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </DataState>
    </Box>
  );
}