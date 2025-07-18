// server/tests/setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Post = require('../src/models/Post');

let mongoServer;

// Setup MongoDB Memory Server for testing
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up database after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

// Disconnect and stop MongoDB Memory Server
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Global test utilities
global.createTestUser = async (userData = {}) => {
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123!',
    role: 'user',
    ...userData
  };

  const hashedPassword = await bcrypt.hash(defaultUser.password, 10);
  const user = new User({
    ...defaultUser,
    password: hashedPassword
  });

  return await user.save();
};

global.createTestAdmin = async (adminData = {}) => {
  const defaultAdmin = {
    username: 'adminuser',
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'admin',
    ...adminData
  };

  const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);
  const admin = new User({
    ...defaultAdmin,
    password: hashedPassword
  });

  return await admin.save();
};

global.createTestPost = async (postData = {}, userId) => {
  const defaultPost = {
    title: 'Test Post',
    content: 'This is a test post content.',
    slug: 'test-post',
    author: userId,
    category: 'Technology',
    tags: ['test', 'example'],
    status: 'pending',
    ...postData
  };

  const post = new Post(defaultPost);
  return await post.save();
};

global.generateAuthToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

global.setupTestDatabase = async () => {
  // Create test categories
  const categories = [
    { name: 'Technology', description: 'Tech related posts' },
    { name: 'Science', description: 'Science related posts' },
    { name: 'Health', description: 'Health related posts' },
    { name: 'Business', description: 'Business related posts' },
    { name: 'Lifestyle', description: 'Lifestyle related posts' }
  ];

  // Note: In a real implementation, you'd have a Category model
  // For now, we'll just ensure the test data is available
  global.testCategories = categories;
};

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// Mock external services
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Global test timeout
jest.setTimeout(30000); 