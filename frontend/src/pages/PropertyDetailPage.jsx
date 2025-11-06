import { useState, useEffect, useCallback, useRef } from 'react';
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
  TableContainer,
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
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import useApiQuery from '../hooks/useApiQuery';
import useApiMutation from '../hooks/useApiMutation';
import DataState from '../components/DataState';
import { formatDate, formatDateTime } from '../utils/date';
import Breadcrumbs from '../components/Breadcrumbs';
import PropertyForm from '../components/PropertyForm';
import UnitForm from '../components/UnitForm';
import PropertyImageManager from '../components/PropertyImageManager';
import PropertyDocumentManager from '../components/PropertyDocumentManager';
import PropertyNotesSection from '../components/PropertyNotesSection';
import { normaliseArray } from '../utils/error';
import {
  formatPropertyAddressLine,
  formatPropertyLocality,
} from '../utils/formatPropertyLocation';
import { CircularProgress } from '@mui/material';
import { queryKeys } from '../utils/queryKeys.js';
import ensureArray from '../utils/ensureArray';
import { getCurrentUser } from '../lib/auth';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = getCurrentUser();

  const [currentTab, setCurrentTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitMenuAnchor, setUnitMenuAnchor] = useState(null);
  const [deleteUnitDialogOpen, setDeleteUnitDialogOpen] = useState(false);
  const unitDialogOpenRef = useRef(unitDialogOpen);
  const deleteUnitDialogOpenRef = useRef(deleteUnitDialogOpen);

  useEffect(() => {
    unitDialogOpenRef.current = unitDialogOpen;
  }, [unitDialogOpen]);

  useEffect(() => {
    deleteUnitDialogOpenRef.current = deleteUnitDialogOpen;
  }, [deleteUnitDialogOpen]);

  // Fetch property details
  const propertyQuery = useApiQuery({
    queryKey: queryKeys.properties.detail(id),
    url: `/properties/${id}`,
  });

  // Fetch units for this property with infinite query
  const unitsQuery = useInfiniteQuery({
    queryKey: queryKeys.properties.units(id),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await apiClient.get(`/units?propertyId=${id}&limit=50&offset=${pageParam}`);
      const data = response.data;

      if (Array.isArray(data)) {
        return {
          items: data,
          hasMore: false,
          nextOffset: undefined,
        };
      }

      if (Array.isArray(data?.items)) {
        return {
          ...data,
          items: data.items,
        };
      }

      if (Array.isArray(data?.data)) {
        return {
          ...data,
          items: data.data,
        };
      }

      return data;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage) {
        return undefined;
      }

      if (Array.isArray(lastPage)) {
        return undefined;
      }

      if (typeof lastPage.nextOffset === 'number') {
        return lastPage.nextOffset;
      }

      if (lastPage.hasMore) {
        if (typeof lastPage.offset === 'number') {
          return lastPage.offset + 50;
        }

        if (typeof lastPage.page === 'number') {
          return (lastPage.page + 1) * 50;
        }

        return 50;
      }

      return undefined;
    },
    initialPageParam: 0,
  });

  // Fetch activity for this property
  // Fix: Removed enabled condition to ensure activity loads on bookmarks and refreshes properly
  const activityQuery = useApiQuery({
    queryKey: queryKeys.properties.activity(id),
    url: `/properties/${id}/activity?limit=20`,
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

  // Check if current user can edit this property
  const canEdit = user?.role === 'PROPERTY_MANAGER' && property?.managerId === user?.id;

  const activities = ensureArray(activityQuery.data, ['activities', 'data.activities', 'items']);

  // Flatten all pages into a single array
  const units = unitsQuery.data?.pages?.flatMap((page) => {
    if (Array.isArray(page)) {
      return page;
    }

    if (Array.isArray(page?.items)) {
      return page.items;
    }

    if (Array.isArray(page?.data?.items)) {
      return page.data.items;
    }

    if (Array.isArray(page?.data)) {
      return page.data;
    }

    return [];
  }) || [];

  // Fix: Reset all state when property ID changes to prevent race conditions
  useEffect(() => {
    setCurrentTab(0);
    setEditDialogOpen(false);
    setUnitDialogOpen(false);
    setSelectedUnit(null);
    setUnitMenuAnchor(null);
    setDeleteUnitDialogOpen(false);
  }, [id]);

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
    // Clear selected unit after a short delay only if no dialogs are open
    setTimeout(() => {
      if (!unitDialogOpenRef.current && !deleteUnitDialogOpenRef.current) {
        setSelectedUnit(null);
      }
    }, 100);
  };

  const handleEditUnit = (unit = null) => {
    if (unit) {
      setSelectedUnit(unit);
    }
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
        url: `/units/${selectedUnit.id}`,
      });
      // Only close dialog and clear state on success
      setDeleteUnitDialogOpen(false);
      setSelectedUnit(null);
      // Manually refetch to ensure data consistency
      unitsQuery.refetch();
      propertyQuery.refetch();
    } catch (error) {
      // Keep dialog open on error so user can retry
      // Error message shown via mutation state
      console.error('Failed to delete unit:', error);
    }
  };

  // Memoize expensive functions to prevent unnecessary re-renders
  const getStatusColor = useCallback((status) => {
    const colors = {
      // Property statuses
      ACTIVE: 'success',
      INACTIVE: 'default',
      UNDER_MAINTENANCE: 'warning',
      UNDER_MAJOR_MAINTENANCE: 'error',
      // Unit statuses
      AVAILABLE: 'success',
      OCCUPIED: 'info',
      MAINTENANCE: 'warning',
      VACANT: 'default',
      // Job statuses
      OPEN: 'warning',
      ASSIGNED: 'info',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'error',
      // Inspection statuses
      SCHEDULED: 'info',
      // Service request statuses
      SUBMITTED: 'warning',
      UNDER_REVIEW: 'info',
      APPROVED: 'success',
      REJECTED: 'error',
      CONVERTED_TO_JOB: 'success',
    };
    return colors[status] || 'default';
  }, []);

  const getPriorityColor = useCallback((priority) => {
    const colors = {
      LOW: 'default',
      MEDIUM: 'info',
      HIGH: 'warning',
      URGENT: 'error',
    };
    return colors[priority] || 'default';
  }, []);

  const formatDate = useCallback((date) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return 'Invalid date';
      }
      return d.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }, []);

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <DataState
        isLoading={propertyQuery.isLoading}
        isError={propertyQuery.isError}
        error={propertyQuery.error}
        onRetry={propertyQuery.refetch}
      >
        {property && (
          <Stack spacing={3}>
            <Breadcrumbs
              labelOverrides={{
                [`/properties/${id}`]: property?.name || 'Property Details',
              }}
            />
            {/* Header with Back Button */}
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 2, md: 3 }}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
                <IconButton 
                  onClick={handleBack} 
                  size="large" 
                  sx={{ border: '1px solid', borderColor: 'divider' }}
                  aria-label="Go back to properties list"
                >
                  <ArrowBackIcon />
                </IconButton>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {property.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatPropertyAddressLine(property)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => navigate('/team')}
                  fullWidth
                  sx={{ maxWidth: { xs: '100%', md: 'auto' } }}
                  aria-label="Manage team members for this property"
                >
                  Manage Team
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditProperty}
                  fullWidth
                  sx={{ maxWidth: { xs: '100%', md: 'auto' } }}
                >
                  Edit Property
                </Button>
              </Stack>
            </Stack>

            {/* Property Image */}
            {property.imageUrl ? (
              <Box
                component="img"
                src={property.imageUrl}
                alt={property.name}
                sx={{
                  width: '100%',
                  height: { xs: 220, sm: 320, md: 420 },
                  objectFit: 'cover',
                  borderRadius: 3,
                }}
              />
            ) : (
              <Paper
                sx={{
                  height: { xs: 220, sm: 320, md: 420 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                  borderRadius: 3,
                  color: 'grey.400',
                }}
              >
                <HomeIcon sx={{ fontSize: { xs: 72, md: 120 } }} />
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
                      label={propertyStatus.replace(/_/g, ' ')}
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
              <Tabs
                value={currentTab}
                onChange={(e, v) => setCurrentTab(v)}
                variant="scrollable"
                allowScrollButtons="auto"
                scrollButtons
                sx={{ '& .MuiTab-root': { textTransform: 'none' } }}
              >
                <Tab label="Overview" />
                <Tab label={`Units (${units.length})`} />
                <Tab label="Owners" />
                <Tab label="Images" />
                <Tab label="Documents" />
                <Tab label="Notes" />
                <Tab label="Activity" />
              </Tabs>
            </Paper>

            {/* Tab Content */}
            {currentTab === 0 && (
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
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
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={{ xs: 2, md: 0 }}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  justifyContent="space-between"
                  sx={{ mb: 3 }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Units
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddUnit}
                    fullWidth
                    sx={{ maxWidth: { xs: '100%', md: 'auto' } }}
                  >
                    Add Unit
                  </Button>
                </Stack>

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
                  onRetry={() => unitsQuery.refetch()}
                >
                  <Stack spacing={3}>
                    <Grid container spacing={2.5}>
                      {units.map((unit) => (
                        <Grid item xs={12} sm={6} md={4} key={unit.id}>
                          <Card
                            sx={{
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              cursor: 'pointer',
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 4,
                              },
                              '&:focus': {
                                outline: '2px solid',
                                outlineColor: 'primary.main',
                                outlineOffset: '2px',
                              },
                            }}
                            onClick={() => navigate(`/units/${unit.id}`)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`/units/${unit.id}`);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`View details for unit ${unit.unitNumber}`}
                          >
                            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  Unit {unit.unitNumber}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnitMenuOpen(e, unit);
                                  }}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                              </Box>

                              <Stack spacing={1}>
                                <Chip
                                  label={unit.status?.replace(/_/g, ' ')}
                                  color={getStatusColor(unit.status)}
                                  size="small"
                                />

                                {unit.bedrooms != null && unit.bathrooms != null && (
                                  <Typography variant="body2" color="text.secondary">
                                    {unit.bedrooms} bed • {unit.bathrooms} bath
                                  </Typography>
                                )}

                                {unit.area != null && (
                                  <Typography variant="body2" color="text.secondary">
                                    {unit.area} sq ft
                                  </Typography>
                                )}

                                {unit.rentAmount != null && (
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    ${unit.rentAmount.toLocaleString()}/mo
                                  </Typography>
                                )}

                                {unit.tenants?.[0]?.tenant && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Tenant
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

                    {/* Load More Button */}
                    {unitsQuery.hasNextPage && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={() => unitsQuery.fetchNextPage()}
                          disabled={unitsQuery.isFetchingNextPage}
                          startIcon={unitsQuery.isFetchingNextPage ? <CircularProgress size={20} /> : null}
                        >
                          {unitsQuery.isFetchingNextPage ? 'Loading...' : 'Load More'}
                        </Button>
                      </Box>
                    )}
                  </Stack>
                </DataState>
              </Paper>
            )}

            {currentTab === 2 && (
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
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
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table sx={{ minWidth: { xs: 500, md: 'auto' } }}>
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
                              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                                {po.owner.firstName} {po.owner.lastName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                                {po.owner.email}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {po.ownershipPercentage}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                                {formatDate(po.startDate)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    No owners assigned yet
                  </Typography>
                )}
              </Paper>
            )}

            {/* Images Tab */}
            {currentTab === 3 && (
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Property Images
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <PropertyImageManager propertyId={id} canEdit={canEdit} />
              </Paper>
            )}

            {/* Documents Tab */}
            {currentTab === 4 && (
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Property Documents
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <PropertyDocumentManager propertyId={id} canEdit={canEdit} />
              </Paper>
            )}

            {/* Notes Tab */}
            {currentTab === 5 && (
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Property Notes
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <PropertyNotesSection propertyId={id} canEdit={canEdit} />
              </Paper>
            )}

            {/* Activity Tab */}
            {currentTab === 6 && (
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Recent Activity
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <DataState
                  isLoading={activityQuery.isLoading}
                  isError={activityQuery.isError}
                  error={activityQuery.error}
                  isEmpty={activities.length === 0}
                  emptyMessage="No recent activity for this property"
                  onRetry={activityQuery.refetch}
                >
                  <List>
                    {activities.map((activity, index) => (
                      <ListItem
                        key={`${activity.type}-${activity.id}-${activity.date}-${index}`}
                        divider={index < activities.length - 1}
                        sx={{ px: 0 }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {activity.title}
                              </Typography>
                              {activity.status && (
                                <Chip
                                  label={activity.status.replace(/_/g, ' ')}
                                  size="small"
                                  color={getStatusColor(activity.status)}
                                />
                              )}
                              {activity.priority && (
                                <Chip
                                  label={activity.priority}
                                  size="small"
                                  color={getPriorityColor(activity.priority)}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {activity.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(activity.date)} • {activity.type.replace(/_/g, ' ')}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </DataState>
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
          // Also refetch units in case totalUnits or other related data changed
          unitsQuery.refetch();
        }}
      />

      {/* Unit Form Dialog */}
      <UnitForm
        open={unitDialogOpen}
        onClose={() => {
          setUnitDialogOpen(false);
          // Delay clearing selectedUnit to prevent flash of wrong data during close animation
          setTimeout(() => setSelectedUnit(null), 200);
        }}
        propertyId={id}
        unit={selectedUnit}
        onSuccess={() => {
          setUnitDialogOpen(false);
          setTimeout(() => setSelectedUnit(null), 200);
          unitsQuery.refetch();
          // Also refetch property to update unit count
          propertyQuery.refetch();
        }}
      />

      {/* Delete Unit Dialog */}
      <Dialog
        open={deleteUnitDialogOpen}
        onClose={() => {
          setDeleteUnitDialogOpen(false);
          setTimeout(() => setSelectedUnit(null), 200);
        }}
      >
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
          <Button
            onClick={() => {
              setDeleteUnitDialogOpen(false);
              setTimeout(() => setSelectedUnit(null), 200);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteUnit}
            color="error"
            variant="contained"
            disabled={
              deleteUnitMutation.isPending || 
              (selectedUnit?.tenants && selectedUnit.tenants.length > 0)
            }
          >
            {deleteUnitMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
