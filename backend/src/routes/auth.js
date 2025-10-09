// backend/src/routes/auth.js (ESM)
import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// TODO: import your real DB adapter that exposes db.query(sql, params)
// import db from '../data/db.js';

const router = Router();

/* --------- EMAIL/PASSWORD (keep your current handlers) --------- */
// Example placeholders (remove if you already have these):
router.post('/auth/login', async (req, res) => {
  const { email, password, role = 'tenant' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  // const rows = await db.query('SELECT * FROM users WHERE email=? AND role=?',[email, role]);
  // const user = rows[0]; if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({error:'Invalid credentials'});
  // const token = jwt.sign({ id:user.id, email:user.email, role:user.role }, process.env.JWT_SECRET, { expiresIn:'7d' });
  // return res.json({ token, user:{ id:user.id, name:user.name, email:user.email, role:user.role }});
  return res.json({ token: 'mock-token', user: { id: 1, email, role, name: 'Test User' } });
});

/* ------------------------- GOOGLE STRATEGY ------------------------- */
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const role = req.query.role || 'tenant';
      const email = profile.emails?.[0]?.value;
      const name  = profile.displayName || 'Google User';

      // let rows = await db.query('SELECT * FROM users WHERE email=? AND role=?',[email, role]);
      // if (rows.length === 0) {
      //   const userId = await db.query(
      //     `INSERT INTO users (name,email,role,google_id,email_verified,created_at) VALUES (?,?,?,?,?,NOW())`,
      //     [name, email, role, profile.id, true]
      //   );
      //   rows = await db.query('SELECT * FROM users WHERE id=?',[userId]);
      // }
      // return done(null, rows[0]);

      // TEMP mock user until DB wired
      return done(null, { id: 1, email, role, name });
    } catch (e) {
      return done(e, null);
    }
  }
));

/* -------------------------- GOOGLE ROUTES -------------------------- */
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/signin' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const dashboard = { client:'/dashboard', admin:'/admin/dashboard', tenant:'/tenant/dashboard' }[req.user.role] || '/dashboard';
    res.redirect(`${process.env.FRONTEND_URL}${dashboard}?token=${token}`);
  }
);

/* --------------------------- JWT helper --------------------------- */
export const authenticateToken = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

router.get('/auth/me', authenticateToken, async (req, res) => {
  // const rows = await db.query('SELECT id,name,email,role FROM users WHERE id=?',[req.user.id]);
  // if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  // res.json({ user: rows[0] });
  res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role } }); // mock
});

export default router;
