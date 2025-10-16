// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import path from 'path'; // Your existing code has this
import fs from 'fs';
import { ensurePropertySchema } from './utils/ensurePropertySchema.js';
import prisma, { prisma as prismaInstance } from './config/prismaClient.js';

// ---- Load env
dotenv.config();

// ---- Prisma (re-exported for backwards compatibility)
export { prismaInstance as prisma };

// ---- App
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy so secure cookies & redirects work behind Render/CF
app.set('trust proxy', 1);

// ---- CORS
// ... (your existing CORS configuration remains the same)
const allowlist = new Set(
  (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
    .map((s) => s && s.trim())
    .filter(Boolean)
);
if (process.env.FRONTEND_URL) allowlist.add(process.env.FRONTEND_URL.trim());
[
  'https://www.buildstate.com.au',
  'https://buildstate.com.au',
  'https://api.buildstate.com.au',
  'https://agentfm.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].forEach((o) => allowlist.add(o));
const dynamicOriginMatchers = [
  /https:\/\/.+\.vercel\.app$/,
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowlist.has(origin)) return cb(null, true);
    if (dynamicOriginMatchers.some((regex) => regex.test(origin))) {
      return cb(null, true);
    }
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions));
app.use(cookieParser());

// ---- Serve Static Files ---
const uploadPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));

// ---- Session
// ... (your existing session configuration remains the same)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'replace-this-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// ---- Passport
import './config/passport.js';
app.use(passport.initialize());
app.use(passport.session());

// ---- Routes
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
// 👇 MINIMAL CHANGE START: Corrected the broken import statement
import recommendationsRoutes from './routes/recommendations.js';
// 👆 MINIMAL CHANGE END
import plansRoutes from './routes/plans.js';
import dashboardRoutes from './routes/dashboard.js';
import serviceRequestsRoutes from './routes/serviceRequests.js';

// ---- Stripe webhook
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// ---- Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/properties', propertiesRoutes);
// ... (rest of your existing app.use statements remain the same)
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


// ---- Health, Root, 404, Error Handler, and Shutdown logic
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'AgentFM API is running' });
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return;
  }
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

async function startServer() {
  try {
    await ensurePropertySchema(prisma);

    const server = app.listen(PORT, () => {
      console.log(`✅ AgentFM backend listening on port ${PORT}`);
    });

    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;

      console.log(`Received ${signal}. Shutting down gracefully...`);

      const closeServer = new Promise((resolve) => {
        server.close(() => {
          resolve();
        });
      });

      try {
        await Promise.allSettled([closeServer, prisma.$disconnect()]);
        console.log('Shutdown complete. Goodbye!');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Failed to start AgentFM backend:', error);
    process.exit(1);
  }
}

startServer();
