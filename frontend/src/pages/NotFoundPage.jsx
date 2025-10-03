import { Box, Typography } from '@mui/material';

export default function NotFoundPage() {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h3" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h6">The page you are looking for could not be found.</Typography>
    </Box>
  );
}
