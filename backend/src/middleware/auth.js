import { prisma } from '../config/prismaClient.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware to verify JWT token and attach user to request.
 * Throws 401 if token is missing or invalid.
 * 
 * Usage:
 *   router.use(requireAuth);
 *   router.get('/protected', (req, res) => {
 *     // req.user is available here
 *   });
 */
export async function requireAuth(req, res, next) {
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
 * 
 * Usage:
 *   router.use(optionalAuth);
 *   router.get('/public-or-private', (req, res) => {
 *     if (req.user) {
 *       // User is authenticated
 *     } else {
 *       // User is not authenticated
 *     }
 *   });
 */
export async function optionalAuth(req, res, next) {
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

export default {
  requireAuth,
  optionalAuth
};
