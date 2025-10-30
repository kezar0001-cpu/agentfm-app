import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Stack,
  Dialog,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import InspectionForm from '../components/InspectionForm';
import { CircularProgress } from '@mui/material';

const InspectionsPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: '',
    propertyId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);

  // Build query params
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.propertyId) queryParams.append('propertyId', filters.propertyId);
  if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

  // Fetch inspections with infinite query
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['inspections', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams(queryParams);
      params.append('limit', '50');
      params.append('offset', pageParam.toString());
      const response = await apiClient.get(`/inspections?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page * 50 : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const inspections = data?.pages?.flatMap(page => page.items) || [];

  // Fetch properties for filter
  const { data: propertiesData } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const response = await apiClient.get('/properties?limit=100&offset=0');
      return response.data;
    },
  });

  const properties = propertiesData?.items || [];

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    setSelectedInspection(null);
    setOpenDialog(true);
  };

  const handleEdit = (inspection) => {
    setSelectedInspection(inspection);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedInspection(null);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseDialog();
  };

  const handleView = (id) => {
    navigate(`/inspections/${id}`);
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: 'default',
      IN_PROGRESS: 'info',
      COMPLETED: 'success',
      CANCELLED: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      SCHEDULED: <ScheduleIcon fontSize="small" />,
      IN_PROGRESS: <PlayArrowIcon fontSize="small" />,
      COMPLETED: <CheckCircleIcon fontSize="small" />,
    };
    return icons[status];
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <DataState type="loading" message="Loading inspections..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <DataState
          type="error"
          message="Failed to load inspections"
          onRetry={refetch}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 2, md: 0 }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Inspections
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule and manage property inspections
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          fullWidth
          sx={{ maxWidth: { xs: '100%', md: 'auto' } }}
        >
          Schedule Inspection
        </Button>
      </Stack>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Property"
                value={filters.propertyId}
                onChange={(e) => handleFilterChange('propertyId', e.target.value)}
                size="small"
              >
                <MenuItem value="">All Properties</MenuItem>
                {Array.isArray(properties) && properties.map((property) => (
                  <MenuItem key={property.id} value={property.id}>
                    {property.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="From Date"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="To Date"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Inspections List */}
      {!Array.isArray(inspections) || inspections.length === 0 ? (
        <DataState
          type="empty"
          message="No inspections found"
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
            >
              Schedule First Inspection
            </Button>
          }
        />
      ) : (
        <Stack spacing={3}>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {inspections.map((inspection) => (
            <Grid item xs={12} md={6} lg={4} key={inspection.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                  borderRadius: 3,
                }}
              >
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'flex-start' },
                      gap: { xs: 1, sm: 2 },
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {inspection.title}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(inspection.status)}
                        label={inspection.status.replace('_', ' ')}
                        color={getStatusColor(inspection.status)}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                    </Box>
                    <Chip
                      label={inspection.type}
                      size="small"
                      variant="outlined"
                      sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                    />
                  </Box>

                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Property
                      </Typography>
                      <Typography variant="body2">
                        {inspection.property?.name || 'N/A'}
                      </Typography>
                    </Box>

                    {inspection.unit && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Unit
                        </Typography>
                        <Typography variant="body2">
                          Unit {inspection.unit.unitNumber}
                        </Typography>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Scheduled Date
                      </Typography>
                      <Typography variant="body2">
                        {new Date(inspection.scheduledDate).toLocaleString()}
                      </Typography>
                    </Box>

                    {inspection.assignedTo && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Assigned To
                        </Typography>
                        <Typography variant="body2">
                          {inspection.assignedTo.firstName} {inspection.assignedTo.lastName}
                        </Typography>
                      </Box>
                    )}

                    {inspection.completedDate && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Completed Date
                        </Typography>
                        <Typography variant="body2">
                          {new Date(inspection.completedDate).toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>

                <Box
                  sx={{
                    p: 2,
                    pt: 0,
                    display: 'flex',
                    gap: 1,
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                  }}
                >
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleView(inspection.id)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  {inspection.status !== 'COMPLETED' && (
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEdit(inspection)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Card>
            </Grid>
            ))}
          </Grid>

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

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <InspectionForm
          inspection={selectedInspection}
          onSuccess={handleSuccess}
          onCancel={handleCloseDialog}
        />
      </Dialog>
    </Container>
  );
};

export default InspectionsPage;