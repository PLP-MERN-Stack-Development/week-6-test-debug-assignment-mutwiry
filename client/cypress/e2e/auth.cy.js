// client/cypress/e2e/auth.cy.js
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.seedTestData();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Test123!'
      };

      cy.visit('/register');
      cy.waitForPageLoad();

      // Fill registration form
      cy.get('[data-testid="username-input"]').type(userData.username);
      cy.get('[data-testid="email-input"]').type(userData.email);
      cy.get('[data-testid="password-input"]').type(userData.password);
      cy.get('[data-testid="confirm-password-input"]').type(userData.password);

      // Submit form
      cy.get('[data-testid="register-button"]').click();

      // Check success message and redirect
      cy.contains('Registration successful').should('be.visible');
      cy.url().should('include', '/dashboard');
      cy.checkLoggedIn(userData.username);
    });

    it('should show validation errors for invalid input', () => {
      cy.visit('/register');

      // Try to submit empty form
      cy.get('[data-testid="register-button"]').click();

      // Check for validation errors
      cy.contains('Username is required').should('be.visible');
      cy.contains('Email is required').should('be.visible');
      cy.contains('Password is required').should('be.visible');
    });

    it('should show error for existing email', () => {
      // First register a user
      cy.register('existinguser', 'existing@example.com', 'Test123!');
      cy.logout();

      // Try to register with same email
      cy.visit('/register');
      cy.get('[data-testid="username-input"]').type('anotheruser');
      cy.get('[data-testid="email-input"]').type('existing@example.com');
      cy.get('[data-testid="password-input"]').type('Test123!');
      cy.get('[data-testid="confirm-password-input"]').type('Test123!');
      cy.get('[data-testid="register-button"]').click();

      cy.contains('Email already exists').should('be.visible');
    });

    it('should validate password strength', () => {
      cy.visit('/register');
      cy.get('[data-testid="username-input"]').type('testuser');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="confirm-password-input"]').type('weak');

      cy.get('[data-testid="register-button"]').click();
      cy.contains('Password must be at least 8 characters').should('be.visible');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Create a test user
      cy.register('testuser', 'test@example.com', 'Test123!');
      cy.logout();
    });

    it('should login successfully with valid credentials', () => {
      cy.visit('/login');
      cy.waitForPageLoad();

      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('Test123!');
      cy.get('[data-testid="login-button"]').click();

      cy.url().should('include', '/dashboard');
      cy.checkLoggedIn('testuser');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();

      cy.contains('Invalid credentials').should('be.visible');
      cy.url().should('include', '/login');
    });

    it('should show error for non-existent user', () => {
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('nonexistent@example.com');
      cy.get('[data-testid="password-input"]').type('Test123!');
      cy.get('[data-testid="login-button"]').click();

      cy.contains('User not found').should('be.visible');
    });

    it('should toggle password visibility', () => {
      cy.visit('/login');
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
      
      cy.get('[data-testid="password-toggle"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'text');
      
      cy.get('[data-testid="password-toggle"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      cy.register('logoutuser', 'logout@example.com', 'Test123!');
    });

    it('should logout successfully', () => {
      cy.checkLoggedIn('logoutuser');
      
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      cy.checkLoggedOut();
      cy.url().should('include', '/');
    });

    it('should redirect to login when accessing protected routes after logout', () => {
      cy.visit('/dashboard');
      cy.checkLoggedIn('logoutuser');

      // Logout
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Try to access protected route
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });
  });

  describe('Session Management', () => {
    it('should maintain session after page refresh', () => {
      cy.register('sessionuser', 'session@example.com', 'Test123!');
      cy.checkLoggedIn('sessionuser');

      cy.reload();
      cy.checkLoggedIn('sessionuser');
    });

    it('should redirect to intended page after login', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');

      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('Test123!');
      cy.get('[data-testid="login-button"]').click();

      cy.url().should('include', '/dashboard');
    });
  });

  describe('Form Validation', () => {
    it('should validate login form fields', () => {
      cy.visit('/login');
      cy.checkFormValidation('[data-testid="login-form"]');
    });

    it('should validate registration form fields', () => {
      cy.visit('/register');
      cy.checkFormValidation('[data-testid="register-form"]');
    });

    it('should show password mismatch error', () => {
      cy.visit('/register');
      cy.get('[data-testid="username-input"]').type('testuser');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('Test123!');
      cy.get('[data-testid="confirm-password-input"]').type('Different123!');
      cy.get('[data-testid="register-button"]').click();

      cy.contains('Passwords do not match').should('be.visible');
    });
  });
}); 