import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🌐 API Request');
      console.log('URL:', config.url);
      console.log('Method:', config.method?.toUpperCase());
      console.log('Headers:', config.headers);
      console.log('Data:', config.data);
      console.groupEnd();
    }

    // Add timestamp for debugging
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      const endTime = new Date();
      const duration = endTime - response.config.metadata.startTime;
      
      console.group('✅ API Response');
      console.log('URL:', response.config.url);
      console.log('Status:', response.status);
      console.log('Duration:', `${duration}ms`);
      console.log('Data:', response.data);
      console.groupEnd();
    }

    return response;
  },
  (error) => {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      const endTime = new Date();
      const duration = error.config?.metadata?.startTime 
        ? endTime - error.config.metadata.startTime 
        : 'unknown';
      
      console.group('❌ API Error');
      console.log('URL:', error.config?.url);
      console.log('Status:', error.response?.status);
      console.log('Duration:', `${duration}ms`);
      console.log('Error:', error.message);
      console.log('Response:', error.response?.data);
      console.groupEnd();
    }

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    if (error.response?.status === 403) {
      // Forbidden - show access denied message
      console.warn('Access denied:', error.response.data);
    }

    if (error.response?.status === 429) {
      // Rate limited
      console.warn('Rate limited:', error.response.data);
    }

    return Promise.reject(error);
  }
);

// API utility functions
export const apiUtils = {
  // Get posts with pagination and filters
  getPosts: (params = {}) => {
    return api.get('/posts', { params });
  },

  // Get single post
  getPost: (id) => {
    return api.get(`/posts/${id}`);
  },

  // Create post
  createPost: (data) => {
    return api.post('/posts', data);
  },

  // Update post
  updatePost: (id, data) => {
    return api.put(`/posts/${id}`, data);
  },

  // Delete post
  deletePost: (id) => {
    return api.delete(`/posts/${id}`);
  },

  // Like/unlike post
  toggleLike: (id) => {
    return api.post(`/posts/${id}/like`);
  },

  // Search posts
  searchPosts: (query, params = {}) => {
    return api.get(`/posts/search/${encodeURIComponent(query)}`, { params });
  },

  // Get user profile
  getUserProfile: (id) => {
    return api.get(`/users/${id}`);
  },

  // Update user profile
  updateUserProfile: (id, data) => {
    return api.put(`/users/${id}`, data);
  },

  // Get user posts
  getUserPosts: (id, params = {}) => {
    return api.get(`/users/${id}/posts`, { params });
  },

  // Get users (admin only)
  getUsers: (params = {}) => {
    return api.get('/users', { params });
  },

  // Get user statistics (admin only)
  getUserStats: () => {
    return api.get('/users/stats/overview');
  },

  // Deactivate user (admin only)
  deactivateUser: (id) => {
    return api.post(`/users/${id}/deactivate`);
  },

  // Activate user (admin only)
  activateUser: (id) => {
    return api.post(`/users/${id}/activate`);
  },

  // Delete user (admin only)
  deleteUser: (id) => {
    return api.delete(`/users/${id}`);
  }
};

// Error handling utilities
export const errorHandler = {
  // Extract error message from axios error
  getErrorMessage: (error) => {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },

  // Check if error is network related
  isNetworkError: (error) => {
    return !error.response && error.request;
  },

  // Check if error is server related
  isServerError: (error) => {
    return error.response?.status >= 500;
  },

  // Check if error is client related
  isClientError: (error) => {
    return error.response?.status >= 400 && error.response?.status < 500;
  },

  // Get error status code
  getStatusCode: (error) => {
    return error.response?.status;
  }
};

// Request utilities
export const requestUtils = {
  // Add delay for testing
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Retry request with exponential backoff
  retry: async (fn, retries = 3, delay = 1000) => {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      
      await requestUtils.delay(delay);
      return requestUtils.retry(fn, retries - 1, delay * 2);
    }
  },

  // Cancel request
  cancelToken: () => axios.CancelToken.source()
};

export default api; 