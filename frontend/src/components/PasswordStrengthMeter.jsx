import React from 'react';
import { Box, LinearProgress, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

/**
 * Password strength meter component with requirements checklist
 * @param {Object} props
 * @param {string} props.password - The password to validate
 * @param {boolean} props.showRequirements - Whether to show the requirements checklist (default: true)
 */
const PasswordStrengthMeter = ({ password, showRequirements = true }) => {
  // Password requirements
  const requirements = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  };

  // Calculate password strength (0-100)
  const getStrength = () => {
    if (!password) return 0;

    const checks = [
      requirements.minLength,
      requirements.hasUppercase,
      requirements.hasLowercase,
      requirements.hasNumber,
      requirements.hasSpecialChar,
    ];

    const passedChecks = checks.filter(Boolean).length;
    return (passedChecks / checks.length) * 100;
  };

  // Get color based on strength
  const getColor = () => {
    const strength = getStrength();
    if (strength === 100) return 'success';
    if (strength >= 60) return 'warning';
    return 'error';
  };

  // Get strength label
  const getLabel = () => {
    const strength = getStrength();
    if (strength === 100) return 'Strong';
    if (strength >= 80) return 'Good';
    if (strength >= 60) return 'Fair';
    if (strength >= 40) return 'Weak';
    return 'Very Weak';
  };

  const strength = getStrength();
  const color = getColor();
  const label = getLabel();
  const allRequirementsMet = Object.values(requirements).every(Boolean);

  return (
    <Box sx={{ width: '100%', mt: 1 }}>
      {password && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={strength}
              color={color}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color={`${color}.main`} sx={{ minWidth: 80, textAlign: 'right', fontWeight: 600 }}>
              {label}
            </Typography>
          </Box>
        </>
      )}

      {showRequirements && (
        <List dense sx={{ mt: 1, pt: 0 }}>
          <RequirementItem
            met={requirements.minLength}
            text="At least 12 characters"
          />
          <RequirementItem
            met={requirements.hasUppercase}
            text="At least one uppercase letter (A-Z)"
          />
          <RequirementItem
            met={requirements.hasLowercase}
            text="At least one lowercase letter (a-z)"
          />
          <RequirementItem
            met={requirements.hasNumber}
            text="At least one number (0-9)"
          />
          <RequirementItem
            met={requirements.hasSpecialChar}
            text="At least one special character (!@#$%^&*...)"
          />
        </List>
      )}
    </Box>
  );
};

const RequirementItem = ({ met, text }) => (
  <ListItem sx={{ py: 0.5, px: 0 }}>
    <ListItemIcon sx={{ minWidth: 32 }}>
      {met ? (
        <CheckCircleIcon color="success" fontSize="small" />
      ) : (
        <CancelIcon color="error" fontSize="small" />
      )}
    </ListItemIcon>
    <ListItemText
      primary={text}
      primaryTypographyProps={{
        variant: 'body2',
        color: met ? 'text.primary' : 'text.secondary',
      }}
    />
  </ListItem>
);

export default PasswordStrengthMeter;
