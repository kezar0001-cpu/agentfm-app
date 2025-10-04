// src/index.js
require('dotenv').config();                    // <-- load env

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');

// FIX: import from routes/auth (not ./auth)
const { authRouter, authRequired } = require('./routes/auth');

const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));

function attachAuthContext(req, _res, next) {
  const token = req.cookies?.access_token;
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch {}
  }
  next();
}
app.use(attachAuthContext);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Auth routes
app.use('/auth', authRouter);

// Protected example
app.get('/properties', authRequired, async (req, res) => {
  const items = await prisma.property.findMany({ where: { orgId: req.user.orgId } });
  res.json({ items });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AgentFM backend listening on port ${PORT}`);
});
