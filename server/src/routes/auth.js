const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { 
  generateToken, 
  comparePassword, 
  validatePasswordStrength 
} = require('../utils/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('profile.firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('profile.lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  
  body('profile.bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array(),
        statusCode: 400
      }
    });
  }

  const { username, email, password, profile } = req.body;

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Password does not meet strength requirements',
        details: passwordValidation.errors,
        statusCode: 400
      }
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
  });

  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
    return res.status(400).json({
      success: false,
      error: {
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        statusCode: 400
      }
    });
  }

  // Create new user
  const user = new User({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    profile
  });

  await user.save();

  // Generate token
  const token = generateToken(user);

  logger.info(`New user registered: ${user.username}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.getPublicProfile(),
      token
    }
  });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array(),
        statusCode: 400
      }
    });
  }

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid credentials',
        statusCode: 401
      }
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Account is deactivated',
        statusCode: 401
      }
    });
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    logger.warn(`Failed login attempt for user: ${user.username}`);
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid credentials',
        statusCode: 401
      }
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user);

  logger.info(`User logged in: ${user.username}`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getPublicProfile(),
      token
    }
  });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Private
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Refresh token is required',
        statusCode: 400
      }
    });
  }

  try {
    const { verifyToken } = require('../utils/auth');
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    const newToken = generateToken(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid refresh token',
        statusCode: 401
      }
    });
  }
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', asyncHandler(async (req, res) => {
  const { extractTokenFromHeader, getCurrentUser } = require('../utils/auth');
  
  const token = extractTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Access denied. No token provided.',
        statusCode: 401
      }
    });
  }

  const user = await getCurrentUser(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token. User not found.',
        statusCode: 401
      }
    });
  }

  res.json({
    success: true,
    data: {
      user: user.getPublicProfile()
    }
  });
}));

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', [
  body('profile.firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('profile.lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  
  body('profile.bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
  const { extractTokenFromHeader, getCurrentUser } = require('../utils/auth');
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array(),
        statusCode: 400
      }
    });
  }

  const token = extractTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Access denied. No token provided.',
        statusCode: 401
      }
    });
  }

  const user = await getCurrentUser(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token. User not found.',
        statusCode: 401
      }
    });
  }

  // Update profile
  const { profile } = req.body;
  if (profile) {
    user.profile = { ...user.profile, ...profile };
  }

  await user.save();

  logger.info(`Profile updated for user: ${user.username}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.getPublicProfile()
    }
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // In a stateless JWT setup, logout is handled client-side
  // This endpoint can be used for logging purposes
  logger.info('User logout requested');
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

module.exports = router; 