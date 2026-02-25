var express = require('express');
const User = require('../models/userModel')
const Report = require('../models/reportModel')
const Card = require('../models/cardModel')
const Certificate = require('../models/certificateModel')
const Operator = require('../models/operatorModel')
const AasiaSteelCard = require('../models/aasiaSteelCardModel')
var router = express.Router();

// Authentication middleware
const requireAuth = (req, res, next) => {

  
  if (req.session.user) {

    next();
  } else {

    res.redirect('/');
  }
};

// Role-based access control
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.session.user === role) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
  };
};

// User credentials (in production, these should be in a database with hashed passwords)
const USERS = {
  supervisor: {
    id: 'user123',
    password: 'supervisor1@3',
    role: 'supervisor',
    name: 'Supervisor',
    email: 'supervisor@ateco.com'
  },
  inspector: {
    id: 'user456',
    password: 'inspector1@3',
    role: 'inspector',
    name: 'Inspector',
    email: 'inspector@ateco.com'
  }
};

router.get('/', function (req, res, next) {

  
  // Only destroy session if user is not authenticated
  if (req.session.user) {

    const redirectUrl = req.session.user === 'supervisor' ? '/supervisor' : '/inspector';
    return res.redirect(redirectUrl);
  }
  
  // Clear any existing session only if not authenticated
  req.session.destroy();
  
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
        name: USERS.supervisor.name,
        role: 'supervisor',
        email: USERS.supervisor.email
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
        name: USERS.inspector.name,
        role: 'inspector',
        email: USERS.inspector.email
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

    // Get user credentials
    const user = USERS[user_role];
    
    if (!user) {

      return res.status(401).json({ 
        error: 'User not found',
        message: 'Invalid user role'
      });
    }

    // Verify credentials
    if (id === user.id && password === user.password) {
      // Set session
      req.session.user = user_role;
      req.session.userId = user.id;
      req.session.userName = user.name;
      req.session.userEmail = user.email;
      req.session.loginTime = new Date();
      

      
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
    } else {

      // Return JSON response for AJAX requests
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'User ID or Password is incorrect. Please check your credentials and try again.'
        });
      } else {
        // For form submissions, redirect back with error
        return res.redirect('/?error=invalid_credentials');
      }
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
  const userInfo = {
    name: req.session.userName,
    role: req.session.user,
    loginTime: req.session.loginTime
  };
  

  
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

// Session check route (for AJAX requests)
router.get('/check-session', (req, res) => {

  if (req.session.user) {
    res.json({ 
      authenticated: true, 
      user: req.session.user,
      name: req.session.userName
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Debug route to check session after login


module.exports = router;
