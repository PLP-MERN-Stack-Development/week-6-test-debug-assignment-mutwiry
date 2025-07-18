import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import api from '../utils/api';

// Create context
const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_TOKEN: 'SET_TOKEN',
  SET_ERROR: 'SET_ERROR',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.SET_TOKEN:
      return {
        ...state,
        token: action.payload,
        isAuthenticated: !!action.payload
      };
    
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const queryClient = useQueryClient();

  // Set up API interceptor for authentication
  useEffect(() => {
    if (state.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [state.token]);

  // Fetch current user data
  const { data: userData, error: userError } = useQuery(
    ['user', 'me'],
    () => api.get('/auth/me').then(res => res.data.data.user),
    {
      enabled: !!state.token,
      retry: false,
      onSuccess: (data) => {
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: data });
      },
      onError: (error) => {
        console.error('Failed to fetch user data:', error);
        if (error.response?.status === 401) {
          // Token is invalid, logout user
          logout();
        }
      }
    }
  );

  // Login mutation
  const loginMutation = useMutation(
    (credentials) => api.post('/auth/login', credentials),
    {
      onSuccess: (response) => {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        dispatch({ type: AUTH_ACTIONS.SET_TOKEN, payload: token });
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
        toast.success('Login successful!');
      },
      onError: (error) => {
        const message = error.response?.data?.error?.message || 'Login failed';
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: message });
        toast.error(message);
      }
    }
  );

  // Register mutation
  const registerMutation = useMutation(
    (userData) => api.post('/auth/register', userData),
    {
      onSuccess: (response) => {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        dispatch({ type: AUTH_ACTIONS.SET_TOKEN, payload: token });
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
        toast.success('Registration successful!');
      },
      onError: (error) => {
        const message = error.response?.data?.error?.message || 'Registration failed';
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: message });
        toast.error(message);
      }
    }
  );

  // Update profile mutation
  const updateProfileMutation = useMutation(
    (profileData) => api.put('/auth/profile', profileData),
    {
      onSuccess: (response) => {
        const user = response.data.data.user;
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
        queryClient.invalidateQueries(['user', 'me']);
        toast.success('Profile updated successfully!');
      },
      onError: (error) => {
        const message = error.response?.data?.error?.message || 'Profile update failed';
        toast.error(message);
      }
    }
  );

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    queryClient.clear();
    toast.success('Logged out successfully');
  };

  // Login function
  const login = (credentials) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    loginMutation.mutate(credentials);
  };

  // Register function
  const register = (userData) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    registerMutation.mutate(userData);
  };

  // Update profile function
  const updateProfile = (profileData) => {
    updateProfileMutation.mutate(profileData);
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Check if user has specific role
  const hasRole = (role) => {
    if (!state.user) return false;
    return state.user.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  };

  // Check if user is admin
  const isAdmin = () => hasRole('admin');

  // Check if user is moderator or admin
  const isModerator = () => hasAnyRole(['admin', 'moderator']);

  const value = {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    clearError,
    
    // Role checks
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    
    // Mutations
    loginMutation,
    registerMutation,
    updateProfileMutation
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider; 