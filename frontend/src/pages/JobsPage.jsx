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
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import JobForm from '../components/JobForm';
import ensureArray from '../utils/ensureArray';

const JobsPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    propertyId: '',
    filter: '',
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Build query params
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.priority) queryParams.append('priority', filters.priority);
  if (filters.propertyId) queryParams.append('propertyId', filters.propertyId);
  if (filters.filter) queryParams.append('filter', filters.filter);

  // Fetch jobs
  const {
    data: jobs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs?${queryParams.toString()}`);
      return ensureArray(response.data, ['jobs', 'data', 'items', 'results']);
    },
  });

  // Fetch properties for filter
  const { data: properties = [] } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const response = await apiClient.get('/properties');
      return ensureArray(response.data, ['properties', 'data', 'items', 'results']);
    },
  });

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    setSelectedJob(null);
    setOpenDialog(true);
  };

  const handleEdit = (job) => {
    setSelectedJob(job);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedJob(null);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseDialog();
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'default',
      MEDIUM: 'info',
      HIGH: 'warning',
      URGENT: 'error',
    };
    return colors[priority] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      OPEN: 'default',
      ASSIGNED: 'info',
      IN_PROGRESS: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'error',
    };
    return colors[status] || 'default';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      LOW: null,
      MEDIUM: <AccessTimeIcon fontSize="small" />,
      HIGH: <WarningIcon fontSize="small" />,
      URGENT: <ErrorIcon fontSize="small" />,
    };
    return icons[priority];
  };

  const isOverdue = (job) => {
    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') return false;
    if (!job.scheduledDate) return false;
    return new Date(job.scheduledDate) < new Date();
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <DataState type="loading" message="Loading jobs..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <DataState
          type="error"
          message="Failed to load jobs"
          onRetry={refetch}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Jobs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track maintenance jobs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Create Job
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                id="jobs-filter-status"
                name="status"
                inputProps={{ id: 'jobs-filter-status', name: 'status' }}
                InputLabelProps={{ htmlFor: 'jobs-filter-status' }}
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="ASSIGNED">Assigned</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                id="jobs-filter-priority"
                name="priority"
                inputProps={{ id: 'jobs-filter-priority', name: 'priority' }}
                InputLabelProps={{ htmlFor: 'jobs-filter-priority' }}
                label="Priority"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                id="jobs-filter-property"
                name="propertyId"
                inputProps={{ id: 'jobs-filter-property', name: 'propertyId' }}
                InputLabelProps={{ htmlFor: 'jobs-filter-property' }}
                label="Property"
                value={filters.propertyId}
                onChange={(e) => handleFilterChange('propertyId', e.target.value)}
                size="small"
              >
                <MenuItem value="">All Properties</MenuItem>
                {properties.map((property) => (
                  <MenuItem key={property.id} value={property.id}>
                    {property.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                id="jobs-filter-quick"
                name="filter"
                inputProps={{ id: 'jobs-filter-quick', name: 'filter' }}
                InputLabelProps={{ htmlFor: 'jobs-filter-quick' }}
                label="Quick Filter"
                value={filters.filter}
                onChange={(e) => handleFilterChange('filter', e.target.value)}
                size="small"
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="unassigned">Unassigned</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {!jobs || jobs.length === 0 ? (
        <DataState
          type="empty"
          message="No jobs found"
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
            >
              Create First Job
            </Button>
          }
        />
      ) : (
        <Grid container spacing={3}>
          {jobs.map((job) => (
            <Grid item xs={12} md={6} lg={4} key={job.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  borderLeft: isOverdue(job) ? '4px solid' : 'none',
                  borderLeftColor: 'error.main',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {job.title}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          label={job.status.replace('_', ' ')}
                          color={getStatusColor(job.status)}
                          size="small"
                        />
                        <Chip
                          icon={getPriorityIcon(job.priority)}
                          label={job.priority}
                          color={getPriorityColor(job.priority)}
                          size="small"
                        />
                      </Stack>
                      {isOverdue(job) && (
                        <Chip
                          icon={<ErrorIcon fontSize="small" />}
                          label="OVERDUE"
                          color="error"
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(job)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                    noWrap
                  >
                    {job.description}
                  </Typography>

                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Property
                      </Typography>
                      <Typography variant="body2">
                        {job.property?.name || 'N/A'}
                      </Typography>
                    </Box>

                    {job.unit && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Unit
                        </Typography>
                        <Typography variant="body2">
                          Unit {job.unit.unitNumber}
                        </Typography>
                      </Box>
                    )}

                    {job.assignedTo ? (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Assigned To
                        </Typography>
                        <Typography variant="body2">
                          {job.assignedTo.firstName} {job.assignedTo.lastName}
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Chip
                          label="Unassigned"
                          size="small"
                          variant="outlined"
                          color="warning"
                        />
                      </Box>
                    )}

                    {job.scheduledDate && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Scheduled Date
                        </Typography>
                        <Typography variant="body2">
                          {new Date(job.scheduledDate).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}

                    {job.estimatedCost && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Estimated Cost
                        </Typography>
                        <Typography variant="body2">
                          ${job.estimatedCost.toFixed(2)}
                        </Typography>
                      </Box>
                    )}

                    {job.serviceRequest && (
                      <Box>
                        <Chip
                          label="From Service Request"
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <JobForm
          job={selectedJob}
          onSuccess={handleSuccess}
          onCancel={handleCloseDialog}
        />
      </Dialog>
    </Container>
  );
};

export default JobsPage;
