import React from 'react';
import { Box, Typography, Button, Alert, AlertTitle, LinearProgress, Chip } from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  Bolt as BoltIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../context/UserContext';
import { calculateDaysRemaining } from '../utils/date';

const TrialBanner = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  // Don't show banner if user has active subscription
  if (!user || user.subscriptionStatus === 'ACTIVE') {
    return null;
  }

  const trialEndDate = user.trialEndDate;
  const daysRemaining = calculateDaysRemaining(trialEndDate);
  const isTrialActive = user.subscriptionStatus === 'TRIAL' && daysRemaining > 0;
  const isTrialExpired = user.subscriptionStatus === 'TRIAL' && daysRemaining <= 0;
  const isSuspended = user.subscriptionStatus === 'SUSPENDED' || user.subscriptionStatus === 'CANCELLED';

  // Calculate urgency level
  const isUrgent = daysRemaining <= 3 && daysRemaining > 0;
  const isCritical = daysRemaining <= 1 && daysRemaining > 0;

  // Calculate progress percentage (14-day trial assumed)
  const totalTrialDays = 14;
  const progressPercentage = Math.max(0, Math.min(100, ((totalTrialDays - daysRemaining) / totalTrialDays) * 100));

  const bannerOffset = { xs: '64px', sm: '72px' };

  // Trial expired or suspended - show urgent warning
  if (isTrialExpired || isSuspended) {
    return (
      <Box
        sx={{
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          borderBottom: '3px solid #7f1d1d',
          py: 2,
          px: 3,
          position: 'sticky',
          top: bannerOffset,
          zIndex: 1100,
          boxShadow: '0 4px 12px rgba(185, 28, 28, 0.3)',
        }}
      >
        <Box
          sx={{
            maxWidth: 1240,
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <WarningIcon sx={{ color: '#fff', fontSize: 32 }} />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  mb: 0.5,
                }}
              >
                Your Trial Has Ended
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                Subscribe now to restore full access to all features and continue managing your properties.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/subscriptions')}
            sx={{
              bgcolor: '#fff',
              color: '#dc2626',
              fontWeight: 700,
              px: 4,
              py: 1.5,
              '&:hover': {
                bgcolor: '#fef2f2',
                transform: 'scale(1.05)',
              },
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            Subscribe Now
          </Button>
        </Box>
      </Box>
    );
  }

  // Trial active - show countdown banner
  if (isTrialActive) {
    // Determine banner styling based on urgency
    const bannerBgColor = isCritical
      ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
      : isUrgent
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';

    const bannerBorderColor = isCritical ? '#7f1d1d' : isUrgent ? '#92400e' : '#1e3a8a';

    return (
      <Box
        sx={{
          background: bannerBgColor,
          borderBottom: `3px solid ${bannerBorderColor}`,
          py: 2,
          px: 3,
          position: 'sticky',
          top: bannerOffset,
          zIndex: 1100,
          boxShadow: isCritical || isUrgent ? '0 4px 12px rgba(185, 28, 28, 0.3)' : '0 4px 12px rgba(59, 130, 246, 0.3)',
        }}
      >
        <Box
          sx={{
            maxWidth: 1240,
            mx: 'auto',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              mb: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {isCritical || isUrgent ? (
                <BoltIcon sx={{ color: '#fff', fontSize: 32 }} />
              ) : (
                <AccessTimeIcon sx={{ color: '#fff', fontSize: 32 }} />
              )}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  >
                    {isCritical
                      ? '🔥 Your Trial Ends Tomorrow!'
                      : isUrgent
                      ? `⚡ Only ${daysRemaining} Days Left in Your Trial`
                      : `Free Trial: ${daysRemaining} Days Remaining`}
                  </Typography>
                  {!isCritical && !isUrgent && (
                    <Chip
                      label="LIMITED TIME"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  {isCritical
                    ? 'Subscribe today to avoid losing access to your properties and data!'
                    : isUrgent
                    ? 'Subscribe now to ensure uninterrupted access to all premium features.'
                    : 'Unlock full access with a paid plan. Start from just $29/month.'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/subscriptions')}
                startIcon={<TrendingUpIcon />}
                sx={{
                  bgcolor: '#fff',
                  color: isCritical || isUrgent ? '#dc2626' : '#1d4ed8',
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: '#fef2f2',
                    transform: 'scale(1.05)',
                  },
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                }}
              >
                {isCritical || isUrgent ? 'Subscribe Now' : 'View Plans'}
              </Button>
            </Box>
          </Box>

          {/* Progress bar */}
          <Box sx={{ width: '100%' }}>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#fff',
                  borderRadius: 3,
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                mt: 0.5,
                display: 'block',
                textAlign: 'right',
              }}
            >
              {Math.round(progressPercentage)}% of trial used
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return null;
};

export default TrialBanner;
