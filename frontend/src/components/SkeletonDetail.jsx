import {
  Box,
  Paper,
  Grid,
  Stack,
  Skeleton,
  Divider,
  Card,
  CardContent,
} from '@mui/material';

/**
 * SkeletonDetail Component
 *
 * Skeleton loader for detail pages
 * Matches the structure of detail pages like PropertyDetailPage, JobDetailPage, etc.
 *
 * @param {string} variant - Detail variant: 'property', 'job', 'profile', 'default' (default: 'default')
 * @param {boolean} showTabs - Show tab skeletons (default: true)
 * @param {boolean} showActions - Show action button skeletons (default: true)
 */
export default function SkeletonDetail({
  variant = 'default',
  showTabs = true,
  showActions = true,
}) {
  const renderHeader = () => (
    <Box
      sx={{
        animation: 'fadeIn 0.5s ease-out',
        '@keyframes fadeIn': {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* Breadcrumb skeleton */}
      <Box display="flex" gap={1} mb={3}>
        <Skeleton variant="text" width={60} height={20} />
        <Skeleton variant="text" width={20} height={20} />
        <Skeleton variant="text" width={100} height={20} />
      </Box>

      {/* Title and action buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box flex={1}>
          <Skeleton variant="text" width="40%" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="60%" height={24} />
        </Box>
        {showActions && (
          <Box display="flex" gap={2}>
            <Skeleton variant="rounded" width={100} height={40} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" width={100} height={40} sx={{ borderRadius: 2 }} />
          </Box>
        )}
      </Box>

      {/* Tabs skeleton */}
      {showTabs && (
        <Box display="flex" gap={3} borderBottom={1} borderColor="divider" mb={3}>
          <Skeleton variant="text" width={80} height={48} />
          <Skeleton variant="text" width={80} height={48} />
          <Skeleton variant="text" width={80} height={48} />
        </Box>
      )}
    </Box>
  );

  const renderPropertyVariant = () => (
    <Grid container spacing={3}>
      {/* Left column - Main info */}
      <Grid item xs={12} md={8}>
        <Stack spacing={3}>
          {/* Property image */}
          <Card>
            <Skeleton
              variant="rectangular"
              height={300}
              sx={{
                animation: 'shimmer 2s infinite',
                '@keyframes shimmer': {
                  '0%': { opacity: 0.3 },
                  '50%': { opacity: 0.6 },
                  '100%': { opacity: 0.3 },
                },
              }}
            />
          </Card>

          {/* Details section */}
          <Card>
            <CardContent>
              <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="70%" height={24} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {/* Right column - Stats and quick actions */}
      <Grid item xs={12} md={4}>
        <Stack spacing={3}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent>
                <Skeleton variant="text" width="50%" height={20} sx={{ mb: 1.5 }} />
                <Skeleton variant="text" width="30%" height={36} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="80%" height={20} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Grid>
    </Grid>
  );

  const renderJobVariant = () => (
    <Grid container spacing={3}>
      {/* Main content */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          {/* Job info */}
          <Box mb={3}>
            <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Details grid */}
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Skeleton variant="text" width="50%" height={20} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="80%" height={24} />
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Timeline or activity */}
          <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Box key={index} display="flex" gap={2}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box flex={1}>
                  <Skeleton variant="text" width="40%" height={20} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="80%" height={20} />
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>

      {/* Sidebar */}
      <Grid item xs={12} md={4}>
        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Skeleton variant="text" width="50%" height={24} sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" width="100%" height={32} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" width="100%" height={32} sx={{ borderRadius: 2 }} />
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Skeleton variant="text" width="50%" height={24} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={20} />
          </Paper>
        </Stack>
      </Grid>
    </Grid>
  );

  const renderProfileVariant = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        {/* Profile card */}
        <Card>
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center">
              <Skeleton
                variant="circular"
                width={120}
                height={120}
                sx={{ mb: 2 }}
              />
              <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" width="80%" height={36} sx={{ borderRadius: 2 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="70%" height={24} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );

  const renderDefaultVariant = () => (
    <Paper sx={{ p: 3 }}>
      {/* Main content sections */}
      <Stack spacing={3}>
        {/* Section 1 */}
        <Box>
          <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="95%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="80%" height={20} />
        </Box>

        <Divider />

        {/* Section 2 - Grid of items */}
        <Box>
          <Skeleton variant="text" width="25%" height={28} sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Skeleton variant="text" width="60%" height={20} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="40%" height={32} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider />

        {/* Section 3 - List */}
        <Box>
          <Skeleton variant="text" width="25%" height={28} sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Box key={index} display="flex" gap={2} alignItems="center">
                <Skeleton variant="circular" width={48} height={48} />
                <Box flex={1}>
                  <Skeleton variant="text" width="50%" height={20} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="70%" height={20} />
                </Box>
                <Skeleton variant="rounded" width={80} height={32} sx={{ borderRadius: 2 }} />
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );

  const renderContent = () => {
    switch (variant) {
      case 'property':
        return renderPropertyVariant();
      case 'job':
        return renderJobVariant();
      case 'profile':
        return renderProfileVariant();
      default:
        return renderDefaultVariant();
    }
  };

  return (
    <Box>
      {renderHeader()}
      {renderContent()}
    </Box>
  );
}
