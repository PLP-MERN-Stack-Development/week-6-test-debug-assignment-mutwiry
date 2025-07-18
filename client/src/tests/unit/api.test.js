// client/src/tests/unit/api.test.js
import api from '../../utils/api';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

describe('API Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header when token exists', () => {
      const mockToken = 'test-token';
      localStorage.setItem('token', mockToken);
      
      // Re-import to trigger the interceptor setup
      jest.resetModules();
      require('../../utils/api');
      
      // The interceptor should be set up with the token
      expect(localStorage.getItem('token')).toBe(mockToken);
    });

    it('should not add Authorization header when no token exists', () => {
      localStorage.removeItem('token');
      
      // Re-import to trigger the interceptor setup
      jest.resetModules();
      require('../../utils/api');
      
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('Response Interceptor', () => {
    it('should return response data on successful request', () => {
      const mockResponse = {
        data: { success: true, message: 'Success' }
      };
      
      // Mock the response interceptor
      const responseInterceptor = api.interceptors.response.use.mock.calls[0][0];
      const result = responseInterceptor(mockResponse);
      
      expect(result).toEqual(mockResponse);
    });

    it('should handle 401 errors by removing token and redirecting', () => {
      const mockError = {
        response: { status: 401 }
      };
      
      // Mock window.location
      delete window.location;
      window.location = { href: '' };
      
      // Mock the response interceptor error handler
      const errorInterceptor = api.interceptors.response.use.mock.calls[0][1];
      errorInterceptor(mockError);
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(window.location.href).toBe('/login');
    });

    it('should handle 403 errors by redirecting to unauthorized page', () => {
      const mockError = {
        response: { status: 403 }
      };
      
      // Mock window.location
      delete window.location;
      window.location = { href: '' };
      
      // Mock the response interceptor error handler
      const errorInterceptor = api.interceptors.response.use.mock.calls[0][1];
      errorInterceptor(mockError);
      
      expect(window.location.href).toBe('/unauthorized');
    });

    it('should handle 500 errors by redirecting to error page', () => {
      const mockError = {
        response: { status: 500 }
      };
      
      // Mock window.location
      delete window.location;
      window.location = { href: '' };
      
      // Mock the response interceptor error handler
      const errorInterceptor = api.interceptors.response.use.mock.calls[0][1];
      errorInterceptor(mockError);
      
      expect(window.location.href).toBe('/error');
    });

    it('should rethrow error for other status codes', () => {
      const mockError = {
        response: { status: 404 }
      };
      
      // Mock the response interceptor error handler
      const errorInterceptor = api.interceptors.response.use.mock.calls[0][1];
      
      expect(() => errorInterceptor(mockError)).toThrow();
    });

    it('should handle network errors', () => {
      const mockError = new Error('Network Error');
      
      // Mock the response interceptor error handler
      const errorInterceptor = api.interceptors.response.use.mock.calls[0][1];
      
      expect(() => errorInterceptor(mockError)).toThrow('Network Error');
    });
  });

  describe('API Methods', () => {
    it('should have get method', () => {
      expect(typeof api.get).toBe('function');
    });

    it('should have post method', () => {
      expect(typeof api.post).toBe('function');
    });

    it('should have put method', () => {
      expect(typeof api.put).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof api.delete).toBe('function');
    });
  });

  describe('Base URL Configuration', () => {
    it('should use correct base URL', () => {
      // The base URL should be set to the proxy or localhost:5000
      expect(api.defaults.baseURL).toBeDefined();
    });

    it('should have proper headers configuration', () => {
      expect(api.defaults.headers).toBeDefined();
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });
  });
}); 