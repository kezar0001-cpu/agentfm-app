import express from 'express';
import { getDashboardSummary, getRecentActivity } from '../../controllers/dashboardController.js'; 
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

/**
 * All routes below are protected by JWT authentication.
 * The requireAuth middleware verifies the token,
 * attaches the user to req.user, and proceeds if valid.
 */
router.use(requireAuth);

// GET /api/dashboard/summary - Returns dashboard summary data
router.get('/summary', asyncHandler(async (req, res) => {
  const data = await getDashboardSummary(req, res);
  return data;
}));

// GET /api/dashboard/activity - Returns recent activity data
router.get('/activity', asyncHandler(async (req, res) => {
  const data = await getRecentActivity(req, res);
  return data;
}));

export default router;