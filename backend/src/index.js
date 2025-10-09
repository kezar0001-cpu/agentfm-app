import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`API listening on ${PORT}`));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced CORS configuration for production
const corsOptions = {
  origin: [
    'https://buildstate.com.au',
    'https://www.buildstate.com.au',
    'http://localhost:5173'
  ],
  credentials: true
};
app.use(cors(corsOptions));


const cors = require('cors');

const corsOptions = {
  origin: [
    'https://buildstate.com.au',
    'https://www.buildstate.com.au',
    'http://localhost:5173'
  ],
  credentials: true
};
app.use(cors(corsOptions));


// basic health probe for Render + uptime checks
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
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