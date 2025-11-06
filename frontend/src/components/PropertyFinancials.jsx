// frontend/src/components/PropertyFinancials.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  TextField,
  Typography,
  InputAdornment,
  Divider,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as TaxIcon,
  Security as InsuranceIcon,
  HomeWork as HOAIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

/**
 * PropertyFinancials component for managing property financial information
 * @param {object} value - Financial data object
 * @param {function} onChange - Callback when financials change
 * @param {boolean} disabled - Whether fields are disabled
 * @param {boolean} showPrivateInfo - Whether to show owner/PM-only financial info
 */
const PropertyFinancials = ({
  value = {},
  onChange,
  disabled = false,
  showPrivateInfo = true,
}) => {
  const [financials, setFinancials] = useState({
    purchasePrice: '',
    purchaseDate: '',
    currentMarketValue: '',
    annualPropertyTax: '',
    annualInsurance: '',
    monthlyHOA: '',
  });

  // Initialize from value prop
  useEffect(() => {
    if (value && typeof value === 'object') {
      setFinancials({
        purchasePrice: value.purchasePrice ?? '',
        purchaseDate: value.purchaseDate
          ? new Date(value.purchaseDate).toISOString().split('T')[0]
          : '',
        currentMarketValue: value.currentMarketValue ?? '',
        annualPropertyTax: value.annualPropertyTax ?? '',
        annualInsurance: value.annualInsurance ?? '',
        monthlyHOA: value.monthlyHOA ?? '',
      });
    }
  }, [value]);

  const handleFieldChange = (field, newValue) => {
    const updatedFinancials = {
      ...financials,
      [field]: newValue,
    };
    setFinancials(updatedFinancials);

    // Call onChange with processed values
    if (onChange) {
      const parsePurchasePrice = parseFloat(updatedFinancials.purchasePrice);
      const parseMarketValue = parseFloat(updatedFinancials.currentMarketValue);
      const parsePropertyTax = parseFloat(updatedFinancials.annualPropertyTax);
      const parseInsurance = parseFloat(updatedFinancials.annualInsurance);
      const parseHOA = parseFloat(updatedFinancials.monthlyHOA);

      const processedData = {
        purchasePrice:
          updatedFinancials.purchasePrice === ''
            ? null
            : Number.isNaN(parsePurchasePrice) ? null : parsePurchasePrice,
        purchaseDate:
          updatedFinancials.purchaseDate === ''
            ? null
            : new Date(updatedFinancials.purchaseDate),
        currentMarketValue:
          updatedFinancials.currentMarketValue === ''
            ? null
            : Number.isNaN(parseMarketValue) ? null : parseMarketValue,
        annualPropertyTax:
          updatedFinancials.annualPropertyTax === ''
            ? null
            : Number.isNaN(parsePropertyTax) ? null : parsePropertyTax,
        annualInsurance:
          updatedFinancials.annualInsurance === ''
            ? null
            : Number.isNaN(parseInsurance) ? null : parseInsurance,
        monthlyHOA:
          updatedFinancials.monthlyHOA === ''
            ? null
            : Number.isNaN(parseHOA) ? null : parseHOA,
      };
      onChange(processedData);
    }
  };

  // Calculate derived metrics
  const calculateMonthlyCarryingCost = () => {
    const tax = parseFloat(financials.annualPropertyTax) || 0;
    const insurance = parseFloat(financials.annualInsurance) || 0;
    const hoa = parseFloat(financials.monthlyHOA) || 0;
    return (tax / 12 + insurance / 12 + hoa).toFixed(2);
  };

  const calculateAnnualCarryingCost = () => {
    const tax = parseFloat(financials.annualPropertyTax) || 0;
    const insurance = parseFloat(financials.annualInsurance) || 0;
    const hoa = parseFloat(financials.monthlyHOA) || 0;
    return (tax + insurance + hoa * 12).toFixed(2);
  };

  const calculateEquityGain = () => {
    const purchase = parseFloat(financials.purchasePrice) || 0;
    const current = parseFloat(financials.currentMarketValue) || 0;
    if (purchase === 0 || current === 0) return null;
    const gain = current - purchase;
    const percentage = ((gain / purchase) * 100).toFixed(2);
    return { gain, percentage };
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const equityGain = calculateEquityGain();

  if (!showPrivateInfo) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Financial information is only available to Property Managers and Owners.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Purchase Information */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Purchase Information
          </Typography>
          <Tooltip title="Information about the property acquisition">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Purchase Price"
              type="number"
              value={financials.purchasePrice}
              onChange={(e) => handleFieldChange('purchasePrice', e.target.value)}
              disabled={disabled}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              helperText="Original purchase price of the property"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Purchase Date"
              type="date"
              value={financials.purchaseDate}
              onChange={(e) => handleFieldChange('purchaseDate', e.target.value)}
              disabled={disabled}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              helperText="Date the property was acquired"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Current Market Value"
              type="number"
              value={financials.currentMarketValue}
              onChange={(e) =>
                handleFieldChange('currentMarketValue', e.target.value)
              }
              disabled={disabled}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              helperText="Estimated current market value"
            />
          </Grid>

          {equityGain && equityGain.gain !== 0 && (
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  bgcolor:
                    equityGain.gain > 0
                      ? 'success.lighter'
                      : 'error.lighter',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <TrendingUpIcon
                  sx={{
                    mr: 1,
                    color:
                      equityGain.gain > 0 ? 'success.main' : 'error.main',
                  }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Equity Gain/Loss
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color:
                        equityGain.gain > 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    {formatCurrency(equityGain.gain)} ({equityGain.percentage}
                    %)
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Annual Expenses */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TaxIcon sx={{ mr: 1, color: 'warning.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Annual Expenses
          </Typography>
          <Tooltip title="Recurring annual costs for property ownership">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Annual Property Tax"
              type="number"
              value={financials.annualPropertyTax}
              onChange={(e) =>
                handleFieldChange('annualPropertyTax', e.target.value)
              }
              disabled={disabled}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              helperText="Yearly property tax amount"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Annual Insurance"
              type="number"
              value={financials.annualInsurance}
              onChange={(e) =>
                handleFieldChange('annualInsurance', e.target.value)
              }
              disabled={disabled}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              helperText="Yearly insurance premium"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Monthly HOA Fees"
              type="number"
              value={financials.monthlyHOA}
              onChange={(e) => handleFieldChange('monthlyHOA', e.target.value)}
              disabled={disabled}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              helperText="Monthly HOA/association fees"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Carrying Cost Summary */}
      {(financials.annualPropertyTax ||
        financials.annualInsurance ||
        financials.monthlyHOA) && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'grey.50',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <InsuranceIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6">Carrying Cost Summary</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Monthly Carrying Cost
                </Typography>
                <Typography variant="h5" color="primary.main" sx={{ mt: 1 }}>
                  {formatCurrency(calculateMonthlyCarryingCost())}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (Tax + Insurance + HOA) / 12
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Annual Carrying Cost
                </Typography>
                <Typography variant="h5" color="primary.main" sx={{ mt: 1 }}>
                  {formatCurrency(calculateAnnualCarryingCost())}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total annual property expenses
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            Carrying costs represent the ongoing expenses of property ownership,
            excluding mortgage payments and maintenance costs.
          </Alert>
        </Paper>
      )}
    </Box>
  );
};

export default PropertyFinancials;
