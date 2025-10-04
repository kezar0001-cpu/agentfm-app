const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

const TOKEN_EXPIRY = '1h';

function buildTokenPayload(user) {
  return { id: user.id, role: user.role, orgId: user.orgId };
}

function signUserToken(user) {
  return jwt.sign(buildTokenPayload(user), JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function sanitizeUser(user) {
  const { id, email, name, role, orgId } = user;
  return { id, email, name, role, orgId };
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const defaultOrgName = name ? `${name}'s Org` : `${email.split('@')[0]}'s Org`;

    const { user } = await prisma.$transaction(async (tx) => {
      const org = await tx.org.create({ data: { name: defaultOrgName } });
      const user = await tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: Role.CLIENT,
          orgId: org.id
        }
      });

      return { user };
    });

    const token = signUserToken(user);

    return res.status(201).json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signUserToken(user);

    return res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Unable to login.' });
  }
});

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Authorization token is required.' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = {
  authRouter: router,
  authRequired
};
