// backend/src/index.js  (ESM)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// ---- Middleware ----
app.use(express.json());
app.use(cors({
  origin: ['https://buildstate.com.au','https://www.buildstate.com.au','http://localhost:5173'],
  credentials: true
}));

// ---- Health check (used by Render + your own checks) ----
app.get('/healthz', (_req,res)=>res.status(200).send('ok'));

// ---- API routes ----
app.post('/api/auth/signin', (req, res) => {
  const { email } = req.body || {};
  return res.json({
    token: 'mock-token',
    user: { id: 1, email, name: 'Test User', role: 'client' }
  });
});

// (Optional) 404 for unknown API routes
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ---- Start server (Render needs 0.0.0.0 and PORT env) ----
const PORT = process.env.PORT || 3000;
app.listen(PORT,'0.0.0.0',()=>console.log(`API on ${PORT}`));
