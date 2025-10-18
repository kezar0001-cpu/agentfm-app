import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarMonth as CalendarMonthIcon,
} from '@mui/icons-material';

const STATUS_COLOR = {
  SCHEDULED: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const DAY_LABEL = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const DATE_LABEL = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function toDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const InspectionCalendarBoard = ({
  startDate,
  events = [],
  onChangeRange,
  onMove,
  canDrag = false,
  isLoading = false,
}) => {
  const days = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [startDate]);

  const grouped = useMemo(() => {
    const map = new Map();
    days.forEach((day) => map.set(toDateKey(day), []));
    events.forEach((event) => {
      const date = event.start ? new Date(event.start) : null;
      if (!date) return;
      date.setHours(0, 0, 0, 0);
      const key = toDateKey(date);
      if (!map.has(key)) return;
      map.get(key).push(event);
    });
    return map;
  }, [days, events]);

  const handleDragStart = (event, inspectionId) => {
    if (!canDrag) return;
    event.dataTransfer.setData('application/json', JSON.stringify({ inspectionId }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event, date) => {
    if (!canDrag) return;
    event.preventDefault();
    try {
      const payload = JSON.parse(event.dataTransfer.getData('application/json'));
      if (payload?.inspectionId) {
        onMove?.(payload.inspectionId, date);
      }
    } catch (error) {
      console.error('Failed to parse drag payload', error);
    }
  };

  const allowDrop = (event) => {
    if (!canDrag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarMonthIcon color="primary" />
            <Box>
              <Typography variant="h6">Inspection schedule</Typography>
              <Typography variant="body2" color="text.secondary">
                Drag inspections between days to reschedule
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Previous week">
              <span>
                <IconButton
                  onClick={() => onChangeRange(-7)}
                  disabled={isLoading}
                >
                  <ArrowBackIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Next week">
              <span>
                <IconButton
                  onClick={() => onChangeRange(7)}
                  disabled={isLoading}
                >
                  <ArrowForwardIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))',
            gap: 2,
            overflowX: 'auto',
          }}
        >
          {days.map((day) => {
            const key = toDateKey(day);
            const dayEvents = grouped.get(key) || [];
            return (
              <Box
                key={key}
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  minHeight: 220,
                  bgcolor: 'background.paper',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onDragOver={allowDrop}
                onDrop={(event) => handleDrop(event, day)}
              >
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2">{DAY_LABEL.format(day)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {DATE_LABEL.format(day)}
                  </Typography>
                </Box>
                <Stack spacing={1.5} sx={{ p: 1.5, flexGrow: 1, overflowY: 'auto' }}>
                  {!dayEvents.length && (
                    <Typography variant="caption" color="text.secondary">
                      {isLoading ? 'Loading…' : 'No inspections'}
                    </Typography>
                  )}
                  {dayEvents.map((inspection) => (
                    <Card
                      key={inspection.id}
                      variant="outlined"
                      draggable={canDrag}
                      onDragStart={(event) => handleDragStart(event, inspection.id)}
                      sx={{ cursor: canDrag ? 'grab' : 'default' }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {inspection.title}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip
                            size="small"
                            label={inspection.status?.replace('_', ' ') || 'Scheduled'}
                            color={STATUS_COLOR[inspection.status] || 'default'}
                          />
                          {inspection.property && (
                            <Typography variant="caption" color="text.secondary">
                              {inspection.property}
                            </Typography>
                          )}
                        </Stack>
                        {inspection.unit && (
                          <Typography variant="caption" color="text.secondary">
                            Unit {inspection.unit}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default InspectionCalendarBoard;
