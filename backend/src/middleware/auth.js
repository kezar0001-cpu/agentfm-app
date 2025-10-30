import prisma from '../config/prismaClient.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware to require authentication
 * Verifies JWT token and attaches user to req.user
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.slice('Bearer '.length).trim();

    let decoded;
    try {
      decoded = verifyToken(token); // uses the single SECRET
    } catch (err) {
      console.error('JWT verify error:', err?.name, err?.message);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    req.user = user;
    return next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

/**
 * Middleware to require specific role(s)
 * Must be used after requireAuth
 * @param {...string} allowedRoles - One or more roles that are allowed
 * @example requireRole('PROPERTY_MANAGER', 'OWNER')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has access to a specific property
 * Must be used after requireAuth
 * Checks if user is property manager or owner of the property
 */
export const requirePropertyAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const propertyId = req.params.propertyId || req.params.id || req.body.propertyId;
    
    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Property ID required' });
    }

    // Property managers can access properties they manage
    if (req.user.role === 'PROPERTY_MANAGER') {
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          managerId: req.user.id,
        },
      });

      if (property) {
        req.property = property;
        return next();
      }
    }

    // Owners can access properties they own
    if (req.user.role === 'OWNER') {
      const ownership = await prisma.propertyOwner.findFirst({
        where: {
          propertyId,
          ownerId: req.user.id,
        },
        include: {
          property: true,
        },
      });

      if (ownership) {
        req.property = ownership.property;
        return next();
      }
    }

    // Technicians can access properties they're assigned to via jobs
    if (req.user.role === 'TECHNICIAN') {
      const job = await prisma.job.findFirst({
        where: {
          propertyId,
          assignedToId: req.user.id,
        },
        include: {
          property: true,
        },
      });

      if (job) {
        req.property = job.property;
        return next();
      }
    }

    return res.status(403).json({ success: false, message: 'Access denied to this property' });
  } catch (error) {
    console.error('Property access check error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify property access' });
  }
};

/**
 * Middleware to check subscription status
 * Blocks access if trial expired or subscription inactive
 */
export const requireActiveSubscription = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const { subscriptionStatus, trialEndDate } = req.user;

  // Active subscription is good
  if (subscriptionStatus === 'ACTIVE') {
    return next();
  }

  // Trial is good if not expired
  if (subscriptionStatus === 'TRIAL') {
    if (trialEndDate && new Date(trialEndDate) > new Date()) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Your trial period has expired. Please upgrade your plan to continue.',
      code: 'TRIAL_EXPIRED',
    });
  }

  // All other statuses are blocked
  return res.status(403).json({
    success: false,
    message: 'Active subscription required. Please upgrade your plan to access this feature.',
    code: 'SUBSCRIPTION_REQUIRED',
  });
};
