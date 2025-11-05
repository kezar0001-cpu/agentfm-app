import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import { sendError, ErrorCodes } from '../utils/errorHandler.js';

const router = express.Router();


// Get user's subscription
router.get('/', requireAuth, async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return sendError(res, 500, 'Failed to fetch subscriptions', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

// Get current user's active subscription
router.get('/current', requireAuth, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (!subscription) {
      return sendError(res, 404, 'No active subscription found', ErrorCodes.RES_NOT_FOUND);
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    return sendError(res, 500, 'Failed to fetch subscription', ErrorCodes.ERR_INTERNAL_SERVER);
  }
});

export default router;
