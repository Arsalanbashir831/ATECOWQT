var express = require('express');
const User = require('../models/userModel')
const bcrypt = require('bcryptjs');
const { sign, verify, cookieOptions } = require('../middleware/jwt');
const Report = require('../models/reportModel')
const Card = require('../models/cardModel')
const Certificate = require('../models/certificateModel')
const Operator = require('../models/operatorModel')
const AasiaSteelCard = require('../models/aasiaSteelCardModel')
var router = express.Router();

// Authentication middleware
const requireAuth = (req, res, next) => {

  
  if (req.auth) {

    next();
  } else {

    res.redirect('/');
  }
};

// Role-based access control
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.auth && req.auth.role === role) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
  };
};

router.get('/', function (req, res, next) {

  
  // Only destroy session if user is not authenticated
  if (req.auth) {

    const redirectUrl = req.auth.role === 'supervisor' ? '/supervisor' : '/inspector';
    return res.redirect(redirectUrl);
  }
  
  // Clear any existing session only if not authenticated
  res.clearCookie('ateco-token');
  
  // Handle error parameters
  const error = req.query.error;
  res.render("authentication", { error });
});

// Protected supervisor route
router.get('/supervisor', requireAuth, requireRole('supervisor'), async (req, res) => {
  try {

    
    const cardData = await Card.find().sort({ createdAt: -1 }).exec();
    const reportData = await Report.find().sort({ createdAt: -1 }).exec();
    const certificateData = await Certificate.find().sort({ createdAt: -1 }).exec();
    const operatorData = await Operator.find().sort({ createdAt: -1 }).exec();
    const aasiaSteelCardData = await AasiaSteelCard.find().sort({ createdAt: -1 }).exec();




    res.render('Supervisor', { 
      cardData, 
      reportData, 
      certificateData, 
      operatorData,
      aasiaSteelCardData,
      user: {
        name: req.auth.name,
        role: 'supervisor',
        email: req.auth.email
      }
    });
  } catch (error) {
    console.error('Error loading supervisor dashboard:', error);
    res.status(500).render('error', { 
      message: 'Failed to load dashboard data',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Protected inspector route
router.get('/inspector', requireAuth, requireRole('inspector'), async (req, res) => {
  try {

    
    const reportData = await Report.find().sort({ createdAt: -1 }).exec();
    

    
    res.render('inspector', { 
      reportData,
      user: {
        name: req.auth.name,
        role: 'inspector',
        email: req.auth.email
      }
    });
  } catch (error) {
    console.error('Error loading inspector dashboard:', error);
    res.status(500).render('error', { 
      message: 'Failed to load inspector data',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Enhanced authentication route
router.post('/auth', async function (req, res) {
  try {
    const { id, password, user_role } = req.body;
    

    
    // Input validation
    if (!id || !password || !user_role) {

      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Please provide User ID, Password, and Role'
      });
    }

    // Validate user role
    if (!['supervisor', 'inspector'].includes(user_role)) {

      return res.status(400).json({ 
        error: 'Invalid user role',
        message: 'Please select a valid role'
      });
    }

    const user = await User.findOne({ userId: id, user_role }).lean();
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials', message: 'User ID or password is incorrect.' });
    }
    const token = sign({ sub: String(user._id), userId: user.userId, role: user.user_role, name: user.name, email: user.email });
    res.cookie('ateco-token', token, cookieOptions);
      

      
      // Log successful login

      
      // Check if this is an AJAX request
      const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' || 
                     req.headers['content-type']?.includes('application/x-www-form-urlencoded');
      
      if (isAjax) {
        // Return JSON response for AJAX requests
        const redirectUrl = user_role === 'supervisor' ? '/supervisor' : '/inspector';
        return res.json({
          success: true,
          message: 'Login successful',
          redirectUrl: redirectUrl,
          user: {
            name: user.name,
            role: user_role,
            email: user.email
          }
        });
      } else {
        // Redirect for traditional form submissions
        const redirectUrl = user_role === 'supervisor' ? '/supervisor' : '/inspector';
        res.redirect(redirectUrl);
        }
  } catch (error) {
    console.error('Authentication error:', error);
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred during authentication'
      });
    } else {
      res.redirect('/?error=server_error');
    }
  }
});

// Logout route
router.get('/logout', (req, res) => {
  res.clearCookie('ateco-token', { path: '/' });
  res.redirect('/');
});

// Session check route (for AJAX requests)
router.get('/check-session', (req, res) => {

  if (req.auth) {
    res.json({ 
      authenticated: true, 
      user: req.auth.role,
      name: req.auth.name
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Creates a user with a bcrypt password hash. Keep this endpoint private or
// disable it after initial provisioning.
router.post('/auth/register', async (req, res) => {
  try {
    const { userId, password, user_role, name, email } = req.body;
    if (!userId || !password || !user_role || !name || !email || !['supervisor', 'inspector'].includes(user_role)) {
      return res.status(400).json({ error: 'userId, password, user_role, name and email are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ userId, password: hashedPassword, user_role, name, email });
    res.status(201).json({ success: true, user: { userId: user.userId, user_role: user.user_role, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Unable to register users' });
  }
});

// Debug route to check session after login


module.exports = router;
