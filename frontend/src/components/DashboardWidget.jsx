import React from 'react';
import { Card, CardContent, CardHeader, Box } from '@mui/material';

export default function DashboardWidget({ title, children, action }) {
  return (
    <Card sx={{ mb: 3, height: '100%' }}>
      <CardHeader
        title={title}
        action={action}
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>{children}</CardContent>
    </Card>
  );
}
