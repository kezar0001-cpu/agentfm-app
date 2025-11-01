import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query'; // 👈 ADD THIS IMPORT
import PropertyForm from './PropertyForm';
import { queryKeys } from '../utils/queryKeys.js';

function PropertyDialog({ open, onClose, property }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient(); // 👈 GET THE QUERY CLIENT

  const handleSuccess = () => {
    // 👇 TELL REACT QUERY TO REFETCH THE PROPERTIES LIST
    queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
    onClose(); // Close the dialog
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle>{property ? 'Edit Property' : 'Add New Property'}</DialogTitle>
      <DialogContent>
        <PropertyForm
          property={property}
          onSuccess={handleSuccess} // 👈 PASS THE SUCCESS HANDLER TO THE FORM
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form="property-form" variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PropertyDialog;