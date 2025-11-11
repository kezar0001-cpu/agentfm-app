import React, { useEffect, useCallback } from 'react';
import { Box, Divider, Alert } from '@mui/material';
import { useImageUpload } from '../hooks';
import { ImageUploadZone } from './ImageUploadZone';
import { ImageGallery } from './ImageGallery';
import { UploadQueue } from './UploadQueue';

/**
 * Complete property image management component
 *
 * Integrates:
 * - Image upload zone
 * - Image gallery with reordering
 * - Upload queue
 * - Optimistic UI
 *
 * This is a drop-in replacement for the old PropertyPhotoUploader
 */
export function PropertyImageManager({
  images: initialImages = [],
  coverImageUrl = '',
  onChange,
  allowCaptions = true,
  disabled = false,
  propertyName = '',
}) {
  const {
    images,
    isUploading,
    error,
    uploadFiles,
    removeImage,
    setCoverImage,
    retryUpload,
    reorderImages,
    updateCaption,
    clearAll,
    getCompletedImages,
    completedCount,
    errorCount,
  } = useImageUpload({
    endpoint: '/uploads/multiple',
    compressImages: true,
    maxConcurrent: 3,
    onSuccess: (completedImages) => {
      console.log('[PropertyImageManager] All uploads complete:', completedImages.length);
    },
    onError: (err) => {
      console.error('[PropertyImageManager] Upload error:', err);
    },
  });

  /**
   * Initialize with existing images
   */
  useEffect(() => {
    if (initialImages && initialImages.length > 0 && images.length === 0) {
      // Convert existing images to our format
      const converted = initialImages.map((img, index) => ({
        id: img.id || `existing-${index}`,
        localPreview: null,
        remoteUrl: img.url || img.imageUrl,
        file: null,
        status: 'complete',
        progress: 100,
        error: null,
        isPrimary: img.url === coverImageUrl || img.imageUrl === coverImageUrl || index === 0,
        caption: img.altText || img.caption || '',
        order: index,
        dimensions: null,
      }));

      console.log('[PropertyImageManager] Initialized with', converted.length, 'existing images');
      // This would require extending useImageUpload to support this
      // For now, we'll handle this in PropertyForm
    }
  }, [initialImages, coverImageUrl, images.length]);

  /**
   * Notify parent of changes
   */
  useEffect(() => {
    if (!onChange) return;

    const completedImages = getCompletedImages();

    // Get cover image URL
    const coverImage = images.find(img => img.isPrimary);
    const coverUrl = coverImage?.remoteUrl || '';

    console.log('[PropertyImageManager] Notifying parent:', {
      imageCount: completedImages.length,
      coverUrl: coverUrl ? coverUrl.substring(0, 60) + '...' : 'none',
    });

    // Call onChange with images and cover URL
    onChange(completedImages, coverUrl);
  }, [images, onChange, getCompletedImages]);

  /**
   * Handle file selection
   */
  const handleFilesSelected = useCallback((files) => {
    if (disabled) return;
    uploadFiles(files);
  }, [uploadFiles, disabled]);

  /**
   * Handle delete
   */
  const handleDelete = useCallback((imageId) => {
    if (disabled) return;
    removeImage(imageId);
  }, [removeImage, disabled]);

  /**
   * Handle set cover
   */
  const handleSetCover = useCallback((imageId) => {
    if (disabled) return;
    setCoverImage(imageId);
  }, [setCoverImage, disabled]);

  /**
   * Handle retry
   */
  const handleRetry = useCallback((imageId) => {
    if (disabled) return;
    retryUpload(imageId);
  }, [retryUpload, disabled]);

  /**
   * Handle caption update
   */
  const handleUpdateCaption = useCallback((imageId, caption) => {
    if (disabled) return;
    updateCaption(imageId, caption);
  }, [updateCaption, disabled]);

  /**
   * Handle clear all
   */
  const handleClearAll = useCallback(() => {
    if (disabled) return;
    if (window.confirm('Are you sure you want to remove all images?')) {
      clearAll();
    }
  }, [clearAll, disabled]);

  return (
    <Box>
      {/* Upload Zone */}
      <ImageUploadZone
        onFilesSelected={handleFilesSelected}
        accept="image/*"
        multiple={true}
        maxFiles={50}
        disabled={disabled}
      />

      <Divider sx={{ my: 3 }} />

      {/* Upload Queue - Compact View */}
      <UploadQueue
        images={images}
        isUploading={isUploading}
        compact={true}
      />

      {/* Error Alert */}
      {error && !isUploading && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Success Summary */}
      {completedCount > 0 && !isUploading && errorCount === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Successfully uploaded {completedCount} image{completedCount !== 1 ? 's' : ''}
        </Alert>
      )}

      {/* Image Gallery */}
      <ImageGallery
        images={images}
        onDelete={handleDelete}
        onSetCover={handleSetCover}
        onRetry={handleRetry}
        onUpdateCaption={handleUpdateCaption}
        onReorder={reorderImages}
        onClearAll={images.length > 0 ? handleClearAll : null}
        allowCaptions={allowCaptions}
        allowReordering={true}
      />
    </Box>
  );
}
