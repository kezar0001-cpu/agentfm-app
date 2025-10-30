import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  MoreVert as MoreVertIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import { format } from 'date-fns';
import ensureArray from '../utils/ensureArray';

const STATUS_COLORS = {
  OPEN: 'default',
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const PRIORITY_COLORS = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  // Fetch jobs assigned to technician
  const { data: jobs, isLoading, error, refetch } = useQuery({
    queryKey: ['technician-jobs'],
    queryFn: async () => {
      const response = await apiClient.get('/jobs');
      return ensureArray(response.data, ['items', 'data.items', 'jobs']);
    },
  });

  const handleMenuOpen = (event, job) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedJob(job);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedJob(null);
  };

  const handleViewDetails = () => {
    if (selectedJob) {
      navigate(`/technician/jobs/${selectedJob.id}`);
    }
    handleMenuClose();
  };

  const handleStartJob = async () => {
    if (!selectedJob) return;
    
    try {
      await apiClient.patch(`/jobs/${selectedJob.id}`, {
        status: 'IN_PROGRESS',
      });
      refetch();
      handleMenuClose();
    } catch (error) {
      console.error('Error starting job:', error);
    }
  };

  const handleCompleteJob = async () => {
    if (!selectedJob) return;
    
    try {
      await apiClient.patch(`/jobs/${selectedJob.id}`, {
        status: 'COMPLETED',
      });
      refetch();
      handleMenuClose();
    } catch (error) {
      console.error('Error completing job:', error);
    }
  };

  const getJobsByStatus = (status) => {
    return jobs?.filter(job => job.status === status) || [];
  };

  const openJobs = getJobsByStatus('OPEN');
  const inProgressJobs = getJobsByStatus('IN_PROGRESS');
  const completedJobs = getJobsByStatus('COMPLETED');

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Jobs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your assigned jobs
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <ScheduleIcon color="info" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{openJobs.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open Jobs
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <BuildIcon color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{inProgressJobs.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{completedJobs.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Jobs List */}
      <DataState
        data={jobs}
        isLoading={isLoading}
        error={error}
        emptyMessage="No jobs assigned to you yet"
      >
        <Grid container spacing={3}>
          {jobs?.map((job) => (
            <Grid item xs={12} md={6} key={job.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                  transition: 'box-shadow 0.3s',
                }}
                onClick={() => navigate(`/technician/jobs/${job.id}`)}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {job.title}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Chip 
                          label={job.status} 
                          color={STATUS_COLORS[job.status]} 
                          size="small" 
                        />
                        <Chip 
                          label={job.priority} 
                          color={PRIORITY_COLORS[job.priority]} 
                          size="small" 
                        />
                      </Stack>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {job.description}
                      </Typography>

                      {job.property && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {job.property.name}
                          </Typography>
                        </Stack>
                      )}

                      {job.scheduledDate && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {format(new Date(job.scheduledDate), 'MMM dd, yyyy')}
                          </Typography>
                        </Stack>
                      )}
                    </Box>

                    <IconButton
                      onClick={(e) => handleMenuOpen(e, job)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Stack>
                </CardContent>

                <CardActions>
                  {job.status === 'ASSIGNED' && (
                    <Button 
                      size="small" 
                      variant="contained"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        handleStartJob();
                      }}
                    >
                      Start Job
                    </Button>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        handleCompleteJob();
                      }}
                    >
                      Mark Complete
                    </Button>
                  )}
                  <Button 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/technician/jobs/${job.id}`);
                    }}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DataState>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>View Details</MenuItem>
        {selectedJob?.status === 'ASSIGNED' && (
          <MenuItem onClick={handleStartJob}>Start Job</MenuItem>
        )}
        {selectedJob?.status === 'IN_PROGRESS' && (
          <MenuItem onClick={handleCompleteJob}>Mark Complete</MenuItem>
        )}
      </Menu>
    </Container>
  );
}
