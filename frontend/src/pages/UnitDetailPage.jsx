import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Stack,
  Card,
  CardContent,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Home as HomeIcon,
  Bed as BedIcon,
  Bathtub as BathtubIcon,
  SquareFoot as AreaIcon,
  AttachMoney as MoneyIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Work as WorkIcon,
  Assignment as InspectionIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import UnitForm from '../components/UnitForm';
import TenantAssignmentDialog from '../components/TenantAssignmentDialog';
import { formatDateTime } from '../utils/date';
import toast from 'react-hot-toast';
import ensureArray from '../utils/ensureArray';
import { queryKeys } from '../utils/queryKeys.js';

const getStatusColor = (status) => {
  const colors = {
    AVAILABLE: 'success',
    OCCUPIED: 'primary',
    MAINTENANCE: 'warning',
    VACANT: 'default',
  };
  return colors[status] || 'default';
};

export default function UnitDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  // Fetch unit details
  const unitQuery = useQuery({
    queryKey: queryKeys.units.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/units/${id}`);
      return response.data?.unit || response.data;
    },
  });

  // Fetch unit tenants
  const tenantsQuery = useQuery({
    queryKey: queryKeys.units.tenants(id),
    queryFn: async () => {
      const response = await apiClient.get(`/units/${id}/tenants`);
      return response.data?.tenants || [];
    },
  });

  // Fetch unit jobs
  const jobsQuery = useQuery({
    queryKey: queryKeys.units.jobs(id),
    queryFn: async () => {
      const response = await apiClient.get(`/jobs?unitId=${id}`);
      return ensureArray(response.data, ['items', 'data.items', 'jobs']);
    },
    enabled: currentTab === 1,
  });

  // Fetch unit inspections
  const inspectionsQuery = useQuery({
    queryKey: queryKeys.units.inspections(id),
    queryFn: async () => {
      const response = await apiClient.get(`/inspections?unitId=${id}`);
      return ensureArray(response.data, ['items', 'data.items', 'inspections']);
    },
    enabled: currentTab === 2,
  });

  // Remove tenant mutation
  const removeTenantMutation = useMutation({
    mutationFn: async (tenantId) => {
      const response = await apiClient.delete(`/units/${id}/tenants/${tenantId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.units.tenants(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.units.detail(id) });
      toast.success('Tenant removed successfully');
      setConfirmRemoveOpen(false);
      setSelectedTenant(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove tenant');
    },
  });

  const unit = unitQuery.data;
  const tenants = tenantsQuery.data || [];
  const activeTenant = tenants.find((t) => t.isActive);
  const jobs = jobsQuery.data || [];
  const inspections = inspectionsQuery.data || [];

  const handleBack = () => {
    if (unit?.propertyId) {
      navigate(`/properties/${unit.propertyId}`);
    } else {
      navigate('/properties');
    }
  };

  const handleEditUnit = () => {
    setEditDialogOpen(true);
  };

  const handleAssignTenant = () => {
    setSelectedTenant(null);
    setAssignDialogOpen(true);
  };

  const handleEditTenant = (tenant) => {
    setSelectedTenant(tenant);
    setAssignDialogOpen(true);
  };

  const handleRemoveTenant = (tenant) => {
    setSelectedTenant(tenant);
    setConfirmRemoveOpen(true);
  };

  const confirmRemove = () => {
    if (selectedTenant) {
      removeTenantMutation.mutate(selectedTenant.tenantId);
    }
  };

  const isLoading = unitQuery.isLoading || tenantsQuery.isLoading;
  const error = unitQuery.error || tenantsQuery.error;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={!unit}
        emptyMessage="Unit not found"
      >
        {unit && (
          <>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                sx={{ mb: 2 }}
              >
                Back to Property
              </Button>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h4" gutterBottom>
                    Unit {unit.unitNumber}
                  </Typography>
                  {unit.property && (
                    <Typography variant="body1" color="text.secondary">
                      {unit.property.name}
                      {unit.property.address && ` • ${unit.property.address}`}
                    </Typography>
                  )}
                </Box>

                <Stack direction="row" spacing={1}>
                  <Chip
                    label={unit.status?.replace('_', ' ')}
                    color={getStatusColor(unit.status)}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEditUnit}
                  >
                    Edit Unit
                  </Button>
                </Stack>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Unit Information */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Unit Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Stack spacing={2}>
                      {unit.bedrooms !== null && unit.bedrooms !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BedIcon color="action" />
                          <Typography>
                            {unit.bedrooms} {unit.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
                          </Typography>
                        </Box>
                      )}

                      {unit.bathrooms !== null && unit.bathrooms !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BathtubIcon color="action" />
                          <Typography>
                            {unit.bathrooms} {unit.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}
                          </Typography>
                        </Box>
                      )}

                      {unit.area && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AreaIcon color="action" />
                          <Typography>{unit.area} sq ft</Typography>
                        </Box>
                      )}

                      {unit.rentAmount && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MoneyIcon color="action" />
                          <Typography>${unit.rentAmount.toLocaleString()}/month</Typography>
                        </Box>
                      )}

                      {unit.floor !== null && unit.floor !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <HomeIcon color="action" />
                          <Typography>Floor {unit.floor}</Typography>
                        </Box>
                      )}

                      {unit.description && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Description
                          </Typography>
                          <Typography variant="body2">{unit.description}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Current Tenant */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6">Current Tenant</Typography>
                      {!activeTenant && (
                        <Button
                          variant="contained"
                          startIcon={<PersonAddIcon />}
                          onClick={handleAssignTenant}
                          size="small"
                        >
                          Assign Tenant
                        </Button>
                      )}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {activeTenant ? (
                      <Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            mb: 2,
                          }}
                        >
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <PersonIcon />
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {activeTenant.tenant?.firstName} {activeTenant.tenant?.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {activeTenant.tenant?.email}
                            </Typography>
                          </Box>
                        </Box>

                        <Stack spacing={1.5}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Lease Period
                            </Typography>
                            <Typography variant="body2">
                              {formatDateTime(activeTenant.leaseStart, 'MMM D, YYYY')} -{' '}
                              {formatDateTime(activeTenant.leaseEnd, 'MMM D, YYYY')}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Monthly Rent
                            </Typography>
                            <Typography variant="body2">
                              ${activeTenant.rentAmount?.toLocaleString()}
                            </Typography>
                          </Box>

                          {activeTenant.depositAmount && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Security Deposit
                              </Typography>
                              <Typography variant="body2">
                                ${activeTenant.depositAmount.toLocaleString()}
                              </Typography>
                            </Box>
                          )}
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditTenant(activeTenant)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleRemoveTenant(activeTenant)}
                          >
                            Remove
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" gutterBottom>
                          No tenant assigned to this unit
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<PersonAddIcon />}
                          onClick={handleAssignTenant}
                          sx={{ mt: 1 }}
                        >
                          Assign Tenant
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Jobs and Inspections Tabs */}
              <Grid item xs={12}>
                <Paper>
                  <Tabs
                    value={currentTab}
                    onChange={(e, newValue) => setCurrentTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Tab label="Overview" />
                    <Tab label={`Jobs (${jobs.length})`} icon={<WorkIcon />} iconPosition="start" />
                    <Tab
                      label={`Inspections (${inspections.length})`}
                      icon={<InspectionIcon />}
                      iconPosition="start"
                    />
                  </Tabs>

                  <Box sx={{ p: 3 }}>
                    {/* Overview Tab */}
                    {currentTab === 0 && (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Recent Activity
                        </Typography>
                        <Alert severity="info" sx={{ mt: 2 }}>
                          Activity timeline coming soon. Switch to Jobs or Inspections tabs to view
                          unit-specific items.
                        </Alert>
                      </Box>
                    )}

                    {/* Jobs Tab */}
                    {currentTab === 1 && (
                      <Box>
                        <DataState
                          isLoading={jobsQuery.isLoading}
                          error={jobsQuery.error}
                          isEmpty={jobs.length === 0}
                          emptyMessage="No jobs for this unit"
                        >
                          <List>
                            {jobs.map((job) => (
                              <ListItem
                                key={job.id}
                                sx={{
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  mb: 1,
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                                onClick={() => navigate(`/jobs?jobId=${job.id}`)}
                              >
                                <ListItemAvatar>
                                  <Avatar>
                                    <WorkIcon />
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={job.title}
                                  secondary={
                                    <>
                                      {job.description && (
                                        <Typography variant="body2" color="text.secondary">
                                          {job.description}
                                        </Typography>
                                      )}
                                      <Box sx={{ mt: 0.5 }}>
                                        <Chip
                                          label={job.status}
                                          size="small"
                                          sx={{ mr: 1 }}
                                        />
                                        <Chip
                                          label={job.priority}
                                          size="small"
                                          color={
                                            job.priority === 'URGENT'
                                              ? 'error'
                                              : job.priority === 'HIGH'
                                              ? 'warning'
                                              : 'default'
                                          }
                                        />
                                      </Box>
                                    </>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </DataState>
                      </Box>
                    )}

                    {/* Inspections Tab */}
                    {currentTab === 2 && (
                      <Box>
                        <DataState
                          isLoading={inspectionsQuery.isLoading}
                          error={inspectionsQuery.error}
                          isEmpty={inspections.length === 0}
                          emptyMessage="No inspections for this unit"
                        >
                          <List>
                            {inspections.map((inspection) => (
                              <ListItem
                                key={inspection.id}
                                sx={{
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  mb: 1,
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                                onClick={() => navigate(`/inspections/${inspection.id}`)}
                              >
                                <ListItemAvatar>
                                  <Avatar>
                                    <InspectionIcon />
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={inspection.title}
                                  secondary={
                                    <>
                                      <Typography variant="body2" color="text.secondary">
                                        {formatDateTime(inspection.scheduledDate, 'MMM D, YYYY')}
                                      </Typography>
                                      <Box sx={{ mt: 0.5 }}>
                                        <Chip
                                          label={inspection.status}
                                          size="small"
                                          sx={{ mr: 1 }}
                                        />
                                        <Chip
                                          label={inspection.type}
                                          size="small"
                                        />
                                      </Box>
                                    </>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </DataState>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Edit Unit Dialog */}
            <Dialog
              open={editDialogOpen}
              onClose={() => setEditDialogOpen(false)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Edit Unit</DialogTitle>
              <DialogContent>
                <UnitForm
                  unit={unit}
                  propertyId={unit.propertyId}
                  onSuccess={() => {
                    setEditDialogOpen(false);
                    unitQuery.refetch();
                  }}
                  onCancel={() => setEditDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            {/* Tenant Assignment Dialog */}
            <TenantAssignmentDialog
              open={assignDialogOpen}
              onClose={() => {
                setAssignDialogOpen(false);
                setSelectedTenant(null);
              }}
              unitId={id}
              tenant={selectedTenant}
            />

            {/* Confirm Remove Dialog */}
            <Dialog
              open={confirmRemoveOpen}
              onClose={() => setConfirmRemoveOpen(false)}
            >
              <DialogTitle>Remove Tenant</DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to remove{' '}
                  <strong>
                    {selectedTenant?.tenant?.firstName} {selectedTenant?.tenant?.lastName}
                  </strong>{' '}
                  from this unit?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmRemoveOpen(false)}>Cancel</Button>
                <Button
                  onClick={confirmRemove}
                  color="error"
                  variant="contained"
                  disabled={removeTenantMutation.isLoading}
                >
                  Remove
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </DataState>
    </Container>
  );
}
