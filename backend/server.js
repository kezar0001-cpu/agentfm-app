// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes/routes');
dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', routes);

// test route
app.get('/', (req, res) => {
  res.send('✅ AgentFM backend API is running...');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
