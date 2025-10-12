// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// ===== Prisma (exported so other modules can import { prisma } from '../index.js') =====
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

// ===== App bootstrap =====
const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render/Proxy for correct secure cookies & redirects
app.set('trust proxy', 1);

// ===== CORS =====
// Build a robust allowlist from env plus sensible defaults
const allowlist = new Set(
  (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
    .map(s => s && s.trim())
    .filter(Boolean)
);
if (process.env.FRONTEND_URL) allowlist.add(process.env.FRONTEND_URL.trim());

// Common defaults (prod + dev)
[
  'https://www.buildstate.com.au',
  'https://buildstate.com.au',
  'https://agentfm.vercel.app',      // include if you use Vercel
  'http://localhost:5173',
  'http://localhost:3000',
].forEach(o => allowlist.add(o));

const corsOptions = {
  origin(origin, cb) {
    // Allow non-browser tools (curl/Postman) with no Origin header
    if (!origin) return cb(null, true);
    return cb(null, allowlist.has(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== Session (needed only for Passport OAuth state/callback; JWT used after) =====
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'replace-this-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // set Secure in prod
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// ===== Passport =====
import './config/passport.js';      // registers Google strategy (uses env + prisma)
app.use(passport.initialize());
app.use(passport.session());

// ===== Routes =====
import authRoutes from './routes/auth.js';
// Only import the routes you have; wrap optional ones so missing files don’t crash:
let propertiesRoutes, tenantsRoutes, maintenanceRoutes, unitsRoutes, jobsRoutes, inspectionsRoutes, subscriptionsRoutes, uploadsRoutes, reportsRoutes, recommendationsRoutes, plansRoutes, dashboardRoutes;
try { propertiesRoutes = (await import('./routes/properties.js')).default; } catch {}
try { tenantsRoutes = (await import('./routes/tenants.js')).default; } catch {}
try { maintenanceRoutes = (await import('./routes/maintenance.js')).default; } catch {}
try { unitsRoutes = (await import('./routes/units.js')).default; } catch {}
try { jobsRoutes = (await import('./routes/jobs.js')).default; } catch {}
try { inspectionsRoutes = (await import('./routes/inspections.js')).default; } catch {}
try { subscriptionsRoutes = (await import('./routes/subscriptions.js')).default; } catch {}
try { uploadsRoutes = (await import('./routes/uploads.js')).default; } catch {}
try { reportsRoutes = (await import('./routes/reports.js')).default; } catch {}
try { recommendationsRoutes = (await import('./routes/recommendations.js')).default; } catch {}
try { plansRoutes = (await import('./routes/plans.js')).default; } catch {}
try { dashboardRoutes = (await import('./routes/dashboard.js')).default; } catch {}

// Mount
app.use('/api/auth', authRoutes);
if (propertiesRoutes) app.use('/api/properties', propertiesRoutes);
if (tenantsRoutes) app.use('/api/tenants', tenantsRoutes);
if (maintenanceRoutes) app.use('/api/maintenance', maintenanceRoutes);
if (unitsRoutes) app.use('/api/units', unitsRoutes);
if (jobsRoutes) app.use('/api/jobs', jobsRoutes);
if (inspectionsRoutes) app.use('/api/inspections', inspectionsRoutes);
if (subscriptionsRoutes) app.use('/api/subscriptions', subscriptionsRoutes);
if (uploadsRoutes) app.use('/api/uploads', uploadsRoutes);
if (reportsRoutes) app.use('/api/reports', reportsRoutes);
if (recommendationsRoutes) app.use('/api/recommendations', recommendationsRoutes);
if (plansRoutes) app.use('/api/plans', plansRoutes);
if (dashboardRoutes) app.use('/api/dashboard', dashboardRoutes);

// ===== Health =====
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

// ===== Root =====
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

// ===== 404 =====
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ===== Error handler =====
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ===== Graceful shutdown =====
process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully…');
  try { await prisma.$disconnect(); } finally { process.exit(0); }
});
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully…');
  try { await prisma.$disconnect(); } finally { process.exit(0); }
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);
});
