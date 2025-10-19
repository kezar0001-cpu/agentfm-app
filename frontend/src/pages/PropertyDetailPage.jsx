import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Stack,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  SquareFoot as AreaIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import useApiQuery from '../hooks/useApiQuery';
import useApiMutation from '../hooks/useApiMutation';
import DataState from '../components/DataState';
import PropertyForm from '../components/PropertyForm';
import UnitForm from '../components/UnitForm';
import { normaliseArray } from '../utils/error';
import {
  formatPropertyAddressLine,
  formatPropertyLocality,
} from '../utils/formatPropertyLocation';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentTab, setCurrentTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitMenuAnchor, setUnitMenuAnchor] = useState(null);
  const [deleteUnitDialogOpen, setDeleteUnitDialogOpen] = useState(false);

  // Fetch property details
  const propertyQuery = useApiQuery({
    queryKey: ['property', id],
    url: `/api/properties/${id}`,
  });

  // Fetch units for this property
  const unitsQuery = useApiQuery({
    queryKey: ['units', id],
    url: `/api/units?propertyId=${id}`,
  });

  // Delete unit mutation
  const deleteUnitMutation = useApiMutation({
    method: 'delete',
    invalidateKeys: [['units', id], ['property', id]],
  });

  const property = propertyQuery.data?.property ?? null;
  const propertyStatus = property?.status ?? 'UNKNOWN';
  const propertyManager = property?.manager ?? null;
  const propertyManagerName = propertyManager
    ? [propertyManager.firstName, propertyManager.lastName].filter(Boolean).join(' ')
    : null;
  const units = normaliseArray(unitsQuery.data);

  const handleBack = () => {
    navigate('/properties');
  };

  const handleEditProperty = () => {
    setEditDialogOpen(true);
  };

  const handleAddUnit = () => {
    setSelectedUnit(null);
    setUnitDialogOpen(true);
  };

  const handleUnitMenuOpen = (event, unit) => {
    event.stopPropagation();
    setUnitMenuAnchor(event.currentTarget);
    setSelectedUnit(unit);
  };

  const handleUnitMenuClose = () => {
    setUnitMenuAnchor(null);
  };

  const handleEditUnit = () => {
    setUnitDialogOpen(true);
    handleUnitMenuClose();
  };

  const handleDeleteUnit = () => {
    setDeleteUnitDialogOpen(true);
    handleUnitMenuClose();
  };

  const confirmDeleteUnit = async () => {
    if (!selectedUnit) return;

    try {
      await deleteUnitMutation.mutateAsync({
        url: `/api/units/${selectedUnit.id}`,
      });
      setDeleteUnitDialogOpen(false);
      setSelectedUnit(null);
    } catch (error) {
      // Error shown via mutation
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: 'success',
      INACTIVE: 'default',
      UNDER_MAINTENANCE: 'warning',
      AVAILABLE: 'success',
      OCCUPIED: 'info',
      MAINTENANCE: 'warning',
      VACANT: 'default',
    };
    return colors[status] || 'default';
  };

  return (
    <Box sx={{ py: 3 }}>
      <DataState
        isLoading={propertyQuery.isLoading}
        isError={propertyQuery.isError}
        error={propertyQuery.error}
        onRetry={propertyQuery.refetch}
      >
        {property && (
          <Stack spacing={3}>
            {/* Header with Back Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={handleBack} size="large">
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {property.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <LocationIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {formatPropertyAddressLine(property)}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditProperty}
              >
                Edit Property
              </Button>
            </Box>

            {/* Property Image */}
            {property.imageUrl ? (
              <Box
                component="img"
                src={property.imageUrl}
                alt={property.name}
                sx={{
                  width: '100%',
                  height: 400,
                  objectFit: 'cover',
                  borderRadius: 2,
                }}
              />
            ) : (
              <Paper
                sx={{
                  height: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                }}
              >
                <HomeIcon sx={{ fontSize: 120, color: 'grey.400' }} />
              </Paper>
            )}

            {/* Quick Stats */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip
                      label={propertyStatus.replace('_', ' ')}
                      color={getStatusColor(propertyStatus)}
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Units
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {property.totalUnits || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Property Type
                    </Typography>
                    <Typography variant="h6">
                      {property.propertyType || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Year Built
                    </Typography>
                    <Typography variant="h6">
                      {property.yearBuilt || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabs */}
            <Paper>
              <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
                <Tab label="Overview" />
                <Tab label={`Units (${units.length})`} />
                <Tab label="Owners" />
                <Tab label="Activity" />
              </Tabs>
            </Paper>

            {/* Tab Content */}
            {currentTab === 0 && (
              <Paper sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Property Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Address
                        </Typography>
                        <Typography variant="body1">
                          {property.address}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Locality
                        </Typography>
                        <Typography variant="body1">
                          {formatPropertyLocality(property)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Country
                        </Typography>
                        <Typography variant="body1">{property.country}</Typography>
                      </Grid>
                      {property.totalArea && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Total Area
                          </Typography>
                          <Typography variant="body1">
                            {property.totalArea.toLocaleString()}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Description
                        </Typography>
                        <Typography variant="body1">
                          {property.description || 'No description provided'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Property Manager
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body1">
                      {propertyManagerName || 'No manager assigned'}
                    </Typography>
                    {propertyManager && (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {propertyManager.email}
                        </Typography>
                        {propertyManager.phone && (
                          <Typography variant="body2" color="text.secondary">
                            {propertyManager.phone}
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                </Stack>
              </Paper>
            )}

            {currentTab === 1 && (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Units
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddUnit}
                  >
                    Add Unit
                  </Button>
                </Box>

                {deleteUnitMutation.isError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {deleteUnitMutation.error?.message || 'Failed to delete unit'}
                  </Alert>
                )}

                <DataState
                  isLoading={unitsQuery.isLoading}
                  isError={unitsQuery.isError}
                  error={unitsQuery.error}
                  isEmpty={units.length === 0}
                  emptyMessage="No units yet. Add your first unit to get started!"
                  onRetry={unitsQuery.refetch}
                >
                  <Grid container spacing={2}>
                    {units.map((unit) => (
                      <Grid item xs={12} sm={6} md={4} key={unit.id}>
                        <Card>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Unit {unit.unitNumber}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={(e) => handleUnitMenuOpen(e, unit)}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </Box>

                            <Stack spacing={1}>
                              <Chip
                                label={unit.status}
                                color={getStatusColor(unit.status)}
                                size="small"
                              />

                              {unit.bedrooms && (
                                <Typography variant="body2" color="text.secondary">
                                  {unit.bedrooms} bed • {unit.bathrooms} bath
                                </Typography>
                              )}

                              {unit.area && (
                                <Typography variant="body2" color="text.secondary">
                                  {unit.area} sq ft
                                </Typography>
                              )}

                              {unit.rentAmount && (
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  ${unit.rentAmount.toLocaleString()}/mo
                                </Typography>
                              )}

                              {unit.tenants && unit.tenants.length > 0 && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Tenant:
                                  </Typography>
                                  <Typography variant="body2">
                                    {unit.tenants[0].tenant.firstName} {unit.tenants[0].tenant.lastName}
                                  </Typography>
                                </Box>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </DataState>
              </Paper>
            )}

            {currentTab === 2 && (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Property Owners
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    disabled
                  >
                    Add Owner
                  </Button>
                </Box>

                {property.owners && property.owners.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Ownership %</TableCell>
                        <TableCell>Since</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {property.owners.map((po) => (
                        <TableRow key={po.id}>
                          <TableCell>
                            {po.owner.firstName} {po.owner.lastName}
                          </TableCell>
                          <TableCell>{po.owner.email}</TableCell>
                          <TableCell>{po.ownershipPercentage}%</TableCell>
                          <TableCell>
                            {new Date(po.startDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography color="text.secondary">
                    No owners assigned yet
                  </Typography>
                )}
              </Paper>
            )}

            {currentTab === 3 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Recent Activity
                </Typography>
                <Typography color="text.secondary">
                  Activity log coming soon...
                </Typography>
              </Paper>
            )}
          </Stack>
        )}
      </DataState>

      {/* Unit Menu */}
      <Menu
        anchorEl={unitMenuAnchor}
        open={Boolean(unitMenuAnchor)}
        onClose={handleUnitMenuClose}
      >
        <MenuItem onClick={handleEditUnit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteUnit} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Edit Property Dialog */}
      <PropertyForm
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        property={property}
        onSuccess={() => {
          setEditDialogOpen(false);
          propertyQuery.refetch();
        }}
      />

      {/* Unit Form Dialog */}
      <UnitForm
        open={unitDialogOpen}
        onClose={() => {
          setUnitDialogOpen(false);
          setSelectedUnit(null);
        }}
        propertyId={id}
        unit={selectedUnit}
        onSuccess={() => {
          setUnitDialogOpen(false);
          setSelectedUnit(null);
          unitsQuery.refetch();
        }}
      />

      {/* Delete Unit Dialog */}
      <Dialog open={deleteUnitDialogOpen} onClose={() => setDeleteUnitDialogOpen(false)}>
        <DialogTitle>Delete Unit</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete Unit {selectedUnit?.unitNumber}?
            This action cannot be undone.
          </Typography>
          {selectedUnit?.tenants && selectedUnit.tenants.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This unit has active tenant(s). Please remove tenants before deleting.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUnitDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteUnit}
            color="error"
            variant="contained"
            disabled={deleteUnitMutation.isPending}
          >
            {deleteUnitMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
