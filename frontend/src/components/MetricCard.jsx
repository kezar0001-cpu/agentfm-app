import { Paper, Stack, Typography } from '@mui/material';

export default function MetricCard({ label, value, helper }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: (theme) => theme.palette.divider,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(249,250,252,0.76))',
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        {helper && (
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
