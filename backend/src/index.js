// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import path from 'path'; // Your existing code has this

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
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
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

// ---- Serve Static Files ---
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
// ... (all of your existing code at the end of the file remains the same)
app.get('/health', async (_req, res) => {
    //...
});
app.get('/', (_req, res) => {
    //...
});
app.use('*', (req, res) => {
    //...
});
app.use((err, _req, res, _next) => {
    //...
});
process.on('SIGINT', async () => {
    //...
});
process.on('SIGTERM', async () => {
    //...
});
app.listen(PORT, () => {
    //...
});