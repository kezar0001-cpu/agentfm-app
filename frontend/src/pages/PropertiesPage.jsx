import { useState, useMemo } from 'react';
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
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add,
  Search,
  LocationOn,
  Apartment,
  SquareFoot,
  Edit,
  Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useApiQuery from '../hooks/useApiQuery';
import DataState from '../components/DataState';

const PropertyCard = ({ property, onView, onEdit }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Maintenance': return 'warning';
      case 'Inactive': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h6" component="h3" gutterBottom>
            {property.name}
          </Typography>
          <Chip
            label={property.status}
            color={getStatusColor(property.status)}
            size="small"
          />
        </Stack>
        
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {property.address || 'No address specified'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Apartment fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {property.type || 'N/A'} • {property._count?.units || 0} units
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Visibility />}
            onClick={() => onView(property.id)}
            fullWidth
          >
            View
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => onEdit(property.id)}
            fullWidth
          >
            Edit
          </Button>
        </Stack>
      </CardContent>
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
    return properties.filter(property =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, properties]);

  const handleAddProperty = () => navigate('/properties/add');
  const handleViewProperty = (id) => navigate(`/properties/${id}`);
  const handleEditProperty = (id) => navigate(`/properties/${id}/edit`);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Properties
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your property portfolio
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddProperty}
          size="large"
        >
          Add Property
        </Button>
      </Stack>

      <Card sx={{ p: 3, mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search properties by name or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Card>
      
      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch} isEmpty={properties.length === 0}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing {filteredProperties.length} of {properties.length} properties
        </Typography>
        
        <Grid container spacing={3}>
          {filteredProperties.map(property => (
            <Grid item xs={12} sm={6} lg={4} key={property.id}>
              <PropertyCard
                property={property}
                onView={handleViewProperty}
                onEdit={handleEditProperty}
              />
            </Grid>
          ))}
        </Grid>
      </DataState>
    </Box>
  );
}