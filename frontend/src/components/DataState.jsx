import { Box, CircularProgress, Alert, Button, Typography, Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InboxIcon from '@mui/icons-material/Inbox';

/**
 * DataState Component
 * 
 * Handles loading, error, and empty states consistently across the app
 * 
 * @param {boolean} isLoading - Show loading state
 * @param {boolean} isError - Show error state
 * @param {Error} error - Error object with message
 * @param {boolean} isEmpty - Show empty state
 * @param {string} emptyMessage - Message to show when empty
 * @param {function} onRetry - Function to call when retry button clicked
 * @param {ReactNode} children - Content to show when data is loaded
 */
export default function DataState({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyMessage = 'No data available',
  onRetry,
  children,
}) {
  // Loading State
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error State
  if (isError) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
        }}
      >
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 500 }}>
          <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main' }} />
          <Typography variant="h6" color="error">
            Something went wrong
          </Typography>
          <Alert severity="error" sx={{ width: '100%' }}>
            {error?.message || 'An unexpected error occurred'}
          </Alert>
          {onRetry && (
            <Button variant="contained" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
        }}
      >
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 400, textAlign: 'center' }}>
          <InboxIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Success State - Show Children
  return <>{children}</>;
}
