const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Adjust if using Prisma

app.use(cors());
app.use(express.json());

// Auth middleware (create in backend/middleware/auth.js if missing)
const protect = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = User.findById(decoded.id).select('-password'); // Adjust for Prisma
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

// Routes (update backend/routes/auth.js)
const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

// Add other protected routes like /dashboard, /activity with app.use('/dashboard', protect, dashboardRouter); etc.

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
