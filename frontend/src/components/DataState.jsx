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
      <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
        <Typography>{t('feedback.loading')}</Typography>
      </Stack>
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
