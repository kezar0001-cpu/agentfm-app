import apiClient from '../api/client.js';

/**
 * Uploads one or more property image files to the backend uploads endpoint.
 * Returns an array of objects describing the uploaded files.
 *
 * @param {File[]} files
 * @returns {Promise<Array<{ url: string, name: string }>>}
 */
export async function uploadPropertyImages(files) {
  const candidates = Array.from(files || []).filter((file) => file instanceof File);
  if (!candidates.length) return [];

  const formData = new FormData();
  candidates.forEach((file) => {
    formData.append('files', file);
  });

  // Bug Fix: Add comprehensive error handling for upload endpoint
  try {
    const response = await apiClient.post('/uploads/multiple', formData);

    // Bug Fix: Validate response structure before accessing nested properties
    if (!response || !response.data) {
      throw new Error('Invalid response from upload endpoint');
    }

    const urls = Array.isArray(response.data.urls) ? response.data.urls : [];
    if (!urls.length) {
      throw new Error('Upload failed - no URLs returned from server');
    }

    return urls.map((url, index) => ({
      url,
      name: candidates[index]?.name || `Image ${index + 1}`,
    }));
  } catch (error) {
    // Bug Fix: Provide more specific error messages based on error type
    if (error.response?.status === 404) {
      throw new Error('Image upload endpoint not available. Please contact support.');
    }
    if (error.response?.status === 413) {
      throw new Error('Files are too large. Maximum size is 10MB per file.');
    }
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    // Re-throw with original message if available, or generic message
    throw new Error(error.message || 'Failed to upload images. Please try again.');
  }
}

/**
 * Normalises existing image data into the shape used by the uploader component.
 *
 * @param {Array<{ imageUrl?: string, url?: string, caption?: string, altText?: string, name?: string }>} images
 */
export function normaliseUploadedImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((image, index) => {
      if (!image) return null;
      const url = typeof image.url === 'string' && image.url.trim()
        ? image.url.trim()
        : typeof image.imageUrl === 'string' && image.imageUrl.trim()
          ? image.imageUrl.trim()
          : null;

      if (!url) return null;

      const altText = typeof image.altText === 'string' ? image.altText : image.caption;

      return {
        id: image.id || `image-${index}`,
        url,
        name: image.name || image.originalName || `Image ${index + 1}`,
        altText: altText ?? '',
      };
    })
    .filter(Boolean);
}

