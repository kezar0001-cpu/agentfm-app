import jwt from 'jsonwebtoken';
import prisma from '../config/prismaClient.js';

export const requireAuth = async (req, res, next) => {
  try {
    const hdr = req.headers.authorization || '';
    const m = hdr.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ success: false, message: 'No token provided' });

    const token = m[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is missing in environment — refusing to verify.');
      return res.status(500).json({ success: false, message: 'Server auth misconfiguration' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret); // must match signing secret
    } catch (e) {
      console.error('JWT verify failed:', e?.name, e?.message);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Accept common claim names
    const userId = decoded.id || decoded.sub || null;
    const email  = decoded.email || null;
    if (!userId && !email) {
      console.error('JWT missing usable identity claim (no id/sub/email). Payload:', decoded);
      return res.status(401).json({ success: false, message: 'Invalid token payload' });
    }

    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email },
    });

    if (!user) {
      console.error('User not found for claims:', { userId, email });
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    return next();
  } catch (err) {
    console.error('Auth middleware error:', err?.message);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};
