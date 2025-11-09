import { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import DataState from '../components/DataState';
import EmptyState from '../components/EmptyState';
import PropertyForm from '../components/PropertyForm';
import PropertyOnboardingWizard from '../components/PropertyOnboardingWizard';
import PropertyOccupancyWidget from '../components/PropertyOccupancyWidget';
import PropertyImageCarousel from '../components/PropertyImageCarousel';
import { normaliseArray } from '../utils/error';
import { formatPropertyAddressLine } from '../utils/formatPropertyLocation';
import { queryKeys } from '../utils/queryKeys.js';

export default function PropertiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' | 'table'
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Debounce search term to avoid excessive API calls (Bug Fix #2)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!location.state?.openCreateDialog) {
      return;
    }

    setEditMode(false);
    setSelectedProperty(null);
    setDialogOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state?.openCreateDialog, location.pathname, navigate]);

  // Fetch properties with infinite query (Bug Fix #1: Server-side search and filter)
  const PROPERTIES_PAGE_SIZE = 50;
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.properties.list({ search: debouncedSearchTerm, status: filterStatus }),
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        limit: PROPERTIES_PAGE_SIZE.toString(),
        offset: pageParam.toString(),
      });

      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }

      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await apiClient.get(`/properties?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Calculate actual offset based on items fetched (Bug Fix: Accurate pagination)
      const totalFetched = allPages.reduce((sum, page) => sum + (page.items?.length || 0), 0);
      return lastPage.hasMore ? totalFetched : undefined;
    },
    initialPageParam: 0,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (propertyId) => {
      const response = await apiClient.delete(`/properties/${propertyId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
    },
  });

  // Flatten all pages into a single array
  // Note: Filtering now happens server-side via API parameters (Bug Fix #1)
  const properties = data?.pages?.flatMap(page => page.items) || [];

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

  const handleViewModeChange = (_event, nextView) => {
    if (nextView !== null) {
      setViewMode(nextView);
    }
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
      await deleteMutation.mutateAsync(selectedProperty.id);
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

  const getPropertyImages = (property) => {
    if (!property) return [];
    if (Array.isArray(property.images) && property.images.length > 0) {
      return property.images;
    }
    if (property.imageUrl) {
      return [property.imageUrl];
    }
    return [];
  };

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2, md: 0 }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          sx={{ animation: 'fade-in-down 0.5s ease-out' }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}
            >
              Properties
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
              Manage your property portfolio
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              size="large"
              fullWidth
              sx={{
                maxWidth: { xs: '100%', md: 'none' },
                background: 'linear-gradient(135deg, #f97316 0%, #b91c1c 100%)',
                boxShadow: '0 4px 14px 0 rgb(185 28 28 / 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
                  boxShadow: '0 6px 20px 0 rgb(185 28 28 / 0.4)',
                },
              }}
            >
              Add Property
            </Button>
          </Box>
        </Stack>

        {/* Search and Filter */}
        <Paper
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            animation: 'fade-in-up 0.6s ease-out',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="properties-search-term"
                name="searchTerm"
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
              <FormControl fullWidth>
                <InputLabel id="properties-filter-status-label">Status</InputLabel>
                <Select
                  labelId="properties-filter-status-label"
                  id="properties-filter-status"
                  name="filterStatus"
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="UNDER_MAINTENANCE">Under Maintenance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              item
              xs={12}
              md={2}
              sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}
            >
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                aria-label="View mode toggle"
                size="small"
                sx={{
                  display: 'inline-flex',
                  backgroundColor: 'background.paper',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: 'divider',
                  '& .MuiToggleButtonGroup-grouped': {
                    minWidth: 0,
                    px: 1,
                    py: 0.5,
                    border: 'none',
                  },
                  '& .MuiToggleButton-root': {
                    borderRadius: '8px !important',
                    color: 'text.secondary',
                  },
                  '& .Mui-selected': {
                    color: 'primary.main',
                    backgroundColor: 'action.selected',
                  },
                }}
              >
                <ToggleButton value="grid" aria-label="grid view">
                  <ViewModuleIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="list" aria-label="list view">
                  <ViewListIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="table" aria-label="table view">
                  <TableChartIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
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
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={false}
        >
          {properties.length === 0 ? (
            <EmptyState
              icon={HomeIcon}
              title={debouncedSearchTerm || filterStatus !== 'all' ? 'No properties match your filters' : 'No properties yet'}
              description={
                debouncedSearchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                  : 'Get started by adding your first property. You can manage units, track maintenance, and monitor inspections all in one place.'
              }
              actionLabel={debouncedSearchTerm || filterStatus !== 'all' ? undefined : 'Add First Property'}
              onAction={debouncedSearchTerm || filterStatus !== 'all' ? undefined : handleCreate}
            />
          ) : (
            <Stack spacing={3} sx={{ animation: 'fade-in 0.7s ease-out' }}>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <Grid container spacing={3}>
                  {properties.map((property) => {
                    const propertyImages = getPropertyImages(property);
                    const hasMultipleImages = propertyImages.length > 1;

                    return (
                      <Grid item xs={12} sm={6} md={4} key={property.id}>
                        <Card
                          sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            cursor: 'pointer',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                            overflow: 'hidden',
                            position: 'relative',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '4px',
                              background: 'linear-gradient(135deg, #f97316 0%, #b91c1c 100%)',
                              opacity: 0,
                              transition: 'opacity 0.3s ease-in-out',
                            },
                            '&:hover::before': {
                              opacity: 1,
                            },
                          }}
                          onClick={() => handleCardClick(property.id)}
                        >
                          <PropertyImageCarousel
                            images={propertyImages}
                            fallbackText={property.name}
                            height={{ xs: 180, sm: 200 }}
                            showDots={hasMultipleImages}
                            showArrows={hasMultipleImages}
                            showCounter={hasMultipleImages}
                            containerSx={{
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                            }}
                          />

                          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: 1,
                                flexWrap: 'wrap',
                              }}
                            >
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
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ flexGrow: 1, minWidth: 0 }}
                              >
                                {formatPropertyAddressLine(property)}
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
                                label={`${property.totalUnits ?? 0} units`}
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
                          </CardContent>

                          <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                            <Stack spacing={0.5} sx={{ width: '100%' }}>
                              <Typography variant="caption" color="text.secondary">
                                Type: {property.propertyType || 'N/A'}
                              </Typography>
                              {property._count && (
                                <Typography variant="caption" color="text.secondary">
                                  {property._count.jobs ?? 0} active jobs • {property._count.inspections ?? 0} inspections
                                </Typography>
                              )}
                            </Stack>
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
              </Grid>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <Stack spacing={2}>
                  {properties.map((property) => {
                    const propertyImages = getPropertyImages(property);
                    const hasMultipleImages = propertyImages.length > 1;

                    return (
                      <Card
                        key={property.id}
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', md: 'row' },
                          cursor: 'pointer',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          overflow: 'hidden',
                          '&:hover': {
                            boxShadow: 3,
                          },
                        }}
                        onClick={() => handleCardClick(property.id)}
                      >
                        {/* Property Image */}
                        <Box
                          sx={{
                            width: { xs: '100%', md: 250 },
                            height: { xs: 180, md: 'auto' },
                            minHeight: { md: 200 },
                            flexShrink: 0,
                          }}
                        >
                          <PropertyImageCarousel
                            images={propertyImages}
                            fallbackText={property.name}
                            height={{ xs: 180, md: '100%' }}
                            showDots={hasMultipleImages}
                            showArrows={hasMultipleImages}
                            showCounter={hasMultipleImages}
                            containerSx={{
                              width: '100%',
                              height: '100%',
                              borderRight: { md: '1px solid' },
                              borderBottom: { xs: '1px solid', md: 'none' },
                              borderColor: 'divider',
                            }}
                          />
                        </Box>

                        {/* Property Content */}
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            flexGrow: 1,
                            p: 2,
                          }}
                        >
                          {/* Header */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              mb: 1.5,
                            }}
                          >
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {property.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <LocationIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {formatPropertyAddressLine(property)}
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, property)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Box>

                          {/* Description */}
                          {property.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 2,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {property.description}
                            </Typography>
                          )}

                          {/* Chips and Stats */}
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                            <Chip
                              size="small"
                              label={property.status?.replace('_', ' ') || ''}
                              color={getStatusColor(property.status || '')}
                            />
                            <Chip
                              size="small"
                              icon={<ApartmentIcon />}
                              label={`${property.totalUnits ?? 0} units`}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={property.propertyType || 'N/A'}
                              variant="outlined"
                            />
                          </Box>

                          {/* Footer Stats */}
                          {property._count && (
                            <Typography variant="caption" color="text.secondary">
                              {property._count.jobs ?? 0} active jobs • {property._count.inspections ?? 0} inspections
                            </Typography>
                          )}
                        </Box>

                        {/* Occupancy Widget (List View Only) */}
                        <Box
                          sx={{
                            display: { xs: 'none', lg: 'flex' },
                            alignItems: 'center',
                            p: 2,
                            borderLeft: '1px solid',
                            borderColor: 'divider',
                            minWidth: 200,
                          }}
                        >
                          <PropertyOccupancyWidget
                            occupancyStats={property.occupancyStats}
                            totalUnits={property.totalUnits}
                            compact={true}
                          />
                        </Box>
                      </Card>
                    );
                  })}
                </Stack>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small" aria-label="properties table view">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Property</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Units
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Jobs
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Inspections
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {properties.map((property) => {
                        const totalUnits = property.totalUnits ?? property._count?.units ?? 0;
                        const jobsCount = property._count?.jobs ?? 0;
                        const inspectionsCount = property._count?.inspections ?? 0;

                        return (
                          <TableRow
                            key={property.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => handleCardClick(property.id)}
                          >
                            <TableCell>
                              <Stack spacing={0.5}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {property.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {property.propertyType || '—'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {formatPropertyAddressLine(property) || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>
                                {totalUnits}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{jobsCount}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{inspectionsCount}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={property.status?.replace('_', ' ') || 'Unknown'}
                                color={getStatusColor(property.status || '')}
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </TableCell>
                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, property)}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Load More Button */}
              {hasNextPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    startIcon={isFetchingNextPage ? <CircularProgress size={20} /> : null}
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
                </Box>
              )}
            </Stack>
          )}
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

      {/* Property Onboarding Wizard */}
      <PropertyOnboardingWizard
        open={dialogOpen && !editMode}
        onClose={() => {
          setDialogOpen(false);
          setSelectedProperty(null);
          setEditMode(false);
        }}
      />

      {/* Property Form Dialog */}
      <PropertyForm
        open={dialogOpen && editMode}
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