import express from 'express';
// ✅ FIX: Changed path from ../ to ../../
import { getDashboardSummary, getRecentActivity } from '../../controllers/dashboardController.js'; 
import { requireAuth } from '../middleware/auth.js'; // This path is correct

const router = express.Router();

/**
 * All routes below are protected by JWT authentication.
 * The requireAuth middleware verifies the token,
 * attaches the user to req.user, and proceeds if valid.
 */
router.use(requireAuth);

// ✅ GET /api/dashboard/summary
// Returns dashboard summary data for the logged-in user
router.get('/summary', async (req, res, next) => {
  try {
    const data = await getDashboardSummary(req, res);
    return data;
  } catch (err) {
    console.error('Error in /summary route:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ GET /api/dashboard/activity
// Returns recent activity data for the logged-in user
router.get('/activity', async (req, res, next) => {
  try {
    const data = await getRecentActivity(req, res);
    return data;
  } catch (err) {
    console.error('Error in /activity route:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;