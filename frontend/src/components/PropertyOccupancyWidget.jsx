// frontend/src/components/PropertyOccupancyWidget.jsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Chip,
  Divider,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Home as HomeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Build as BuildIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

/**
 * PropertyOccupancyWidget - Displays property occupancy statistics
 * @param {Array} units - Array of units for the property (optional, for backward compatibility)
 * @param {number} totalUnits - Total number of units (from property.totalUnits)
 * @param {Object} occupancyStats - Pre-calculated occupancy statistics from backend
 * @param {boolean} compact - Whether to display in compact mode
 */
const PropertyOccupancyWidget = ({ units = [], totalUnits = 0, occupancyStats = null, compact = false }) => {
  // Calculate occupancy statistics
  const calculateStats = () => {
    // If pre-calculated stats are provided, use them
    if (occupancyStats) {
      const vacancyRate = occupancyStats.total > 0
        ? ((occupancyStats.vacant / occupancyStats.total) * 100).toFixed(1)
        : 0;

      return {
        total: occupancyStats.total,
        occupied: occupancyStats.occupied,
        vacant: occupancyStats.vacant,
        maintenance: occupancyStats.maintenance,
        occupancyRate: occupancyStats.occupancyRate.toFixed(1),
        vacancyRate,
      };
    }

    // Fallback to calculating from units array (for backward compatibility)
    const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
    const vacant = units.filter((u) => u.status === 'VACANT').length;
    const maintenance = units.filter((u) => u.status === 'MAINTENANCE').length;
    const total = units.length || totalUnits || 0;
    const occupancyRate = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;
    const vacancyRate = total > 0 ? ((vacant / total) * 100).toFixed(1) : 0;

    return {
      total,
      occupied,
      vacant,
      maintenance,
      occupancyRate,
      vacancyRate,
    };
  };

  const stats = calculateStats();

  // Color determination based on occupancy rate
  const getOccupancyColor = () => {
    if (stats.occupancyRate >= 90) return 'success';
    if (stats.occupancyRate >= 70) return 'warning';
    return 'error';
  };

  const getOccupancyProgressColor = () => {
    if (stats.occupancyRate >= 90) return 'success';
    if (stats.occupancyRate >= 70) return 'warning';
    return 'error';
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Tooltip title={`${stats.occupied} of ${stats.total} units occupied`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HomeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {stats.occupied}/{stats.total}
            </Typography>
          </Box>
        </Tooltip>
        <Chip
          label={`${stats.occupancyRate}% Occupied`}
          size="small"
          color={getOccupancyColor()}
          variant="outlined"
        />
      </Box>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
      role="region"
      aria-label="Property occupancy overview"
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <HomeIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Occupancy Overview
          </Typography>
          <Tooltip title="Occupancy statistics based on current unit status">
            <InfoIcon fontSize="small" color="action" />
          </Tooltip>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Main occupancy rate */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Occupancy Rate
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: `${getOccupancyProgressColor()}.main`,
                fontWeight: 'bold',
              }}
            >
              {stats.occupancyRate}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={parseFloat(stats.occupancyRate)}
            color={getOccupancyProgressColor()}
            sx={{
              height: 8,
              borderRadius: 1,
              bgcolor: 'grey.200',
            }}
            aria-label={`Occupancy rate: ${stats.occupancyRate}%`}
            role="progressbar"
            aria-valuenow={parseFloat(stats.occupancyRate)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.5 }}
          >
            {stats.occupied} of {stats.total} units occupied
          </Typography>
        </Box>

        {/* Detailed statistics */}
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'success.lighter',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
              </Box>
              <Typography variant="h6" sx={{ color: 'success.main' }}>
                {stats.occupied}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Occupied
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={4}>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'error.lighter',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                <CancelIcon sx={{ fontSize: 20, color: 'error.main' }} />
              </Box>
              <Typography variant="h6" sx={{ color: 'error.main' }}>
                {stats.vacant}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Vacant
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={4}>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'warning.lighter',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                <BuildIcon sx={{ fontSize: 20, color: 'warning.main' }} />
              </Box>
              <Typography variant="h6" sx={{ color: 'warning.main' }}>
                {stats.maintenance}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Maintenance
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Additional info */}
        {stats.total > 0 && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Vacancy Rate
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {stats.vacancyRate}%
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Units
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {stats.total}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {/* No units message */}
        {stats.total === 0 && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No units added yet. Add units to track occupancy.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyOccupancyWidget;
