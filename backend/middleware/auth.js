const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust if using Prisma

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

module.exports = protect;
