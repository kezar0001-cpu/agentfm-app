import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  IconButton,
  Typography,
  Alert,
} from '@mui/material';
import { Add as AddIcon, DeleteOutline as DeleteOutlineIcon } from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { inviteOwnersToProperty } from '../utils/inviteOwners.js';
import { queryKeys } from '../utils/queryKeys.js';

function initialEmailsState() {
  return [''];
}

export default function InviteOwnerDialog({ open, onClose, property, onInvitesSent }) {
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState(() => initialEmailsState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) {
      setEmails(initialEmailsState());
      setIsSubmitting(false);
      setFormError('');
    }
  }, [open]);

  const propertyName = useMemo(() => property?.name || 'this property', [property?.name]);

  const handleEmailChange = (index) => (event) => {
    const value = event.target.value;
    setEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddEmail = () => {
    setEmails((prev) => [...prev, '']);
  };

  const handleRemoveEmail = (index) => () => {
    setEmails((prev) => prev.filter((_, emailIndex) => emailIndex !== index));
  };

  const handleSubmit = async () => {
    const normalizedEmails = emails.map((email) => email.trim()).filter(Boolean);

    if (!property?.id) {
      setFormError('Missing property identifier. Please refresh and try again.');
      return;
    }

    if (normalizedEmails.length === 0) {
      setFormError('Enter at least one owner email address.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const result = await inviteOwnersToProperty({ emails: normalizedEmails, propertyId: property.id });

      if (result.successes > 0) {
        toast.success(`Sent ${result.successes} owner invite${result.successes === 1 ? '' : 's'}.`);
      }

      if (result.failures.length > 0) {
        const failureMessage =
          result.failures.length === 1
            ? `${result.failures[0].email}: ${result.failures[0].error}`
            : `${result.failures.length} invites failed. Check the emails and try again.`;
        toast.error(failureMessage);
      }

      if (typeof onInvitesSent === 'function') {
        onInvitesSent(result);
      }

      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.invites() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.properties.detail(property.id) }),
      ]);

      if (result.failures.length === 0) {
        if (typeof onClose === 'function') {
          onClose();
        }
      }
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to send invites. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite property owners</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Owners receive an email invitation to join your Buildstate workspace with access to {propertyName}.
          </Alert>

          {emails.map((email, index) => (
            <Stack key={`owner-email-${index}`} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <TextField
                fullWidth
                type="email"
                label={`Owner Email ${index + 1}`}
                value={email}
                onChange={handleEmailChange(index)}
                autoFocus={index === 0}
              />
              {emails.length > 1 && (
                <IconButton onClick={handleRemoveEmail(index)} aria-label={`Remove owner ${index + 1}`}>
                  <DeleteOutlineIcon />
                </IconButton>
              )}
            </Stack>
          ))}

          <Button onClick={handleAddEmail} startIcon={<AddIcon />} variant="text" sx={{ alignSelf: 'flex-start' }}>
            Add another owner
          </Button>

          {formError && (
            <Typography color="error" variant="body2">
              {formError}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Sending invites…' : 'Send invites'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
