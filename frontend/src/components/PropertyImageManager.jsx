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
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import {
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

const PropertyImageManager = ({ propertyId, canEdit = false }) => {
  const { showSuccess, showError } = useNotification();
  const { data: imagesData, isLoading, refetch } = usePropertyImages(propertyId);
  const addImageMutation = useAddPropertyImage(propertyId, () => {
    showSuccess('Image added successfully');
    refetch();
  });
  const updateImageMutation = useUpdatePropertyImage(propertyId, () => {
    showSuccess('Image updated successfully');
    refetch();
  });
  const deleteImageMutation = useDeletePropertyImage(propertyId, () => {
    showSuccess('Image deleted successfully');
    refetch();
  });
  const reorderImagesMutation = useReorderPropertyImages(propertyId, () => {
    showSuccess('Images reordered successfully');
    refetch();
  });

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const images = imagesData?.images || [];

  const handleAddImage = async () => {
    if (!imageUrl.trim()) {
      setUploadError('Image URL is required');
      return;
    }

    try {
      setUploadError('');
      await addImageMutation.mutateAsync({
        data: {
          imageUrl: imageUrl.trim(),
          caption: caption.trim() || null,
          isPrimary: images.length === 0, // First image is primary by default
        },
      });
      setUploadDialogOpen(false);
      setImageUrl('');
      setCaption('');
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Failed to add image');
    }
  };

  const handleUpdateCaption = async () => {
    if (!selectedImage) return;

    try {
      await updateImageMutation.mutateAsync({
        url: `/properties/${propertyId}/images/${selectedImage.id}`,
        data: {
          caption: caption.trim() || null,
        },
      });
      setEditDialogOpen(false);
      setSelectedImage(null);
      setCaption('');
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
    setCaption(image.caption || '');
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (image) => {
    setSelectedImage(image);
    setDeleteDialogOpen(true);
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

    // Reorder the images array
    const reorderedImages = [...images];
    const [draggedImage] = reorderedImages.splice(draggedIndex, 1);
    reorderedImages.splice(dropIndex, 0, draggedImage);

    // Create the ordered array of image IDs
    const orderedImageIds = reorderedImages.map(img => img.id);

    try {
      await reorderImagesMutation.mutateAsync({
        data: { orderedImageIds },
      });
    } catch (error) {
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
        <Box mb={2}>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Add Image
          </Button>
        </Box>
      )}

      {images.length === 0 ? (
        <Alert severity="info">No images uploaded yet</Alert>
      ) : (
        <>
          {canEdit && images.length > 1 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DragIndicatorIcon fontSize="small" />
                <Typography variant="body2">
                  Drag and drop images to reorder them
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
                    cursor: canEdit ? 'move' : 'default',
                    opacity: draggedIndex === index ? 0.5 : 1,
                    border: dragOverIndex === index ? '2px dashed' : '1px solid',
                    borderColor: dragOverIndex === index ? 'primary.main' : 'divider',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': canEdit ? {
                      boxShadow: 3,
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
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        borderRadius: 1,
                        p: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <DragIndicatorIcon sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                  )}
                </Box>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {image.caption || 'No caption'}
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
                        title="Edit caption"
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
            helperText="Enter the URL of the image (upload images via the Uploads page first)"
            required
          />
          <TextField
            margin="dense"
            label="Caption (Optional)"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            helperText="Add a description for this image"
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

      {/* Edit Caption Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Image Caption</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Caption"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateCaption}
            variant="contained"
            disabled={updateImageMutation.isPending}
          >
            {updateImageMutation.isPending ? 'Updating...' : 'Update'}
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
