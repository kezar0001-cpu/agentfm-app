import { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    let interval;
    if (images.length > 1) {
      interval = setInterval(() => {
        setCurrentImage((prev) => (prev + 1) % images.length);
      }, 3000); // Slide every 3 seconds
    }
    return () => clearInterval(interval);
  }, [images.length]);

  const handleImageCycle = (e, direction) => {
    e.stopPropagation();
    const newIndex = (currentImage + direction + images.length) % images.length;
    setCurrentImage(newIndex);
  };

  const handleDotClick = (index) => {
    setCurrentImage(index);
  };

  const placeholderImage = `https://via.placeholder.com/300x140?text=${encodeURIComponent(property.name)}`;

  const resolveImageUrl = (value) => {
    if (!value) return placeholderImage;
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
      return value;
    }
    if (/^\d+x\d+\?text=/i.test(value)) {
      return `https://via.placeholder.com/${value}`;
    }
    const normalised = value.startsWith('/') ? value : `/${value}`;
    return `${API_BASE}${normalised}`;
  };

  const imageUrl = images.length > 0
    ? resolveImageUrl(images[currentImage])
    : placeholderImage;

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
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '8px 8px 0 0', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <CardMedia
          component="img"
          height="200"
          image={imageUrl}
          alt={`${property.name} image ${currentImage + 1}`}
          sx={{ objectFit: 'cover', width: '100%' }}
        />
        {images.length > 1 && (
          <>
            <IconButton
              onClick={(e) => handleImageCycle(e, -1)}
              size="small"
              sx={{
                position: 'absolute',
                top: '50%',
                left: 8,
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255,255,255,0.8)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                zIndex: 2,
              }}
            >
              <ArrowBackIos fontSize="small" />
            </IconButton>
            <IconButton
              onClick={(e) => handleImageCycle(e, 1)}
              size="small"
              sx={{
                position: 'absolute',
                top: '50%',
                right: 8,
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255,255,255,0.8)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                zIndex: 2,
              }}
            >
              <ArrowForwardIos fontSize="small" />
            </IconButton>
            <Box sx={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 0.5,
              zIndex: 2,
            }}>
              {images.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => handleDotClick(index)}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: index === currentImage ? 'primary.main' : 'grey.300',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s, transform 0.2s',
                    '&:hover': {
                      backgroundColor: index === currentImage ? 'primary.dark' : 'grey.400',
                      transform: 'scale(1.2)',
                    },
                  }}
                />
              ))}
            </Box>
          </>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{property.name}</Typography>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocationOn fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary">{property.address || 'No address'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Apartment fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary">{property.type || 'N/A'} • {property._count?.units || 0} units</Typography>
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
          sx={{ '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
        >
          View
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => onEdit(property.id)}
          fullWidth
          sx={{ '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
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
  const [filterType, setFilterType] = useState('all');

  const { data, isLoading, isError, error, refetch } = useApiQuery({ queryKey: ['properties'], url: '/api/properties' });
  const properties = data?.properties || [];

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

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1200px', margin: '0 auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>Properties</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/properties/add')}
          sx={{ px: 3, py: 1, borderRadius: 2, '&:hover': { backgroundColor: 'primary.dark' } }}
        >
          Add Property
        </Button>
      </Stack>
      <Card sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 1 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by name or address..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Search sx={{ color: 'grey.500' }} /></InputAdornment>),
                sx: { borderRadius: 2 },
              }}
              sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: 'primary.main' } } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {propertyTypes.map(type => (
                <Chip
                  key={type}
                  label={type === 'all' ? 'All Properties' : type.charAt(0).toUpperCase() + type.slice(1)}
                  variant={filterType === type ? 'filled' : 'outlined'}
                  onClick={() => setFilterType(type)}
                  color={filterType === type ? 'primary' : 'default'}
                  sx={{
                    fontWeight: filterType === type ? 600 : 400,
                    '&:hover': { backgroundColor: filterType === type ? 'primary.light' : 'grey.100' },
                  }}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Card>
      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch} isEmpty={!isLoading && properties.length === 0}>
        <Grid container spacing={4}>
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