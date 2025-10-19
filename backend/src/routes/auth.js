import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';

const TRIAL_PERIOD_DAYS = 14;

function calculateTrialEndDate(baseDate = new Date()) {
  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + TRIAL_PERIOD_DAYS);
  return endDate;
}

async function ensureTrialState(user) {
  if (!user) return user;

  const now = new Date();
  const updates = {};
  let trialEndDate = user.trialEndDate ? new Date(user.trialEndDate) : null;

  if (user.subscriptionStatus === 'TRIAL') {
    const baseDate = user.createdAt ? new Date(user.createdAt) : now;

    if (!trialEndDate) {
      trialEndDate = calculateTrialEndDate(baseDate);
      updates.trialEndDate = trialEndDate;
    }

    if (trialEndDate && trialEndDate <= now) {
      updates.subscriptionStatus = 'SUSPENDED';
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: updates,
    });

    return {
      ...user,
      ...updates,
      trialEndDate: updates.trialEndDate ?? trialEndDate ?? user.trialEndDate,
    };
  }

  return {
    ...user,
    trialEndDate: trialEndDate ?? user.trialEndDate ?? null,
  };
}

const router = Router();

// ========================================
// AUTH MIDDLEWARE
// ========================================
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      // orgId removed (not in schema)
    };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ========================================
// VALIDATION SCHEMAS
// ========================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'PROPERTY_MANAGER', 'OWNER', 'TECHNICIAN', 'TENANT']).optional()
});

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional().refine((phone) => {
    if (!phone) return true;
    return /^\+[1-9]\d{1,14}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
  }, {
    message: "Phone number must be in a valid international format, e.g., +971 4 xxx-xxxx",
  }), // 👈 COMMA ADDED HERE
  role: z.enum(['PROPERTY_MANAGER', 'OWNER', 'TECHNICIAN', 'TENANT']).optional(),
});

// ========================================
// POST /api/auth/register
// ========================================
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // (trial/subscription/org removed – not in schema)

    const trialEndDate = calculateTrialEndDate();

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        phone,
        role: 'PROPERTY_MANAGER',
        subscriptionPlan: 'FREE_TRIAL',
        subscriptionStatus: 'TRIAL',
        trialEndDate,
      },
    });

    // ❌ Removed: propertyManagerProfile create (model not in schema)

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Strip passwordHash
    const userWithTrial = await ensureTrialState(user);
    const { passwordHash: _ph, ...userWithoutPassword } = userWithTrial;

    res.status(201).json({
      success: true,
      token,
      user: userWithoutPassword,
      message: 'Account created successfully!',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// ========================================
// POST /api/auth/login
// ========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = loginSchema.parse(req.body);
    const whereClause = role ? { email, role } : { email };

    const user = await prisma.user.findFirst({
      where: whereClause,
      // ❌ Removed: include: { org: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Please login with Google' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // ❌ Removed: subscription checks (not on User in this schema)

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    await prisma.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } });

    const userWithTrial = await ensureTrialState(user);

    const { passwordHash: _ph, ...userWithoutPassword } = userWithTrial;
    res.json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ========================================
// GET /api/auth/google
// ========================================
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ success: false, message: 'Google OAuth is not configured. Please use email/password signup.' });
  }
  const { role = 'PROPERTY_MANAGER' } = req.query;
  if (!['PROPERTY_MANAGER', 'ADMIN'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Google signup is only available for Property Managers' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], state: role })(req, res, next);
});

// ========================================
// GET /api/auth/google/callback
// ========================================
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/signin?error=oauth_not_configured`);
    }
    next();
  },
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/signin?error=auth_failed`,
  }),
  async (req, res) => {
    try {
      const user = req.user;

      // ❌ Removed: subscription checks (not present)

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const dashboardRoutes = {
        ADMIN: '/admin/dashboard',
        PROPERTY_MANAGER: '/dashboard',
        OWNER: '/owner/dashboard',
        TECHNICIAN: '/tech/dashboard',
        TENANT: '/tenant/dashboard',
      };

      const nextPath = dashboardRoutes[user.role] || '/dashboard';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
// ========================================
router.get('/me', requireAuth, async (req, res) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        trialEndDate: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelAt: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user = await ensureTrialState(user);

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
});

// ========================================
// POST /api/auth/logout
// ========================================
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ========================================
// POST /api/auth/verify-email
// ========================================
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required' });
    // Placeholder
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Email verification failed' });
  }
});

export default router;
