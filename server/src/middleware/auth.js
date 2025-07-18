const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
 * Authentication middleware
 */
const authenticate = async (req, res, next) => {
  try {
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

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Access denied. User not authenticated.',
            statusCode: 401
          }
        });
      }

      if (!hasRole(req.user, roles)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. Insufficient permissions.',
            statusCode: 403
          }
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticate,
  authorize,
  extractTokenFromHeader,
  getCurrentUser,
  hasRole,
  verifyToken
}; 