
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  ToggleButtonGroup,
  ToggleButton,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  ViewModule as ViewModuleIcon,
  ViewKanban as ViewKanbanIcon,
  CalendarToday as CalendarTodayIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import JobForm from '../components/JobForm';
import ensureArray from '../utils/ensureArray';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import JobDetailModal from '../components/JobDetailModal';
import { CircularProgress } from '@mui/material';
import { queryKeys } from '../utils/queryKeys.js';

const localizer = momentLocalizer(moment);


const JobsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    propertyId: '',
    filter: '',
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [view, setView] = useState('card'); // 'card', 'kanban', 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Build query params
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.priority) queryParams.append('priority', filters.priority);
  if (filters.propertyId) queryParams.append('propertyId', filters.propertyId);
  if (filters.filter) queryParams.append('filter', filters.filter);

  // Fetch jobs with infinite query
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.jobs.filtered(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams(queryParams);
      params.append('limit', '50');
      params.append('offset', pageParam.toString());
      const response = await apiClient.get(`/jobs?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page * 50 : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const jobs = data?.pages?.flatMap(page => page.items) || [];

  // Fetch properties for filter
  const { data: propertiesData } = useQuery({
    queryKey: queryKeys.properties.selectOptions(),
    queryFn: async () => {
      const response = await apiClient.get('/properties?limit=100&offset=0');
      return response.data;
    },
  });

  const properties = propertiesData?.items || [];

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleViewChange = (event, nextView) => {
    if (nextView !== null) {
      setView(nextView);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleOpenDetailModal = (job) => {
    setSelectedJob(job);
    setDetailModalOpen(true);
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  useEffect(() => {
    if (location.state?.openCreateDialog) {
      setSelectedJob(null);
      setOpenDialog(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

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

  const onDragEnd = (result) => {
    // For now, we'll just log the result.
    // In a real app, you'd update the job status here.
    console.log(result);
  };

  const isOverdue = (job) => {
    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') return false;
    if (!job.scheduledDate) return false;
    return new Date(job.scheduledDate) < new Date();
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <DataState type="loading" message="Loading jobs..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <DataState
          type="error"
          message="Failed to load jobs"
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
          fullWidth
          sx={{ maxWidth: { xs: '100%', md: 'auto' } }}
        >
          Create Job
        </Button>
      </Stack>

      {/* Search and View Toggle */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <TextField
          variant="outlined"
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={handleSearchChange}
          size="small"
          InputProps={{
            startAdornment: (
              <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            ),
          }}
          sx={{ width: { xs: '100%', md: 320 } }}
        />
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={handleViewChange}
          aria-label="view toggle"
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="card" aria-label="card view">
            <ViewModuleIcon />
          </ToggleButton>
          <ToggleButton value="kanban" aria-label="kanban view">
            <ViewKanbanIcon />
          </ToggleButton>
          <ToggleButton value="calendar" aria-label="calendar view">
            <CalendarTodayIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

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

      {/* Jobs List / Views */}
      {!filteredJobs || filteredJobs.length === 0 ? (
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
        <>
          {view === 'card' && (
            <Stack spacing={3}>
              <Grid container spacing={{ xs: 2, md: 3 }}>
                {filteredJobs.map((job) => (
                  <Grid item xs={12} md={6} lg={4} key={job.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        borderLeft: isOverdue(job) ? '4px solid' : 'none',
                        borderLeftColor: 'error.main',
                        borderRadius: 3,
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4,
                        },
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
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="h6" gutterBottom>
                            {job.title}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
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
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            color="default"
                            onClick={() => handleOpenDetailModal(job)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(job)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Stack>
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
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
                      </Stack>
                    </CardContent>
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

          {view === 'kanban' && (
            <DragDropContext onDragEnd={onDragEnd}>
              <Grid container spacing={{ xs: 2, md: 3 }}>
                {['OPEN', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                  <Grid item xs={12} md={4} key={status}>
                    <Paper sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#f5f5f5' }}>
                      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                        {status.replace('_', ' ')}
                      </Typography>
                      <Droppable droppableId={status}>
                        {(provided) => (
                          <Box
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            sx={{ minHeight: '500px' }}
                          >
                            {filteredJobs
                              .filter((job) => job.status === status)
                              .map((job, index) => (
                                <Draggable
                                  key={job.id}
                                  draggableId={job.id.toString()}
                                  index={index}
                                >
                                  {(provided) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      sx={{ mb: 2 }}
                                    >
                                      <CardContent>
                                        <Typography variant="h6">{job.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          {job.property?.name}
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                          <Chip
                                            label={job.priority}
                                            color={getPriorityColor(job.priority)}
                                            size="small"
                                          />
                                        </Stack>
                                      </CardContent>
                                    </Card>
                                  )}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                          </Box>
                        )}
                      </Droppable>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </DragDropContext>
          )}

          {view === 'calendar' && (
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Calendar
                localizer={localizer}
                events={filteredJobs
                  .filter((job) => job.scheduledDate)
                  .map((job) => ({
                    id: job.id,
                    title: job.title,
                    start: new Date(job.scheduledDate),
                    end: new Date(job.scheduledDate),
                    allDay: true,
                    resource: job,
                  }))}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                onSelectEvent={(event) => handleOpenDetailModal(event.resource)}
              />
            </Paper>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      {openDialog && (
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
      )}

      {/* Job Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />
    </Container>
  );
};

export default JobsPage;
