// client/cypress/support/commands.js

// Custom command to wait for page load
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible');
  cy.window().its('document').its('readyState').should('eq', 'complete');
});

// Custom command to check if element is visible and clickable
Cypress.Commands.add('clickIfVisible', (selector) => {
  cy.get('body').then(($body) => {
    if ($body.find(selector).length > 0) {
      cy.get(selector).should('be.visible').click();
    }
  });
});

// Custom command to type with delay (for better reliability)
Cypress.Commands.add('typeWithDelay', (selector, text, delay = 100) => {
  cy.get(selector).clear().type(text, { delay });
});

// Custom command to select option from dropdown
Cypress.Commands.add('selectOption', (selector, option) => {
  cy.get(selector).select(option);
});

// Custom command to check toast messages
Cypress.Commands.add('checkToast', (message, type = 'success') => {
  cy.get(`[data-testid="toast-${type}"]`).should('contain', message);
});

// Custom command to wait for loading to complete
Cypress.Commands.add('waitForLoading', () => {
  cy.get('[data-testid="loading"]').should('not.exist');
});

// Custom command to check if user is logged in
Cypress.Commands.add('checkLoggedIn', (username) => {
  cy.get('[data-testid="user-menu"]').should('contain', username);
});

// Custom command to check if user is logged out
Cypress.Commands.add('checkLoggedOut', () => {
  cy.get('[data-testid="login-link"]').should('be.visible');
});

// Custom command to navigate to a page
Cypress.Commands.add('navigateTo', (path) => {
  cy.visit(path);
  cy.waitForPageLoad();
});

// Custom command to check form validation
Cypress.Commands.add('checkFormValidation', (formSelector) => {
  cy.get(formSelector).within(() => {
    cy.get('input[required]').each(($input) => {
      cy.wrap($input).should('have.attr', 'required');
    });
  });
});

// Custom command to fill form fields
Cypress.Commands.add('fillForm', (formData) => {
  Object.keys(formData).forEach(field => {
    const value = formData[field];
    const selector = `[data-testid="${field}-input"]`;
    
    if (field.includes('select')) {
      cy.selectOption(selector, value);
    } else {
      cy.typeWithDelay(selector, value);
    }
  });
});

// Custom command to submit form
Cypress.Commands.add('submitForm', (formSelector) => {
  cy.get(formSelector).find('[type="submit"]').click();
});

// Custom command to check error messages
Cypress.Commands.add('checkError', (message) => {
  cy.get('[data-testid="error-message"]').should('contain', message);
});

// Custom command to check success messages
Cypress.Commands.add('checkSuccess', (message) => {
  cy.get('[data-testid="success-message"]').should('contain', message);
});

// Custom command to wait for network idle
Cypress.Commands.add('waitForNetworkIdle', (timeout = 5000) => {
  cy.wait(timeout);
});

// Custom command to take screenshot on failure
Cypress.Commands.add('screenshotOnFailure', () => {
  cy.screenshot(`${Cypress.currentTest.titlePath.join(' -- ')}`);
}); 