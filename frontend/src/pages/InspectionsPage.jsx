import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  BarChart as BarChartIcon,
  CalendarToday as CalendarTodayIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import InspectionForm from '../components/InspectionForm';
import InspectionCalendarBoard from '../components/InspectionCalendarBoard';
import InspectionAnalytics from '../components/InspectionAnalytics';
import useOfflineCache from '../hooks/useOfflineCache';
import ensureArray from '../utils/ensureArray';
import { useCurrentUser } from '../context/UserContext.jsx';

const VIEW_TABS = [
  { value: 'list', label: 'List', icon: <ViewListIcon fontSize="small" /> },
  { value: 'calendar', label: 'Calendar', icon: <CalendarTodayIcon fontSize="small" /> },
  { value: 'analytics', label: 'Analytics', icon: <BarChartIcon fontSize="small" /> },
];

const SORT_FIELD_MAP = {
  title: 'title',
  scheduledDate: 'scheduledDate',
  status: 'status',
  createdAt: 'createdAt',
};

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function buildQueryParams(filters, pagination, sort) {
  return {
    page: pagination.page + 1,
    pageSize: pagination.pageSize,
    sortBy: SORT_FIELD_MAP[sort.field] || 'scheduledDate',
    sortOrder: sort.direction,
    search: filters.search || undefined,
    propertyId: filters.propertyId || undefined,
    unitId: filters.unitId || undefined,
    inspectorId: filters.inspectorId || undefined,
    status: filters.status.length ? filters.status.join(',') : undefined,
    tags: filters.tags.length ? filters.tags.join(',') : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };
}

function getStartOfWeek(date = new Date()) {
  const day = new Date(date);
  const diff = day.getDay() === 0 ? -6 : 1 - day.getDay();
  day.setDate(day.getDate() + diff);
  day.setHours(0, 0, 0, 0);
  return day;
}

const InspectionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const { user } = useCurrentUser();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [view, setView] = useState('list');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: [],
    propertyId: '',
    unitId: '',
    inspectorId: '',
    dateFrom: '',
    dateTo: '',
    tags: [],
  });
  const [pagination, setPagination] = useState({ page: 0, pageSize: 12 });
  const [sort, setSort] = useState({ field: 'scheduledDate', direction: 'asc' });
  const [calendarStart, setCalendarStart] = useState(() => getStartOfWeek());

  const params = useMemo(() => buildQueryParams(filters, pagination, sort), [filters, pagination, sort]);

  const {
    data: inspectionsResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inspections', params],
    queryFn: async () => {
      const response = await apiClient.get('/inspections', { params });
      return response.data;
    },
    keepPreviousData: true,
  });

  const offline = useOfflineCache('inspections:list', inspectionsResponse, { enabled: !isFetching });

  const inspections = inspectionsResponse?.data?.items || offline.cached?.data?.items || [];
  const paginationInfo = inspectionsResponse?.data?.pagination || offline.cached?.data?.pagination || {
    page: pagination.page + 1,
    pageSize: pagination.pageSize,
    total: inspections.length,
    totalPages: 1,
  };
  const summary = inspectionsResponse?.summary || offline.cached?.summary || {};

  const { data: properties = [] } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const response = await apiClient.get('/properties');
      return ensureArray(response.data, ['properties', 'data', 'items', 'results']);
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', filters.propertyId],
    queryFn: async () => {
      if (!filters.propertyId) return [];
      const response = await apiClient.get('/units', { params: { propertyId: filters.propertyId } });
      return ensureArray(response.data, ['units', 'data', 'items', 'results']);
    },
    enabled: Boolean(filters.propertyId),
  });

  const { data: inspectorsData = { inspectors: [] } } = useQuery({
    queryKey: ['inspections', 'inspectors'],
    queryFn: async () => {
      const response = await apiClient.get('/inspections/inspectors');
      return response.data;
    },
  });

  const { data: tagData = { tags: [] } } = useQuery({
    queryKey: ['inspections', 'tags'],
    queryFn: async () => {
      const response = await apiClient.get('/inspections/tags');
      return response.data;
    },
  });

  const calendarParams = useMemo(() => {
    const end = new Date(calendarStart);
    end.setDate(calendarStart.getDate() + 6);
    return {
      ...params,
      start: calendarStart.toISOString(),
      end: end.toISOString(),
    };
  }, [calendarStart, params]);

  const {
    data: calendarData,
    isFetching: calendarLoading,
  } = useQuery({
    queryKey: ['inspections', 'calendar', calendarParams],
    queryFn: async () => {
      const response = await apiClient.get('/inspections/calendar', { params: calendarParams });
      return response.data;
    },
    enabled: view === 'calendar',
  });

  const { data: analyticsData, isFetching: analyticsLoading } = useQuery({
    queryKey: ['inspections', 'analytics', params],
    queryFn: async () => {
      const response = await apiClient.get('/inspections/analytics', { params });
      return response.data;
    },
    enabled: view === 'analytics',
  });

  useEffect(() => {
    if (location.state?.openCreateDialog) {
      setSelectedInspection(null);
      setOpenDialog(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'propertyId' ? { unitId: '' } : {}),
    }));
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  const handleSort = (field) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const handlePageChange = (_event, newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (event) => {
    const newSize = parseInt(event.target.value, 10);
    setPagination({ page: 0, pageSize: newSize });
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
    queryClient.invalidateQueries(['inspections']);
    handleCloseDialog();
  };

  const handleView = (id) => {
    navigate(`/inspections/${id}`);
  };

  const handleCalendarRangeChange = (offset) => {
    const next = new Date(calendarStart);
    next.setDate(calendarStart.getDate() + offset);
    setCalendarStart(getStartOfWeek(next));
  };

  const handleReschedule = async (inspectionId, date) => {
    try {
      const iso = new Date(date);
      iso.setHours(10, 0, 0, 0);
      await apiClient.patch(`/inspections/${inspectionId}/schedule`, {
        scheduledDate: iso.toISOString(),
      });
      queryClient.invalidateQueries(['inspections']);
      queryClient.invalidateQueries(['inspections', 'calendar']);
    } catch (err) {
      console.error('Failed to reschedule inspection', err);
    }
  };

  const visibleInspections = useMemo(() => inspections, [inspections]);

  const renderTable = () => {
    if (!visibleInspections.length) {
      return (
        <DataState
          type="empty"
          message="No inspections found"
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
              Schedule first inspection
            </Button>
          }
        />
      );
    }

    if (isMobile) {
      return (
        <Stack spacing={2}>
          {visibleInspections.map((inspection) => (
            <Card key={inspection.id} variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="h6">{inspection.title}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip size="small" label={inspection.status?.replace('_', ' ') || 'Scheduled'} />
                      {inspection.type && <Chip size="small" label={inspection.type} variant="outlined" />}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Scheduled
                    </Typography>
                    <Typography variant="body2">
                      {inspection.scheduledDate ? new Date(inspection.scheduledDate).toLocaleString() : 'TBD'}
                    </Typography>
                  </Box>
                  {inspection.property && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Property
                      </Typography>
                      <Typography variant="body2">{inspection.property?.name}</Typography>
                    </Box>
                  )}
                  {inspection.assignedTo && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Inspector
                      </Typography>
                      <Typography variant="body2">
                        {inspection.assignedTo.firstName} {inspection.assignedTo.lastName}
                      </Typography>
                    </Box>
                  )}
                  {!!(inspection.tags?.length) && (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {inspection.tags.map((tag) => (
                        <Chip key={tag} size="small" label={tag} variant="outlined" />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
              <Divider />
              <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Tooltip title="View details">
                  <IconButton onClick={() => handleView(inspection.id)}>
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
                {inspection.status !== 'COMPLETED' && (user?.role === 'PROPERTY_MANAGER' || user?.role === 'TECHNICIAN') && (
                  <Tooltip title="Edit inspection">
                    <IconButton onClick={() => handleEdit(inspection)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Card>
          ))}
        </Stack>
      );
    }

    return (
      <Card variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sort.field === 'title' ? sort.direction : false}>
                <TableSortLabel
                  active={sort.field === 'title'}
                  direction={sort.field === 'title' ? sort.direction : 'asc'}
                  onClick={() => handleSort('title')}
                >
                  Title
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell sortDirection={sort.field === 'scheduledDate' ? sort.direction : false}>
                <TableSortLabel
                  active={sort.field === 'scheduledDate'}
                  direction={sort.field === 'scheduledDate' ? sort.direction : 'asc'}
                  onClick={() => handleSort('scheduledDate')}
                >
                  Scheduled
                </TableSortLabel>
              </TableCell>
              <TableCell>Property</TableCell>
              <TableCell>Inspector</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleInspections.map((inspection) => (
              <TableRow key={inspection.id} hover>
                <TableCell>
                  <Typography variant="subtitle2">{inspection.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {inspection.type}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={inspection.status?.replace('_', ' ') || 'Scheduled'} />
                </TableCell>
                <TableCell>
                  {inspection.scheduledDate ? new Date(inspection.scheduledDate).toLocaleString() : 'TBD'}
                </TableCell>
                <TableCell>{inspection.property?.name || '—'}</TableCell>
                <TableCell>
                  {inspection.assignedTo ? `${inspection.assignedTo.firstName} ${inspection.assignedTo.lastName}` : 'Unassigned'}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {(inspection.tags || []).map((tag) => (
                      <Chip key={tag} size="small" label={tag} variant="outlined" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View details">
                    <IconButton onClick={() => handleView(inspection.id)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  {inspection.status !== 'COMPLETED' && (user?.role === 'PROPERTY_MANAGER' || user?.role === 'TECHNICIAN') && (
                    <Tooltip title="Edit inspection">
                      <IconButton onClick={() => handleEdit(inspection)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 12, 24, 50]}
          count={paginationInfo.total}
          rowsPerPage={pagination.pageSize}
          page={pagination.page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handlePageSizeChange}
        />
      </Card>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4">Inspections</Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule, track, and analyse on-site inspections
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Schedule inspection
        </Button>
      </Box>

      {!offline.isOnline && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You are viewing offline data. Some actions are disabled until you reconnect.
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search"
                  value={filters.search}
                  onChange={(event) => handleFilterChange('search', event.target.value)}
                  placeholder="Search by title, notes, or findings"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Property"
                  value={filters.propertyId}
                  onChange={(event) => handleFilterChange('propertyId', event.target.value)}
                >
                  <MenuItem value="">All properties</MenuItem>
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Unit"
                  value={filters.unitId}
                  onChange={(event) => handleFilterChange('unitId', event.target.value)}
                  disabled={!filters.propertyId}
                >
                  <MenuItem value="">All units</MenuItem>
                  {units.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      Unit {unit.unitNumber}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Status"
                  SelectProps={{ multiple: true, renderValue: (selected) => (selected.length ? selected.join(', ') : 'All statuses') }}
                  value={filters.status}
                  onChange={(event) => {
                    const value = event.target.value;
                    handleFilterChange('status', typeof value === 'string' ? value.split(',') : value);
                  }}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <Autocomplete
                  size="small"
                  options={inspectorsData.inspectors}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  value={inspectorsData.inspectors.find((inspector) => inspector.id === filters.inspectorId) || null}
                  onChange={(_event, value) => handleFilterChange('inspectorId', value?.id || '')}
                  renderInput={(params) => <TextField {...params} label="Inspector" />}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  label="From"
                  value={filters.dateFrom}
                  onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  label="To"
                  value={filters.dateTo}
                  onChange={(event) => handleFilterChange('dateTo', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Autocomplete
                  multiple
                  size="small"
                  options={tagData.tags || []}
                  value={filters.tags}
                  onChange={(_event, value) => handleFilterChange('tags', value)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => <Chip {...getTagProps({ index })} label={option} key={option} size="small" />)
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tags"
                      placeholder="Filter by tag"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <InputAdornment position="end">
                            <FilterListIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {Object.keys(summary).length ?
                  `${summary.SCHEDULED || 0} scheduled • ${summary.IN_PROGRESS || 0} in progress • ${summary.COMPLETED || 0} completed` :
                  'No inspections yet'}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Tabs
        value={view}
        onChange={(_event, value) => setView(value)}
        sx={{ mb: 3 }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {VIEW_TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                {tab.icon}
                <span>{tab.label}</span>
              </Stack>
            }
          />
        ))}
      </Tabs>

      {view === 'list' && (
        <Box>
          {isLoading ? (
            <DataState type="loading" message="Loading inspections…" />
          ) : error ? (
            <DataState type="error" message="Failed to load inspections" onRetry={refetch} />
          ) : (
            renderTable()
          )}
        </Box>
      )}

      {view === 'calendar' && (
        <InspectionCalendarBoard
          startDate={calendarStart}
          events={calendarData?.events || []}
          onChangeRange={handleCalendarRangeChange}
          onMove={offline.isOnline ? handleReschedule : undefined}
          canDrag={offline.isOnline && (user?.role === 'PROPERTY_MANAGER' || user?.role === 'TECHNICIAN')}
          isLoading={calendarLoading}
        />
      )}

      {view === 'analytics' && (
        analyticsLoading && !analyticsData ? (
          <DataState type="loading" message="Loading analytics…" />
        ) : (
          <InspectionAnalytics metrics={analyticsData?.metrics} charts={analyticsData?.charts} />
        )
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <InspectionForm inspection={selectedInspection} onSuccess={handleSuccess} onCancel={handleCloseDialog} />
      </Dialog>
    </Container>
  );
};

export default InspectionsPage;
