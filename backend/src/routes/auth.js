const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// ----- config
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');
const TOKEN_EXPIRY = '1h';

// ----- helpers
function sign(user) {
  // keep payload light but useful
  return jwt.sign({ id: user.id, orgId: user.orgId, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}
function sanitize(user) {
  const { id, email, name, role, orgId } = user;
  return { id, email, name, role, orgId };
}

// ----- middleware
function authRequired(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Authorization token is required.' });
  }
  const token = h.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ----- routes

// POST /auth/register
router.post('/register', async (req, res) => {
   console.log('📝 Register endpoint hit with body:', req.body);
  console.log('📝 Headers:', req.headers);
  const { name, email, password, orgName } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'A user with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);

    // safe default if orgName omitted
    const resolvedOrgName =
      orgName && orgName.trim().length > 0 ? orgName.trim() : `${(email.split('@')[0] || 'org').trim()}'s Org`;

    const user = await prisma.$transaction(async (tx) => {
      const org = await tx.org.create({ data: { name: resolvedOrgName } });
      return tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: 'owner',        // <- your schema uses String, not enum
          orgId: org.id
        },
      });
    });

    const token = sign(user);
    return res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = sign(user);
    return res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Unable to login.' });
  }
});

// GET /auth/me
router.get('/me', authRequired, async (req, res) => {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: sanitize(u) });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Unable to fetch user.' });
  }
});

module.exports = { authRouter: router, authRequired };
