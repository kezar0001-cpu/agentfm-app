import { Router } from 'express';
import prisma from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js'; // Assuming you have this middleware

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { role } = req.query;

  if (!role) {
    return res.status(400).json({ success: false, message: 'Role query parameter is required' });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        role: role.toUpperCase(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error(`Failed to fetch users with role ${role}:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

export default router;
