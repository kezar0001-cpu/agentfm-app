// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';

// ---- Load env
dotenv.config();

// ---- Prisma (exported so other modules can `import { prisma }`)
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

// ---- App
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy so secure cookies & redirects work behind Render/CF
app.set('trust proxy', 1);

// ---- CORS
const allowlist = new Set(
  (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
    .map((s) => s && s.trim())
    .filter(Boolean)
);
if (process.env.FRONTEND_URL) allowlist.add(process.env.FRONTEND_URL.trim());

// sensible defaults
[
  'https://www.buildstate.com.au',
  'https://buildstate.com.au',
  'https://api.buildstate.com.au',
  'https://agentfm.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].forEach((o) => allowlist.add(o));

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // tools like curl/Postman
    if (allowlist.has(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions));
app.use(cookieParser());

// ---- Session (needed for Passport OAuth; JWT is used for API auth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'replace-this-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// ---- Passport
import './config/passport.js'; // registers Google strategy (uses env + prisma)
app.use(passport.initialize());
app.use(passport.session());

// ---- Routes (single import block, no duplicates)
import authRoutes from './routes/auth.js';
import billingRoutes, { webhook as stripeWebhook } from './routes/billing.js';
import propertiesRoutes from './routes/properties.js';
import tenantsRoutes from './routes/tenants.js';
import maintenanceRoutes from './routes/maintenance.js';
import unitsRoutes from './routes/units.js';
import jobsRoutes from './routes/jobs.js';
import inspectionsRoutes from './routes/inspections.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import uploadsRoutes from './routes/uploads.js';
import reportsRoutes from './routes/reports.js';
import recommendationsRoutes from './routes/recommendations.js';
import plansRoutes from './routes/plans.js';
import dashboardRoutes from './routes/dashboard.js';
import serviceRequestsRoutes from './routes/serviceRequests.js';

// ---- Stripe webhook MUST be before express.json so the raw body is available
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// ---- Body parsers (after webhook)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Mount (after session/passport)
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/serviceRequests', serviceRequestsRoutes);

// ---- Health
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      service: 'AgentFM Backend',
      database: 'Connected',
      environment: process.env.NODE_ENV || 'development',
      time: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'ERROR',
      service: 'AgentFM Backend',
      database: 'Disconnected',
      error: err?.message || 'unknown',
      time: new Date().toISOString(),
    });
  }
});

// ---- Root
app.get('/', (_req, res) => {
  res.json({
    message: 'AgentFM API Server',
    version: '1.0.0',
    frontend: process.env.FRONTEND_URL || null,
    docs: {
      health: '/health',
      auth: '/api/auth',
      properties: '/api/properties',
      tenants: '/api/tenants',
      maintenance: '/api/maintenance',
    },
  });
});

// ---- 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ---- Error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ---- Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully…');
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
});
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully…');
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
});

// ---- Start
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);
});
