import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { asyncHandler, sendError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const router = Router();

router.use(requireAuth);

// Validation schemas
const userUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(10).max(20).optional().nullable(),
  company: z.string().max(100).optional().nullable(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// GET /api/users - List users by role (restricted to PROPERTY_MANAGER)
router.get('/', asyncHandler(async (req, res) => {
  const { role } = req.query;

  if (!role) {
    return sendError(res, 400, 'Role query parameter is required');
  }

  // Access control: Only property managers can list users
  // This prevents unauthorized enumeration of users in the system
  if (req.user.role !== 'PROPERTY_MANAGER') {
    return sendError(res, 403, 'Access denied. Only property managers can list users.');
  }

  // Property managers can only query for TECHNICIAN role
  // This prevents them from enumerating owners, other managers, or tenants
  const allowedRoles = ['TECHNICIAN'];
  const requestedRole = role.toUpperCase();
  
  if (!allowedRoles.includes(requestedRole)) {
    return sendError(res, 403, `Access denied. You can only list users with roles: ${allowedRoles.join(', ')}`);
  }

  const users = await prisma.user.findMany({
    where: {
      role: requestedRole,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });
  
  res.json({ success: true, users });
}));

// GET /api/users/me - Get current user profile
router.get('/me', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      company: true,
      emailVerified: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      trialEndDate: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  res.json({ success: true, data: user });
}));

// GET /api/users/:id - Get user by ID
router.get('/:id', asyncHandler(async (req, res) => {
  // Only allow users to view their own profile or property managers to view any
  if (req.user.id !== req.params.id && req.user.role !== 'PROPERTY_MANAGER') {
    return sendError(res, 403, 'Access denied');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      company: true,
      emailVerified: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  res.json({ success: true, data: user });
}));

// PATCH /api/users/:id - Update user profile
router.patch('/:id', validate(userUpdateSchema), asyncHandler(async (req, res) => {
  // Only allow users to update their own profile
  if (req.user.id !== req.params.id) {
    return sendError(res, 403, 'Access denied');
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: req.body,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      company: true,
    },
  });

  logger.info(`User ${req.user.id} updated their profile`);
  res.json({ success: true, data: user });
}));

// POST /api/users/:id/change-password - Change password
router.post('/:id/change-password', validate(passwordChangeSchema), asyncHandler(async (req, res) => {
  // Only allow users to change their own password
  if (req.user.id !== req.params.id) {
    return sendError(res, 403, 'Access denied');
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    return sendError(res, 401, 'Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash: newPasswordHash },
  });

  logger.info(`User ${req.user.id} changed their password`);
  res.json({ success: true, message: 'Password changed successfully' });
}));

export default router;
