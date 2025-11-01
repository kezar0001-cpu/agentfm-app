import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { ArrowBack, Home } from '@mui/icons-material';
import PropertyForm from '../components/PropertyForm';
import useApiQuery from '../hooks/useApiQuery';
import useApiMutation from '../hooks/useApiMutation';
import { queryKeys } from '../utils/queryKeys.js';

export default function EditPropertyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useApiQuery({
    queryKey: queryKeys.properties.detail(id),
    url: `/properties/${id}`,
  });

  const { mutateAsync, isPending } = useApiMutation({
    url: `/properties/${id}`,
    method: 'patch',
  });

  const property = data?.property || data;

  const handleSubmit = async (formData) => {
    try {
      setSubmitError(null);
      const response = await mutateAsync({ data: formData });
      if (response?.success !== false) {
        navigate(`/properties/${id}`);
      } else {
        throw new Error(response?.message || 'Failed to update property');
      }
    } catch (err) {
      setSubmitError(err?.message || 'Failed to update property');
      throw err;
    }
  };

  const handleCancel = () => {
    navigate(`/properties/${id}`);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    const is404 = error?.message?.toLowerCase().includes('not found') || error?.status === 404;
    
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {is404 ? 'Property not found' : error?.message || 'Failed to load property'}
        </Alert>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => refetch()}>
            Retry
          </Button>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/properties')}
          >
            Back to Properties
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!property) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
        <Alert severity="warning">Property data not available</Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/properties')}
          sx={{ mt: 2 }}
        >
          Back to Properties
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Stack spacing={3}>
        <Box>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
            <Link
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              color="inherit"
              onClick={() => navigate('/properties')}
            >
              <Home sx={{ mr: 0.5 }} fontSize="small" />
              Properties
            </Link>
            <Link
              underline="hover"
              sx={{ cursor: 'pointer' }}
              color="inherit"
              onClick={() => navigate(`/properties/${id}`)}
            >
              {property.name}
            </Link>
            <Typography color="text.primary">Edit</Typography>
          </Breadcrumbs>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={{ xs: 2, md: 0 }}
          >
            <Typography variant="h4" component="h1" fontWeight={700}>
              Edit Property
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(`/properties/${id}`)}
              disabled={isPending}
              fullWidth
              sx={{ maxWidth: { xs: '100%', md: 'auto' } }}
            >
              Back
            </Button>
          </Stack>
        </Box>

        <Paper sx={{ p: { xs: 2, md: 4 } }}>
          <PropertyForm
            mode="edit"
            initialData={property}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isPending}
            submitError={submitError}
          />
        </Paper>
      </Stack>
    </Box>
  );
}
