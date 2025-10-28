/**
 * Role-Based Authorization Middleware
 * Protects routes based on user roles
 * 
 * NOTE: This file is deprecated. Use ../src/middleware/auth.js instead.
 * Kept for backward compatibility with existing routes.
 */

// Roles from Prisma schema (no ADMIN role exists)
export const ROLES = {
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
  OWNER: 'OWNER',
  TECHNICIAN: 'TECHNICIAN',
  TENANT: 'TENANT'
};

/**
 * Middleware to check if user has one of the required roles
 * @param {Array<string>} allowedRoles - Array of roles that can access the route
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    // Check if user's role is in the allowed roles
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
 * Middleware to check if user is a property manager
 */
export function requirePropertyManager(req, res, next) {
  return requireRole(ROLES.ADMIN)(req, res, next);
}

/**
 * Middleware to check if user is a property manager or admin
 */
export function requirePropertyManager(req, res, next) {
  return requireRole(ROLES.ADMIN, ROLES.PROPERTY_MANAGER)(req, res, next);
}

/**
 * Middleware to check if user is a technician or admin
 */
export function requireTechnician(req, res, next) {
  return requireRole(ROLES.ADMIN, ROLES.TECHNICIAN)(req, res, next);
}

/**
 * Middleware to check if user owns or manages a specific property
 * Requires propertyId in req.params or req.body
 */
export async function requirePropertyAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const propertyId = req.params.propertyId || req.params.id || req.body.propertyId;
  
  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID required' });
  }

  const userRole = req.user.role;

  // Admins have access to all properties
  if (userRole === ROLES.ADMIN) {
    return next();
  }

  try {
    // For Property Managers, check if they manage this property
    if (userRole === ROLES.PROPERTY_MANAGER) {
      const profile = req.user.propertyManagerProfile;
      if (profile?.managedProperties?.includes(propertyId)) {
        return next();
      }
    }

    // For Owners, check if they own this property
    if (userRole === ROLES.OWNER) {
      const profile = req.user.ownerProfile;
      if (profile?.ownedProperties?.includes(propertyId)) {
        return next();
      }
    }

    // For Technicians, check if they have access to this property
    if (userRole === ROLES.TECHNICIAN) {
      const profile = req.user.technicianProfile;
      if (profile?.canAccessAllProperties || profile?.propertyAccess?.includes(propertyId)) {
        return next();
      }
    }

    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'You do not have access to this property'
    });
  } catch (error) {
    console.error('Error checking property access:', error);
    return res.status(500).json({ error: 'Error checking permissions' });
  }
}

/**
 * Middleware to check if user has access to a specific unit (for tenants)
 */
export async function requireUnitAccess(prisma) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const unitId = req.params.unitId || req.params.id || req.body.unitId;
    
    if (!unitId) {
      return res.status(400).json({ error: 'Unit ID required' });
    }

    const userRole = req.user.role;

    // Admins have access to all units
    if (userRole === ROLES.ADMIN) {
      return next();
    }

    try {
      // For tenants, check if they are linked to this unit
      if (userRole === ROLES.TENANT) {
        const link = await prisma.tenantUnitLink.findFirst({
          where: {
            userId: req.user.id,
            unitId: unitId,
            active: true
          }
        });

        if (!link) {
          return res.status(403).json({ 
            error: 'Forbidden',
            message: 'You do not have access to this unit'
          });
        }
      }

      // For property managers and owners, check property access
      if (userRole === ROLES.PROPERTY_MANAGER || userRole === ROLES.OWNER) {
        const unit = await prisma.unit.findUnique({
          where: { id: unitId }
        });

        if (unit) {
          req.params.propertyId = unit.propertyId;
          return requirePropertyAccess(req, res, next);
        }
      }

      next();
    } catch (error) {
      console.error('Error checking unit access:', error);
      return res.status(500).json({ error: 'Error checking permissions' });
    }
  };
}

/**
 * Middleware to ensure user profile exists for their role
 */
export async function ensureRoleProfile(prisma) {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check and create role-specific profile if needed
      switch (userRole) {
        case ROLES.TECHNICIAN:
          if (!req.user.technicianProfile) {
            await prisma.technicianProfile.create({
              data: { userId }
            });
          }
          break;

        case ROLES.PROPERTY_MANAGER:
          if (!req.user.propertyManagerProfile) {
            await prisma.propertyManagerProfile.create({
              data: { userId }
            });
          }
          break;

        case ROLES.OWNER:
          if (!req.user.ownerProfile) {
            await prisma.ownerProfile.create({
              data: { userId }
            });
          }
          break;

        case ROLES.TENANT:
          if (!req.user.tenantProfile) {
            await prisma.tenantProfile.create({
              data: { userId }
            });
          }
          break;
      }

      next();
    } catch (error) {
      console.error('Error ensuring role profile:', error);
      next(); // Continue even if profile creation fails
    }
  };
}

export default {
  ROLES,
  requireRole,
  requireAdmin,
  requirePropertyManager,
  requireTechnician,
  requirePropertyAccess,
  requireUnitAccess,
  ensureRoleProfile
};
