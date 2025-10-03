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

/* ---------------- CORS (dev-safe) ----------------
   Allows Codespaces preview URLs (*.github.dev) and localhost.
   Blocks anything else. Preflight handled globally. */
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
    const ok = allowedOrigins.some(r =>
      r instanceof RegExp ? r.test(origin) : r === origin
    );
    return cb(ok ? null : new Error(`CORS blocked: ${origin}`), ok);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.options('*', cors());
/* ------------------------------------------------- */

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Dev auth stub (swap for real auth later)
if (process.env.DEV_AUTO_LOGIN === 'true') {
  app.use((req, _res, next) => {
    req.user = { id: 'demo-user', orgId: 'org1', role: 'owner', email: 'demo@example.com' };
    next();
  });
}


// Request logging (before routes/404)
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

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
