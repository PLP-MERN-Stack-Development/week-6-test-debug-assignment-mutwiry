const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  extractTokenFromHeader,
  getCurrentUser,
  hasRole,
  validatePasswordStrength
} = require('../../src/utils/auth');
const User = require('../../src/models/User');

// Mock User model
jest.mock('../../src/models/User');

describe('Auth Utils', () => {
  let mockUser;

  beforeEach(() => {
    mockUser = {
      _id: new mongoose.Types.ObjectId(),
      username: 'testuser',
      email: 'test@example.com',
      role: 'user'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token structure
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should include user data in token payload', () => {
      const token = generateToken(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      expect(decoded.id).toBe(mockUser._id.toString());
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should throw error when user is invalid', () => {
      expect(() => generateToken(null)).toThrow('Failed to generate authentication token');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded.id).toBe(mockUser._id.toString());
      expect(decoded.username).toBe(mockUser.username);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        { id: mockUser._id, username: mockUser.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '0s' }
      );
      
      // Wait for token to expire
      setTimeout(() => {
        expect(() => verifyToken(expiredToken)).toThrow('Invalid or expired token');
      }, 100);
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(password.length);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for invalid input', async () => {
      await expect(hashPassword(null)).rejects.toThrow('Failed to hash password');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testpassword123';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const result = await comparePassword(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const result = await comparePassword(wrongPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it('should throw error for invalid input', async () => {
      await expect(comparePassword(null, 'hash')).rejects.toThrow('Failed to compare passwords');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'test-token';
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      
      const result = extractTokenFromHeader(req);
      expect(result).toBe(token);
    });

    it('should return null for missing Authorization header', () => {
      const req = { headers: {} };
      
      const result = extractTokenFromHeader(req);
      expect(result).toBeNull();
    });

    it('should return null for invalid Authorization header format', () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat test-token'
        }
      };
      
      const result = extractTokenFromHeader(req);
      expect(result).toBeNull();
    });

    it('should return null for Authorization header without Bearer', () => {
      const req = {
        headers: {
          authorization: 'test-token'
        }
      };
      
      const result = extractTokenFromHeader(req);
      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user for valid token', async () => {
      const token = generateToken(mockUser);
      User.findById.mockResolvedValue({
        ...mockUser,
        isActive: true,
        select: jest.fn().mockReturnThis()
      });
      
      const result = await getCurrentUser(token);
      
      expect(result).toBeDefined();
      expect(result.username).toBe(mockUser.username);
      expect(User.findById).toHaveBeenCalledWith(mockUser._id.toString());
    });

    it('should return null for invalid token', async () => {
      const result = await getCurrentUser('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const token = generateToken(mockUser);
      User.findById.mockResolvedValue({
        ...mockUser,
        isActive: false,
        select: jest.fn().mockReturnThis()
      });
      
      const result = await getCurrentUser(token);
      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      const token = generateToken(mockUser);
      User.findById.mockResolvedValue(null);
      
      const result = await getCurrentUser(token);
      expect(result).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      const user = { role: 'admin' };
      const result = hasRole(user, 'admin');
      expect(result).toBe(true);
    });

    it('should return false for non-matching role', () => {
      const user = { role: 'user' };
      const result = hasRole(user, 'admin');
      expect(result).toBe(false);
    });

    it('should return true for user with role in array', () => {
      const user = { role: 'moderator' };
      const result = hasRole(user, ['admin', 'moderator']);
      expect(result).toBe(true);
    });

    it('should return false for user without role', () => {
      const user = {};
      const result = hasRole(user, 'admin');
      expect(result).toBe(false);
    });

    it('should return false for null user', () => {
      const result = hasRole(null, 'admin');
      expect(result).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should return valid for strong password', () => {
      const password = 'StrongPass123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for short password', () => {
      const password = 'short';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return invalid for password without lowercase', () => {
      const password = 'STRONGPASS123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should return invalid for password without uppercase', () => {
      const password = 'strongpass123!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should return invalid for password without number', () => {
      const password = 'StrongPass!';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return invalid for password without special character', () => {
      const password = 'StrongPass123';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
    });

    it('should return invalid for empty password', () => {
      const password = '';
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return invalid for null password', () => {
      const password = null;
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });
}); 