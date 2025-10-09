import { Router } from 'express';

const router = Router();

router.post('/login', async (req, res) => {
  const { email = '', password = '', role = 'client' } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  return res.json({
    token: 'demo-token',
    user: { email, role }
  });
});

router.post('/register', async (req, res) => {
  const { email = '', name = '', role = 'client' } = req.body || {};
  if (!email || !name) return res.status(400).json({ message: 'Name and email required' });
  return res.json({
    token: 'demo-token',
    user: { email, name, role }
  });
});

router.get('/google', (req, res) => {
  // Stub: start Google OAuth here. role/action available in req.query
  res.status(501).send('Google OAuth not implemented');
});

export default router;
