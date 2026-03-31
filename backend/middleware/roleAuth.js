const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. User not found.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token.'
    });
  }
};

// Role-based authorization middleware
const authorizeMentor = (req, res, next) => {
  if (req.user.role !== 'mentor') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Mentor role required.'
    });
  }
  next();
};

const authorizeStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Student role required.'
    });
  }
  next();
};

// Combined middleware for specific roles
const requireMentor = [authenticate, authorizeMentor];
const requireStudent = [authenticate, authorizeStudent];
const requireAuth = [authenticate];

module.exports = {
  authenticate,
  authorizeMentor,
  authorizeStudent,
  requireMentor,
  requireStudent,
  requireAuth
};