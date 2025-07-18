const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Post = require('../models/Post');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    role,
    isActive,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};
  
  if (role) {
    query.role = role;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  // Execute query
  const users = await User.find(query)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination
  const total = await User.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  logger.info(`Users list accessed by admin: ${req.user.username}`);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage
      }
    }
  });
}));

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (User can view own profile, Admin can view any)
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user is viewing their own profile or is admin
  const isOwnProfile = req.user._id.toString() === id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwnProfile && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. You can only view your own profile.',
        statusCode: 403
      }
    });
  }

  const user = await User.findById(id).select('-password');
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        statusCode: 404
      }
    });
  }

  // Get user's posts count
  const postsCount = await Post.countDocuments({ author: id });

  logger.info(`User profile accessed: ${user.username} by ${req.user.username}`);

  res.json({
    success: true,
    data: {
      user: {
        ...user.toObject(),
        postsCount
      }
    }
  });
}));

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (User can update own profile, Admin can update any)
 * @access  Private
 */
router.put('/:id', [
  authenticate,
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
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('role')
    .optional()
    .isIn(['user', 'admin', 'moderator'])
    .withMessage('Invalid role'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
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

  const { id } = req.params;
  const { profile, role, isActive } = req.body;

  // Check if user is updating their own profile or is admin
  const isOwnProfile = req.user._id.toString() === id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwnProfile && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. You can only update your own profile.',
        statusCode: 403
      }
    });
  }

  // Only admins can change roles and active status
  if ((role || isActive !== undefined) && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Only admins can change roles and active status.',
        statusCode: 403
      }
    });
  }

  // Find user
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        statusCode: 404
      }
    });
  }

  // Update user
  const updateData = {};
  if (profile) {
    updateData.profile = { ...user.profile, ...profile };
  }
  if (role && isAdmin) {
    updateData.role = role;
  }
  if (isActive !== undefined && isAdmin) {
    updateData.isActive = isActive;
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  logger.info(`User updated: ${updatedUser.username} by ${req.user.username}`);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: updatedUser
    }
  });
}));

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (Admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (req.user._id.toString() === id) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'You cannot delete your own account',
        statusCode: 400
      }
    });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        statusCode: 404
      }
    });
  }

  // Delete user's posts
  await Post.deleteMany({ author: id });

  // Delete user
  await User.findByIdAndDelete(id);

  logger.info(`User deleted: ${user.username} by admin: ${req.user.username}`);

  res.json({
    success: true,
    message: 'User and associated posts deleted successfully'
  });
}));

/**
 * @route   GET /api/users/:id/posts
 * @desc    Get user's posts
 * @access  Public
 */
router.get('/:id/posts', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    page = 1,
    limit = 10,
    status = 'published',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Verify user exists
  const user = await User.findById(id).select('username');
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        statusCode: 404
      }
    });
  }

  // Build query
  const query = { author: id };
  if (status) {
    query.status = status;
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  // Execute query
  const posts = await Post.find(query)
    .populate('category', 'name')
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .select('-__v');

  // Get total count for pagination
  const total = await Post.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  logger.info(`User posts accessed: ${user.username}`);

  res.json({
    success: true,
    data: {
      posts,
      author: {
        id: user._id,
        username: user.username
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage
      }
    }
  });
}));

/**
 * @route   GET /api/users/stats/overview
 * @desc    Get user statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  // Get total users count
  const totalUsers = await User.countDocuments();
  
  // Get active users count
  const activeUsers = await User.countDocuments({ isActive: true });
  
  // Get users by role
  const usersByRole = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get users registered in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Get top users by post count
  const topUsers = await Post.aggregate([
    {
      $group: {
        _id: '$author',
        postCount: { $sum: 1 }
      }
    },
    {
      $sort: { postCount: -1 }
    },
    {
      $limit: 10
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        username: '$user.username',
        postCount: 1
      }
    }
  ]);

  logger.info(`User statistics accessed by admin: ${req.user.username}`);

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      newUsers,
      usersByRole,
      topUsers
    }
  });
}));

/**
 * @route   POST /api/users/:id/deactivate
 * @desc    Deactivate user (Admin only)
 * @access  Private (Admin)
 */
router.post('/:id/deactivate', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deactivating themselves
  if (req.user._id.toString() === id) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'You cannot deactivate your own account',
        statusCode: 400
      }
    });
  }

  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        statusCode: 404
      }
    });
  }

  logger.info(`User deactivated: ${user.username} by admin: ${req.user.username}`);

  res.json({
    success: true,
    message: 'User deactivated successfully',
    data: {
      user
    }
  });
}));

/**
 * @route   POST /api/users/:id/activate
 * @desc    Activate user (Admin only)
 * @access  Private (Admin)
 */
router.post('/:id/activate', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { isActive: true },
    { new: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        statusCode: 404
      }
    });
  }

  logger.info(`User activated: ${user.username} by admin: ${req.user.username}`);

  res.json({
    success: true,
    message: 'User activated successfully',
    data: {
      user
    }
  });
}));

module.exports = router; 