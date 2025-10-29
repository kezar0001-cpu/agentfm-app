import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  IconButton,
  ImageList,
  ImageListItem,
  List,
  ListItem,
  ListItemText,
  TextField,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import DataState from './DataState';
import { formatDateTime } from '../utils/date';
import toast from 'react-hot-toast';

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

export default function ServiceRequestDetailModal({ requestId, open, onClose }) {
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'

  // Fetch request details
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-request', requestId],
    queryFn: async () => {
      const response = await apiClient.get(`/service-requests/${requestId}`);
      return response.data?.request || response.data;
    },
    enabled: open && !!requestId,
  });

  // Update request mutation
  const updateMutation = useMutation({
    mutationFn: async ({ status, reviewNotes }) => {
      const response = await apiClient.patch(`/service-requests/${requestId}`, {
        status,
        reviewNotes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service-requests']);
      queryClient.invalidateQueries(['service-request', requestId]);
      toast.success(reviewAction === 'approve' ? 'Request approved' : 'Request rejected');
      setShowReviewInput(false);
      setReviewNotes('');
      setReviewAction(null);
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update request');
    },
  });

  // Convert to job mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/service-requests/${requestId}/convert-to-job`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service-requests']);
      queryClient.invalidateQueries(['service-request', requestId]);
      queryClient.invalidateQueries(['jobs']);
      toast.success('Converted to job successfully');
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to convert to job');
    },
  });

  const handleApprove = () => {
    setReviewAction('approve');
    setShowReviewInput(true);
  };

  const handleReject = () => {
    setReviewAction('reject');
    setShowReviewInput(true);
  };

  const handleSubmitReview = () => {
    if (!reviewNotes.trim()) {
      toast.error('Please enter review notes');
      return;
    }

    updateMutation.mutate({
      status: reviewAction === 'approve' ? 'APPROVED' : 'REJECTED',
      reviewNotes: reviewNotes.trim(),
    });
  };

  const handleCancelReview = () => {
    setShowReviewInput(false);
    setReviewNotes('');
    setReviewAction(null);
  };

  const handleConvert = () => {
    convertMutation.mutate();
  };

  const handleClose = () => {
    if (!updateMutation.isLoading && !convertMutation.isLoading) {
      handleCancelReview();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Service Request Details</Typography>
          <IconButton onClick={handleClose} disabled={updateMutation.isLoading || convertMutation.isLoading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <DataState isLoading={isLoading} error={error} isEmpty={!data}>
          {data && (
            <Stack spacing={3}>
              {/* Title and Status */}
              <Box>
                <Typography variant="h5" gutterBottom>
                  {data.title}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    label={data.status?.replace(/_/g, ' ')}
                    color={getStatusColor(data.status)}
                    size="small"
                  />
                  <Chip
                    label={data.category?.replace(/_/g, ' ')}
                    color={getCategoryColor(data.category)}
                    size="small"
                  />
                  {data.priority && (
                    <Chip
                      label={data.priority}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>

              {/* Description */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Description
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {data.description}
                </Typography>
              </Paper>

              {/* Photos */}
              {data.photos && data.photos.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Photos ({data.photos.length})
                  </Typography>
                  <ImageList cols={3} gap={8} sx={{ mt: 1 }}>
                    {data.photos.map((photo, index) => (
                      <ImageListItem key={index}>
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          loading="lazy"
                          style={{
                            borderRadius: 4,
                            objectFit: 'cover',
                            height: 150,
                          }}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Paper>
              )}

              {/* Details */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Details
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Property
                    </Typography>
                    <Typography variant="body2">
                      {data.property?.name}
                      {data.property?.address && ` • ${data.property.address}`}
                    </Typography>
                  </Box>

                  {data.unit && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Unit
                      </Typography>
                      <Typography variant="body2">
                        Unit {data.unit.unitNumber}
                      </Typography>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Requested by
                    </Typography>
                    <Typography variant="body2">
                      {data.requestedBy?.firstName} {data.requestedBy?.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {data.requestedBy?.email}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Submitted
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(data.createdAt)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Review History */}
              {data.reviewNotes && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Review History
                  </Typography>
                  {data.reviewedAt && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Reviewed at: {formatDateTime(data.reviewedAt)}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {data.reviewNotes}
                  </Typography>
                </Paper>
              )}

              {/* Converted Jobs */}
              {data.jobs && data.jobs.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Converted Jobs
                  </Typography>
                  <List dense disablePadding>
                    {data.jobs.map((job) => (
                      <ListItem key={job.id} disableGutters>
                        <ListItemText
                          primary={job.title}
                          secondary={
                            <>
                              <Chip
                                label={job.status}
                                size="small"
                                sx={{ mr: 1, mt: 0.5 }}
                              />
                              {job.priority && (
                                <Chip
                                  label={job.priority}
                                  size="small"
                                  sx={{ mr: 1, mt: 0.5 }}
                                />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(job.createdAt)}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              {/* Review Input */}
              {showReviewInput && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    {reviewAction === 'approve' ? 'Approve Request' : 'Reject Request'}
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Review Notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={
                      reviewAction === 'approve'
                        ? 'Enter approval notes (e.g., "Approved - urgent repair needed")'
                        : 'Enter rejection reason (e.g., "Duplicate request - already addressed")'
                    }
                    disabled={updateMutation.isLoading}
                    sx={{ mt: 1 }}
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button
                      onClick={handleCancelReview}
                      disabled={updateMutation.isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitReview}
                      variant="contained"
                      color={reviewAction === 'approve' ? 'success' : 'error'}
                      disabled={updateMutation.isLoading}
                      startIcon={reviewAction === 'approve' ? <CheckCircleIcon /> : <CancelIcon />}
                    >
                      {updateMutation.isLoading
                        ? 'Submitting...'
                        : reviewAction === 'approve'
                        ? 'Approve'
                        : 'Reject'}
                    </Button>
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </DataState>
      </DialogContent>

      <DialogActions>
        {data && !showReviewInput && (
          <>
            {data.status === 'SUBMITTED' && (
              <>
                <Button
                  onClick={handleReject}
                  color="error"
                  startIcon={<CancelIcon />}
                  disabled={updateMutation.isLoading || convertMutation.isLoading}
                >
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  disabled={updateMutation.isLoading || convertMutation.isLoading}
                >
                  Approve
                </Button>
              </>
            )}
            {data.status === 'APPROVED' && (
              <Button
                onClick={handleConvert}
                variant="contained"
                startIcon={<BuildIcon />}
                disabled={updateMutation.isLoading || convertMutation.isLoading}
              >
                {convertMutation.isLoading ? 'Converting...' : 'Convert to Job'}
              </Button>
            )}
          </>
        )}
        <Button onClick={handleClose} disabled={updateMutation.isLoading || convertMutation.isLoading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
