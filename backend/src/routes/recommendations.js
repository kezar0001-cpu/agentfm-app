import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import { listRecommendations, convertRecommendation } from '../data/memoryStore.js';

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
      where: { id: decoded.id },
      include: { org: true }
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

router.get('/', requireAuth, (req, res) => {
  res.json(listRecommendations(req.user.orgId));
});

router.post('/:id/convert', requireAuth, (req, res) => {
  const result = convertRecommendation(req.user.orgId, req.params.id);
  if (result instanceof Error) {
    let status = 400;
    if (result.code === 'NOT_FOUND') status = 404;
    if (result.code === 'INVALID') status = 400;
    return res.status(status).json({ error: result.message });
  }
  res.json(result);
});

export default router;
