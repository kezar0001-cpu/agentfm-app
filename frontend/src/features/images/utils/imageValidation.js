/**
 * Image validation utilities
 */

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

export const VALIDATION_RULES = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DIMENSION: 8000, // 8000px
  MIN_DIMENSION: 10, // 10px
  MAX_FILES: 50,
};

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, code, file = null) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.file = file;
  }
}

/**
 * Validate file type
 * @param {File} file
 * @throws {ValidationError}
 */
export function validateFileType(file) {
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    throw new ValidationError(
      `Invalid file type: ${file.type}. Only JPEG, PNG, GIF, WebP, and SVG are allowed.`,
      'INVALID_FILE_TYPE',
      file
    );
  }

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (extension && !ALLOWED_EXTENSIONS.includes(extension)) {
    throw new ValidationError(
      `Invalid file extension: ${extension}`,
      'INVALID_FILE_EXTENSION',
      file
    );
  }
}

/**
 * Validate file size
 * @param {File} file
 * @throws {ValidationError}
 */
export function validateFileSize(file) {
  if (file.size > VALIDATION_RULES.MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxMB = (VALIDATION_RULES.MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
    throw new ValidationError(
      `File too large: ${sizeMB}MB. Maximum size is ${maxMB}MB.`,
      'FILE_TOO_LARGE',
      file
    );
  }

  if (file.size === 0) {
    throw new ValidationError(
      'File is empty',
      'FILE_EMPTY',
      file
    );
  }
}

/**
 * Validate image dimensions
 * @param {File} file
 * @returns {Promise<{width: number, height: number}>}
 * @throws {ValidationError}
 */
export async function validateDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;

      if (width > VALIDATION_RULES.MAX_DIMENSION || height > VALIDATION_RULES.MAX_DIMENSION) {
        reject(new ValidationError(
          `Image dimensions too large: ${width}x${height}. Maximum is ${VALIDATION_RULES.MAX_DIMENSION}px.`,
          'DIMENSIONS_TOO_LARGE',
          file
        ));
        return;
      }

      if (width < VALIDATION_RULES.MIN_DIMENSION || height < VALIDATION_RULES.MIN_DIMENSION) {
        reject(new ValidationError(
          `Image dimensions too small: ${width}x${height}. Minimum is ${VALIDATION_RULES.MIN_DIMENSION}px.`,
          'DIMENSIONS_TOO_SMALL',
          file
        ));
        return;
      }

      resolve({ width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ValidationError(
        'Failed to load image. File may be corrupted.',
        'IMAGE_LOAD_FAILED',
        file
      ));
    };

    img.src = url;
  });
}

/**
 * Validate a single file
 * @param {File} file
 * @returns {Promise<{valid: boolean, error: ValidationError | null, dimensions: {width, height} | null}>}
 */
export async function validateFile(file) {
  try {
    validateFileType(file);
    validateFileSize(file);
    const dimensions = await validateDimensions(file);

    return {
      valid: true,
      error: null,
      dimensions,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof ValidationError ? error : new ValidationError(error.message, 'UNKNOWN_ERROR', file),
      dimensions: null,
    };
  }
}

/**
 * Validate multiple files
 * @param {File[]} files
 * @returns {Promise<{valid: File[], invalid: Array<{file: File, error: ValidationError}>}>}
 */
export async function validateFiles(files) {
  if (files.length > VALIDATION_RULES.MAX_FILES) {
    throw new ValidationError(
      `Too many files: ${files.length}. Maximum is ${VALIDATION_RULES.MAX_FILES}.`,
      'TOO_MANY_FILES'
    );
  }

  const results = await Promise.all(
    files.map(async (file) => {
      const result = await validateFile(file);
      return { file, ...result };
    })
  );

  return {
    valid: results.filter(r => r.valid).map(r => r.file),
    invalid: results.filter(r => !r.valid).map(r => ({ file: r.file, error: r.error })),
  };
}

/**
 * Get user-friendly error message
 * @param {ValidationError} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  const messages = {
    INVALID_FILE_TYPE: 'This file type is not supported. Please use JPEG, PNG, GIF, WebP, or SVG.',
    INVALID_FILE_EXTENSION: 'Invalid file extension. Please check your file.',
    FILE_TOO_LARGE: `File is too large. Maximum size is ${VALIDATION_RULES.MAX_FILE_SIZE / 1024 / 1024}MB.`,
    FILE_EMPTY: 'File is empty. Please select a valid image.',
    DIMENSIONS_TOO_LARGE: `Image is too large. Maximum dimension is ${VALIDATION_RULES.MAX_DIMENSION}px.`,
    DIMENSIONS_TOO_SMALL: `Image is too small. Minimum dimension is ${VALIDATION_RULES.MIN_DIMENSION}px.`,
    IMAGE_LOAD_FAILED: 'Failed to load image. The file may be corrupted.',
    TOO_MANY_FILES: `Too many files. Maximum is ${VALIDATION_RULES.MAX_FILES} files.`,
    UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
  };

  if (error instanceof ValidationError) {
    return error.message || messages[error.code] || messages.UNKNOWN_ERROR;
  }

  return messages.UNKNOWN_ERROR;
}
