import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';

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
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
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
      return res.status(404).json({ success: false, message: 'No active subscription found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
});

export default router;
