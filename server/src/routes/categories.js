const express = require('express');
const Category = require('../models/Category');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/categories - Get all active categories
router.get('/', asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).select('name slug description');
  res.json({ success: true, data: { categories } });
}));

module.exports = router; 