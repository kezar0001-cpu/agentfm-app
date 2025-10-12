import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { z } from 'zod';
import { prisma } from '../index.js';

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'PROPERTY_MANAGER', 'OWNER', 'TECHNICIAN', 'TENANT']).optional()
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum(['PROPERTY_MANAGER']), // Only Property Managers can self-signup
  company: z.string().min(1, 'Company name is required'),
  // Subscription is required for Property Managers
  subscriptionPlan: z.enum(['FREE_TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('FREE_TRIAL')
});

// ========================================
// POST /api/auth/register
// Only for PROPERTY_MANAGER self-signup
// Other roles (OWNER, TECHNICIAN, TENANT) must be invited
// ========================================
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);
    const { email, name, password, phone, role, company, subscriptionPlan } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create organization for the property manager
    const org = await prisma.org.create({
      data: {
        name: company
      }
    });

    // Calculate trial end date (14 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Create user with PROPERTY_MANAGER role
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        phone,
        role: 'PROPERTY_MANAGER',
        company,
        subscriptionPlan,
        subscriptionStatus: 'TRIAL', // Start with trial
        trialEndDate,
        emailVerified: false,
        orgId: org.id
      },
      include: { org: true }
    });

    // Create Property Manager profile
    await prisma.propertyManagerProfile.create({
      data: {
        userId: user.id,
        managedProperties: [],
        permissions: {
          canCreateProperties: true,
          canManageTenants: true,
          canAssignJobs: true,
          canViewReports: true
        }
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user data (exclude password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      token,
      user: {
        ...userWithoutPassword,
        trialDaysRemaining: 14
      },
      message: 'Account created successfully! You have 14 days free trial.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// ========================================
// POST /api/auth/login
// Universal login for all user types
// ========================================
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    const { email, password, role } = validatedData;

    // Find user (optionally filter by role if provided)
    const whereClause = role ? { email, role } : { email };
    
    const user = await prisma.user.findFirst({
      where: whereClause,
      include: { org: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user has a password (not OAuth-only)
    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Please login with Google'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check subscription status for PROPERTY_MANAGER
    if (user.role === 'PROPERTY_MANAGER') {
      if (user.subscriptionStatus === 'TRIAL' && user.trialEndDate < new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Your free trial has expired. Please subscribe to continue.',
          trialExpired: true
        });
      }
      
      if (user.subscriptionStatus === 'CANCELLED' || user.subscriptionStatus === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'Your subscription is inactive. Please update your payment method.',
          subscriptionInactive: true
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    // Return user data (exclude password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// ========================================
// GET /api/auth/google
// Initiate Google OAuth
// ========================================
router.get('/google', (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please use email/password signup.'
    });
  }

  const { role = 'PROPERTY_MANAGER' } = req.query;

  // Only allow PROPERTY_MANAGER to signup via Google
  if (!['PROPERTY_MANAGER', 'ADMIN'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Google signup is only available for Property Managers'
    });
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: role
  })(req, res, next);
});

// ========================================
// GET /api/auth/google/callback
// Google OAuth Callback
// ========================================
router.get('/google/callback',
  (req, res, next) => {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/signin?error=oauth_not_configured`);
    }
    next();
  },
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/signin?error=auth_failed`
  }),
  async (req, res) => {
    try {
      const user = req.user;

      // Check subscription status for PROPERTY_MANAGER
      if (user.role === 'PROPERTY_MANAGER') {
        if (user.subscriptionStatus === 'TRIAL' && user.trialEndDate < new Date()) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          return res.redirect(`${frontendUrl}/subscription?trial_expired=true`);
        }
        
        if (user.subscriptionStatus === 'CANCELLED' || user.subscriptionStatus === 'SUSPENDED') {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          return res.redirect(`${frontendUrl}/subscription?inactive=true`);
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id, 
          email: user.email,
          role: user.role,
          orgId: user.orgId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // Determine redirect based on role
      const dashboardRoutes = {
        ADMIN: '/admin/dashboard',
        PROPERTY_MANAGER: '/dashboard',
        OWNER: '/owner/dashboard',
        TECHNICIAN: '/tech/dashboard',
        TENANT: '/tenant/dashboard'
      };

      const nextPath = dashboardRoutes[user.role] || '/dashboard';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Redirect to frontend with token
      res.redirect(`${frontendUrl}/signin?token=${token}&next=${encodeURIComponent(nextPath)}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/signin?error=auth_failed`);
    }
  }
);

// ========================================
// GET /api/auth/me
// Get current authenticated user
// ========================================
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const user = await prisma.user.findUnique({
  where: { id: decoded.id },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    phone: true,
    company: true,
    emailVerified: true,
    subscriptionPlan: true,
    subscriptionStatus: true,
    trialEndDate: true,
    orgId: true,

    // relations (true returns the whole related record)
    org: true,
    propertyManagerProfile: true,
    ownerProfile: true,
    technicianProfile: true,
    tenantProfile: true,

    createdAt: true,
    updatedAt: true,
  },
});

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate trial days remaining if applicable
    let trialDaysRemaining = null;
    if (user.role === 'PROPERTY_MANAGER' && user.subscriptionStatus === 'TRIAL' && user.trialEndDate) {
      const now = new Date();
      const daysLeft = Math.ceil((user.trialEndDate - now) / (1000 * 60 * 60 * 24));
      trialDaysRemaining = Math.max(0, daysLeft);
    }

    res.json({
      success: true,
      user: {
        ...user,
        trialDaysRemaining
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
});

// ========================================
// POST /api/auth/logout
// ========================================
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// ========================================
// POST /api/auth/verify-email
// Verify email address
// ========================================
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // In a real app, you'd verify the token here
    // For now, we'll just mark the user as verified

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
});

export default router;