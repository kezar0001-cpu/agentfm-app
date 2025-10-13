import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Stack, Divider, Chip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import useApiQuery from '../hooks/useApiQuery';
import DataState from '../components/DataState';

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
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>{property.name}</Typography>
                  <Typography color="text.secondary">{property.address}, {property.city} {property.postcode}</Typography>
                  <Stack direction="row" spacing={1} sx={{ my: 2 }}>
                    <Chip label={property.type} />
                    <Chip label={property.status} color={property.status === 'Active' ? 'success' : 'default'} />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6">Units</Typography>
                  {property.units.length > 0 ? (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {property.units.map(unit => (
                        <Paper key={unit.id} variant="outlined" sx={{ p: 1.5 }}>
                          <Typography>{unit.unitCode}</Typography>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary" sx={{ mt: 1 }}>No units found for this property.</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              {/* Placeholder for future actions or summary cards */}
            </Grid>
          </Grid>
        )}
      </DataState>
    </Box>
  );
}