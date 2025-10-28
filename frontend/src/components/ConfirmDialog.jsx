import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

/**
 * Reusable confirmation dialog component
 * 
 * @param {boolean} open - Whether the dialog is open
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message/description
 * @param {function} onConfirm - Callback when user confirms
 * @param {function} onCancel - Callback when user cancels
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} confirmColor - Color for confirm button (default: "error")
 * @param {boolean} loading - Whether the confirm action is loading
 */
export default function ConfirmDialog({
  open,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'error',
  loading = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {confirmColor === 'error' && <Warning color="error" />}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button 
          onClick={onConfirm} 
          color={confirmColor} 
          variant="contained"
          disabled={loading}
          autoFocus
        >
          {loading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
