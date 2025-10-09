import { Router } from 'express';

const router = Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  // TODO: replace with real auth
  const { email = '', password = '', role = 'client' } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  return res.json({
    token: 'demo-token',
    user: { email, role }
  });
});

// POST /auth/register
router.post('/register', async (req, res) => {
  // TODO: replace with real registration
  const { email = '', name = '', role = 'client' } = req.body || {};
  if (!email || !name) return res.status(400).json({ message: 'Name and email required' });
  return res.json({
    token: 'demo-token',
    user: { email, name, role }
  });
});

// GET /auth/google
router.get('/google', (req, res) => {
  // TODO: start OAuth flow. Keeping this endpoint present fixes module resolution.
  // You can read req.query.role and req.query.action ('signin' | 'signup').
  res.status(501).send('Google OAuth not implemented');
});

export default router;
