/**
 * Standardized error response utility
 * Ensures consistent error format across all API routes
 */

import * as ErrorCodes from './errorCodes.js';

/**
 * Standard error response format
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - User-friendly error message
 * @param {string} code - Error code for frontend handling (optional)
 * @param {Array|Object} errors - Validation errors or additional error details (optional)
 */
export function sendError(res, statusCode, message, code = null, errors = null) {
  const response = {
    success: false,
    message,
  };

  // Add error code if provided
  if (code) {
    response.code = code;
  }

  // Add errors array/object if provided
  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

/**
 * Handle Prisma errors and convert to user-friendly messages
 * @param {Error} error - Prisma error object
 * @returns {Object} - { statusCode, message, code }
 */
export function handlePrismaError(error) {
  // P2002: Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return {
      statusCode: 409,
      message: `A record with this ${field} already exists`,
      code: ErrorCodes.DB_UNIQUE_CONSTRAINT,
    };
  }

  // P2025: Record not found
  if (error.code === 'P2025') {
    return {
      statusCode: 404,
      message: 'Record not found',
      code: ErrorCodes.DB_RECORD_NOT_FOUND,
    };
  }

  // P2003: Foreign key constraint violation
  if (error.code === 'P2003') {
    return {
      statusCode: 400,
      message: 'Invalid reference to related record',
      code: ErrorCodes.DB_FOREIGN_KEY_CONSTRAINT,
    };
  }

  // P2014: Relation violation
  if (error.code === 'P2014') {
    return {
      statusCode: 400,
      message: 'Cannot delete record due to existing relationships',
      code: ErrorCodes.DB_RELATION_VIOLATION,
    };
  }

  // Default Prisma error
  if (error.code?.startsWith('P')) {
    return {
      statusCode: 400,
      message: 'Database operation failed',
      code: ErrorCodes.DB_OPERATION_FAILED,
    };
  }

  // Generic error
  return {
    statusCode: 500,
    message: error.message || 'Internal server error',
    code: ErrorCodes.ERR_INTERNAL_SERVER,
  };
}

/**
 * Async route handler wrapper
 * Catches errors and sends standardized error responses
 * @param {Function} fn - Async route handler function
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Route error:', error);

      // Handle Prisma errors
      if (error.code?.startsWith('P')) {
        const { statusCode, message, code } = handlePrismaError(error);
        return sendError(res, statusCode, message, code);
      }

      // Handle validation errors (Zod)
      if (error.name === 'ZodError') {
        return sendError(
          res,
          400,
          'Validation error',
          ErrorCodes.VAL_VALIDATION_ERROR,
          error.errors
        );
      }

      // Handle custom ApiError with statusCode and code
      if (error.statusCode) {
        return sendError(
          res,
          error.statusCode,
          error.message,
          error.code || null,
          error.errors || null
        );
      }

      // Generic error
      return sendError(res, 500, 'Internal server error', ErrorCodes.ERR_INTERNAL_SERVER);
    });
  };
}

/**
 * Create a custom error with status code, error code, and optional errors array
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Error code (optional)
 * @param {Array|Object} errors - Validation errors or additional details (optional)
 */
export class ApiError extends Error {
  constructor(statusCode, message, code = null, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.name = 'ApiError';
  }
}

// Common error creators
export const notFound = (message = 'Resource not found', code = ErrorCodes.RES_NOT_FOUND) =>
  new ApiError(404, message, code);

export const badRequest = (message = 'Bad request', code = ErrorCodes.ERR_BAD_REQUEST, errors = null) =>
  new ApiError(400, message, code, errors);

export const unauthorized = (message = 'Unauthorized', code = ErrorCodes.AUTH_UNAUTHORIZED) =>
  new ApiError(401, message, code);

export const forbidden = (message = 'Forbidden', code = ErrorCodes.ACC_ACCESS_DENIED) =>
  new ApiError(403, message, code);

export const conflict = (message = 'Conflict', code = ErrorCodes.ERR_CONFLICT) =>
  new ApiError(409, message, code);

// Export ErrorCodes for use in routes
export { ErrorCodes };
