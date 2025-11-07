import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Alert, AlertTitle, LinearProgress, Chip, Collapse } from '@mui/material';
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
  const [isExpanded, setIsExpanded] = useState(true);
  const lastScrollYRef = useRef(0);
  const isExpandedRef = useRef(true);
  const bannerRef = useRef(null);
  const subscriptionStatus = user?.subscriptionStatus ?? null;
  const trialEndDate = user?.trialEndDate;
  const daysRemaining = calculateDaysRemaining(trialEndDate);
  const isTrialActive = subscriptionStatus === 'TRIAL' && daysRemaining > 0;
  const isTrialExpired = subscriptionStatus === 'TRIAL' && daysRemaining <= 0;
  const isSuspended = subscriptionStatus === 'SUSPENDED' || subscriptionStatus === 'CANCELLED';

  // Handle scroll to collapse/expand banner
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const previousScrollY = lastScrollYRef.current;
      const delta = currentScrollY - previousScrollY;

      lastScrollYRef.current = currentScrollY;

      // Ignore tiny adjustments that can happen from layout shifts while collapsing/expanding
      if (Math.abs(delta) < 2) {
        return;
      }

      const isScrollingDown = delta > 0;
      const isScrollingUp = delta < 0;

      if (isScrollingDown && currentScrollY > 50 && isExpandedRef.current) {
        // Only collapse after a meaningful downward movement to avoid oscillation
        if (delta > 4) {
          isExpandedRef.current = false;
          setIsExpanded(false);
        }
        return;
      }

      if (
        isScrollingUp &&
        !isExpandedRef.current &&
        (currentScrollY < 16 || Math.abs(delta) > 8)
      ) {
        isExpandedRef.current = true;
        setIsExpanded(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  useEffect(() => {
    const updateBannerHeight = () => {
      const height = bannerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty('--trial-banner-height', `${height}px`);
    };

    updateBannerHeight();

    window.addEventListener('resize', updateBannerHeight);

    let resizeObserver;
    if (bannerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateBannerHeight);
      resizeObserver.observe(bannerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateBannerHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      document.documentElement.style.removeProperty('--trial-banner-height');
    };
  }, [isExpanded, isTrialActive, isTrialExpired, isSuspended]);

  useEffect(() => {
    const updateBannerHeight = () => {
      const height = bannerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty('--trial-banner-height', `${height}px`);
    };

    updateBannerHeight();

    window.addEventListener('resize', updateBannerHeight);

    let resizeObserver;
    if (bannerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateBannerHeight);
      resizeObserver.observe(bannerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateBannerHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      document.documentElement.style.removeProperty('--trial-banner-height');
    };
  }, [isExpanded, isTrialActive, isTrialExpired, isSuspended]);

  // Don't show banner if user has active subscription
  if (!user || subscriptionStatus === 'ACTIVE') {
    return null;
  }

  // Calculate urgency level
  const isUrgent = daysRemaining <= 3 && daysRemaining > 0;
  const isCritical = daysRemaining <= 1 && daysRemaining > 0;

  // Calculate progress percentage (14-day trial assumed)
  const totalTrialDays = 14;
  const progressPercentage = Math.max(0, Math.min(100, ((totalTrialDays - daysRemaining) / totalTrialDays) * 100));

  // Trial expired or suspended - show urgent warning
  if (isTrialExpired || isSuspended) {
    return (
      <Box
        ref={bannerRef}
        sx={{
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          borderBottom: '2px solid #7f1d1d',
          py: isExpanded ? 0.75 : 0.375,
          px: 2,
          position: 'sticky',
          top: 0,
          zIndex: 1300,
          boxShadow: '0 2px 6px rgba(185, 28, 28, 0.2)',
          transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
          willChange: 'padding',
        }}
      >
        <Box
          sx={{
            maxWidth: 1240,
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1 }}>
            <WarningIcon sx={{
              color: '#fff',
              fontSize: isExpanded ? 20 : 18,
              transition: 'font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: isExpanded ? '0.875rem' : '0.8rem',
                  transition: 'font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  lineHeight: 1.3,
                }}
              >
                Your Trial Has Ended
              </Typography>
              <Collapse in={isExpanded} timeout={300} sx={{ overflow: 'hidden' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.8rem',
                    mt: 0.2,
                    lineHeight: 1.3,
                  }}
                >
                  Subscribe now to restore full access to all features.
                </Typography>
              </Collapse>
            </Box>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate('/subscriptions')}
            sx={{
              bgcolor: '#fff',
              color: '#dc2626',
              fontWeight: 700,
              px: isExpanded ? 2.5 : 2,
              py: isExpanded ? 0.625 : 0.5,
              fontSize: isExpanded ? '0.8125rem' : '0.7rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: '#fef2f2',
                transform: 'scale(1.03)',
              },
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
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
        ref={bannerRef}
        sx={{
          background: bannerBgColor,
          borderBottom: `2px solid ${bannerBorderColor}`,
          py: isExpanded ? 0.75 : 0.375,
          px: 2,
          position: 'sticky',
          top: 0,
          zIndex: 1300,
          boxShadow: isCritical || isUrgent ? '0 2px 6px rgba(185, 28, 28, 0.2)' : '0 2px 6px rgba(249, 115, 22, 0.2)',
          transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
          willChange: 'padding',
        }}
      >
        <Box
          sx={{
            maxWidth: 1240,
            mx: 'auto',
          }}
        >
          {/* Always visible compact header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.25,
              minHeight: isExpanded ? 'auto' : '28px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1 }}>
              {isCritical || isUrgent ? (
                <BoltIcon sx={{
                  color: '#fff',
                  fontSize: isExpanded ? 20 : 18,
                  transition: 'font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              ) : (
                <AccessTimeIcon sx={{
                  color: '#fff',
                  fontSize: isExpanded ? 20 : 18,
                  transition: 'font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              )}
              <Typography
                variant="subtitle1"
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: isExpanded ? '0.875rem' : '0.8rem',
                  transition: 'font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  lineHeight: 1.3,
                }}
              >
                {isCritical
                  ? '🔥 Your Trial Ends Tomorrow!'
                  : isUrgent
                  ? `⚡ Only ${daysRemaining} Days Left in Your Trial`
                  : `Free Trial: ${daysRemaining} Days Remaining`}
              </Typography>
              {!isCritical && !isUrgent && isExpanded && (
                <Chip
                  label="LIMITED TIME"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.6rem',
                    height: 18,
                    transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              )}
            </Box>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate('/subscriptions')}
              startIcon={isExpanded ? <TrendingUpIcon /> : null}
              sx={{
                bgcolor: '#fff',
                color: isCritical || isUrgent ? '#dc2626' : '#ea580c',
                fontWeight: 700,
                px: isExpanded ? 2.5 : 2,
                py: isExpanded ? 0.625 : 0.5,
                fontSize: isExpanded ? '0.8125rem' : '0.7rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: '#fef2f2',
                  transform: 'scale(1.03)',
                },
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
              }}
            >
              {isCritical || isUrgent ? 'Subscribe Now' : 'View Plans'}
            </Button>
          </Box>

          {/* Collapsible detailed content */}
          <Collapse in={isExpanded} timeout={300} sx={{ overflow: 'hidden' }}>
            <Box sx={{ mt: 0.4, overflow: 'hidden' }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.8rem',
                  mb: 0.75,
                  lineHeight: 1.3,
                }}
              >
                {isCritical
                  ? 'Subscribe today to avoid losing access!'
                  : isUrgent
                  ? 'Subscribe now to ensure uninterrupted access.'
                  : 'Unlock full access. Start from just $29/month.'}
              </Typography>

              {/* Progress bar */}
              <Box sx={{ width: '100%' }}>
                <LinearProgress
                  variant="determinate"
                  value={progressPercentage}
                  sx={{
                    height: 3,
                    borderRadius: 1.5,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#fff',
                      borderRadius: 1.5,
                      transition: 'transform 0.3s ease',
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    mt: 0.2,
                    display: 'block',
                    textAlign: 'right',
                    fontSize: '0.65rem',
                    lineHeight: 1.2,
                  }}
                >
                  {Math.round(progressPercentage)}% of trial used
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Box>
      </Box>
    );
  }

  return null;
};

export default TrialBanner;
