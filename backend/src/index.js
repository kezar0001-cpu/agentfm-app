require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const { authRouter, authRequired } = require('./routes/auth');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors({
  origin: 'https://special-eureka-v6jp4x6pq6qr3w97r-5173.app.github.dev',
  credentials: true
}));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);

app.get('/properties', authRequired, async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { orgId: req.user.orgId }
    });

    return res.json({ items: properties });
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    return res.status(500).json({ error: 'Unable to fetch properties.' });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AgentFM backend listening on port ${PORT}`);
});
