/**
 * Standardized error response utility
 * Ensures consistent error format across all API routes
 */

/**
 * Standard error response format
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} details - Optional additional error details
 */
export function sendError(res, statusCode, message, details = null) {
  const response = {
    success: false,
    message,
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Handle Prisma errors and convert to user-friendly messages
 * @param {Error} error - Prisma error object
 * @returns {Object} - { statusCode, message }
 */
export function handlePrismaError(error) {
  // P2002: Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return {
      statusCode: 409,
      message: `A record with this ${field} already exists`,
    };
  }
  
  // P2025: Record not found
  if (error.code === 'P2025') {
    return {
      statusCode: 404,
      message: 'Record not found',
    };
  }
  
  // P2003: Foreign key constraint violation
  if (error.code === 'P2003') {
    return {
      statusCode: 400,
      message: 'Invalid reference to related record',
    };
  }
  
  // P2014: Relation violation
  if (error.code === 'P2014') {
    return {
      statusCode: 400,
      message: 'Cannot delete record due to existing relationships',
    };
  }
  
  // Default Prisma error
  if (error.code?.startsWith('P')) {
    return {
      statusCode: 400,
      message: 'Database operation failed',
    };
  }
  
  // Generic error
  return {
    statusCode: 500,
    message: error.message || 'Internal server error',
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
        const { statusCode, message } = handlePrismaError(error);
        return sendError(res, statusCode, message);
      }
      
      // Handle validation errors
      if (error.name === 'ZodError') {
        const firstError = error.errors[0];
        return sendError(res, 400, firstError.message, { errors: error.errors });
      }
      
      // Handle custom errors with statusCode
      if (error.statusCode) {
        return sendError(res, error.statusCode, error.message);
      }
      
      // Generic error
      return sendError(res, 500, 'Internal server error');
    });
  };
}

/**
 * Create a custom error with status code
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

// Common error creators
export const notFound = (message = 'Resource not found') => new ApiError(404, message);
export const badRequest = (message = 'Bad request') => new ApiError(400, message);
export const unauthorized = (message = 'Unauthorized') => new ApiError(401, message);
export const forbidden = (message = 'Forbidden') => new ApiError(403, message);
export const conflict = (message = 'Conflict') => new ApiError(409, message);
