// frontend/src/pages/PropertiesPage.jsx
import { useState, useMemo, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
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

const typeIcons = {
  residential: { icon: Apartment, color: 'primary.main' },
  commercial: { icon: Business, color: 'secondary.main' },
  industrial: { icon: Factory, color: 'warning.main' },
  retail: { icon: Storefront, color: 'success.main' },
  hospitality: { icon: Hotel, color: 'info.main' },
  office: { icon: Domain, color: 'secondary.main' },
};

const formatTypeName = type => {
  if (!type) return 'N/A';
  return type
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const PropertyCard = ({ property, onView, onEdit }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const images = (property.images && Array.isArray(property.images) && property.images.length > 0) ? property.images : [];

  const typeKey = property.type?.toLowerCase().trim();
  const { icon: TypeIcon = Apartment, color: typeColor = 'primary.main' } =
    (typeKey && typeIcons[typeKey]) || {};
  const formattedType = formatTypeName(property.type);

  const handleEditClick = () => {
    setIsConfirmOpen(true);
  };

  const handleCloseDialog = () => {
    setIsConfirmOpen(false);
  };

  const handleConfirmEdit = () => {
    setIsConfirmOpen(false);
    onEdit(property.id);
  };

  return (
    <>
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
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{property.name}</Typography>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocationOn fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">{property.address || 'No address'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TypeIcon fontSize="small" sx={{ color: typeColor }} />
              <Typography variant="body2" color="text.secondary">{formattedType} • {property._count?.units || 0} units</Typography>
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
            sx={{
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
              '&:focus-visible': {
                outline: theme => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            }}
            aria-label={`View property ${property.name}`}
          >
            View
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEditClick}
            fullWidth
            sx={{
              '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
              '&:focus-visible': {
                outline: theme => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            }}
            aria-label={`Edit property ${property.name}`}
          >
            Edit
          </Button>
        </Stack>
      </Card>
      <Dialog
        open={isConfirmOpen}
        onClose={handleCloseDialog}
        aria-labelledby="edit-confirmation-title"
      >
        <DialogTitle id="edit-confirmation-title">Confirm Edit</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to edit this property?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmEdit} variant="contained" autoFocus>
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

  const debouncedSearch = useMemo(
    () => debounce(value => setSearchTerm(value), 300),
    [setSearchTerm]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchChange = event => {
    const { value } = event.target;
    setSearchInput(value);
    debouncedSearch(value);
  };

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

  const resetFilters = () => {
    debouncedSearch.cancel();
    setSearchTerm('');
    setSearchInput('');
    setFilterType('all');
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
              value={searchInput}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Search sx={{ color: 'grey.500' }} /></InputAdornment>),
                sx: { borderRadius: 2 },
              }}
              inputProps={{ 'aria-label': 'Search properties by name or address' }}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setSearchInput('');
                  setSearchTerm('');
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: 'primary.main' } } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {propertyTypes.map(type => {
                const chipLabel = type === 'all' ? 'All Properties' : type.charAt(0).toUpperCase() + type.slice(1);
                const chipFilterTarget = type === 'all' ? 'all properties' : type;

                return (
                  <Chip
                    key={type}
                    label={chipLabel}
                    variant={filterType === type ? 'filled' : 'outlined'}
                    onClick={() => setFilterType(type)}
                    color={filterType === type ? 'primary' : 'default'}
                    sx={{
                      fontWeight: filterType === type ? 600 : 400,
                      '&:hover': { backgroundColor: filterType === type ? 'primary.light' : 'grey.100' },
                      '&.Mui-focusVisible': {
                        outline: theme => `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2,
                      },
                    }}
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
        onAddProperty={() => navigate('/properties/add')}
        showResetButton={hasFiltersApplied}
      >
        <Grid container spacing={4}>
          {filteredProperties.map(property => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <PropertyCard
                property={property}
                onView={id => navigate(`/properties/${id}`)}
                onEdit={id => navigate(`/properties/${id}/edit`)}
              />
            </Grid>
          ))}
        </Grid>
      </DataState>
    </Box>
  );
}
