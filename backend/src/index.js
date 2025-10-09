// backend/src/index.js (ESM)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import routes from './routes/index.js';

dotenv.config();

const app = express();

// ---- Middleware ----
app.use(express.json());
app.use(cors({
  origin: ['https://buildstate.com.au','https://www.buildstate.com.au','http://localhost:5173'],
  credentials: true
}));
app.use(passport.initialize()); // <- required for Google OAuth

// ---- Health check (Render) ----
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// ---- API routes ----
app.use('/', routes);

// 404 for unknown API routes (optional)
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ---- Start server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`API on ${PORT}`));
