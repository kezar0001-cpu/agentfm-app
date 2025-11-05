import express from 'express';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, sendError, ErrorCodes } from '../utils/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET / - Get all notifications for current user
router.get('/', asyncHandler(async (req, res) => {
  const { isRead, limit = 50 } = req.query;
  
  const where = {
    userId: req.user.id,
  };
  
  if (isRead !== undefined) {
    where.isRead = isRead === 'true';
  }
  
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: parseInt(limit),
  });
  
  res.json(notifications);
}));

// GET /unread-count - Get count of unread notifications
router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await prisma.notification.count({
    where: {
      userId: req.user.id,
      isRead: false,
    },
  });
  
  res.json({ count });
}));

// PATCH /:id/read - Mark notification as read
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Verify notification belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id },
  });
  
  if (!notification) {
    return sendError(res, 404, 'Notification not found', ErrorCodes.RES_NOT_FOUND);
  }
  
  if (notification.userId !== req.user.id) {
    return sendError(res, 403, 'Access denied', ErrorCodes.ACC_ACCESS_DENIED);
  }
  
  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
  
  res.json(updated);
}));

// PATCH /mark-all-read - Mark all notifications as read
router.patch('/mark-all-read', asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId: req.user.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
  
  res.json({ 
    success: true, 
    message: `Marked ${result.count} notifications as read`,
    count: result.count,
  });
}));

// DELETE /:id - Delete notification
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Verify notification belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id },
  });
  
  if (!notification) {
    return sendError(res, 404, 'Notification not found', ErrorCodes.RES_NOT_FOUND);
  }
  
  if (notification.userId !== req.user.id) {
    return sendError(res, 403, 'Access denied', ErrorCodes.ACC_ACCESS_DENIED);
  }
  
  await prisma.notification.delete({
    where: { id },
  });
  
  res.json({ success: true, message: 'Notification deleted' });
}));

export default router;
