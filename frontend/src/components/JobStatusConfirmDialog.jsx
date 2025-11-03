import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';

/**
 * Confirmation dialog for job status transitions that send notifications
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onClose - Handler for closing the dialog
 * @param {function} onConfirm - Handler for confirming the status change
 * @param {string} currentStatus - Current job status
 * @param {string} newStatus - New job status
 * @param {string} jobTitle - Title of the job
 * @param {boolean} isLoading - Whether the status update is in progress
 */
const JobStatusConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  currentStatus,
  newStatus,
  jobTitle,
  isLoading = false
}) => {
  // Determine if this status transition requires confirmation
  const requiresConfirmation = (from, to) => {
    // Status transitions that send notifications
    const notifyingTransitions = [
      { from: 'ASSIGNED', to: 'IN_PROGRESS' }, // Notifies property manager
      { from: 'IN_PROGRESS', to: 'COMPLETED' }, // Notifies property manager
      { from: 'OPEN', to: 'IN_PROGRESS' }, // Notifies property manager
      { from: 'OPEN', to: 'ASSIGNED' }, // Notifies technician
      { from: 'ASSIGNED', to: 'COMPLETED' }, // Notifies property manager
    ];

    return notifyingTransitions.some(t => t.from === from && t.to === to);
  };

  const getNotificationMessage = (status) => {
    const messages = {
      IN_PROGRESS: 'This will notify the property manager that work has started.',
      COMPLETED: 'This will notify the property manager that the job is complete.',
      ASSIGNED: 'This will notify the assigned technician.',
    };
    return messages[status] || '';
  };

  const getStatusLabel = (status) => {
    const labels = {
      OPEN: 'Open',
      ASSIGNED: 'Assigned',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Confirm Status Change</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to change the status of <strong>"{jobTitle}"</strong> from{' '}
          <strong>{getStatusLabel(currentStatus)}</strong> to{' '}
          <strong>{getStatusLabel(newStatus)}</strong>?
        </DialogContentText>
        {getNotificationMessage(newStatus) && (
          <DialogContentText sx={{ mt: 2, fontWeight: 500, color: 'primary.main' }}>
            {getNotificationMessage(newStatus)}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {isLoading ? 'Updating...' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobStatusConfirmDialog;
