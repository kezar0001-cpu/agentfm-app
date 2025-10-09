import { Router } from 'express';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email = '', password = '', role = 'client' } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password required' 
      });
    }

    // Mock authentication
    return res.json({
      success: true,
      token: 'demo-jwt-token-' + Date.now(),
      user: { 
        id: 1, 
        email, 
        name: email.split('@')[0],
        role 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email = '', name = '', password = '', role = 'client' } = req.body || {};
    
    if (!email || !name || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email and password required' 
      });
    }

    // Mock registration
    const user = {
      id: Date.now(),
      email,
      name,
      role,
      createdAt: new Date().toISOString()
    };

    return res.json({
      success: true,
      token: 'demo-jwt-token-' + Date.now(),
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/google
router.get('/google', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Google OAuth not implemented yet'
  });
});

export default router;