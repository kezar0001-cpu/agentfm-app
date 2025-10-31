import { prisma } from '../config/prismaClient.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Authentication and Authorization Middleware
 * Provides requireAuth, optionalAuth, requireRole, and subscription checking
 */

/**
 * Middleware to verify JWT token and attach user to request.
 * Throws 401 if token is missing or invalid.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token (will throw if JWT_SECRET is not set or token is invalid)
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      console.error('JWT verification failed:', {
        name: error.name,
        message: error.message
      });

      // Provide specific error messages
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.'
        });
      }

      // If JWT_SECRET is not set, this will be caught here
      if (error.message.includes('JWT_SECRET')) {
        console.error('CRITICAL: JWT_SECRET not configured!');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error. Please contact support.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { org: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}

/**
 * Optional authentication middleware.
 * Attaches user to request if token is valid, but doesn't require it.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { org: true }
      });

      if (user && user.isActive !== false) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but that's okay for optional auth
      console.debug('Optional auth: Invalid token provided');
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
}

/**
 * Middleware to check if user has one of the required roles
 * @param {Array<string>} allowedRoles - Array of roles that can access the route
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has an active subscription (placeholder)
 * TODO: Implement actual subscription checking logic
 */
function isSubscriptionActive(req, res, next) {
  // For now, allow all authenticated users through
  // Implement actual subscription logic when needed
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
}

/**
 * Middleware to require active subscription (placeholder)
 * TODO: Implement actual subscription checking logic
 */
function requireActiveSubscription(req, res, next) {
  return isSubscriptionActive(req, res, next);
}

/**
 * Middleware to require property manager subscription (placeholder)
 * TODO: Implement actual subscription checking logic
 */
function requirePropertyManagerSubscription(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'PROPERTY_MANAGER') {
    return res.status(403).json({
      success: false,
      message: 'Property manager access required'
    });
  }

  // TODO: Add subscription check
  next();
}

// Named exports
export {
  requireAuth,
  optionalAuth,
  requireRole,
  isSubscriptionActive,
  requireActiveSubscription,
  requirePropertyManagerSubscription
};

// Default export
export default {
  requireAuth,
  optionalAuth,
  requireRole,
  isSubscriptionActive,
  requireActiveSubscription,
  requirePropertyManagerSubscription
};
