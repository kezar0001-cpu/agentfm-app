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
  InputAdornment
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

// Mock data - replace with actual API data later
const mockProperties = [
  {
    id: 1,
    name: 'Downtown Office Tower',
    address: '123 Main St, Sydney NSW 2000',
    type: 'Commercial',
    units: 24,
    area: '15,000 sq ft',
    status: 'active',
    lastInspection: '2024-01-15',
    image: '/api/placeholder/300/200'
  },
  {
    id: 2,
    name: 'Harbour View Apartments',
    address: '456 Harbour Dr, Sydney NSW 2000',
    type: 'Residential',
    units: 48,
    area: '25,000 sq ft',
    status: 'active',
    lastInspection: '2024-01-10',
    image: '/api/placeholder/300/200'
  },
  {
    id: 3,
    name: 'Westfield Retail Space',
    address: '789 Shopping St, Parramatta NSW 2150',
    type: 'Retail',
    units: 12,
    area: '8,000 sq ft',
    status: 'maintenance',
    lastInspection: '2023-12-20',
    image: '/api/placeholder/300/200'
  },
  {
    id: 4,
    name: 'North Sydney Warehouse',
    address: '321 Industrial Rd, North Sydney NSW 2060',
    type: 'Industrial',
    units: 1,
    area: '50,000 sq ft',
    status: 'inactive',
    lastInspection: '2023-11-05',
    image: '/api/placeholder/300/200'
  }
];

const PropertyCard = ({ property, onView, onEdit }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'maintenance': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'maintenance': return 'Needs Maintenance';
      case 'inactive': return 'Inactive';
      default: return status;
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
      <Box
        sx={{
          height: 140,
          backgroundColor: '#e0e0e0',
          backgroundImage: `url(${property.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        }}
      >
        <Chip
          label={getStatusText(property.status)}
          color={getStatusColor(property.status)}
          size="small"
          sx={{ position: 'absolute', top: 8, right: 8 }}
        />
      </Box>
      
      <CardContent>
        <Typography variant="h6" component="h3" gutterBottom>
          {property.name}
        </Typography>
        
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {property.address}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Apartment fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {property.type} • {property.units} {property.units === 1 ? 'Unit' : 'Units'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SquareFoot fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {property.area}
            </Typography>
          </Box>
        </Stack>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Last inspected: {new Date(property.lastInspection).toLocaleDateString()}
        </Typography>

        <Stack direction="row" spacing={1}>
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
  const [filterType, setFilterType] = useState('all');

  const filteredProperties = useMemo(() => {
    return mockProperties.filter(property => {
      const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          property.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || property.type.toLowerCase() === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filterType]);

  const handleAddProperty = () => {
    navigate('/api/properties/add');
  };

  const handleViewProperty = (propertyId) => {
    navigate(`/api/properties/${propertyId}`);
  };

  const handleEditProperty = (propertyId) => {
    navigate(`/api/properties/${propertyId}/edit`);
  };

  const propertyTypes = ['all', ...new Set(mockProperties.map(p => p.type.toLowerCase()))];

  return (
    <Box>
      {/* Header Section */}
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

      {/* Search and Filter Section */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
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
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No properties found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first property'
            }
          </Typography>
          {(searchTerm || filterType !== 'all') ? (
            <Button onClick={() => { setSearchTerm(''); setFilterType('all'); }}>
              Clear Filters
            </Button>
          ) : (
            <Button variant="contained" startIcon={<Add />} onClick={handleAddProperty}>
              Add Your First Property
            </Button>
          )}
        </Card>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {filteredProperties.length} of {mockProperties.length} properties
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
        </>
      )}
    </Box>
  );
}