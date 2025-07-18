// client/src/tests/integration/AuthContext.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api');

// Test component that uses the auth context
const TestComponent = () => {
  const { user, login, logout, register, loading } = useAuth();
  
  return (
    <div>
      <div data-testid="user-info">
        {user ? `Logged in as ${user.username}` : 'Not logged in'}
      </div>
      <div data-testid="loading-status">{loading ? 'Loading...' : 'Not loading'}</div>
      <button onClick={() => login('test@example.com', 'password')} data-testid="login-btn">
        Login
      </button>
      <button onClick={() => register('test@example.com', 'password', 'testuser')} data-testid="register-btn">
        Register
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

const renderWithAuth = (component) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe('AuthContext Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Login Functionality', () => {
    it('should handle successful login', async () => {
      const mockUser = { id: '1', username: 'testuser', email: 'test@example.com' };
      const mockToken = 'mock-jwt-token';
      
      api.post.mockResolvedValueOnce({
        data: { success: true, data: { user: mockUser, token: mockToken } }
      });

      renderWithAuth(<TestComponent />);
      
      const loginButton = screen.getByTestId('login-btn');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as testuser');
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('token', mockToken);
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password'
      });
    });

    it('should handle login failure', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { message: 'Invalid credentials' } }
      });

      renderWithAuth(<TestComponent />);
      
      const loginButton = screen.getByTestId('login-btn');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
      });

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should show loading state during login', async () => {
      let resolveLogin;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      
      api.post.mockReturnValueOnce(loginPromise);

      renderWithAuth(<TestComponent />);
      
      const loginButton = screen.getByTestId('login-btn');
      fireEvent.click(loginButton);

      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading...');

      resolveLogin({
        data: { success: true, data: { user: { username: 'testuser' }, token: 'token' } }
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading-status')).toHaveTextContent('Not loading');
      });
    });
  });

  describe('Register Functionality', () => {
    it('should handle successful registration', async () => {
      const mockUser = { id: '1', username: 'newuser', email: 'new@example.com' };
      const mockToken = 'mock-jwt-token';
      
      api.post.mockResolvedValueOnce({
        data: { success: true, data: { user: mockUser, token: mockToken } }
      });

      renderWithAuth(<TestComponent />);
      
      const registerButton = screen.getByTestId('register-btn');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as newuser');
      });

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        password: 'password',
        username: 'testuser'
      });
    });

    it('should handle registration failure', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { message: 'Email already exists' } }
      });

      renderWithAuth(<TestComponent />);
      
      const registerButton = screen.getByTestId('register-btn');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
      });
    });
  });

  describe('Logout Functionality', () => {
    it('should handle logout', async () => {
      // First login
      const mockUser = { id: '1', username: 'testuser', email: 'test@example.com' };
      api.post.mockResolvedValueOnce({
        data: { success: true, data: { user: mockUser, token: 'token' } }
      });

      renderWithAuth(<TestComponent />);
      
      const loginButton = screen.getByTestId('login-btn');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as testuser');
      });

      // Then logout
      const logoutButton = screen.getByTestId('logout-btn');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Token Persistence', () => {
    it('should restore user session from localStorage token', async () => {
      const mockUser = { id: '1', username: 'testuser', email: 'test@example.com' };
      const mockToken = 'existing-token';
      
      localStorage.getItem.mockReturnValue(mockToken);
      api.get.mockResolvedValueOnce({
        data: { success: true, data: { user: mockUser } }
      });

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as testuser');
      });

      expect(api.get).toHaveBeenCalledWith('/auth/me');
    });

    it('should handle invalid token on app load', async () => {
      localStorage.getItem.mockReturnValue('invalid-token');
      api.get.mockRejectedValueOnce({
        response: { status: 401 }
      });

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during login', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'));

      renderWithAuth(<TestComponent />);
      
      const loginButton = screen.getByTestId('login-btn');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
      });
    });

    it('should handle API errors with no response', async () => {
      api.post.mockRejectedValueOnce({
        message: 'Request timeout'
      });

      renderWithAuth(<TestComponent />);
      
      const loginButton = screen.getByTestId('login-btn');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
      });
    });
  });
}); 