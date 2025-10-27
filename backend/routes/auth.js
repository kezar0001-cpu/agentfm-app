const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust
const protect = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ msg: 'JWT secret not configured' });
  }

  const { email, name } = req.body || {};
  // Temporary stub user until persistence is implemented
  const user = {
    _id: 'stub-register-user',
    name: name || 'New User',
    email: email || 'new.user@example.com',
  };

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '5d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

// Login
router.post('/login', async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ msg: 'JWT secret not configured' });
  }

  const { email, name } = req.body || {};
  // Temporary stub user until persistence is implemented
  const user = {
    _id: 'stub-login-user',
    name: name || 'Existing User',
    email: email || 'existing.user@example.com',
  };

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '5d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

// Me
router.get('/me', protect, (req, res) => res.json(req.user));

module.exports = router;
