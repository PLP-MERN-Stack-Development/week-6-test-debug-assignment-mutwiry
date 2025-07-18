// server/src/routes/test.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const bcrypt = require('bcryptjs');

// Only allow test routes in test environment
if (process.env.NODE_ENV !== 'test') {
  module.exports = (req, res, next) => next();
  return;
}

// Clear database
router.post('/clear-db', async (req, res) => {
  try {
    await User.deleteMany({});
    await Post.deleteMany({});
    res.json({ message: 'Database cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear database', error: error.message });
  }
});

// Seed test data
router.post('/seed-data', async (req, res) => {
  try {
    // Create test users
    const testUsers = [
      {
        username: 'testuser',
        email: 'test@example.com',
        password: await bcrypt.hash('Test123!', 10),
        role: 'user'
      },
      {
        username: 'adminuser',
        email: 'admin@example.com',
        password: await bcrypt.hash('Admin123!', 10),
        role: 'admin'
      }
    ];

    await User.insertMany(testUsers);
    res.json({ message: 'Test data seeded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to seed test data', error: error.message });
  }
});

// Make user admin
router.post('/make-admin', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User made admin successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to make user admin', error: error.message });
  }
});

// Get test user token
router.post('/get-token', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate token', error: error.message });
  }
});

module.exports = router; 