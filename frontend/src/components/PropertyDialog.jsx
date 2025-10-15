import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import PropertyForm from './PropertyForm';
import useApiMutation from '../hooks/useApiMutation';

export default function PropertyDialog({ open, onClose, onSuccess }) {
  const [error, setError] = useState(null);
  
  const { mutateAsync, isPending } = useApiMutation({
    url: '/api/properties',
    method: 'post',
  });

  const handleSubmit = async (formData) => {
    try {
      setError(null);
      const response = await mutateAsync({ data: formData });
      onSuccess?.(response?.property);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create property');
      throw err;
    }
  };

  const handleClose = () => {
    if (!isPending) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          Add New Property
          <IconButton
            edge="end"
            onClick={handleClose}
            disabled={isPending}
            aria-label="close"
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <PropertyForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isSubmitting={isPending}
          submitError={error}
        />
      </DialogContent>
    </Dialog>
  );
}
