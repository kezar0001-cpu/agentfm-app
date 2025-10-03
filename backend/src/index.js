// src/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Prisma (if you need it in middlewares later)
// const prisma = require('./prisma');

// --- Routers (keep your existing ones) ---
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

// NEW: uploads router
const uploadsRouter = require('./routes/uploads');

const app = express();

// Helpful log (optional)
// console.log('CWD:', process.cwd());

// CORS
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);
app.options('*', cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// DEV auth stub (replace with real auth later)
app.use((req, _res, next) => {
  req.user = { id: 'demo-user', orgId: 'org1', role: 'owner', email: 'demo@example.com' };
  next();
});

// --- API routes ---
app.use('/properties', propertiesRouter);
app.use('/properties/:propertyId/units', unitsRouter);
app.use('/inspections', inspectionsRouter);
app.use('/recommendations', recommendationsRouter);
app.use('/jobs', jobsRouter);
app.use('/plans', plansRouter);
app.use('/subscriptions', subscriptionsRouter);
app.use('/dashboard', dashboardRouter);
app.use('/reports', reportsRouter);
app.use('/service-requests', serviceRequestsRouter);

// NEW: Uploads API + static files
// Router first (POST /uploads/single, GET /uploads/ping)
app.use('/uploads', uploadsRouter);
// Then serve the actual files saved to ./uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error', detail: err.message });
});

// Start server when run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`AgentFM backend listening on port ${port}`));
}

module.exports = app;
