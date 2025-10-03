// src/index.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const { authRouter, authRequired } = require('./auth');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'https://*.github.dev'],
  credentials: true
}));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Auth routes
app.use('/auth', authRouter);

// Example protected route (only works if logged in)
app.get('/properties', authRequired, async (req, res) => {
  const items = await prisma.property.findMany({ where: { orgId: req.user.orgId } });
  res.json({ items });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AgentFM backend listening on port ${PORT}`);
});

