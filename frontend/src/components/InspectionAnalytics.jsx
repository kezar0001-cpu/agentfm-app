import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS = {
  SCHEDULED: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

function buildTrendPoints(data = []) {
  if (!data.length) return '';
  const max = Math.max(...data.map((item) => item.completed)) || 1;
  return data
    .map((item, index) => {
      const x = (index / (data.length - 1 || 1)) * 100;
      const y = 100 - (item.completed / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');
}

const InspectionAnalytics = ({ metrics, charts }) => {
  const trendPoints = buildTrendPoints(charts?.monthlyCompletion || []);
  const maxIssue = charts?.recurringIssues?.[0]?.count || 1;

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance overview
          </Typography>
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total inspections
              </Typography>
              <Typography variant="h3">{metrics?.total ?? 0}</Typography>
            </Box>
            <Box sx={{ flex: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Completion rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics?.completionRate ?? 0}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {metrics?.completionRate ?? 0}% of inspections completed
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              {Object.entries(metrics?.status || {}).map(([status, count]) => (
                <Chip
                  key={status}
                  label={`${STATUS_LABELS[status] || status}: ${count}`}
                  color={STATUS_COLORS[status] || 'default'}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Monthly completion trend
          </Typography>
          {trendPoints ? (
            <Box component="svg" viewBox="0 0 100 100" preserveAspectRatio="none" sx={{ width: '100%', height: 160 }}>
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                points={trendPoints}
                style={{ color: '#1976d2' }}
              />
              {charts.monthlyCompletion.map((item, index) => {
                const x = (index / (charts.monthlyCompletion.length - 1 || 1)) * 100;
                const y = 100 - (item.completed / (Math.max(...charts.monthlyCompletion.map((entry) => entry.completed)) || 1)) * 100;
                return <circle key={item.month} cx={x} cy={y} r={2} fill="#1976d2" />;
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Not enough data yet to render a trend.
            </Typography>
          )}
          <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
            {charts?.monthlyCompletion?.map((item) => (
              <Box key={item.month} sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {item.month}
                </Typography>
                <Typography variant="subtitle1">{item.completed}</Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recurring issues by tag
          </Typography>
          {!charts?.recurringIssues?.length ? (
            <Typography variant="body2" color="text.secondary">
              No tagged issues recorded yet.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tag</TableCell>
                  <TableCell align="right">Occurrences</TableCell>
                  <TableCell width="40%">Share</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {charts.recurringIssues.map((issue) => (
                  <TableRow key={issue.label}>
                    <TableCell>{issue.label}</TableCell>
                    <TableCell align="right">{issue.count}</TableCell>
                    <TableCell>
                      <LinearProgress
                        variant="determinate"
                        value={(issue.count / maxIssue) * 100}
                        sx={{ height: 8, borderRadius: 5 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default InspectionAnalytics;
