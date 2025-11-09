import { useId, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, DeleteOutline as DeleteOutlineIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { resolvePropertyImageUrl } from '../utils/propertyImages.js';
import { uploadPropertyImages } from '../utils/uploadPropertyImages.js';

const INITIAL_IMAGE = { url: '', name: '', altText: '' };

const PropertyPhotoUploader = ({
  title = 'Property photos',
  description = 'Showcase the property with high-quality photos. Each file can be up to 10MB.',
  images,
  coverImageUrl,
  propertyName,
  onChange,
  allowAltText = false,
  disabled = false,
}) => {
  const fileInputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const safeImages = Array.isArray(images) && images.length > 0 ? images : [];
  const hasImages = safeImages.length > 0;

  const updateImages = (updater) => {
    if (!onChange) return;
    const nextImages = typeof updater === 'function' ? updater(safeImages) : updater;
    const cleaned = Array.isArray(nextImages)
      ? nextImages.filter((image) => image && image.url)
      : [];
    // Bug Fix: Check if cleaned array has items before accessing cleaned[0]
    // Previous code could cause runtime error if cleaned array was empty
    const nextCover = cleaned.length
      ? (cleaned.find((image) => image.url === coverImageUrl)?.url || cleaned[0]?.url || '')
      : '';
    onChange(cleaned, nextCover);
  };

  const handleUpload = async (event) => {
    const files = Array.from(event?.target?.files || []);
    if (!files.length) return;

    // Bug Fix: Prevent concurrent uploads by checking if already uploading
    if (isUploading) {
      console.warn('Upload already in progress, ignoring new upload request');
      return;
    }

    // Bug Fix #13: Limit maximum number of files to prevent browser/server overload
    const MAX_FILES_PER_UPLOAD = 50;
    if (files.length > MAX_FILES_PER_UPLOAD) {
      setError(`Too many files selected. Maximum ${MAX_FILES_PER_UPLOAD} files per upload.`);
      if (event?.target) event.target.value = '';
      return;
    }

    // Bug Fix: Client-side validation before upload to save bandwidth
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    // Bug Fix #10: Add maximum dimension validation to prevent huge images
    const MAX_DIMENSION = 8000; // 8000px max width/height

    const invalidFiles = [];
    const dimensionCheckPromises = [];

    // First pass: check file size and type
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push({ file, reason: 'size' });
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        invalidFiles.push({ file, reason: 'type' });
        continue;
      }

      // Bug Fix #10: Check image dimensions before uploading
      const dimensionCheck = new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);
          if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
            resolve({ file, reason: 'dimension', width: img.width, height: img.height });
          } else {
            resolve(null);
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ file, reason: 'corrupt' });
        };

        img.src = url;
      });

      dimensionCheckPromises.push(dimensionCheck);
    }

    // Wait for all dimension checks to complete
    const dimensionResults = await Promise.all(dimensionCheckPromises);
    invalidFiles.push(...dimensionResults.filter(Boolean));

    if (invalidFiles.length > 0) {
      const oversized = invalidFiles.filter(f => f.reason === 'size');
      const wrongType = invalidFiles.filter(f => f.reason === 'type');
      const tooBig = invalidFiles.filter(f => f.reason === 'dimension');
      const corrupt = invalidFiles.filter(f => f.reason === 'corrupt');

      let errorMsg = '';
      if (oversized.length > 0) {
        errorMsg += `${oversized.length} file(s) exceed 10MB limit. `;
      }
      if (wrongType.length > 0) {
        errorMsg += `${wrongType.length} file(s) are not valid images (JPEG, PNG, GIF, WebP only). `;
      }
      if (tooBig.length > 0) {
        errorMsg += `${tooBig.length} file(s) exceed maximum dimensions (${MAX_DIMENSION}px). `;
      }
      if (corrupt.length > 0) {
        errorMsg += `${corrupt.length} file(s) are corrupted or unreadable. `;
      }

      setError(errorMsg.trim());
      if (event?.target) event.target.value = '';
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const uploaded = await uploadPropertyImages(files);
      updateImages((prev = []) => {
        const existing = Array.isArray(prev) ? prev : [];
        return [
          ...existing,
          ...uploaded.map((item) => ({
            ...INITIAL_IMAGE,
            url: item.url,
            name: item.name,
          })),
        ];
      });
    } catch (uploadError) {
      const message = uploadError?.response?.data?.message || uploadError?.message || 'Failed to upload images';
      setError(message);
    } finally {
      setIsUploading(false);
      // Bug Fix: Clear file input and release file references to prevent memory leaks
      if (event?.target) {
        event.target.value = '';
      }
      // Bug Fix: Force garbage collection of file references
      // This prevents memory leaks from large image files staying in memory
      if (typeof window !== 'undefined' && window.gc) {
        setTimeout(() => window.gc(), 100);
      }
    }
  };

  const handleRemove = (url) => {
    updateImages((prev = []) => prev.filter((image) => image.url !== url));
  };

  const handleSetCover = (url) => {
    if (!onChange) return;
    const nextCover = url || '';
    const nextImages = safeImages.slice();
    onChange(nextImages, nextCover);
  };

  const handleAltTextChange = (url, altText) => {
    updateImages((prev = []) =>
      prev.map((image) => (image.url === url ? { ...image, altText } : image))
    );
  };

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <Typography variant="subtitle2">{title}</Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          disabled={disabled || isUploading}
        >
          {isUploading ? 'Uploading…' : 'Upload photos'}
          <input
            id={fileInputId}
            type="file"
            hidden
            multiple
            accept="image/*"
            onChange={handleUpload}
            disabled={disabled}
          />
        </Button>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>

      {isUploading && <LinearProgress aria-label="Uploading property photos" />}

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {hasImages && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {safeImages.map((image) => {
            const resolvedUrl = resolvePropertyImageUrl(image.url, propertyName);
            const isCover = (coverImageUrl || '').trim() === image.url;

            return (
              <Stack
                key={image.url}
                spacing={1}
                sx={{
                  width: 140,
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: 100,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: isCover ? 'primary.main' : 'divider',
                    boxShadow: isCover ? 4 : 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleSetCover(image.url)}
                >
                  <Box
                    component="img"
                    src={resolvedUrl}
                    alt={image.altText || image.name || 'Property image'}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemove(image.url);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(0,0,0,0.55)',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                    }}
                    aria-label={`Remove ${image.name || 'uploaded image'}`}
                  >
                    <DeleteOutlineIcon fontSize="inherit" />
                  </IconButton>
                  <Chip
                    size="small"
                    color={isCover ? 'primary' : 'default'}
                    label={isCover ? 'Cover photo' : 'Make cover'}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSetCover(image.url);
                    }}
                    clickable={!isCover}
                    sx={{
                      position: 'absolute',
                      bottom: 4,
                      left: 4,
                      bgcolor: isCover ? 'primary.main' : 'rgba(255,255,255,0.9)',
                      color: isCover ? 'primary.contrastText' : 'text.primary',
                    }}
                  />
                </Box>
                {allowAltText && (
                  <TextField
                    size="small"
                    label="Alt text"
                    value={image.altText || ''}
                    onChange={(event) => handleAltTextChange(image.url, event.target.value)}
                    placeholder="Describe the image"
                  />
                )}
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

PropertyPhotoUploader.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  images: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string.isRequired,
      name: PropTypes.string,
      altText: PropTypes.string,
    })
  ),
  coverImageUrl: PropTypes.string,
  propertyName: PropTypes.string,
  onChange: PropTypes.func,
  allowAltText: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default PropertyPhotoUploader;

