import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import {
  usePropertyImages,
  useAddPropertyImage,
  useUpdatePropertyImage,
  useDeletePropertyImage,
  useReorderPropertyImages,
} from '../hooks/usePropertyImages.js';
import { useNotification } from '../hooks/useNotification.js';
import { resolvePropertyImageUrl } from '../utils/propertyImages.js';
import { uploadPropertyImages } from '../utils/uploadPropertyImages.js';

const PropertyImageManager = ({ propertyId, canEdit = false, onImagesUpdated }) => {
  const { showSuccess, showError } = useNotification();
  const { data: imagesData, isLoading } = usePropertyImages(propertyId);
  // Bug Fix: Removed manual refetch() calls - mutations now auto-invalidate via invalidateKeys
  const addImageMutation = useAddPropertyImage(propertyId, () => {
    showSuccess('Image added successfully');
    if (typeof onImagesUpdated === 'function') {
      onImagesUpdated();
    }
  });
  const updateImageMutation = useUpdatePropertyImage(propertyId, () => {
    showSuccess('Image updated successfully');
    if (typeof onImagesUpdated === 'function') {
      onImagesUpdated();
    }
  });
  const deleteImageMutation = useDeletePropertyImage(propertyId, () => {
    showSuccess('Image deleted successfully');
    if (typeof onImagesUpdated === 'function') {
      onImagesUpdated();
    }
  });
  const reorderImagesMutation = useReorderPropertyImages(propertyId, () => {
    showSuccess('Images reordered successfully');
    if (typeof onImagesUpdated === 'function') {
      onImagesUpdated();
    }
  });

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [bulkUploadError, setBulkUploadError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  // Bug Fix: Add optimistic state for drag-and-drop reordering
  // Provides immediate visual feedback instead of waiting for server response
  const [optimisticallyReorderedImages, setOptimisticallyReorderedImages] = useState(null);

  const images = optimisticallyReorderedImages || imagesData?.images || [];

  const handleAddImage = async () => {
    if (!imageUrl.trim()) {
      setUploadError('Image URL is required');
      return;
    }

    try {
      setUploadError('');
      const payload = {
        imageUrl: imageUrl.trim(),
        caption: altText.trim() || null,
      };

      if (images.length === 0) {
        payload.isPrimary = true;
      }

      await addImageMutation.mutateAsync({
        data: payload,
      });
      setUploadDialogOpen(false);
      setImageUrl('');
      setAltText('');
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Failed to add image');
    }
  };

  const handleUpdateAltText = async () => {
    if (!selectedImage) return;

    try {
      await updateImageMutation.mutateAsync({
        url: `/properties/${propertyId}/images/${selectedImage.id}`,
        data: {
          caption: altText.trim() || null,
        },
      });
      setEditDialogOpen(false);
      setSelectedImage(null);
      setAltText('');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update image');
    }
  };

  const handleSetPrimary = async (image) => {
    if (image.isPrimary) return;

    try {
      await updateImageMutation.mutateAsync({
        url: `/properties/${propertyId}/images/${image.id}`,
        data: {
          isPrimary: true,
        },
      });
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to set primary image');
    }
  };

  const handleDeleteImage = async () => {
    if (!selectedImage) return;

    try {
      await deleteImageMutation.mutateAsync({
        url: `/properties/${propertyId}/images/${selectedImage.id}`,
      });
      setDeleteDialogOpen(false);
      setSelectedImage(null);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete image');
    }
  };

  const openEditDialog = (image) => {
    setSelectedImage(image);
    setAltText(image.caption || '');
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (image) => {
    setSelectedImage(image);
    setDeleteDialogOpen(true);
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event?.target?.files || []);
    if (!files.length) return;

    setIsUploadingFiles(true);
    setBulkUploadError('');

    // Bug Fix: Track successes and failures for better error reporting
    let successCount = 0;
    let failureCount = 0;
    let firstError = null;

    try {
      const uploaded = await uploadPropertyImages(files);

      // Bug Fix: Use Promise.allSettled to attempt all uploads even if some fail
      // This provides better UX than stopping at first failure
      const uploadResults = await Promise.allSettled(
        uploaded.map(async (file, index) => {
          const payload = {
            imageUrl: file.url,
            caption: null,
          };

          // Only set first image as primary if no images exist yet
          if (images.length === 0 && index === 0) {
            payload.isPrimary = true;
          }

          return addImageMutation.mutateAsync({
            data: payload,
          });
        })
      );

      // Bug Fix: Count successes and failures for comprehensive error message
      uploadResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failureCount++;
          if (!firstError) {
            firstError = result.reason;
          }
        }
      });

      // Bug Fix: Provide detailed feedback about partial failures
      if (failureCount > 0 && successCount > 0) {
        setBulkUploadError(
          `${successCount} of ${files.length} images uploaded successfully. ` +
          `${failureCount} failed: ${firstError?.response?.data?.message || firstError?.message || 'Unknown error'}`
        );
      } else if (failureCount > 0) {
        setBulkUploadError(
          `Failed to upload images: ${firstError?.response?.data?.message || firstError?.message || 'Unknown error'}`
        );
      }
    } catch (error) {
      setBulkUploadError(error?.response?.data?.message || error?.message || 'Failed to upload images');
    } finally {
      setIsUploadingFiles(false);
      if (event?.target) {
        event.target.value = '';
      }
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Bug Fix: Optimistic update - immediately show reordered images for better UX
    // Reorder the images array
    const baseImages = imagesData?.images || [];
    const reorderedImages = [...baseImages];
    const [draggedImage] = reorderedImages.splice(draggedIndex, 1);
    reorderedImages.splice(dropIndex, 0, draggedImage);

    // Set optimistic state for immediate visual feedback
    setOptimisticallyReorderedImages(reorderedImages);

    // Create the ordered array of image IDs
    const orderedImageIds = reorderedImages.map(img => img.id);

    try {
      await reorderImagesMutation.mutateAsync({
        data: { orderedImageIds },
      });
      // Clear optimistic state on success - real data will be fetched
      setOptimisticallyReorderedImages(null);
    } catch (error) {
      // Rollback optimistic update on error
      setOptimisticallyReorderedImages(null);
      showError(error.response?.data?.message || 'Failed to reorder images');
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {canEdit && (
        <Stack spacing={1.5} mb={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              disabled={isUploadingFiles}
            >
              {isUploadingFiles ? 'Uploading…' : 'Upload photos'}
              <input type="file" hidden multiple accept="image/*" onChange={handleFileUpload} />
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setUploadDialogOpen(true)}
              disabled={addImageMutation.isPending}
            >
              Add via URL
            </Button>
          </Stack>
          {bulkUploadError && (
            <Alert severity="error" onClose={() => setBulkUploadError('')}>
              {bulkUploadError}
            </Alert>
          )}
        </Stack>
      )}

      {images.length === 0 ? (
        <Alert severity="info">No images uploaded yet</Alert>
      ) : (
        <>
          {canEdit && images.length > 1 && (
            <Alert
              severity="info"
              sx={{
                mb: 2,
                background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(33, 150, 243, 0.15) 100%)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DragIndicatorIcon fontSize="small" sx={{ color: 'primary.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Drag and drop images to reorder • First image is the cover photo
                </Typography>
              </Box>
            </Alert>
          )}
          <Grid container spacing={2}>
            {images.map((image, index) => (
              <Grid item xs={12} sm={6} md={4} key={image.id}>
                <Card
                  draggable={canEdit}
                  onDragStart={(e) => canEdit && handleDragStart(e, index)}
                  onDragOver={(e) => canEdit && handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => canEdit && handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    cursor: canEdit ? 'grab' : 'default',
                    opacity: draggedIndex === index ? 0.4 : 1,
                    transform: draggedIndex === index ? 'scale(0.95) rotate(2deg)' : 'scale(1)',
                    border: dragOverIndex === index ? '3px dashed' : '1px solid',
                    borderColor: dragOverIndex === index ? 'primary.main' : 'divider',
                    backgroundColor: dragOverIndex === index ? 'action.hover' : 'background.paper',
                    boxShadow: draggedIndex === index ? 6 : dragOverIndex === index ? 4 : 1,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    '&:hover': canEdit ? {
                      boxShadow: 4,
                      transform: 'translateY(-4px)',
                      borderColor: 'primary.light',
                      '& .drag-handle': {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      },
                    } : {},
                    '&:active': canEdit ? {
                      cursor: 'grabbing',
                    } : {},
                  }}
                >
                  <Box position="relative">
                  <CardMedia
                    component="img"
                    height="200"
                    image={resolvePropertyImageUrl(image.imageUrl)}
                    alt={image.caption || 'Property image'}
                    sx={{ objectFit: 'cover' }}
                  />
                  {image.isPrimary && (
                    <Chip
                      label="Primary"
                      color="primary"
                      size="small"
                      icon={<StarIcon />}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                      }}
                    />
                  )}
                  {canEdit && (
                    <Box
                      className="drag-handle"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: 2,
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <DragIndicatorIcon sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                  )}
                </Box>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {image.caption || 'No alt text'}
                  </Typography>
                  {canEdit && (
                    <Box display="flex" gap={1} mt={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleSetPrimary(image)}
                        color={image.isPrimary ? 'primary' : 'default'}
                        title="Set as primary image"
                      >
                        {image.isPrimary ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(image)}
                        title="Edit alt text"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => openDeleteDialog(image)}
                        color="error"
                        title="Delete image"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        </>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Property Image
          <IconButton
            onClick={() => setUploadDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {uploadError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Image URL"
            type="url"
            fullWidth
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            helperText="Paste a direct image URL. Use the Upload photos button above for local files."
            required
          />
          <TextField
            margin="dense"
            label="Alt text (optional)"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            helperText="Describe the image for accessibility"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddImage}
            variant="contained"
            disabled={addImageMutation.isPending}
          >
            {addImageMutation.isPending ? 'Adding...' : 'Add Image'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Alt Text Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Image Alt Text</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Alt text"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateAltText}
            variant="contained"
            disabled={updateImageMutation.isPending}
          >
            {updateImageMutation.isPending ? 'Updating...' : 'Save Alt Text'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Image</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this image? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteImage}
            color="error"
            variant="contained"
            disabled={deleteImageMutation.isPending}
          >
            {deleteImageMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PropertyImageManager;
