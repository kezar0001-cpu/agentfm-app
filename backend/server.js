// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import propertyRoutes from './src/routes/index.js';
dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;

// middleware
const allowlist = new Set(
  (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
    .map((origin) => origin && origin.trim())
    .filter(Boolean)
);

[
  process.env.FRONTEND_URL,
  'https://www.buildstate.com.au',
  'https://buildstate.com.au',
  'https://api.buildstate.com.au',
  'https://agentfm.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].forEach((origin) => {
  if (origin) allowlist.add(origin.trim());
});

const dynamicOriginMatchers = [
  /https:\/\/.+\.vercel\.app$/,
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowlist.has(origin)) return callback(null, true);
    if (dynamicOriginMatchers.some((regex) => regex.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions));
app.use(express.json());

// API routes
app.use('/api', propertyRoutes);

// test route
app.get('/', (req, res) => {
  res.send('✅ AgentFM backend API is running...');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
