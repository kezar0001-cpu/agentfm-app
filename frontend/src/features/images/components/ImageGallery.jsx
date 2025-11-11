import React, { useState } from 'react';
import { Grid, Box, Typography, Button, Alert } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { ImageCard } from './ImageCard';

/**
 * Image gallery with grid layout and drag-and-drop reordering
 *
 * Features:
 * - Responsive grid layout (1-4 columns)
 * - Drag-and-drop reordering
 * - Empty state
 * - Bulk actions
 * - Lightbox support (future)
 */
export function ImageGallery({
  images = [],
  onDelete,
  onSetCover,
  onRetry,
  onUpdateCaption,
  onReorder,
  onClearAll,
  allowCaptions = false,
  allowReordering = true,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const hasImages = images.length > 0;
  const hasErrors = images.some(img => img.status === 'error');

  /**
   * Handle drag start
   */
  const handleDragStart = (index) => (event) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.currentTarget);

    // Add drag image styling
    event.currentTarget.style.opacity = '0.4';
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = (event) => {
    event.currentTarget.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (index) => (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null || draggedIndex === index) {
      return;
    }

    setDragOverIndex(index);
  };

  /**
   * Handle drop
   */
  const handleDrop = (index) => (event) => {
    event.preventDefault();

    if (draggedIndex === null || draggedIndex === index) {
      return;
    }

    console.log(`[ImageGallery] Reordering: ${draggedIndex} -> ${index}`);

    if (onReorder) {
      onReorder(draggedIndex, index);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /**
   * Empty state
   */
  if (!hasImages) {
    return (
      <Box
        sx={{
          p: 6,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: 'background.default',
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No images yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload images using the upload zone above
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Error Alert */}
      {hasErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Some images failed to upload. Click the retry button on each failed image to try again.
        </Alert>
      )}

      {/* Actions Bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {images.length} image{images.length !== 1 ? 's' : ''}
          {allowReordering && ' (drag to reorder)'}
        </Typography>

        {onClearAll && (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={onClearAll}
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Image Grid */}
      <Grid container spacing={2}>
        {images.map((image, index) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={3}
            key={image.id}
            onDragOver={allowReordering ? handleDragOver(index) : undefined}
            onDrop={allowReordering ? handleDrop(index) : undefined}
            sx={{
              position: 'relative',
              transition: 'all 0.2s',
              ...(dragOverIndex === index && {
                transform: 'scale(1.05)',
              }),
            }}
          >
            <ImageCard
              image={image}
              onDelete={onDelete}
              onSetCover={onSetCover}
              onRetry={onRetry}
              onUpdateCaption={onUpdateCaption}
              allowCaptions={allowCaptions}
              draggable={allowReordering}
              onDragStart={allowReordering ? handleDragStart(index) : undefined}
              onDragEnd={allowReordering ? handleDragEnd : undefined}
            />
          </Grid>
        ))}
      </Grid>

      {/* Upload Summary */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Completed: {images.filter(img => img.status === 'complete').length} |{' '}
          Uploading: {images.filter(img => img.status === 'uploading').length} |{' '}
          Failed: {images.filter(img => img.status === 'error').length} |{' '}
          Pending: {images.filter(img => img.status === 'pending').length}
        </Typography>
      </Box>
    </Box>
  );
}
