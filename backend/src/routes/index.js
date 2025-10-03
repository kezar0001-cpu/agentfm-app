// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Routers
const propertiesRouter = require('./routes/properties');
const uploadsRouter = require('./routes/uploads');

const app = express();
app.use((req, _res, next) => { console.log(req.method, req.path); next(); });

app.use(cors({
  origin: [/^http:\/\/localhost:5173$/, /^http:\/\/127\.0\.0\.1:5173$/],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// DEV auth stub
app.use((req, _res, next) => {
  req.user = { id: 'u1', name: 'Demo Owner', orgId: 'org1', role: 'owner', email: 'demo@example.com' };
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API routes
app.use('/properties', propertiesRouter);
app.use('/uploads', uploadsRouter); // <-- this must exist ONCE

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404 + error
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error', detail: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AgentFM backend listening on port ${PORT}`);
});
