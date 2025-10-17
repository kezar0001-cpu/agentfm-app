import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import DataState from '../components/DataState';
import InspectionForm from '../components/InspectionForm';

export default function InspectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeData, setCompleteData] = useState({
    findings: '',
    photos: [],
  });

  // Fetch inspection
  const {
    data: inspection,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => apiRequest(`/inspections/${id}`),
  });

  // Complete inspection mutation
  const completeMutation = useMutation({
    mutationFn: (data) =>
      apiRequest(`/inspections/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['inspection', id]);
      queryClient.invalidateQueries(['inspections']);
      setCompleteDialogOpen(false);
    },
  });

  const handleCompleteSubmit = () => {
    completeMutation.mutate(completeData);
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: 'info',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'error',
    };
    return colors[status] || 'default';
  };

  const getTypeColor = (type) => {
    const colors = {
      ROUTINE: 'primary',
      MOVE_IN: 'info',
      MOVE_OUT: 'warning',
      EMERGENCY: 'error',
      COMPLIANCE: 'secondary',
    };
    return colors[type] || 'default';
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <DataState type="loading" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <DataState
          type="error"
          message="Failed to load inspection"
          action={{
            label: 'Go Back',
            onClick: () => navigate('/inspections'),
          }}
        />
      </Container>
    );
  }

  if (!inspection) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <DataState
          type="empty"
          message="Inspection not found"
          action={{
            label: 'Go Back',
            onClick: () => navigate('/inspections'),
          }}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/inspections')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Typography variant="h4" component="h1">
              {inspection.title}
            </Typography>
            <Chip
              label={inspection.status.replace(/_/g, ' ')}
              color={getStatusColor(inspection.status)}
            />
            <Chip
              label={inspection.type}
              color={getTypeColor(inspection.type)}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Scheduled for {new Date(inspection.scheduledDate).toLocaleString()}
          </Typography>
        </Box>
        {inspection.status !== 'COMPLETED' && inspection.status !== 'CANCELLED' && (
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditDialogOpen(true)}
            >
              Edit
            </Button>
            {inspection.status !== 'COMPLETED' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => setCompleteDialogOpen(true)}
              >
                Complete Inspection
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Details */}
        <Grid item xs={12} md={8}>
          {/* Basic Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inspection Details
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Property
                  </Typography>
                  <Typography variant="body1">
                    {inspection.property?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {inspection.property?.address}, {inspection.property?.city},{' '}
                    {inspection.property?.state}
                  </Typography>
                </Grid>

                {inspection.unit && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Unit
                    </Typography>
                    <Typography variant="body1">
                      Unit {inspection.unit.unitNumber}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1">{inspection.type}</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1">{inspection.status}</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Scheduled Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(inspection.scheduledDate).toLocaleString()}
                  </Typography>
                </Grid>

                {inspection.completedDate && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Completed Date
                    </Typography>
                    <Typography variant="body1">
                      {new Date(inspection.completedDate).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Notes */}
          {inspection.notes && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">{inspection.notes}</Typography>
              </CardContent>
            </Card>
          )}

          {/* Findings */}
          {inspection.findings && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Findings
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {inspection.findings}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {inspection.photos && inspection.photos.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Photos
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {inspection.photos.map((photo, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Paper
                        sx={{
                          height: 200,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'action.hover',
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.8 },
                        }}
                        onClick={() => window.open(photo, '_blank')}
                      >
                        <ImageIcon sx={{ fontSize: 64, color: 'action.active' }} />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right Column - People & Report */}
        <Grid item xs={12} md={4}>
          {/* Assigned Technician */}
          {inspection.assignedTo && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Assigned Technician
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar>
                    {inspection.assignedTo.firstName?.[0]}
                    {inspection.assignedTo.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">
                      {inspection.assignedTo.firstName}{' '}
                      {inspection.assignedTo.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {inspection.assignedTo.email}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Completed By */}
          {inspection.completedBy && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Completed By
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar>
                    {inspection.completedBy.firstName?.[0]}
                    {inspection.completedBy.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">
                      {inspection.completedBy.firstName}{' '}
                      {inspection.completedBy.lastName}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Property Manager */}
          {inspection.property?.manager && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Property Manager
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar>
                    {inspection.property.manager.firstName?.[0]}
                    {inspection.property.manager.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">
                      {inspection.property.manager.firstName}{' '}
                      {inspection.property.manager.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {inspection.property.manager.email}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Report Link */}
          {inspection.report && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Report
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DescriptionIcon />}
                  onClick={() => navigate(`/reports/${inspection.report.id}`)}
                >
                  View Report
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tenants */}
          {inspection.unit?.tenants && inspection.unit.tenants.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tenants
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List dense>
                  {inspection.unit.tenants.map((tenancy) => (
                    <ListItem key={tenancy.tenant.id}>
                      <ListItemText
                        primary={`${tenancy.tenant.firstName} ${tenancy.tenant.lastName}`}
                        secondary={tenancy.tenant.email}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <InspectionForm
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        inspection={inspection}
        onSuccess={() => {
          setEditDialogOpen(false);
          queryClient.invalidateQueries(['inspection', id]);
          queryClient.invalidateQueries(['inspections']);
        }}
      />

      {/* Complete Inspection Dialog */}
      <Dialog
        open={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Complete Inspection
          <IconButton
            onClick={() => setCompleteDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={8}
            id="inspection-complete-findings"
            name="findings"
            label="Findings *"
            value={completeData.findings}
            onChange={(e) =>
              setCompleteData({ ...completeData, findings: e.target.value })
            }
            helperText="Describe your findings and any issues discovered during the inspection"
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            id="inspection-complete-photos"
            name="photos"
            label="Photo URLs (comma-separated)"
            value={completeData.photos.join(', ')}
            onChange={(e) =>
              setCompleteData({
                ...completeData,
                photos: e.target.value.split(',').map((url) => url.trim()).filter(Boolean),
              })
            }
            helperText="Enter photo URLs separated by commas"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCompleteSubmit}
            variant="contained"
            color="success"
            disabled={!completeData.findings || completeMutation.isLoading}
          >
            Complete Inspection
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
