// ESM
import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const router = Router();

/* --- EMAIL/PASSWORD MOCKS (replace with your DB later) --- */
router.post('/auth/login', async (req, res) => {
  const { email, password, role = 'client' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  // mock ok:
  const user = { id: 1, name: 'Demo', email, role };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

router.post('/auth/register', async (req, res) => {
  const { name, email, password, role = 'client' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
  const user = { id: 2, name, email, role };
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
});

/* --- GOOGLE OAUTH (works even without DB) --- */
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    passReqToCallback: true,
  },
  async (req, _at, _rt, profile, done) => {
    const role = req.query.role || 'client';
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName || 'Google User';
    return done(null, { id: profile.id, email, name, role });
  }
));

router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/signin' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const routes = { client: '/dashboard', admin: '/admin/dashboard', tenant: '/tenant/dashboard' };
    const to = routes[req.user.role] || '/dashboard';
    res.redirect(`${process.env.FRONTEND_URL}${to}?token=${token}`);
  }
);

export default router;
