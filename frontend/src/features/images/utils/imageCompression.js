import imageCompression from 'browser-image-compression';

/**
 * Compress an image file before upload
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} Compressed image file
 */
export async function compressImage(file, options = {}) {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
    fileType: 'image/jpeg',
    quality: 0.9,
    initialQuality: 0.9,
  };

  const compressionOptions = { ...defaultOptions, ...options };

  try {
    console.log(`[Compression] Starting compression for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    const startTime = performance.now();

    const compressedFile = await imageCompression(file, compressionOptions);

    const endTime = performance.now();
    const originalSize = file.size / 1024 / 1024;
    const compressedSize = compressedFile.size / 1024 / 1024;
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`[Compression] Complete in ${(endTime - startTime).toFixed(0)}ms`);
    console.log(`[Compression] Size: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB (${reduction}% reduction)`);

    return compressedFile;
  } catch (error) {
    console.error('[Compression] Failed:', error);
    // Return original file if compression fails
    return file;
  }
}

/**
 * Compress multiple images
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<File[]>} Array of compressed files
 */
export async function compressImages(files, options = {}, onProgress) {
  const compressed = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (onProgress) {
      onProgress(i + 1, files.length);
    }

    const compressedFile = await compressImage(file, options);
    compressed.push(compressedFile);
  }

  return compressed;
}

/**
 * Get image dimensions from file
 * @param {File} file - Image file
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Create a preview URL from a file
 * @param {File} file - Image file
 * @returns {Promise<string>} Data URL
 */
export function createPreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Check if image needs compression
 * @param {File} file - Image file
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {Promise<boolean>}
 */
export async function needsCompression(file, maxSizeMB = 1) {
  const fileSizeMB = file.size / 1024 / 1024;

  if (fileSizeMB <= maxSizeMB) {
    return false;
  }

  // Also check dimensions
  try {
    const { width, height } = await getImageDimensions(file);
    return width > 2000 || height > 2000;
  } catch {
    // If we can't get dimensions, compress based on file size
    return fileSizeMB > maxSizeMB;
  }
}
