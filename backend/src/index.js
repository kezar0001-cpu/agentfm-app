// backend/src/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// ---- Routers ----
const propertiesRouter = require('./routes/properties');
const unitsRouter = require('./routes/units');
const inspectionsRouter = require('./routes/inspections');
const recommendationsRouter = require('./routes/recommendations');
const jobsRouter = require('./routes/jobs');
const plansRouter = require('./routes/plans');
const subscriptionsRouter = require('./routes/subscriptions');
const dashboardRouter = require('./routes/dashboard');
const reportsRouter = require('./routes/reports');
const serviceRequestsRouter = require('./routes/serviceRequests');
const uploadsRouter = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================= CORS (dev-safe) =========================
const allowedOrigins = [
  /^https:\/\/.*\.github\.dev$/, // Codespaces/GitHub
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl / server-side
    const ok = allowedOrigins.some(r => r instanceof RegExp ? r.test(origin) : r === origin);
    return cb(ok ? null : new Error(`CORS blocked: ${origin}`), ok);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.options('*', cors());
// ==================================================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (before routes/404)
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check (unprotected)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ========================= DEV AUTH ===============================
// A simple dev token. Set DEV_TOKEN in .env to override.
const DEV_TOKEN = process.env.DEV_TOKEN || 'devtoken';

// Optional legacy auto-login (set DEV_AUTO_LOGIN=true in backend/.env)
const DEV_AUTO_LOGIN = process.env.DEV_AUTO_LOGIN === 'true';

// Login -> returns token + basic user
app.post('/api/auth/login', (req, res) => {
  const email = req.body?.email || 'demo@example.com';
  return res.json({ token: DEV_TOKEN, user: { email } });
});

// Who am I -> valid only if Authorization header has our token
app.get('/api/auth/me', (req, res) => {
  const ok = req.headers.authorization === `Bearer ${DEV_TOKEN}`;
  return ok
    ? res.json({ user: { email: 'demo@example.com' } })
    : res.status(401).json({ error: 'unauthorized' });
});

// Guard: protect ALL /api/* except /api/health and /api/auth/*
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next(); // not an API route
  if (req.path === '/api/health' || req.path.startsWith('/api/auth')) return next();

  // In dev you can bypass auth entirely if you want:
  if (DEV_AUTO_LOGIN) {
    req.user = { id: 'dev-user', orgId: 'org1', role: 'owner', email: 'demo@example.com' };
    return next();
  }

  const auth = req.headers.authorization || '';
  if (auth === `Bearer ${DEV_TOKEN}`) {
    req.user = { id: 'dev-user', orgId: 'org1', role: 'owner', email: 'demo@example.com' };
    return next();
  }
  return res.status(401).json({ error: 'unauthorized' });
});
// ==================================================================

// ---- Mount ALL APIs under /api ----
app.use('/api/properties', propertiesRouter);
app.use('/api/properties/:propertyId/units', unitsRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/service-requests', serviceRequestsRouter);

// Uploads API + static files
app.use('/api/uploads', uploadsRouter);
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Friendly root (not API)
app.get('/', (_req, res) =>
  res.type('text').send('AgentFM API is running. Try GET /api/health')
);

// 404 LAST
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error', detail: err.message });
});

// Start server when run directly
if (require.main === module) {
  app.listen(PORT, () => console.log(`AgentFM backend listening on port ${PORT}`));
}

module.exports = app;
