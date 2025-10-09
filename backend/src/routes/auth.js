import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { z } from 'zod';
import { prisma } from '../index.js';

const router = Router();

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['client', 'admin', 'tenant', 'technician']).default('client')
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum(['client', 'tenant']).default('tenant'),
  company: z.string().optional(),
  subscriptionPlan: z.string().optional()
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);
    const { email, name, password, phone, role, company, subscriptionPlan } = validatedData;

    // Check if role is client and company is required
    if (role === 'client' && !company) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required for business accounts'
      });
    }

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

    // Create organization
    const org = await prisma.org.create({
      data: {
        name: company || `${name}'s Organization`
      }
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        phone,
        role,
        company,
        subscriptionPlan,
        emailVerified: false,
        orgId: org.id
      },
      include: { org: true }
    });

    // Create tenant profile if role is tenant
    if (role === 'tenant') {
      await prisma.tenantProfile.create({
        data: {
          userId: user.id,
          phone,
          preferredChannel: 'EMAIL',
          language: 'EN'
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (exclude password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({
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

    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    const { email, password, role } = validatedData;

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email,
        role
      },
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

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    });

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

// GET /api/auth/google - Initiate Google OAuth
router.get('/google', (req, res, next) => {
  const { role = 'client' } = req.query;
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: role  // Pass role as state
  })(req, res, next);
});

// GET /api/auth/google/callback - Google OAuth Callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/signin?error=auth_failed` }),
  async (req, res) => {
    try {
      const user = req.user;

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Determine redirect based on role
      const dashboardRoutes = {
        client: '/dashboard',
        admin: '/admin/dashboard',
        tenant: '/tenant/dashboard',
        technician: '/tech/dashboard'
      };

      const redirectPath = dashboardRoutes[user.role] || '/dashboard';

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}${redirectPath}?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/signin?error=auth_failed`);
    }
  }
);

// GET /api/auth/me - Get current user
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { org: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        company: true,
        emailVerified: true,
        subscriptionPlan: true,
        orgId: true,
        org: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
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

// POST /api/auth/logout
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

export default router;