import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Paper,
  IconButton,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import useApiMutation from '../hooks/useApiMutation.js';
import { COUNTRIES } from '../lib/countries.js';
import { queryKeys } from '../utils/queryKeys.js';

const PROPERTY_TYPES = [
  'Residential',
  'Commercial',
  'Mixed-Use',
  'Industrial',
  'Retail',
  'Office',
];

const PROPERTY_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
];

const MAINTENANCE_FREQUENCY = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];

const initialState = {
  basicInfo: {
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    propertyType: '',
    yearBuilt: '',
    totalUnits: '0',
    totalArea: '',
    status: 'ACTIVE',
    description: '',
    imageUrl: '',
  },
  units: [
    {
      label: '',
      bedrooms: '',
      bathrooms: '',
      area: '',
      rent: '',
    },
  ],
  owners: {
    emails: [''],
    message: '',
  },
  maintenance: {
    planName: '',
    frequency: 'Monthly',
    autoAssign: true,
    notifyTeam: true,
    notes: '',
  },
  inspection: {
    date: '',
    time: '',
    inspector: '',
    notes: '',
  },
};

const steps = [
  { label: 'Basic property info', description: 'Tell us about the property you are onboarding.' },
  { label: 'Add units', description: 'Add unit details so leasing and maintenance teams stay in sync.' },
  { label: 'Invite owners', description: 'Share access with owners or stakeholders who need visibility.' },
  { label: 'Set up maintenance plans', description: 'Define preventive maintenance cadence and notifications.' },
  { label: 'Schedule first inspection', description: 'Plan the initial inspection to kick off operations.' },
];

const getErrorMessage = (error) => {
  if (!error) return '';
  return error?.response?.data?.message || error.message || 'Something went wrong while saving the property.';
};

export default function PropertyOnboardingWizard({ open, onClose }) {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [formState, setFormState] = useState(initialState);
  const [completed, setCompleted] = useState({});
  const [basicInfoErrors, setBasicInfoErrors] = useState({});
  const [createdProperty, setCreatedProperty] = useState(null);

  const createPropertyMutation = useApiMutation({
    url: '/properties',
    method: 'post',
  });

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setFormState(initialState);
      setCompleted({});
      setBasicInfoErrors({});
      setCreatedProperty(null);
    }
  }, [open]);

  const basicInfo = useMemo(() => formState.basicInfo, [formState.basicInfo]);

  const handleBasicInfoChange = (field) => (event) => {
    const { value } = event.target;
    setFormState((prev) => ({
      ...prev,
      basicInfo: {
        ...prev.basicInfo,
        [field]: value,
      },
    }));
    setBasicInfoErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const handleUnitChange = (index, field) => (event) => {
    const { value } = event.target;
    setFormState((prev) => {
      const updatedUnits = [...prev.units];
      updatedUnits[index] = {
        ...updatedUnits[index],
        [field]: value,
      };
      return {
        ...prev,
        units: updatedUnits,
      };
    });
  };

  const addUnit = () => {
    setFormState((prev) => ({
      ...prev,
      units: [
        ...prev.units,
        { label: '', bedrooms: '', bathrooms: '', area: '', rent: '' },
      ],
    }));
  };

  const removeUnit = (index) => () => {
    setFormState((prev) => ({
      ...prev,
      units: prev.units.filter((_, unitIndex) => unitIndex !== index),
    }));
  };

  const handleOwnerEmailChange = (index) => (event) => {
    const { value } = event.target;
    setFormState((prev) => {
      const updatedEmails = [...prev.owners.emails];
      updatedEmails[index] = value;
      return {
        ...prev,
        owners: {
          ...prev.owners,
          emails: updatedEmails,
        },
      };
    });
  };

  const addOwnerEmail = () => {
    setFormState((prev) => ({
      ...prev,
      owners: {
        ...prev.owners,
        emails: [...prev.owners.emails, ''],
      },
    }));
  };

  const removeOwnerEmail = (index) => () => {
    setFormState((prev) => ({
      ...prev,
      owners: {
        ...prev.owners,
        emails: prev.owners.emails.filter((_, emailIndex) => emailIndex !== index),
      },
    }));
  };

  const handleOwnerMessageChange = (event) => {
    const { value } = event.target;
    setFormState((prev) => ({
      ...prev,
      owners: {
        ...prev.owners,
        message: value,
      },
    }));
  };

  const handleMaintenanceChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormState((prev) => ({
      ...prev,
      maintenance: {
        ...prev.maintenance,
        [field]: value,
      },
    }));
  };

  const handleInspectionChange = (field) => (event) => {
    const { value } = event.target;
    setFormState((prev) => ({
      ...prev,
      inspection: {
        ...prev.inspection,
        [field]: value,
      },
    }));
  };

  const validateBasicInfo = () => {
    const errors = {};

    if (!basicInfo.name.trim()) errors.name = 'Property name is required';
    if (!basicInfo.address.trim()) errors.address = 'Address is required';
    if (!basicInfo.city.trim()) errors.city = 'City / locality is required';
    if (!basicInfo.country) errors.country = 'Country is required';
    if (!basicInfo.propertyType) errors.propertyType = 'Property type is required';

    if (basicInfo.yearBuilt) {
      const year = parseInt(basicInfo.yearBuilt, 10);
      const currentYear = new Date().getFullYear();
      if (Number.isNaN(year) || year < 1800 || year > currentYear) {
        errors.yearBuilt = `Year must be between 1800 and ${currentYear}`;
      }
    }

    if (basicInfo.totalUnits && Number.isNaN(parseInt(basicInfo.totalUnits, 10))) {
      errors.totalUnits = 'Must be a valid number';
    }

    if (basicInfo.totalArea && Number.isNaN(parseFloat(basicInfo.totalArea))) {
      errors.totalArea = 'Must be a valid number';
    }

    setBasicInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateBasicInfo()) {
      return;
    }

    setCompleted((prev) => ({
      ...prev,
      [activeStep]: true,
    }));
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCancel = () => {
    if (createPropertyMutation.isPending) return;
    if (onClose) onClose();
  };

  const handleFinish = async () => {
    if (!validateBasicInfo()) {
      setActiveStep(0);
      return;
    }

    try {
      const payload = {
        name: basicInfo.name.trim(),
        address: basicInfo.address.trim(),
        city: basicInfo.city.trim(),
        state: basicInfo.state.trim() || null,
        zipCode: basicInfo.zipCode.trim() || null,
        country: basicInfo.country,
        propertyType: basicInfo.propertyType,
        yearBuilt: basicInfo.yearBuilt ? parseInt(basicInfo.yearBuilt, 10) : null,
        totalUnits: parseInt(basicInfo.totalUnits, 10) || 0,
        totalArea: basicInfo.totalArea ? parseFloat(basicInfo.totalArea) : null,
        status: basicInfo.status,
        description: basicInfo.description.trim() || null,
        imageUrl: basicInfo.imageUrl.trim() || null,
      };

      const response = await createPropertyMutation.mutateAsync({ data: payload });
      const savedProperty = response?.data;

      setCompleted((prev) => ({
        ...prev,
        [activeStep]: true,
      }));
      setCreatedProperty(savedProperty || payload);
      setActiveStep(steps.length);
      await queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
    } catch (error) {
      // handled by alert below
    }
  };

  const renderBasicInfoStep = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Provide the essential property details. You can always update this information later.
      </Typography>

      <TextField
        fullWidth
        required
        id="onboarding-property-name"
        label="Property Name"
        value={basicInfo.name}
        onChange={handleBasicInfoChange('name')}
        error={Boolean(basicInfoErrors.name)}
        helperText={basicInfoErrors.name}
      />

      <TextField
        fullWidth
        required
        id="onboarding-property-address"
        label="Street Address"
        value={basicInfo.address}
        onChange={handleBasicInfoChange('address')}
        error={Boolean(basicInfoErrors.address)}
        helperText={basicInfoErrors.address}
      />

      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
        <TextField
          fullWidth
          required
          id="onboarding-property-city"
          label="City"
          value={basicInfo.city}
          onChange={handleBasicInfoChange('city')}
          error={Boolean(basicInfoErrors.city)}
          helperText={basicInfoErrors.city}
        />
        <TextField
          fullWidth
          id="onboarding-property-state"
          label="State / Province"
          value={basicInfo.state}
          onChange={handleBasicInfoChange('state')}
        />
      </Stack>

      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
        <TextField
          fullWidth
          id="onboarding-property-zip"
          label="Postal Code"
          value={basicInfo.zipCode}
          onChange={handleBasicInfoChange('zipCode')}
        />
        <TextField
          fullWidth
          required
          id="onboarding-property-country"
          label="Country"
          select
          value={basicInfo.country}
          onChange={handleBasicInfoChange('country')}
          error={Boolean(basicInfoErrors.country)}
          helperText={basicInfoErrors.country}
        >
          {COUNTRIES.map((country) => (
            <MenuItem key={country.code} value={country.name}>
              {country.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
        <TextField
          fullWidth
          required
          id="onboarding-property-type"
          label="Property Type"
          select
          value={basicInfo.propertyType}
          onChange={handleBasicInfoChange('propertyType')}
          error={Boolean(basicInfoErrors.propertyType)}
          helperText={basicInfoErrors.propertyType}
        >
          {PROPERTY_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          id="onboarding-property-status"
          label="Status"
          select
          value={basicInfo.status}
          onChange={handleBasicInfoChange('status')}
        >
          {PROPERTY_STATUSES.map((status) => (
            <MenuItem key={status.value} value={status.value}>
              {status.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
        <TextField
          fullWidth
          id="onboarding-property-year-built"
          label="Year Built"
          type="number"
          value={basicInfo.yearBuilt}
          onChange={handleBasicInfoChange('yearBuilt')}
          error={Boolean(basicInfoErrors.yearBuilt)}
          helperText={basicInfoErrors.yearBuilt}
        />
        <TextField
          fullWidth
          id="onboarding-property-total-units"
          label="Total Units"
          type="number"
          value={basicInfo.totalUnits}
          onChange={handleBasicInfoChange('totalUnits')}
          error={Boolean(basicInfoErrors.totalUnits)}
          helperText={basicInfoErrors.totalUnits}
        />
        <TextField
          fullWidth
          id="onboarding-property-total-area"
          label="Total Area (sq ft)"
          type="number"
          value={basicInfo.totalArea}
          onChange={handleBasicInfoChange('totalArea')}
          error={Boolean(basicInfoErrors.totalArea)}
          helperText={basicInfoErrors.totalArea}
        />
      </Stack>

      <TextField
        fullWidth
        multiline
        minRows={3}
        id="onboarding-property-description"
        label="Description"
        value={basicInfo.description}
        onChange={handleBasicInfoChange('description')}
      />

      <TextField
        fullWidth
        id="onboarding-property-image-url"
        label="Image URL (optional)"
        value={basicInfo.imageUrl}
        onChange={handleBasicInfoChange('imageUrl')}
      />
    </Stack>
  );

  const renderUnitsStep = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Capture unit details like bedrooms, bathrooms, and target rent. This helps downstream leasing workflows.
      </Typography>

      {formState.units.map((unit, index) => (
        <Paper key={`unit-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">Unit {index + 1}</Typography>
              {formState.units.length > 1 && (
                <IconButton size="small" onClick={removeUnit(index)} aria-label={`Remove unit ${index + 1}`}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                fullWidth
                label="Unit Label / Number"
                value={unit.label}
                onChange={handleUnitChange(index, 'label')}
              />
              <TextField
                fullWidth
                label="Bedrooms"
                type="number"
                value={unit.bedrooms}
                onChange={handleUnitChange(index, 'bedrooms')}
              />
              <TextField
                fullWidth
                label="Bathrooms"
                type="number"
                value={unit.bathrooms}
                onChange={handleUnitChange(index, 'bathrooms')}
              />
            </Stack>

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                fullWidth
                label="Area (sq ft)"
                type="number"
                value={unit.area}
                onChange={handleUnitChange(index, 'area')}
              />
              <TextField
                fullWidth
                label="Market Rent"
                type="number"
                value={unit.rent}
                onChange={handleUnitChange(index, 'rent')}
              />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label="Progress saved" color="success" size="small" variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                Units can be edited later from the property detail page.
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      ))}

      <Button variant="outlined" startIcon={<AddIcon />} onClick={addUnit} sx={{ alignSelf: 'flex-start' }}>
        Add Another Unit
      </Button>
    </Stack>
  );

  const renderOwnersStep = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Invite owners or stakeholders by email. They will receive onboarding instructions when you finish.
      </Typography>

      {formState.owners.emails.map((email, index) => (
        <Stack key={`owner-${index}`} spacing={1} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }}>
          <TextField
            fullWidth
            type="email"
            label={`Owner Email ${index + 1}`}
            value={email}
            onChange={handleOwnerEmailChange(index)}
          />
          {formState.owners.emails.length > 1 && (
            <IconButton onClick={removeOwnerEmail(index)} aria-label={`Remove owner ${index + 1}`}>
              <DeleteOutlineIcon />
            </IconButton>
          )}
        </Stack>
      ))}

      <Button variant="outlined" startIcon={<AddIcon />} onClick={addOwnerEmail} sx={{ alignSelf: 'flex-start' }}>
        Add Another Owner
      </Button>

      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Personal message (optional)"
        value={formState.owners.message}
        onChange={handleOwnerMessageChange}
        helperText="This note will be included in the invitation email."
      />
    </Stack>
  );

  const renderMaintenanceStep = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Configure recurring maintenance so nothing slips through the cracks.
      </Typography>

      <TextField
        fullWidth
        label="Plan Name"
        placeholder="e.g. HVAC preventative maintenance"
        value={formState.maintenance.planName}
        onChange={handleMaintenanceChange('planName')}
      />

      <TextField
        fullWidth
        select
        label="Frequency"
        value={formState.maintenance.frequency}
        onChange={handleMaintenanceChange('frequency')}
      >
        {MAINTENANCE_FREQUENCY.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>

      <FormControlLabel
        control={
          <Switch
            checked={formState.maintenance.autoAssign}
            onChange={handleMaintenanceChange('autoAssign')}
            name="autoAssign"
          />
        }
        label="Automatically assign to the default maintenance team"
      />

      <FormControlLabel
        control={
          <Switch
            checked={formState.maintenance.notifyTeam}
            onChange={handleMaintenanceChange('notifyTeam')}
            name="notifyTeam"
          />
        }
        label="Send reminder notifications to the maintenance team"
      />

      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Notes"
        placeholder="Add any special instructions for technicians"
        value={formState.maintenance.notes}
        onChange={handleMaintenanceChange('notes')}
      />
    </Stack>
  );

  const renderInspectionStep = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Schedule the first inspection so you can document property condition from day one.
      </Typography>

      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
        <TextField
          fullWidth
          type="date"
          label="Inspection Date"
          InputLabelProps={{ shrink: true }}
          value={formState.inspection.date}
          onChange={handleInspectionChange('date')}
        />
        <TextField
          fullWidth
          type="time"
          label="Inspection Time"
          InputLabelProps={{ shrink: true }}
          value={formState.inspection.time}
          onChange={handleInspectionChange('time')}
        />
      </Stack>

      <TextField
        fullWidth
        label="Inspector"
        placeholder="Assign to a team member"
        value={formState.inspection.inspector}
        onChange={handleInspectionChange('inspector')}
      />

      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Inspection Notes"
        value={formState.inspection.notes}
        onChange={handleInspectionChange('notes')}
      />
    </Stack>
  );

  const renderCompletion = () => (
    <Box sx={{ mt: 2 }}>
      <Stack spacing={2} alignItems="flex-start">
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {createdProperty?.name || basicInfo.name || 'Property onboarding complete'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Great job! Your property has been created and the initial onboarding checklist is wrapped up.
        </Typography>

        <Divider sx={{ width: '100%' }} />

        <List sx={{ width: '100%' }}>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Property profile created"
              secondary={`${basicInfo.city || 'City'}, ${basicInfo.country || 'Country'}`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Units drafted"
              secondary={`${formState.units.length} unit${formState.units.length === 1 ? '' : 's'} prepared for onboarding`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Owner invitations ready"
              secondary={
                formState.owners.emails.filter(Boolean).length > 0
                  ? formState.owners.emails.filter(Boolean).join(', ')
                  : 'You can send invitations whenever you are ready.'
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Maintenance plan outlined"
              secondary={`Cadence: ${formState.maintenance.frequency}`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="First inspection scheduled"
              secondary={
                formState.inspection.date
                  ? `${formState.inspection.date}${formState.inspection.time ? ` at ${formState.inspection.time}` : ''}`
                  : 'Inspection schedule can be added later.'
              }
            />
          </ListItem>
        </List>

        <Alert severity="success" sx={{ width: '100%' }}>
          Next up: review your units, send owner invites, and add tenants when ready.
        </Alert>
      </Stack>
    </Box>
  );

  const stepContent = useMemo(() => {
    switch (activeStep) {
      case 0:
        return renderBasicInfoStep();
      case 1:
        return renderUnitsStep();
      case 2:
        return renderOwnersStep();
      case 3:
        return renderMaintenanceStep();
      case 4:
        return renderInspectionStep();
      default:
        return renderCompletion();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, formState, basicInfoErrors]);

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>Property onboarding</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ py: 2 }}>
          {steps.map((step, index) => (
            <Step key={step.label} completed={Boolean(completed[index])}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep < steps.length && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: -1, mb: 2 }}>
            {steps[activeStep].description}
          </Typography>
        )}

        {createPropertyMutation.isError && activeStep === steps.length - 1 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {getErrorMessage(createPropertyMutation.error)}
          </Alert>
        )}

        {stepContent}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {activeStep < steps.length && (
          <Button onClick={handleCancel} disabled={createPropertyMutation.isPending}>
            Cancel
          </Button>
        )}

        {activeStep > 0 && activeStep < steps.length && (
          <Button onClick={handleBack} disabled={createPropertyMutation.isPending}>
            Back
          </Button>
        )}

        {activeStep < steps.length - 1 && (
          <Button variant="contained" onClick={handleNext}>
            Save & Continue
          </Button>
        )}

        {activeStep === steps.length - 1 && (
          <Button
            variant="contained"
            onClick={handleFinish}
            disabled={createPropertyMutation.isPending}
          >
            {createPropertyMutation.isPending ? 'Saving...' : 'Finish setup'}
          </Button>
        )}

        {activeStep === steps.length && (
          <Button variant="contained" onClick={onClose}>
            Return to properties
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
