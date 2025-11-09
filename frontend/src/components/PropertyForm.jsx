import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Alert,
  Box,
  useMediaQuery,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  Apartment as ApartmentIcon,
} from '@mui/icons-material';
import useApiMutation from '../hooks/useApiMutation';
import PropertyBasicInfo from './forms/PropertyBasicInfo';
import PropertyLocation from './forms/PropertyLocation';
import PropertyManagement from './forms/PropertyManagement';
import PropertyAmenitiesForm from './PropertyAmenitiesForm';
import PropertyFinancials from './PropertyFinancials';
import { propertySchema, propertyDefaultValues } from '../schemas/propertySchema';
import { queryKeys } from '../utils/queryKeys';
import PropertyPhotoUploader from './PropertyPhotoUploader.jsx';
import { normaliseUploadedImages } from '../utils/uploadPropertyImages.js';

const PROPERTY_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
];

// Helper function to normalize country values from backend
const normaliseCountryValue = (country) => {
  return country || '';
};

export default function PropertyForm({ open, onClose, property, onSuccess }) {
  const isEdit = !!property;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(propertySchema),
    defaultValues: propertyDefaultValues,
    mode: 'onBlur',
  });

  const [photoSelections, setPhotoSelections] = useState([]);
  const [coverImage, setCoverImage] = useState('');

  // Create/Update mutation
  const mutation = useApiMutation({
    url: isEdit ? `/properties/${property?.id}` : '/properties',
    method: isEdit ? 'patch' : 'post',
    invalidateKeys: [queryKeys.properties.all()],
  });

  // Initialize form with property data if editing
  useEffect(() => {
    if (property) {
      const normalisedImages = normaliseUploadedImages(
        property.images?.length ? property.images : property.imageUrl ? [{ imageUrl: property.imageUrl }] : []
      );
      setPhotoSelections(normalisedImages);
      const initialCover = property.imageUrl || normalisedImages[0]?.url || '';
      setCoverImage(initialCover);

      reset({
        name: property.name || '',
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: property.zipCode || '',
        country: normaliseCountryValue(property.country),
        propertyType: property.propertyType || '',
        yearBuilt: property.yearBuilt?.toString() || '',
        totalUnits: property.totalUnits?.toString() || '0',
        totalArea: property.totalArea?.toString() || '',
        status: property.status || 'ACTIVE',
        description: property.description || '',
        imageUrl: initialCover || '',
        // Enhanced property details
        lotSize: property.lotSize?.toString() || '',
        buildingSize: property.buildingSize?.toString() || '',
        numberOfFloors: property.numberOfFloors?.toString() || '',
        constructionType: property.constructionType || '',
        heatingSystem: property.heatingSystem || '',
        coolingSystem: property.coolingSystem || '',
        amenities: property.amenities || null,
        // Financial information
        purchasePrice: property.purchasePrice?.toString() || '',
        purchaseDate: property.purchaseDate || null,
        currentMarketValue: property.currentMarketValue?.toString() || '',
        annualPropertyTax: property.annualPropertyTax?.toString() || '',
        annualInsurance: property.annualInsurance?.toString() || '',
        monthlyHOA: property.monthlyHOA?.toString() || '',
      });
    } else {
      reset(propertyDefaultValues);
      setPhotoSelections([]);
      setCoverImage('');
    }
  }, [property, open, reset]);

  // Auto-focus on first error field
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      setFocus(firstErrorField);
    }
  }, [errors, setFocus]);

  const propertyName = watch('name');
  const imageUrlValue = watch('imageUrl');

  useEffect(() => {
    if (typeof imageUrlValue === 'string') {
      setCoverImage(imageUrlValue);
    }
  }, [imageUrlValue]);

  const handleImagesChange = (nextImages = [], nextCover = '') => {
    setPhotoSelections(nextImages);
    const resolvedCover = nextCover || nextImages[0]?.url || '';
    setCoverImage(resolvedCover);
    setValue('imageUrl', resolvedCover || '', { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (data) => {
    try {
      const coverFromForm = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '';
      const imagePayload = photoSelections
        .map((image, index) => {
          if (!image || !image.url) {
            return null;
          }

          const trimmedAltText = typeof image.altText === 'string' ? image.altText.trim() : '';

          return {
            imageUrl: image.url,
            caption: trimmedAltText ? trimmedAltText : null,
            isPrimary: coverFromForm ? image.url === coverFromForm : index === 0,
          };
        })
        .filter(Boolean);

      const imageUrls = imagePayload.map((image) => image.imageUrl);

      await mutation.mutateAsync({
        data: {
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state || null,
          zipCode: data.zipCode || null,
          country: data.country,
          propertyType: data.propertyType,
          yearBuilt: data.yearBuilt,
          totalUnits: data.totalUnits,
          totalArea: data.totalArea,
          status: data.status,
          description: data.description || null,
          imageUrl: coverFromForm || null,
          images: imageUrls,
          imageMetadata: imagePayload,
          // Enhanced property details
          lotSize: data.lotSize,
          buildingSize: data.buildingSize,
          numberOfFloors: data.numberOfFloors,
          constructionType: data.constructionType || null,
          heatingSystem: data.heatingSystem || null,
          coolingSystem: data.coolingSystem || null,
          amenities: data.amenities || null,
          // Financial information
          purchasePrice: data.purchasePrice,
          purchaseDate: data.purchaseDate,
          currentMarketValue: data.currentMarketValue,
          annualPropertyTax: data.annualPropertyTax,
          annualInsurance: data.annualInsurance,
          monthlyHOA: data.monthlyHOA,
        },
      });

      onSuccess();
    } catch (error) {
      // Error is shown via mutation.error
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        {isEdit ? 'Edit Property' : 'Add New Property'}
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }} role="alert">
              {mutation.error?.message || 'Failed to save property'}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <HomeIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Property Information</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <PropertyBasicInfo control={control} />
                    </Grid>
                    <Grid item xs={12}>
                      <PropertyLocation control={control} />
                    </Grid>
                    <Grid item xs={12}>
                      <PropertyPhotoUploader
                        images={photoSelections}
                        coverImageUrl={coverImage}
                        onChange={handleImagesChange}
                        propertyName={propertyName}
                        allowAltText
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <PropertyManagement control={control} />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Amenities Section */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ApartmentIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6">Amenities & Features</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Controller
                    name="amenities"
                    control={control}
                    render={({ field }) => (
                      <PropertyAmenitiesForm
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting || mutation.isPending}
                      />
                    )}
                  />
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Financial Information Section */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MoneyIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="h6">Financial Information</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Controller
                      name="purchasePrice"
                      control={control}
                      render={({ field: purchasePriceField }) => (
                        <Controller
                          name="purchaseDate"
                          control={control}
                          render={({ field: purchaseDateField }) => (
                            <Controller
                              name="currentMarketValue"
                              control={control}
                              render={({ field: currentMarketValueField }) => (
                                <Controller
                                  name="annualPropertyTax"
                                  control={control}
                                  render={({ field: annualPropertyTaxField }) => (
                                    <Controller
                                      name="annualInsurance"
                                      control={control}
                                      render={({ field: annualInsuranceField }) => (
                                        <Controller
                                          name="monthlyHOA"
                                          control={control}
                                          render={({ field: monthlyHOAField }) => (
                                            <PropertyFinancials
                                              value={{
                                                purchasePrice: purchasePriceField.value,
                                                purchaseDate: purchaseDateField.value,
                                                currentMarketValue: currentMarketValueField.value,
                                                annualPropertyTax: annualPropertyTaxField.value,
                                                annualInsurance: annualInsuranceField.value,
                                                monthlyHOA: monthlyHOAField.value,
                                              }}
                                              onChange={(financials) => {
                                                purchasePriceField.onChange(financials.purchasePrice);
                                                purchaseDateField.onChange(financials.purchaseDate);
                                                currentMarketValueField.onChange(financials.currentMarketValue);
                                                annualPropertyTaxField.onChange(financials.annualPropertyTax);
                                                annualInsuranceField.onChange(financials.annualInsurance);
                                                monthlyHOAField.onChange(financials.monthlyHOA);
                                              }}
                                              disabled={isSubmitting || mutation.isPending}
                                              showPrivateInfo={true}
                                            />
                                          )}
                                        />
                                      )}
                                    />
                                  )}
                                />
                              )}
                            />
                          )}
                        />
                      )}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, md: 3 },
          pb: { xs: 2, md: 2 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}
      >
        <Button
          onClick={onClose}
          disabled={isSubmitting || mutation.isPending}
          fullWidth={isMobile}
          sx={{ minHeight: { xs: 48, md: 36 } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || mutation.isPending}
          fullWidth={isMobile}
          sx={{ minHeight: { xs: 48, md: 36 } }}
        >
          {mutation.isPending
            ? 'Saving...'
            : isEdit
            ? 'Update Property'
            : 'Create Property'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
