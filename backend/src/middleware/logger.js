import logger from '../utils/logger.js';

/**
 * Request/Response logging middleware
 * Logs all API requests with detailed information including:
 * - Timestamp
 * - User ID (if authenticated)
 * - Endpoint
 * - HTTP method
 * - Status code
 * - Response time
 * - Error stack traces for 5xx errors
 */
const requestLogger = (req, res, next) => {
  // Capture the start time
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;
  const originalJson = res.json;

  // Track if response has been logged
  let logged = false;

  // Log function to avoid duplicate logs
  const logRequest = (statusCode) => {
    if (logged) return;
    logged = true;

    const duration = Date.now() - startTime;
    const userId = req.user?.id || req.session?.userId || 'anonymous';

    // Build log data
    const logData = {
      timestamp: new Date().toISOString(),
      userId,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      path: req.path,
      statusCode,
      responseTime: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Add query params if present
    if (req.query && Object.keys(req.query).length > 0) {
      logData.queryParams = req.query;
    }

    // Add request body for non-GET requests (sanitize sensitive data)
    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = { ...req.body };
      // Remove sensitive fields from logging
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
      sensitiveFields.forEach(field => {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = '[REDACTED]';
        }
      });
      logData.requestBody = sanitizedBody;
    }

    // Determine log level based on status code
    if (statusCode >= 500) {
      // For 5xx errors, log with error level and include stack trace if available
      logData.level = 'error';

      // If there's an error object stored on the response, include the stack trace
      if (res.locals.error) {
        logData.error = {
          message: res.locals.error.message,
          stack: res.locals.error.stack,
          name: res.locals.error.name,
        };
      }

      logger.error('HTTP Request Error', logData);
    } else if (statusCode >= 400) {
      // For 4xx errors, log as warning
      logger.warn('HTTP Request Warning', logData);
    } else {
      // For successful requests, log at http level
      logger.http('HTTP Request', logData);
    }
  };

  // Override res.json to capture status code
  res.json = function(body) {
    const statusCode = res.statusCode || 200;
    logRequest(statusCode);
    return originalJson.call(this, body);
  };

  // Override res.end to capture final status code
  res.end = function(...args) {
    const statusCode = res.statusCode || 200;
    logRequest(statusCode);
    return originalEnd.apply(this, args);
  };

  // Handle errors by storing them on res.locals for logging
  res.on('error', (error) => {
    res.locals.error = error;
  });

  next();
};

/**
 * Error logging middleware
 * Should be added after all routes to catch unhandled errors
 * Captures detailed error information for 5xx errors
 */
export const errorLogger = (err, req, res, next) => {
  // Store error on res.locals so request logger can access it
  res.locals.error = err;

  // Log the error immediately
  const logData = {
    timestamp: new Date().toISOString(),
    userId: req.user?.id || req.session?.userId || 'anonymous',
    method: req.method,
    endpoint: req.originalUrl || req.url,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      statusCode: err.statusCode || err.status || 500,
    },
  };

  logger.error('Unhandled Error', logData);

  // Pass to next error handler
  next(err);
};

export default requestLogger;
