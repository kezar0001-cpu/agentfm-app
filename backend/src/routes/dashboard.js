import express from 'express';
// 👇 This path needs to be correct
import { getDashboardSummary, getRecentActivity } from '../../controllers/dashboardController.js'; 
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';

const router = express.Router();

// Middleware to verify JWT token
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

router.use(requireAuth);

// Wires up the /summary route
router.get('/summary', getDashboardSummary);

// 👇 Adds the missing /activity route
router.get('/activity', getRecentActivity);

export default router;