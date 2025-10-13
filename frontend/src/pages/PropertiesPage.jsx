// frontend/src/pages/PropertiesPage.jsx
import { useState, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Stack, Chip, TextField, InputAdornment, CardMedia, IconButton,
} from '@mui/material';
import { Add, Search, LocationOn, Apartment, Edit, Visibility, ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useApiQuery from '../hooks/useApiQuery';
import DataState from '../components/DataState';

const PropertyCard = ({ property, onView, onEdit }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const images = property.images || [];

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev + 1) % images.length);
  };
  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const imageUrl = images.length > 0 
    ? images[currentImage] 
    : `https://via.placeholder.com/300x140?text=${encodeURIComponent(property.name)}`;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ position: 'relative' }}>
        <CardMedia component="img" height="140" image={imageUrl} alt={property.name} />
        {images.length > 1 && (
          <>
            <IconButton onClick={handlePrevImage} size="small" sx={{ position: 'absolute', top: '50%', left: 4, transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.5)' }}><ArrowBackIos fontSize="small" /></IconButton>
            <IconButton onClick={handleNextImage} size="small" sx={{ position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.5)' }}><ArrowForwardIos fontSize="small" /></IconButton>
          </>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6">{property.name}</Typography>
        <Stack spacing={1} sx={{ my: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">{property.address || 'No address'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Apartment fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">{property.type} • {property._count?.units || 0} units</Typography>
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
  const { data, isLoading, isError, error, refetch } = useApiQuery({ queryKey: ['properties'], url: '/api/properties' });
  const properties = data?.properties || [];

  const filteredProperties = useMemo(() => properties.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [searchTerm, properties]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Properties</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/properties/add')}>Add Property</Button>
      </Stack>
      <Card sx={{ p: 2, mb: 4 }}>
        <TextField fullWidth placeholder="Search properties..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}/>
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