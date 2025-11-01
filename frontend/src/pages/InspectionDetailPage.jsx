import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddTask as AddTaskIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  NotificationsActive as NotificationsActiveIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import InspectionAttachmentManager from '../components/InspectionAttachmentManager';
import InspectionForm from '../components/InspectionForm';
import { formatPropertyAddressLine } from '../utils/formatPropertyLocation';
import { formatDateTime } from '../utils/date';
import { STATUS_COLOR, TYPE_COLOR } from '../constants/inspections';
import { useCurrentUser } from '../context/UserContext';
import { queryKeys } from '../utils/queryKeys.js';

export default function InspectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);

  const [completeData, setCompleteData] = useState({ findings: '', notes: '', tags: [] });
  const [reminderForm, setReminderForm] = useState({ remindAt: '', recipients: [], note: '', channel: 'IN_APP' });
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignedToId: '',
    scheduledDate: '',
  });

  const canManage = useMemo(() => user?.role === 'PROPERTY_MANAGER' || user?.role === 'TECHNICIAN', [user?.role]);

  const {
    data: inspection,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.inspections.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/inspections/${id}`);
      return response.data;
    },
  });

  const { data: auditData } = useQuery({
    queryKey: queryKeys.inspections.audit(id),
    queryFn: async () => {
      const response = await apiClient.get(`/inspections/${id}/audit`);
      return response.data?.logs || [];
    },
    enabled: Boolean(inspection),
  });

  const { data: inspectorData = { inspectors: [] } } = useQuery({
    queryKey: queryKeys.inspections.inspectors(),
    queryFn: async () => {
      const response = await apiClient.get('/inspections/inspectors');
      return response.data;
    },
  });

  const inspectorOptions = inspectorData.inspectors || [];

  const completeMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(`/inspections/${id}/complete`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections.all() });
      setCompleteDialogOpen(false);
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(`/inspections/${id}/reminders`, payload);
      return response.data;
    },
    onSuccess: () => {
      setReminderDialogOpen(false);
      setReminderForm({ remindAt: '', recipients: [], note: '', channel: 'IN_APP' });
    },
  });

  const jobMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(`/inspections/${id}/jobs`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(id) });
      setJobDialogOpen(false);
      setJobForm({ title: '', description: '', priority: 'MEDIUM', assignedToId: '', scheduledDate: '' });
    },
  });

  const handleCompleteSubmit = () => {
    completeMutation.mutate({
      findings: completeData.findings,
      notes: completeData.notes,
      tags: completeData.tags,
    });
  };

  const handleReminderSubmit = () => {
    reminderMutation.mutate({
      remindAt: reminderForm.remindAt,
      recipients: reminderForm.recipients,
      channel: reminderForm.channel,
      note: reminderForm.note,
    });
  };

  const handleJobSubmit = () => {
    jobMutation.mutate({
      title: jobForm.title,
      description: jobForm.description,
      priority: jobForm.priority,
      assignedToId: jobForm.assignedToId || undefined,
      scheduledDate: jobForm.scheduledDate ? new Date(jobForm.scheduledDate).toISOString() : undefined,
    });
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <DataState type="loading" message="Loading inspection" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <DataState
          type="error"
          message="Failed to load inspection"
          action={{ label: 'Back to inspections', onClick: () => navigate('/inspections') }}
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
          action={{ label: 'Back to inspections', onClick: () => navigate('/inspections') }}
        />
      </Container>
    );
  }

  const canComplete = canManage && inspection.status !== 'COMPLETED' && inspection.status !== 'CANCELLED';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/inspections')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            {inspection.title}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={inspection.status.replace(/_/g, ' ')} color={STATUS_COLOR[inspection.status] || 'default'} />
            <Chip label={inspection.type} color={TYPE_COLOR[inspection.type] || 'default'} />
            {(inspection.tags || []).map((tag) => (
              <Chip key={tag} label={tag} variant="outlined" size="small" />
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Scheduled for {formatDateTime(inspection.scheduledDate)}
          </Typography>
        </Box>
        {canManage && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditDialogOpen(true)}>
              Edit
            </Button>
            {canComplete && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => {
                  setCompleteData({
                    findings: inspection.findings || '',
                    notes: inspection.notes || '',
                    tags: inspection.tags || [],
                  });
                  setCompleteDialogOpen(true);
                }}
              >
                Complete
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overview
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
                    {formatPropertyAddressLine(inspection.property)}
                  </Typography>
                </Grid>
                {inspection.unit && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Unit
                    </Typography>
                    <Typography variant="body1">Unit {inspection.unit.unitNumber}</Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Assigned inspector
                  </Typography>
                  <Typography variant="body1">
                    {inspection.assignedTo
                      ? `${inspection.assignedTo.firstName} ${inspection.assignedTo.lastName}`
                      : 'Unassigned'}
                  </Typography>
                </Grid>
                {inspection.completedBy && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Completed by
                    </Typography>
                    <Typography variant="body1">
                      {inspection.completedBy.firstName} {inspection.completedBy.lastName}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {inspection.notes || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Findings
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {inspection.findings || '—'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Attachments</Typography>
                {canManage && (
                  <Typography variant="caption" color="text.secondary">
                    Upload photos, videos, or documents as evidence
                  </Typography>
                )}
              </Stack>
              <InspectionAttachmentManager
                inspectionId={inspection.id}
                attachments={inspection.attachments || []}
                canEdit={canManage}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <HistoryIcon color="primary" />
                <Typography variant="h6">Audit trail</Typography>
              </Stack>
              {!auditData?.length ? (
                <Typography variant="body2" color="text.secondary">
                  No changes recorded yet.
                </Typography>
              ) : (
                <List>
                  {auditData.map((log) => (
                    <ListItem key={log.id} alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar>{log.user?.firstName?.[0] || '?'}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${log.action.replace(/_/g, ' ')} • ${formatDateTime(log.createdAt)}`}
                        secondary={log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick actions
                </Typography>
                <Stack spacing={1.5}>
                  {canManage && (
                    <Button
                      variant="outlined"
                      startIcon={<NotificationsActiveIcon />}
                      onClick={() => {
                        setReminderDialogOpen(true);
                        setReminderForm((prev) => ({
                          ...prev,
                          recipients: inspection.assignedTo ? [inspection.assignedTo.id] : [],
                        }));
                      }}
                    >
                      Schedule reminder
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      variant="outlined"
                      startIcon={<AddTaskIcon />}
                      onClick={() => {
                        setJobForm((prev) => ({
                          ...prev,
                          title: `${inspection.title} follow-up`,
                          description: inspection.findings || '',
                        }));
                        setJobDialogOpen(true);
                      }}
                    >
                      Generate job from findings
                    </Button>
                  )}
                  <Button variant="text" onClick={() => navigate('/inspections')}>
                    Back to inspections
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {inspection.jobs?.length ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Linked jobs
                  </Typography>
                  <Stack spacing={1}>
                    {inspection.jobs.map((job) => (
                      <Paper key={job.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2">{job.title}</Typography>
                        <Chip label={job.status} size="small" sx={{ mt: 0.5 }} />
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ) : null}
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <InspectionForm
          inspection={inspection}
          onSuccess={() => {
            queryClient.invalidateQueries(['inspection', id]);
            queryClient.invalidateQueries(['inspections']);
            setEditDialogOpen(false);
          }}
          onCancel={() => setEditDialogOpen(false)}
        />
      </Dialog>

      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete inspection</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Summary of findings"
              multiline
              minRows={3}
              value={completeData.findings}
              onChange={(event) => setCompleteData((prev) => ({ ...prev, findings: event.target.value }))}
            />
            <TextField
              label="Additional notes"
              multiline
              minRows={2}
              value={completeData.notes}
              onChange={(event) => setCompleteData((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <TextField
              label="Tags"
              placeholder="Comma separated"
              value={completeData.tags.join(', ')}
              onChange={(event) =>
                setCompleteData((prev) => ({
                  ...prev,
                  tags: event.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleCompleteSubmit}
            startIcon={<CheckCircleIcon />}
            disabled={completeMutation.isPending}
          >
            Complete inspection
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reminderDialogOpen} onClose={() => setReminderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule reminder</DialogTitle>
        <DialogContent dividers>
          {reminderMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to create reminder. Please try again.
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Reminder time"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={reminderForm.remindAt}
              onChange={(event) => setReminderForm((prev) => ({ ...prev, remindAt: event.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Delivery channel"
              value={reminderForm.channel}
              onChange={(event) => setReminderForm((prev) => ({ ...prev, channel: event.target.value }))}
            >
              <MenuItem value="IN_APP">In-app notification</MenuItem>
              <MenuItem value="EMAIL">Email</MenuItem>
            </TextField>
            <TextField
              select
              label="Recipients"
              SelectProps={{ multiple: true, renderValue: (selected) => selected.length ? `${selected.length} selected` : 'None' }}
              value={reminderForm.recipients}
              onChange={(event) =>
                setReminderForm((prev) => ({
                  ...prev,
                  recipients: typeof event.target.value === 'string'
                    ? event.target.value.split(',')
                    : event.target.value,
                }))
              }
            >
              {inspectorOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.firstName} {option.lastName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Message"
              multiline
              minRows={2}
              value={reminderForm.note}
              onChange={(event) => setReminderForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReminderDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<NotificationsActiveIcon />}
            onClick={handleReminderSubmit}
            disabled={reminderMutation.isPending}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={jobDialogOpen} onClose={() => setJobDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create follow-up job</DialogTitle>
        <DialogContent dividers>
          {jobMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to create job. Please check the details and try again.
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Job title"
              value={jobForm.title}
              onChange={(event) => setJobForm((prev) => ({ ...prev, title: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              multiline
              minRows={3}
              value={jobForm.description}
              onChange={(event) => setJobForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <TextField
              select
              label="Priority"
              value={jobForm.priority}
              onChange={(event) => setJobForm((prev) => ({ ...prev, priority: event.target.value }))}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Assign to"
              value={jobForm.assignedToId}
              onChange={(event) => setJobForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {inspectorOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.firstName} {option.lastName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Scheduled date"
              type="date"
              value={jobForm.scheduledDate}
              onChange={(event) => setJobForm((prev) => ({ ...prev, scheduledDate: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJobDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<AddTaskIcon />}
            onClick={handleJobSubmit}
            disabled={jobMutation.isPending}
          >
            Create job
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
