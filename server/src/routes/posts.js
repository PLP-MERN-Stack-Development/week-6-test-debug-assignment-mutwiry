const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/posts
 * @desc    Get all posts with pagination and filtering
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    author,
    status = 'published',
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};
  
  if (status) {
    query.status = status;
  }
  
  if (category) {
    query.category = category;
  }
  
  if (author) {
    query.author = author;
  }
  
  if (search) {
    query.$text = { $search: search };
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  // Execute query
  const posts = await Post.find(query)
    .populate('author', 'username profile.firstName profile.lastName')
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

  logger.logDatabase('find', 'posts', null, Date.now());

  res.json({
    success: true,
    data: {
      posts,
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
 * @route   GET /api/posts/my-posts
 * @desc    Get current user's posts
 * @access  Private
 */
router.get('/my-posts', authenticate, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = { author: req.user._id };
  
  if (status) {
    query.status = status;
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const posts = await Post.find(query)
    .populate('category', 'name')
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .select('-__v');

  const total = await Post.countDocuments(query);
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  logger.info(`User posts retrieved: ${req.user.username}`);

  res.json({
    success: true,
    data: {
      posts,
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
 * @route   GET /api/posts/pending/approval
 * @desc    Get all posts pending approval (Admin only)
 * @access  Private (Admin only)
 */
router.get('/pending/approval', [authenticate, authorize('admin')], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'submittedAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const posts = await Post.findPendingApproval()
    .populate('author', 'username profile.firstName profile.lastName email')
    .populate('category', 'name')
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .select('-__v');

  const total = await Post.countDocuments({
    status: 'pending',
    submittedForApproval: true
  });

  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  logger.info(`Pending posts retrieved by admin: ${req.user.username}`);

  res.json({
    success: true,
    data: {
      posts,
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
 * @route   GET /api/posts/:id
 * @desc    Get single post by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id)
    .populate('author', 'username profile.firstName profile.lastName')
    .populate('category', 'name')
    .select('-__v');

  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Post not found',
        statusCode: 404
      }
    });
  }

  // Increment view count for published posts
  if (post.status === 'published') {
    await post.incrementViewCount();
  }

  logger.logDatabase('findById', 'posts', id);

  res.json({
    success: true,
    data: {
      post
    }
  });
}));

/**
 * @route   POST /api/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/', [
  authenticate,
  body('title')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .trim(),
  
  body('content')
    .isLength({ min: 10, max: 10000 })
    .withMessage('Content must be between 10 and 10000 characters'),
  
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  
  body('slug')
    .isLength({ min: 3, max: 100 })
    .withMessage('Slug must be between 3 and 100 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  
  body('excerpt')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Excerpt cannot exceed 300 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  
  body('seo.metaTitle')
    .optional()
    .isLength({ max: 60 })
    .withMessage('Meta title cannot exceed 60 characters'),
  
  body('seo.metaDescription')
    .optional()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters')
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

  const {
    title,
    content,
    category,
    slug,
    excerpt,
    featuredImage,
    tags,
    status = 'draft',
    seo
  } = req.body;

  // Check if slug already exists
  const existingPost = await Post.findBySlug(slug);
  if (existingPost) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Slug already exists',
        statusCode: 400
      }
    });
  }

  // Create new post
  const post = new Post({
    title,
    content,
    author: req.user._id,
    category,
    slug,
    excerpt,
    featuredImage,
    tags,
    status,
    seo
  });

  await post.save();

  // Populate author and category for response
  await post.populate('author', 'username profile.firstName profile.lastName');
  await post.populate('category', 'name');

  logger.info(`New post created by user: ${req.user.username}`, { postId: post._id });

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: {
      post
    }
  });
}));

/**
 * @route   PUT /api/posts/:id
 * @desc    Update a post
 * @access  Private (Author or Admin)
 */
router.put('/:id', [
  authenticate,
  body('title')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .trim(),
  
  body('content')
    .optional()
    .isLength({ min: 10, max: 10000 })
    .withMessage('Content must be between 10 and 10000 characters'),
  
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Valid category ID is required'),
  
  body('excerpt')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Excerpt cannot exceed 300 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  
  body('seo.metaTitle')
    .optional()
    .isLength({ max: 60 })
    .withMessage('Meta title cannot exceed 60 characters'),
  
  body('seo.metaDescription')
    .optional()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters')
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

  // Find post
  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Post not found',
        statusCode: 404
      }
    });
  }

  // Check if user is author or admin
  const isAuthor = post.author.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  
  if (!isAuthor && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. You can only update your own posts.',
        statusCode: 403
      }
    });
  }

  // Update post
  const updatedPost = await Post.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  )
    .populate('author', 'username profile.firstName profile.lastName')
    .populate('category', 'name')
    .select('-__v');

  logger.info(`Post updated by user: ${req.user.username}`, { postId: id });

  res.json({
    success: true,
    message: 'Post updated successfully',
    data: {
      post: updatedPost
    }
  });
}));

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete a post
 * @access  Private (Author or Admin)
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find post
  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Post not found',
        statusCode: 404
      }
    });
  }

  // Check if user is author or admin
  const isAuthor = post.author.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  
  if (!isAuthor && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. You can only delete your own posts.',
        statusCode: 403
      }
    });
  }

  // Delete post
  await Post.findByIdAndDelete(id);

  logger.info(`Post deleted by user: ${req.user.username}`, { postId: id });

  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
}));

/**
 * @route   POST /api/posts/:id/like
 * @desc    Like/unlike a post
 * @access  Private
 */
router.post('/:id/like', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Post not found',
        statusCode: 404
      }
    });
  }

  // Check if user already liked the post
  // Note: This is a simplified implementation. In a real app, you'd have a separate likes collection
  const hasLiked = false; // This would be determined by checking a likes collection

  if (hasLiked) {
    await post.decrementLikeCount();
    logger.info(`Post unliked by user: ${req.user.username}`, { postId: id });
  } else {
    await post.incrementLikeCount();
    logger.info(`Post liked by user: ${req.user.username}`, { postId: id });
  }

  res.json({
    success: true,
    message: hasLiked ? 'Post unliked' : 'Post liked',
    data: {
      likeCount: post.likeCount,
      hasLiked: !hasLiked
    }
  });
}));

/**
 * @route   GET /api/posts/search/:query
 * @desc    Search posts
 * @access  Public
 */
router.get('/search/:query', asyncHandler(async (req, res) => {
  const { query } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const posts = await Post.search(query)
    .populate('author', 'username profile.firstName profile.lastName')
    .populate('category', 'name')
    .skip(skip)
    .limit(limitNum)
    .select('-__v');

  const total = await Post.countDocuments({
    $text: { $search: query },
    status: 'published',
    isPublished: true
  });

  const totalPages = Math.ceil(total / limitNum);

  logger.info(`Post search performed: ${query}`);

  res.json({
    success: true,
    data: {
      posts,
      query,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum
      }
    }
  });
}));

/**
 * @route   POST /api/posts/:id/submit
 * @desc    Submit post for approval
 * @access  Private (Author only)
 */
router.post('/:id/submit', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Post not found',
        statusCode: 404
      }
    });
  }

  // Check if user is the author
  if (post.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. You can only submit your own posts.',
        statusCode: 403
      }
    });
  }

  // Check if post is in draft status
  if (post.status !== 'draft') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Only draft posts can be submitted for approval',
        statusCode: 400
      }
    });
  }

  // Submit for approval
  await post.submitForApproval();

  // Populate author and category for response
  await post.populate('author', 'username profile.firstName profile.lastName');
  await post.populate('category', 'name');

  logger.info(`Post submitted for approval by user: ${req.user.username}`, { postId: id });

  res.json({
    success: true,
    message: 'Post submitted for approval successfully',
    data: {
      post
    }
  });
}));

/**
 * @route   POST /api/posts/:id/approve
 * @desc    Approve a post (Admin only)
 * @access  Private (Admin only)
 */
router.post('/:id/approve', [authenticate, authorize('admin')], asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Post not found',
        statusCode: 404
      }
    });
  }

  // Check if post is pending approval
  if (post.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Only pending posts can be approved',
        statusCode: 400
      }
    });
  }

  // Approve the post
  await post.approve(req.user._id);

  // Populate author and category for response
  await post.populate('author', 'username profile.firstName profile.lastName');
  await post.populate('category', 'name');

  logger.info(`Post approved by admin: ${req.user.username}`, { postId: id });

  res.json({
    success: true,
    message: 'Post approved successfully',
    data: {
      post
    }
  });
}));

/**
 * @route   POST /api/posts/:id/reject
 * @desc    Reject a post (Admin only)
 * @access  Private (Admin only)
 */
router.post('/:id/reject', [
  authenticate, 
  authorize('admin'),
  body('reason')
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters')
    .trim()
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
  const { reason } = req.body;

  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Post not found',
        statusCode: 404
      }
    });
  }

  // Check if post is pending approval
  if (post.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Only pending posts can be rejected',
        statusCode: 400
      }
    });
  }

  // Reject the post
  await post.reject(req.user._id, reason);

  // Populate author and category for response
  await post.populate('author', 'username profile.firstName profile.lastName');
  await post.populate('category', 'name');

  logger.info(`Post rejected by admin: ${req.user.username}`, { postId: id, reason });

  res.json({
    success: true,
    message: 'Post rejected successfully',
    data: {
      post
    }
  });
}));

module.exports = router; 