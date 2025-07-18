const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('./logger');

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  try {
    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'mern-testing-app',
      audience: 'mern-testing-users'
    });

    logger.debug(`Token generated for user: ${user.username}`);
    return token;
  } catch (error) {
    logger.error('Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.debug(`Token verified for user: ${decoded.username}`);
    return decoded;
  } catch (error) {
    logger.warn('Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
};

/**
 * Hash password using bcrypt
 * @param {String} password - Plain text password
 * @returns {String} Hashed password
 */
const hashPassword = async (password) => {
  try {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    logger.debug('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare password with hashed password
 * @param {String} password - Plain text password
 * @param {String} hashedPassword - Hashed password
 * @returns {Boolean} True if passwords match
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    logger.debug(`Password comparison result: ${isMatch}`);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    throw new Error('Failed to compare passwords');
  }
};

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {String|null} Token or null
 */
const extractTokenFromHeader = (req) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return token;
  } catch (error) {
    logger.error('Error extracting token from header:', error);
    return null;
  }
};

/**
 * Get current user from token
 * @param {String} token - JWT token
 * @returns {Object|null} User object or null
 */
const getCurrentUser = async (token) => {
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return null;
    }
    
    logger.debug(`Current user retrieved: ${user.username}`);
    return user;
  } catch (error) {
    logger.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Check if user has required role
 * @param {Object} user - User object
 * @param {String|Array} requiredRoles - Required role(s)
 * @returns {Boolean} True if user has required role
 */
const hasRole = (user, requiredRoles) => {
  if (!user || !user.role) {
    return false;
  }
  
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const hasRequiredRole = roles.includes(user.role);
  
  logger.debug(`Role check for user ${user.username}: ${user.role} in ${roles} = ${hasRequiredRole}`);
  return hasRequiredRole;
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @returns {String} Refresh token
 */
const generateRefreshToken = (user) => {
  try {
    const payload = {
      id: user._id,
      type: 'refresh'
    };

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '30d',
      issuer: 'mern-testing-app',
      audience: 'mern-testing-users'
    });

    logger.debug(`Refresh token generated for user: ${user.username}`);
    return refreshToken;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} Validation result with isValid and errors
 */
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  const isValid = errors.length === 0;
  
  logger.debug(`Password strength validation: ${isValid ? 'valid' : 'invalid'}`);
  
  return {
    isValid,
    errors
  };
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  extractTokenFromHeader,
  getCurrentUser,
  hasRole,
  generateRefreshToken,
  validatePasswordStrength
}; 