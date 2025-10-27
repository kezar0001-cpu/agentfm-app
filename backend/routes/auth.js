const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust
const protect = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  // ... hash password, save user ...
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '5d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

// Login
router.post('/login', async (req, res) => {
  // ... check credentials ...
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '5d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

// Me
router.get('/me', protect, (req, res) => res.json(req.user));

module.exports = router;
