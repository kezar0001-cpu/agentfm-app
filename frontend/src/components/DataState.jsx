import { Box, CircularProgress, Stack, Typography, Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function DataState({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  children,
  emptyMessage,
  onResetFilters,
  onAddProperty,
  resetButtonLabel = 'Reset Filters',
  addButtonLabel = 'Add a Property',
  showResetButton = true,
  showAddButton = true,
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
        aria-live="polite"
        role="status"
        aria-busy="true"
      >
        <CircularProgress size={40} color="primary" aria-label={t('feedback.loading')} />
        <Typography sx={{ ml: 2 }}>
          {t('feedback.loadingProperties', 'Loading Properties...')}
        </Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button color="inherit" onClick={onRetry} size="small">
              {t('feedback.retry')}
            </Button>
          )
        }
        sx={{ my: 2 }}
      >
        {error?.message || t('feedback.error')}
      </Alert>
    );
  }

  if (isEmpty) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">
          {emptyMessage || t('feedback.empty')}
        </Typography>
        {(onResetFilters || onAddProperty) && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
            sx={{ mt: 3 }}
          >
            {onResetFilters && showResetButton && (
              <Button variant="outlined" onClick={onResetFilters}>
                {resetButtonLabel}
              </Button>
            )}
            {onAddProperty && showAddButton && (
              <Button variant="contained" onClick={onAddProperty}>
                {addButtonLabel}
              </Button>
            )}
          </Stack>
        )}
      </Box>
    );
  }

  return <>{children}</>;
}
