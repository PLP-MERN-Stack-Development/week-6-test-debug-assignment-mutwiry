// client/cypress/support/e2e.js

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
const app = window.top;
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML =
    '.command-name-request, .command-name-xhr { display: none }';
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Script error')) {
    return false;
  }
  return true;
});

// Custom command to login
Cypress.Commands.add('login', (email = 'test@example.com', password = 'Test123!') => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

// Custom command to register
Cypress.Commands.add('register', (username, email, password) => {
  cy.visit('/register');
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="register-button"]').click();
  cy.url().should('include', '/dashboard');
});

// Custom command to create a post
Cypress.Commands.add('createPost', (title, content, category = 'Technology') => {
  cy.visit('/create-post');
  cy.get('[data-testid="title-input"]').type(title);
  cy.get('[data-testid="content-input"]').type(content);
  cy.get('[data-testid="category-select"]').select(category);
  cy.get('[data-testid="submit-button"]').click();
  cy.contains('Post created successfully').should('be.visible');
});

// Custom command to wait for API calls
Cypress.Commands.add('waitForApi', (method, url) => {
  cy.intercept(method, url).as('apiCall');
  cy.wait('@apiCall');
});

// Custom command to clear database (for testing)
Cypress.Commands.add('clearDatabase', () => {
  cy.request('POST', 'http://localhost:5000/api/test/clear-db');
});

// Custom command to seed test data
Cypress.Commands.add('seedTestData', () => {
  cy.request('POST', 'http://localhost:5000/api/test/seed-data');
}); 