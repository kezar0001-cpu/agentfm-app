import jwt from 'jsonwebtoken';
import prisma from '../config/prismaClient.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      console.error('JWT verification failed:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
      });
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error?.message);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};
