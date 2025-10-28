import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  TextField,
  Alert,
  Divider,
  Grid,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: 'Start Job', color: 'warning' },
  { value: 'COMPLETED', label: 'Mark Complete', color: 'success' },
];

export default function TechnicianJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [notes, setNotes] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  // Fetch job details
  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs/${id}`);
      return response.data;
    },
  });

  // Update job mutation
  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const response = await apiClient.patch(`/jobs/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job', id]);
      queryClient.invalidateQueries(['technician-jobs']);
      setUpdateSuccess('Job updated successfully');
      setUpdateError('');
      setTimeout(() => setUpdateSuccess(''), 3000);
    },
    onError: (error) => {
      setUpdateError(error.response?.data?.message || 'Failed to update job');
      setUpdateSuccess('');
    },
  });

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ status: newStatus });
  };

  const handleAddNotes = () => {
    if (!notes.trim()) return;
    
    const existingNotes = job?.notes || '';
    const timestamp = format(new Date(), 'MMM dd, yyyy HH:mm');
    const newNotes = existingNotes 
      ? `${existingNotes}\n\n[${timestamp}]\n${notes}`
      : `[${timestamp}]\n${notes}`;
    
    updateMutation.mutate({ notes: newNotes });
    setNotes('');
  };

  const handleUpdateCost = () => {
    const cost = parseFloat(actualCost);
    if (isNaN(cost) || cost < 0) {
      setUpdateError('Please enter a valid cost');
      return;
    }
    
    updateMutation.mutate({ actualCost: cost });
    setActualCost('');
  };

  const canUpdateStatus = (status) => {
    if (job?.status === 'ASSIGNED' && status === 'IN_PROGRESS') return true;
    if (job?.status === 'IN_PROGRESS' && status === 'COMPLETED') return true;
    return false;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/technician/dashboard')}
        sx={{ mb: 3 }}
      >
        Back to Jobs
      </Button>

      <DataState data={job} isLoading={isLoading} error={error}>
        {job && (
          <Grid container spacing={3}>
            {/* Main Content */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <Chip label={job.status} color="primary" />
                    <Chip label={job.priority} color="warning" />
                  </Stack>

                  <Typography variant="h4" gutterBottom>
                    {job.title}
                  </Typography>

                  <Typography variant="body1" color="text.secondary" paragraph>
                    {job.description}
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  {/* Property Info */}
                  {job.property && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Property Information
                      </Typography>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {job.property.name}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {job.property.address}, {job.property.city}, {job.property.state}
                        </Typography>
                      </Stack>
                    </Box>
                  )}

                  {/* Unit Info */}
                  {job.unit && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Unit
                      </Typography>
                      <Typography variant="body2">
                        Unit {job.unit.unitNumber}
                      </Typography>
                    </Box>
                  )}

                  {/* Schedule */}
                  {job.scheduledDate && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Scheduled Date
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {format(new Date(job.scheduledDate), 'MMMM dd, yyyy')}
                        </Typography>
                      </Stack>
                    </Box>
                  )}

                  {/* Cost Info */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Cost Information
                    </Typography>
                    <Grid container spacing={2}>
                      {job.estimatedCost && (
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Estimated Cost
                          </Typography>
                          <Typography variant="h6">
                            ${job.estimatedCost.toFixed(2)}
                          </Typography>
                        </Grid>
                      )}
                      {job.actualCost && (
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Actual Cost
                          </Typography>
                          <Typography variant="h6">
                            ${job.actualCost.toFixed(2)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>

                  {/* Existing Notes */}
                  {job.notes && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Notes
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ whiteSpace: 'pre-wrap' }}
                        >
                          {job.notes}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Actions Sidebar */}
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                {/* Status Updates */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Update Status
                    </Typography>
                    
                    {updateSuccess && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        {updateSuccess}
                      </Alert>
                    )}
                    
                    {updateError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {updateError}
                      </Alert>
                    )}

                    <Stack spacing={2}>
                      {STATUS_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          variant="contained"
                          color={option.color}
                          fullWidth
                          disabled={!canUpdateStatus(option.value) || updateMutation.isPending}
                          onClick={() => handleStatusChange(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Add Notes */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Add Notes
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Enter notes about the job..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={!notes.trim() || updateMutation.isPending}
                      onClick={handleAddNotes}
                    >
                      Add Notes
                    </Button>
                  </CardContent>
                </Card>

                {/* Update Actual Cost */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Update Actual Cost
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      placeholder="Enter actual cost"
                      value={actualCost}
                      onChange={(e) => setActualCost(e.target.value)}
                      InputProps={{
                        startAdornment: <MoneyIcon sx={{ mr: 1, color: 'action.active' }} />,
                      }}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={!actualCost || updateMutation.isPending}
                      onClick={handleUpdateCost}
                    >
                      Update Cost
                    </Button>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        )}
      </DataState>
    </Container>
  );
}
