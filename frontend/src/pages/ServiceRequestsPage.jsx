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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import ServiceRequestForm from '../components/ServiceRequestForm';

const ServiceRequestsPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    propertyId: '',
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(null);
  const [convertDialog, setConvertDialog] = useState(null);

  // Get user role (you'd get this from auth context)
  const userRole = 'PROPERTY_MANAGER'; // This should come from your auth context

  // Build query params
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.category) queryParams.append('category', filters.category);
  if (filters.propertyId) queryParams.append('propertyId', filters.propertyId);

  // Fetch service requests
  const {
    data: requests,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['service-requests', filters],
    queryFn: async () => {
      const response = await apiClient.get(`/service-requests?${queryParams.toString()}`);
      return response.data;
    },
  });

  // Fetch properties for filter
  const { data: properties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const response = await apiClient.get('/properties');
      return response.data;
    },
  });

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseDialog();
  };

  const handleReview = (request) => {
    setReviewDialog(request);
  };

  const handleConvert = (request) => {
    setConvertDialog(request);
  };

  const getCategoryColor = (category) => {
    const colors = {
      PLUMBING: 'info',
      ELECTRICAL: 'warning',
      HVAC: 'primary',
      APPLIANCE: 'secondary',
      STRUCTURAL: 'error',
      PEST_CONTROL: 'default',
      LANDSCAPING: 'success',
      GENERAL: 'default',
      OTHER: 'default',
    };
    return colors[category] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      SUBMITTED: 'warning',
      UNDER_REVIEW: 'info',
      APPROVED: 'success',
      CONVERTED_TO_JOB: 'primary',
      REJECTED: 'error',
      COMPLETED: 'success',
    };
    return colors[status] || 'default';
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <DataState type="loading" message="Loading service requests..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <DataState
          type="error"
          message="Failed to load service requests"
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
            Service Requests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userRole === 'TENANT'
              ? 'Submit and track your maintenance requests'
              : 'Review and manage tenant service requests'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          {userRole === 'TENANT' ? 'Submit Request' : 'Create Request'}
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                id="service-request-filter-status"
                name="status"
                select
                fullWidth
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="SUBMITTED">Submitted</MenuItem>
                <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="CONVERTED_TO_JOB">Converted to Job</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                id="service-request-filter-category"
                name="category"
                select
                fullWidth
                label="Category"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="PLUMBING">Plumbing</MenuItem>
                <MenuItem value="ELECTRICAL">Electrical</MenuItem>
                <MenuItem value="HVAC">HVAC</MenuItem>
                <MenuItem value="APPLIANCE">Appliance</MenuItem>
                <MenuItem value="STRUCTURAL">Structural</MenuItem>
                <MenuItem value="PEST_CONTROL">Pest Control</MenuItem>
                <MenuItem value="LANDSCAPING">Landscaping</MenuItem>
                <MenuItem value="GENERAL">General</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </TextField>
            </Grid>
            {userRole !== 'TENANT' && (
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  id="service-request-filter-property"
                  name="propertyId"
                  select
                  fullWidth
                  label="Property"
                  value={filters.propertyId}
                  onChange={(e) => handleFilterChange('propertyId', e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Properties</MenuItem>
                  {properties?.map((property) => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Service Requests List */}
      {!requests || requests.length === 0 ? (
        <DataState
          type="empty"
          message="No service requests found"
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
            >
              {userRole === 'TENANT' ? 'Submit First Request' : 'Create Request'}
            </Button>
          }
        />
      ) : (
        <Grid container spacing={3}>
          {requests.map((request) => (
            <Grid item xs={12} md={6} lg={4} key={request.id}>
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
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      {request.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <Chip
                        label={request.status.replace('_', ' ')}
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                      <Chip
                        label={request.category.replace('_', ' ')}
                        color={getCategoryColor(request.category)}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={request.priority}
                        size="small"
                      />
                    </Stack>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {request.description.length > 100
                      ? `${request.description.substring(0, 100)}...`
                      : request.description}
                  </Typography>

                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Property
                      </Typography>
                      <Typography variant="body2">
                        {request.property?.name || 'N/A'}
                      </Typography>
                    </Box>

                    {request.unit && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Unit
                        </Typography>
                        <Typography variant="body2">
                          Unit {request.unit.unitNumber}
                        </Typography>
                      </Box>
                    )}

                    {userRole !== 'TENANT' && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Submitted By
                        </Typography>
                        <Typography variant="body2">
                          {request.requestedBy?.firstName} {request.requestedBy?.lastName}
                        </Typography>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Submitted
                      </Typography>
                      <Typography variant="body2">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>

                    {request.jobs && request.jobs.length > 0 && (
                      <Box>
                        <Chip
                          icon={<BuildIcon fontSize="small" />}
                          label={`${request.jobs.length} Job(s) Created`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    )}
                  </Stack>
                </CardContent>

                {userRole !== 'TENANT' && request.status === 'SUBMITTED' && (
                  <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={() => handleReview(request)}
                    >
                      Review
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      startIcon={<BuildIcon />}
                      onClick={() => handleConvert(request)}
                    >
                      Convert to Job
                    </Button>
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <ServiceRequestForm
          onSuccess={handleSuccess}
          onCancel={handleCloseDialog}
        />
      </Dialog>

      {/* Review Dialog */}
      {reviewDialog && (
        <ReviewDialog
          request={reviewDialog}
          onClose={() => setReviewDialog(null)}
          onSuccess={() => {
            refetch();
            setReviewDialog(null);
          }}
        />
      )}

      {/* Convert to Job Dialog */}
      {convertDialog && (
        <ConvertToJobDialog
          request={convertDialog}
          onClose={() => setConvertDialog(null)}
          onSuccess={() => {
            refetch();
            setConvertDialog(null);
          }}
        />
      )}
    </Container>
  );
};

// Review Dialog Component
const ReviewDialog = ({ request, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    status: 'UNDER_REVIEW',
    reviewNotes: '',
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.patch(`/service-requests/${request.id}`, data);
      return response.data;
    },
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Review Service Request</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              id="review-status"
              name="status"
              select
              fullWidth
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </TextField>
            <TextField
              id="review-notes"
              name="reviewNotes"
              fullWidth
              label="Review Notes"
              value={formData.reviewNotes}
              onChange={(e) => setFormData({ ...formData, reviewNotes: e.target.value })}
              multiline
              rows={4}
              placeholder="Add notes about your review decision..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
            Submit Review
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// Convert to Job Dialog
const ConvertToJobDialog = ({ request, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    assignedToId: '',
    scheduledDate: '',
    estimatedCost: '',
  });

  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await apiClient.get('/users?role=TECHNICIAN');
      return response.data;
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/service-requests/${request.id}/convert-to-job`, data);
      return response.data;
    },
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
      scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : undefined,
    };
    convertMutation.mutate(payload);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Convert to Job</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              This will create a new job and update the service request status.
            </Alert>
            <TextField
              id="convert-technician"
              name="assignedToId"
              select
              fullWidth
              label="Assign to Technician (Optional)"
              value={formData.assignedToId}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {technicians?.map((tech) => (
                <MenuItem key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="convert-scheduled-date"
              name="scheduledDate"
              fullWidth
              label="Scheduled Date (Optional)"
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              id="convert-estimated-cost"
              name="estimatedCost"
              fullWidth
              label="Estimated Cost (Optional)"
              type="number"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              InputProps={{ startAdornment: '$' }}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={convertMutation.isPending}
            startIcon={<BuildIcon />}
          >
            Create Job
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ServiceRequestsPage;
