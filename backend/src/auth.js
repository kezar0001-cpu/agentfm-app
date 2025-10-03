// src/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// token setup
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'none',
  secure: true // https (Codespaces, Render, Vercel)
};

function signTokens(user) {
  const payload = { uid: user.id, orgId: user.orgId, role: user.role };
  return {
    access: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL }),
    refresh: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: REFRESH_TTL })
  };
}

function authRequired(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// --- routes ---

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, orgName } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    const org = await prisma.org.create({ data: { name: orgName || 'My Org' } });
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, name: name || '', passwordHash, role: 'owner', orgId: org.id }
    });

    const { access, refresh } = signTokens(user);
    res
      .cookie('access_token', access, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 })
      .cookie('refresh_token', refresh, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .status(201)
      .json({ user: { id: user.id, email: user.email, name: user.name, orgId: user.orgId, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const { access, refresh } = signTokens(user);
  res
    .cookie('access_token', access, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 })
    .cookie('refresh_token', refresh, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json({ user: { id: user.id, email: user.email, name: user.name, orgId: user.orgId, role: user.role } });
});

// Refresh
router.post('/refresh', (req, res) => {
  const rt = req.cookies?.refresh_token;
  if (!rt) return res.status(401).json({ error: 'No refresh' });
  try {
    const payload = jwt.verify(rt, process.env.JWT_SECRET);
    const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
    res.cookie('access_token', access, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 }).json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid refresh' });
  }
});

// Me
router.get('/me', authRequired, async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.uid } });
  res.json({ user: { id: u.id, email: u.email, name: u.name, orgId: u.orgId, role: u.role } });
});

// Logout
router.post('/logout', (_req, res) => {
  res
    .clearCookie('access_token', COOKIE_BASE)
    .clearCookie('refresh_token', COOKIE_BASE)
    .json({ ok: true });
});

module.exports = { authRouter: router, authRequired };
