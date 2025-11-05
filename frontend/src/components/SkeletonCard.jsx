import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

/**
 * SkeletonCard Component
 *
 * Skeleton loader that matches card layouts used throughout the app
 * Provides smooth loading states for card-based content
 *
 * @param {number} count - Number of skeleton cards to render (default: 3)
 * @param {string} variant - Card variant: 'stat', 'property', 'job', 'default' (default: 'default')
 * @param {number} columns - Grid columns (1-12, default: 4 for 3 cards per row)
 */
export default function SkeletonCard({ count = 3, variant = 'default', columns = 4 }) {
  const renderStatCardSkeleton = () => (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'visible',
        background: 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
          borderRadius: '16px 16px 0 0',
        },
      }}
    >
      <CardContent sx={{ pt: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
          <Box flex={1}>
            {/* Title skeleton */}
            <Skeleton
              variant="text"
              width="60%"
              height={20}
              sx={{ mb: 1.5 }}
            />
            {/* Value skeleton */}
            <Skeleton
              variant="text"
              width="40%"
              height={48}
              sx={{
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                }
              }}
            />
          </Box>
          {/* Icon skeleton */}
          <Skeleton
            variant="rounded"
            width={56}
            height={56}
            sx={{
              borderRadius: 3,
              animation: 'shimmer 2s infinite',
              '@keyframes shimmer': {
                '0%': { opacity: 0.3 },
                '50%': { opacity: 0.6 },
                '100%': { opacity: 0.3 },
              }
            }}
          />
        </Box>
        {/* Subtitle skeleton */}
        <Skeleton variant="text" width="80%" height={20} />
      </CardContent>
    </Card>
  );

  const renderPropertyCardSkeleton = () => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          {/* Property icon skeleton */}
          <Skeleton variant="circular" width={40} height={40} />
          {/* Status chip skeleton */}
          <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 3 }} />
        </Box>
        {/* Property name */}
        <Skeleton variant="text" width="70%" height={28} sx={{ mb: 1 }} />
        {/* Address line 1 */}
        <Skeleton variant="text" width="90%" height={20} sx={{ mb: 0.5 }} />
        {/* Address line 2 */}
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
        {/* Details section */}
        <Box display="flex" gap={2} mb={2}>
          <Skeleton variant="text" width={80} height={20} />
          <Skeleton variant="text" width={80} height={20} />
        </Box>
        {/* Action buttons */}
        <Box display="flex" gap={1} mt={2}>
          <Skeleton variant="rounded" width={100} height={36} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" width={80} height={36} sx={{ borderRadius: 2 }} />
        </Box>
      </CardContent>
    </Card>
  );

  const renderJobCardSkeleton = () => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          {/* Job title */}
          <Skeleton variant="text" width="70%" height={28} />
          {/* Priority chip */}
          <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 3 }} />
        </Box>
        {/* Description */}
        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="85%" height={20} sx={{ mb: 2 }} />
        {/* Property info */}
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={150} height={20} />
        </Box>
        {/* Status chips */}
        <Box display="flex" gap={1} mb={2}>
          <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 3 }} />
        </Box>
        {/* Action buttons */}
        <Box display="flex" gap={1} mt={2}>
          <Skeleton variant="rounded" width="48%" height={36} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" width="48%" height={36} sx={{ borderRadius: 2 }} />
        </Box>
      </CardContent>
    </Card>
  );

  const renderDefaultCardSkeleton = () => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {/* Header */}
        <Skeleton variant="text" width="60%" height={28} sx={{ mb: 2 }} />
        {/* Content lines */}
        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
        {/* Footer */}
        <Box display="flex" gap={1} mt={2}>
          <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" width={80} height={32} sx={{ borderRadius: 2 }} />
        </Box>
      </CardContent>
    </Card>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'stat':
        return renderStatCardSkeleton();
      case 'property':
        return renderPropertyCardSkeleton();
      case 'job':
        return renderJobCardSkeleton();
      default:
        return renderDefaultCardSkeleton();
    }
  };

  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={columns} key={index}>
          <Box
            sx={{
              animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
              '@keyframes fadeIn': {
                '0%': { opacity: 0, transform: 'translateY(10px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            {renderSkeleton()}
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
