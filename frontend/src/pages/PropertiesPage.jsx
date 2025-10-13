import { useState, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Stack, Chip, TextField, InputAdornment, CardMedia, IconButton,
} from '@mui/material';
import { Add, Search, LocationOn, Apartment, Edit, Visibility, ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useApiQuery from '../hooks/useApiQuery';
import DataState from '../components/DataState';
import { API_BASE } from '../lib/auth';

const PropertyCard = ({ property, onView, onEdit }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const images = (property.images && Array.isArray(property.images) && property.images.length > 0) ? property.images : [];

  const handleImageCycle = (e, direction) => {
    e.stopPropagation();
    const newIndex = (currentImage + direction + images.length) % images.length;
    setCurrentImage(newIndex);
  };

  const imageUrl = images.length > 0
    ? `${API_BASE}${images[currentImage]}`
    : `https://via.placeholder.com/300x140?text=${encodeURIComponent(property.name)}`;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ position: 'relative' }}>
        <CardMedia component="img" height="140" image={imageUrl} alt={property.name} />
        {images.length > 1 && (
          <>
            <IconButton onClick={(e) => handleImageCycle(e, -1)} size="small" sx={{ position: 'absolute', top: '50%', left: 4, transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.7)' }}><ArrowBackIos fontSize="small" /></IconButton>
            <IconButton onClick={(e) => handleImageCycle(e, 1)} size="small" sx={{ position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.7)' }}><ArrowForwardIos fontSize="small" /></IconButton>
          </>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6">{property.name}</Typography>
        <Stack spacing={1} sx={{ my: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LocationOn fontSize="small" /><Typography variant="body2" color="text.secondary">{property.address || 'No address'}</Typography></Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Apartment fontSize="small" /><Typography variant="body2" color="text.secondary">{property.type} • {property._count?.units || 0} units</Typography></Box>
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
  const [filterType, setFilterType] = useState('all'); // 👈 MINIMAL CHANGE: Re-added filter state

  const { data, isLoading, isError, error, refetch } = useApiQuery({ queryKey: ['properties'], url: '/api/properties' });
  const properties = data?.properties || [];

  // 👇 MINIMAL CHANGE START: Updated memo to include type filtering
  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    return properties.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.address || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'all' || (p.type && p.type.toLowerCase() === filterType);
        return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filterType, properties]);
  
  const propertyTypes = useMemo(() => {
    if (!properties) return ['all'];
    const types = new Set(properties.map(p => p.type?.toLowerCase()).filter(Boolean));
    return ['all', ...Array.from(types)];
  }, [properties]);
  // 👆 MINIMAL CHANGE END

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Properties</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/properties/add')}>Add Property</Button>
      </Stack>
      <Card sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
                <TextField fullWidth placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}/>
            </Grid>
            {/* 👇 MINIMAL CHANGE START: Re-added the filter chips UI */}
            <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {propertyTypes.map(type => (
                    <Chip
                    key={type}
                    label={type === 'all' ? 'All Properties' : type.charAt(0).toUpperCase() + type.slice(1)}
                    variant={filterType === type ? 'filled' : 'outlined'}
                    onClick={() => setFilterType(type)}
                    color={filterType === type ? 'primary' : 'default'}
                    />
                ))}
                </Stack>
            </Grid>
            {/* 👆 MINIMAL CHANGE END */}
        </Grid>
      </Card>
      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch} isEmpty={!isLoading && properties.length === 0}>
        <Grid container spacing={3}>
          {filteredProperties.map(property => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <PropertyCard property={property} onView={() => navigate(`/properties/${property.id}`)} onEdit={() => navigate(`/properties/${property.id}/edit`)} />
            </Grid>
          ))}
        </Grid>
      </DataState>
    </Box>
  );
}