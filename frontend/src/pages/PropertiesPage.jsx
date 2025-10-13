// frontend/src/pages/PropertiesPage.jsx
import { useState, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Stack, Chip, TextField, InputAdornment, CardMedia,
} from '@mui/material';
import { Add, Search, LocationOn, Apartment, Edit, Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useApiQuery from '../hooks/useApiQuery';
import DataState from '../components/DataState';
import { API_BASE } from '../lib/auth';

const PropertyCard = ({ property, onView, onEdit }) => {
  const getStatusColor = (status) => {
    return status === 'Active' ? 'success' : 'default';
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.3s', '&:hover': { boxShadow: 4 } }}>
      <CardMedia
        component="img"
        height="140"
        image={property.coverImage ? `${API_BASE}${property.coverImage}` : `https://via.placeholder.com/300x140?text=${property.name}`}
        alt={property.name}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h6" component="h3" gutterBottom>{property.name}</Typography>
          <Chip label={property.status} color={getStatusColor(property.status)} size="small" />
        </Stack>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">{property.address || 'No address'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Apartment fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {property.type || 'N/A'} • {property._count?.units || 0} units
            </Typography>
          </Box>
        </Stack>
      </CardContent>
      <Stack direction="row" spacing={1} sx={{ p: 2, pt: 0 }}>
        <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={() => onView(property.id)} fullWidth>View</Button>
        <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => onEdit(property.id)} fullWidth>Edit</Button>
      </Stack>
    </Card>
  );
};

export default function PropertiesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: ['properties'],
    url: '/api/properties',
  });

  const properties = data?.properties || [];

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    return properties.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, properties]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Properties</Typography>
          <Typography variant="body1" color="text.secondary">Manage your property portfolio</Typography>
        </div>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/properties/add')} size="large">
          Add Property
        </Button>
      </Stack>

      <Card sx={{ p: 2, mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search properties by name or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
        />
      </Card>

      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch} isEmpty={!isLoading && properties.length === 0}>
        <Grid container spacing={3}>
          {filteredProperties.map(property => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <PropertyCard
                property={property}
                onView={() => navigate(`/properties/${property.id}`)}
                onEdit={() => navigate(`/properties/${property.id}/edit`)}
              />
            </Grid>
          ))}
        </Grid>
      </DataState>
    </Box>
  );
}