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
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: { xs: 200, md: 300 },
          px: 2,
          gap: 2,
        }}
      >
        <CircularProgress
          size={48}
          thickness={4}
          sx={{
            color: 'primary.main',
            animation: 'pulse-subtle 1.5s ease-in-out infinite',
          }}
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            animation: 'fade-in 0.5s ease-out',
          }}
        >
          Loading...
        </Typography>
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
          minHeight: { xs: 220, md: 320 },
          px: 2,
        }}
      >
        <Stack
          spacing={3}
          alignItems="center"
          sx={{
            maxWidth: 500,
            textAlign: 'center',
            animation: 'fade-in-up 0.5s ease-out',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #fecaca 0%, #fee2e2 100%)',
              boxShadow: '0 4px 14px 0 rgb(239 68 68 / 0.2)',
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} />
          </Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Something went wrong
          </Typography>
          <Alert
            severity="error"
            sx={{
              width: '100%',
              borderRadius: 3,
              '& .MuiAlert-icon': {
                fontSize: 24,
              },
            }}
          >
            {error?.message || 'An unexpected error occurred'}
          </Alert>
          {onRetry && (
            <Button
              variant="contained"
              color="error"
              onClick={onRetry}
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
              }}
            >
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
          minHeight: { xs: 200, md: 300 },
          px: 2,
        }}
      >
        <Stack
          spacing={2}
          alignItems="center"
          sx={{
            maxWidth: 400,
            textAlign: 'center',
            animation: 'fade-in-up 0.5s ease-out',
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
              boxShadow: '0 4px 14px 0 rgb(59 130 246 / 0.15)',
            }}
          >
            <InboxIcon sx={{ fontSize: 56, color: 'primary.main', opacity: 0.8 }} />
          </Box>
          <Typography variant="h6" fontWeight={600} color="text.primary">
            {emptyMessage}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
            There's nothing here yet. Start by adding your first item.
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Success State - Show Children
  return <>{children}</>;
}
