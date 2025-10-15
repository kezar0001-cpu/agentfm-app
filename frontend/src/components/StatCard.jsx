import React from 'react';
import { Card, CardContent, Box, Typography, Icon } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  trend,
  alert,
  onClick,
}) {
  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s',
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" component="div" color={`${color}.main`}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: `${color}.light`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ color: `${color}.main`, fontSize: 32 }}>{icon}</Icon>
          </Box>
        </Box>

        {subtitle && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
            {trend === 'up' && (
              <TrendingUpIcon fontSize="small" color="success" />
            )}
            {trend === 'down' && (
              <TrendingDownIcon fontSize="small" color="error" />
            )}
          </Box>
        )}

        {alert && (
          <Box
            mt={1}
            p={0.5}
            px={1}
            bgcolor="error.light"
            borderRadius={1}
          >
            <Typography variant="caption" color="error.dark">
              {alert}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
