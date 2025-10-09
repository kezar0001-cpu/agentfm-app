import { Router } from 'express';

const router = Router();

// Mock user database (replace with real database in production)
const mockUsers = new Map();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email = '', password = '', role = 'client' } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password required' 
      });
    }

    // Basic validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Mock authentication - in real app, check against database
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

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { 
      email = '', 
      name = '', 
      password = '',
      role = 'client',
      phone = '',
      company = ''
    } = req.body || {};
    
    if (!email || !name || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email and password required' 
      });
    }

    // Basic validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    if (role === 'client' && !company) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required for business accounts'
      });
    }

    // Mock registration - in real app, save to database
    const user = {
      id: Date.now(),
      email,
      name,
      role,
      phone,
      company: role === 'client' ? company : undefined,
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

// GET /auth/google
router.get('/google', (req, res) => {
  const { role = 'client', action = 'signin' } = req.query;
  
  // TODO: Implement real Google OAuth
  return res.status(501).json({
    success: false,
    message: 'Google OAuth not implemented yet',
    info: `Would handle ${action} for ${role} role`
  });
});

// GET /auth/health - For testing
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'auth',
    timestamp: new Date().toISOString()
  });
});

export default router;