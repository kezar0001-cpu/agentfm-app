// backend/src/routes/auth.js (ESM, guide-aligned, Apple optional)
import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// If/when you wire DB, import your adapter that exposes db.query(sql, params)
// import db from '../data/db.js';

const router = Router();

/* ==========================================
   EMAIL/PASSWORD AUTHENTICATION
   ========================================== */

// Register endpoint
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, company, subscriptionPlan } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // TODO: uncomment when DB ready
    // const existingUser = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    // if (existingUser.length > 0) {
    //   return res.status(400).json({ error: 'Email already registered' });
    // }

    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: insert and get new user id
    // const userId = await db.query(
    //   `INSERT INTO users (name, email, password, phone, role, company, subscription_plan, email_verified, created_at)
    //    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    //   [name, email, hashedPassword, phone, role, company, subscriptionPlan, false]
    // );

    // if (role === 'tenant') {
    //   await db.query(
    //     `INSERT INTO tenant_profiles (user_id, phone, preferred_channel, language)
    //      VALUES (?, ?, ?, ?)`,
    //     [userId, phone, 'EMAIL', 'EN']
    //   );
    // }

    // TEMP until DB is wired:
    const userId = 1;

    const token = jwt.sign({ id: userId, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: { id: userId, name, email, role, company, emailVerified: false }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    // TODO: fetch user by email + role
    // const users = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    // if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    // const user = users[0];
    // const valid = await bcrypt.compare(password, user.password);
    // if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // TEMP user:
    const user = { id: 1, name: 'Test User', email, role, company: 'Buildstate', email_verified: true };

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        emailVerified: user.email_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* ==========================================
   GOOGLE OAUTH CONFIGURATION
   ========================================== */

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const role = req.query.role || 'tenant'; // you can switch default later
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || 'Google User';

      // TODO: lookup/create user in DB
      // let users = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
      // if (users.length === 0) {
      //   const userId = await db.query(
      //     `INSERT INTO users (name, email, role, google_id, email_verified, created_at)
      //      VALUES (?, ?, ?, ?, ?, NOW())`,
      //     [name, email, role, profile.id, true]
      //   );
      //   if (role === 'tenant') {
      //     await db.query(
      //       `INSERT INTO tenant_profiles (user_id, preferred_channel, language) VALUES (?, ?, ?)`,
      //       [userId, 'EMAIL', 'EN']
      //     );
      //   }
      //   users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      // }
      // return done(null, users[0]);

      // TEMP until DB is wired:
      return done(null, { id: 1, email, role, name });
    } catch (err) {
      return done(err, null);
    }
  }
));

// Start Google OAuth
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// OAuth callback → issue JWT → redirect to a page that exists now
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/signin' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const redirectPath = '/dashboard'; // <- single route that exists now
    return res.redirect(`${process.env.FRONTEND_URL}${redirectPath}?token=${token}`);
  }
);

/* ==========================================
   JWT MIDDLEWARE + ME + LOGOUT
   ========================================== */
export const authenticateToken = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    // const rows = await db.query('SELECT id, name, email, role, company FROM users WHERE id = ?', [req.user.id]);
    // if (!rows.length) return res.status(404).json({ error: 'User not found' });
    // return res.json({ user: rows[0] });

    // TEMP
    return res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role } });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/auth/logout', authenticateToken, async (_req, res) => {
  // If you later implement refresh tokens, blacklist/expire here
  return res.json({ message: 'Logged out successfully' });
});

export default router;
