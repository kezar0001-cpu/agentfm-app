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
          borderBottom: '2px solid #7f1d1d',
          py: 1,
          px: 2,
          position: 'sticky',
          top: bannerOffset,
          zIndex: 1100,
          boxShadow: '0 2px 8px rgba(185, 28, 28, 0.25)',
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
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            <WarningIcon sx={{ color: '#fff', fontSize: 24 }} />
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                }}
              >
                Your Trial Has Ended
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.85rem',
                  mt: 0.25,
                }}
              >
                Subscribe now to restore full access to all features and continue managing your properties.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            size="medium"
            onClick={() => navigate('/subscriptions')}
            sx={{
              bgcolor: '#fff',
              color: '#dc2626',
              fontWeight: 700,
              px: 3,
              py: 0.75,
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: '#fef2f2',
                transform: 'scale(1.03)',
              },
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
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
      : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'; // Changed to orange theme

    const bannerBorderColor = isCritical ? '#7f1d1d' : isUrgent ? '#92400e' : '#c2410c'; // Changed to orange

    return (
      <Box
        sx={{
          background: bannerBgColor,
          borderBottom: `2px solid ${bannerBorderColor}`,
          py: 1,
          px: 2,
          position: 'sticky',
          top: bannerOffset,
          zIndex: 1100,
          boxShadow: isCritical || isUrgent ? '0 2px 8px rgba(185, 28, 28, 0.25)' : '0 2px 8px rgba(249, 115, 22, 0.25)',
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
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
              {isCritical || isUrgent ? (
                <BoltIcon sx={{ color: '#fff', fontSize: 24 }} />
              ) : (
                <AccessTimeIcon sx={{ color: '#fff', fontSize: 24 }} />
              )}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
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
                        fontSize: '0.65rem',
                        height: 20,
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.85rem',
                    mt: 0.25,
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
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="medium"
                onClick={() => navigate('/subscriptions')}
                startIcon={<TrendingUpIcon />}
                sx={{
                  bgcolor: '#fff',
                  color: isCritical || isUrgent ? '#dc2626' : '#ea580c',
                  fontWeight: 700,
                  px: 3,
                  py: 0.75,
                  fontSize: '0.875rem',
                  '&:hover': {
                    bgcolor: '#fef2f2',
                    transform: 'scale(1.03)',
                  },
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                {isCritical || isUrgent ? 'Subscribe Now' : 'View Plans'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return null;
};

export default TrialBanner;
