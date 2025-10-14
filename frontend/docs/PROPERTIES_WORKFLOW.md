# Properties Workflow Documentation

## Overview
The properties workflow has been completely redesigned to be production-ready with comprehensive validation, error handling, and user experience improvements.

## Components

### PropertyForm
**Location**: `frontend/src/components/PropertyForm.jsx`

A reusable form component for creating and editing properties with:
- **Validation**: Uses `react-hook-form` + `zod` for robust validation
- **Image Management**: Upload up to 10 images (max 5MB each)
- **Error Handling**: Comprehensive error messages and field-level validation
- **Accessibility**: Proper ARIA labels and keyboard navigation

**Props**:
- `initialData`: Property data for edit mode
- `onSubmit`: Callback with FormData
- `onCancel`: Cancel callback
- `isSubmitting`: Loading state
- `submitError`: Error message to display
- `mode`: 'create' or 'edit'

### PropertyDialog
**Location**: `frontend/src/components/PropertyDialog.jsx`

Modal dialog for creating new properties:
- Wraps PropertyForm in a Material-UI Dialog
- Handles API calls via `useApiMutation`
- Prevents closing during submission
- Resets form on success

**Props**:
- `open`: Dialog visibility
- `onClose`: Close callback
- `onSuccess`: Success callback with created property

### PropertyImageCarousel
**Location**: `frontend/src/components/PropertyImageCarousel.jsx`

Displays property images in a carousel format (unchanged from previous implementation).

## Pages

### PropertiesPage
**Location**: `frontend/src/pages/PropertiesPage.jsx`

Main properties list page with:
- Search and filter functionality
- Grid layout with property cards
- Opens PropertyDialog for creating new properties
- Debounced search for performance

### PropertyDetailPage
**Location**: `frontend/src/pages/PropertyDetailPage.jsx`

Property details view with:
- Image carousel
- Property information display
- Edit and Delete actions
- Confirmation dialog for deletion
- Unit listing

### EditPropertyPage
**Location**: `frontend/src/pages/EditPropertyPage.jsx`

Property editing page with:
- Breadcrumb navigation
- PropertyForm in edit mode
- Loading and error states
- Automatic redirect on success

## Validation Rules

### Property Schema
```javascript
{
  name: string (required, max 200 chars)
  address: string (optional, max 500 chars)
  city: string (optional, max 100 chars)
  postcode: string (optional, max 20 chars)
  country: string (optional, max 100 chars)
  type: string (optional, one of: residential, commercial, industrial, retail, hospitality, office)
  status: string (default: 'Active', one of: Active, Inactive)
}
```

### Image Validation
- **File Type**: Only image files (image/*)
- **File Size**: Maximum 5MB per image
- **Total Images**: Maximum 10 images per property
- **Formats**: JPEG, PNG, GIF, WebP supported

## API Integration

### Endpoints Used
- `GET /api/properties` - List all properties
- `GET /api/properties/:id` - Get property details
- `POST /api/properties` - Create property (FormData)
- `PATCH /api/properties/:id` - Update property (FormData)
- `DELETE /api/properties/:id` - Delete property

### FormData Structure
```javascript
FormData {
  name: string
  address?: string
  city?: string
  postcode?: string
  country?: string
  type?: string
  status: string
  images: File[] // New images to upload
  existingImages?: string // JSON array of URLs to keep (edit mode only)
}
```

## Error Handling

### Form Validation Errors
- Displayed inline below each field
- Prevents submission until resolved
- Real-time validation on blur

### API Errors
- Displayed in Alert component at top of form
- Specific error messages from backend
- Retry functionality on failure

### Network Errors
- Caught and displayed to user
- Loading states prevent duplicate submissions
- Graceful degradation

## User Experience Features

### Loading States
- Skeleton loaders during data fetch
- Disabled buttons during submission
- Progress indicators for long operations

### Optimistic Updates
- Form remains responsive during submission
- Clear feedback on success/failure
- Automatic navigation on success

### Accessibility
- Keyboard navigation support
- ARIA labels on all interactive elements
- Focus management in dialogs
- Screen reader friendly

### Responsive Design
- Mobile-first approach
- Grid layout adapts to screen size
- Touch-friendly controls
- Optimized image sizes

## Testing

### Unit Tests
Location: `frontend/src/components/__tests__/PropertyForm.test.jsx`

Tests cover:
- Form validation rules
- Image upload constraints
- Required field validation
- Field length limits

### Manual Testing Checklist
- [ ] Create property with all fields
- [ ] Create property with only required fields
- [ ] Upload multiple images
- [ ] Edit property and update fields
- [ ] Edit property and add/remove images
- [ ] Delete property
- [ ] Cancel operations
- [ ] Test validation errors
- [ ] Test API errors
- [ ] Test on mobile devices

## Migration from Old Workflow

### Removed Components
- `PropertyWizard.jsx` - Replaced by PropertyDialog + PropertyForm
- Old `EditPropertyPage.jsx` - Replaced with new implementation

### Key Improvements
1. **Better Validation**: Zod schema validation vs manual checks
2. **Reusable Form**: Single form component for create/edit
3. **Image Management**: Better preview and removal UI
4. **Error Handling**: Comprehensive error states
5. **Type Safety**: Better TypeScript support (if added)
6. **Accessibility**: WCAG compliant
7. **Performance**: Optimized re-renders with react-hook-form

## Future Enhancements

### Potential Improvements
- [ ] Drag-and-drop image reordering
- [ ] Image cropping/editing
- [ ] Bulk property import
- [ ] Property templates
- [ ] Advanced search filters
- [ ] Export property data
- [ ] Property comparison view
- [ ] Map integration for location
- [ ] Property analytics dashboard

### Technical Debt
- Add TypeScript types
- Add E2E tests with Playwright
- Add Storybook stories
- Implement optimistic updates with React Query
- Add image optimization/compression
- Implement virtual scrolling for large lists

## Troubleshooting

### Common Issues

**Images not uploading**
- Check file size (max 5MB)
- Verify file type is image/*
- Check network tab for API errors

**Validation errors not clearing**
- Ensure form is using react-hook-form correctly
- Check zod schema matches backend expectations

**Form not submitting**
- Check browser console for errors
- Verify API endpoint is accessible
- Check authentication token is valid

**Images not displaying**
- Verify image URLs are correct
- Check CORS settings on backend
- Ensure uploads directory is accessible

## Support

For issues or questions:
1. Check this documentation
2. Review component source code
3. Check backend API documentation
4. Contact development team
