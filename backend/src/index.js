import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced CORS configuration for production
const corsOptions = {
  origin: [
    'https://agentfm-frontend.onrender.com',
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Alternative local
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AgentFM API is running' });
});

// Auth routes
app.post('/api/auth/signin', (req, res) => {
  // Your signin logic here
  res.json({ 
    token: 'mock-token', 
    user: { 
      id: 1, 
      email: req.body.email, 
      name: 'Test User', 
      role: 'client' 
    } 
  });
});

// Serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
});