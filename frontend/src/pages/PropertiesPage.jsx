import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Home as HomeIcon,
  LocationOn as LocationIcon,
  Apartment as ApartmentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery';
import useApiMutation from '../hooks/useApiMutation';
import DataState from '../components/DataState';
import PropertyForm from '../components/PropertyForm';
import { normaliseArray } from '../utils/error';

export default function PropertiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Fetch properties
  const query = useApiQuery({
    queryKey: ['properties'],
    url: '/api/properties',
  });

  // Delete mutation
  const deleteMutation = useApiMutation({
    method: 'delete',
    invalidateKeys: [['properties']],
  });

  const properties = normaliseArray(query.data);

  // Filter properties
  const filteredProperties = properties.filter((property) => {
  const matchesSearch =
    (property.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (property.address || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (property.city || '').toLowerCase().includes((searchTerm || '').toLowerCase());

  const matchesStatus =
    filterStatus === 'all' || (property.status || '') === filterStatus;

  return matchesSearch && matchesStatus;
});

  const handleMenuOpen = (event, property) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedProperty(property);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCreate = () => {
    setEditMode(false);
    setSelectedProperty(null);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleEdit = () => {
    setEditMode(true);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!selectedProperty) return;

    try {
      await deleteMutation.mutateAsync({
        url: `/api/properties/${selectedProperty.id}`,
      });
      setDeleteDialogOpen(false);
      setSelectedProperty(null);
    } catch (error) {
      // Error is shown via mutation.error
    }
  };

  const handleCardClick = (propertyId) => {
    navigate(`/properties/${propertyId}`);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setSelectedProperty(null);
    setEditMode(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: 'success',
      INACTIVE: 'default',
      UNDER_MAINTENANCE: 'warning',
    };
    return colors[status] || 'default';
  };

  return (
    <Box sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Properties
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your property portfolio
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            size="large"
          >
            Add Property
          </Button>
        </Box>

        {/* Search and Filter */}
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                id="properties-search"
                name="search"
                placeholder="Search properties by name, address, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                id="properties-filter-status"
                name="filterStatus"
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
                <MenuItem value="UNDER_MAINTENANCE">Under Maintenance</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Error Alert */}
        {deleteMutation.isError && (
          <Alert severity="error" onClose={() => deleteMutation.reset()}>
            {deleteMutation.error?.message || 'Failed to delete property'}
          </Alert>
        )}

        {/* Properties Grid */}
        <DataState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={filteredProperties.length === 0}
          emptyMessage={searchTerm || filterStatus !== 'all' 
            ? 'No properties match your filters' 
            : 'No properties yet. Add your first property to get started!'}
          onRetry={query.refetch}
        >
          <Grid container spacing={3}>
            {filteredProperties.map((property) => (
              <Grid item xs={12} sm={6} md={4} key={property.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => handleCardClick(property.id)}
                >
                  {property.imageUrl ? (
                    <Box
                      component="img"
                      src={property.imageUrl}
                      alt={property.name}
                      sx={{
                        height: 200,
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 200,
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HomeIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                    </Box>
                  )}

                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {property.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, property)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {property.address}, {property.city}, {property.state}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={property.status?.replace('_', ' ') || ''}
                          color={getStatusColor(property.status || '')}
                        />
                        <Chip
                          size="small"
                          icon={<ApartmentIcon />}
                          label={`${property.totalUnits} units`}
                          variant="outlined"
                        />
                      </Box>

                      {property.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {property.description}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Stack spacing={0.5} sx={{ width: '100%' }}>
                      <Typography variant="caption" color="text.secondary">
                        Type: {property.propertyType}
                      </Typography>
                      {property._count && (
                        <Typography variant="caption" color="text.secondary">
                          {property._count.jobs} active jobs • {property._count.inspections} inspections
                        </Typography>
                      )}
                    </Stack>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DataState>
      </Stack>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Property Form Dialog */}
      <PropertyForm
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedProperty(null);
          setEditMode(false);
        }}
        property={editMode ? selectedProperty : null}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Property</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedProperty?.name}</strong>?
            This action cannot be undone.
          </Typography>
          {selectedProperty?.totalUnits > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This property has {selectedProperty.totalUnits} unit(s). Make sure to remove all units and tenants before deleting.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
