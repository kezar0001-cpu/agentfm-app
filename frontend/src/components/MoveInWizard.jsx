
import React, { useState } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Box,
  TextField,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

const steps = [
  'Invite Tenant',
  'Schedule Move-in Inspection',
  'Document Unit Condition',
  'Collect Deposit',
  'Activate Lease',
];

const MoveInWizard = ({ unitId, onComplete }) => {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    leaseStart: '',
    leaseEnd: '',
    rentAmount: '',
    depositAmount: '',
  });

  const inviteMutation = useMutation({
    mutationFn: (email) => apiClient.post('/invites', { email, role: 'TENANT', unitId }),
    onSuccess: (data) => {
      setFormData({ ...formData, tenantId: data.invitedUser.id });
      toast.success('Tenant invited successfully');
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to invite tenant');
    },
  });

  const scheduleInspectionMutation = useMutation({
    mutationFn: (inspectionDate) => apiClient.post('/inspections', { 
      title: `Move-in inspection for Unit ${unitId}`,
      type: 'MOVE_IN',
      scheduledDate: inspectionDate,
      unitId,
    }),
    onSuccess: () => {
      toast.success('Inspection scheduled successfully');
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to schedule inspection');
    },
  });

  const moveInMutation = useMutation({
    mutationFn: (data) => apiClient.post(`/units/${unitId}/move-in`, data),
    onSuccess: () => {
      if (activeStep === steps.length - 1) {
        queryClient.invalidateQueries({ queryKey: ['units', unitId] });
        onComplete();
      } else {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
      }
    },
  });

  const handleNext = () => {
    if (activeStep === 0) {
      moveInMutation.mutate({ step: 0, ...formData });
    } else if (activeStep === 1) {
      moveInMutation.mutate({ step: 1, inspectionDate: formData.inspectionDate });
    } else if (activeStep === 4) {
      moveInMutation.mutate({ step: 4 });
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={2}>
            <TextField
              label="Tenant Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label="Lease Start Date"
              type="date"
              value={formData.leaseStart}
              onChange={(e) => setFormData({ ...formData, leaseStart: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Lease End Date"
              type="date"
              value={formData.leaseEnd}
              onChange={(e) => setFormData({ ...formData, leaseEnd: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Rent Amount"
              type="number"
              value={formData.rentAmount}
              onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
            />
            <TextField
              label="Deposit Amount"
              type="number"
              value={formData.depositAmount}
              onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
            />
          </Stack>
        );
      case 1:
        return (
          <TextField
            label="Inspection Date"
            type="date"
            value={formData.inspectionDate}
            onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
            InputLabelProps={{
              shrink: true,
            }}
          />
        );
      case 2:
        return (
          <TextField
            label="Inspection Findings"
            multiline
            rows={4}
            value={formData.findings}
            onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
          />
        );
      case 3:
        return (
          <FormControlLabel
            control={<Checkbox checked={formData.depositCollected} onChange={(e) => setFormData({ ...formData, depositCollected: e.target.checked })} />}
            label="Deposit Collected"
          />
        );
      case 4:
        return <Typography>Click Finish to activate the lease and complete the move-in process.</Typography>;
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <React.Fragment>
        <Typography sx={{ mt: 2, mb: 1 }}>Step {activeStep + 1}</Typography>
        {getStepContent(activeStep)}
        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          <Button
            color="inherit"
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          <Button onClick={handleNext} disabled={inviteMutation.isLoading || scheduleInspectionMutation.isLoading}>
            {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </Box>
      </React.Fragment>
    </Box>
  );
};

export default MoveInWizard;
