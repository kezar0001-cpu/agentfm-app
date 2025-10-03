import { Box, CircularProgress, Stack, Typography, Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function DataState({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  children,
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
      <Box sx={{ py: 4 }}>
        <Typography color="text.secondary">{t('feedback.empty')}</Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
