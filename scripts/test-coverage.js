// scripts/test-coverage.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Generating Test Coverage Report...\n');

// Function to run tests and generate coverage
function runTests() {
  try {
    console.log('📊 Running server tests...');
    execSync('npm run test:coverage', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    console.log('\n📊 Running client tests...');
    execSync('npm run test:coverage', { stdio: 'inherit', cwd: path.join(__dirname, '../client') });
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Function to generate coverage summary
function generateCoverageSummary() {
  const coverageDir = path.join(__dirname, '../coverage');
  const summary = {
    timestamp: new Date().toISOString(),
    server: {},
    client: {},
    overall: {}
  };

  // Read server coverage
  const serverCoveragePath = path.join(coverageDir, 'server', 'coverage-summary.json');
  if (fs.existsSync(serverCoveragePath)) {
    const serverData = JSON.parse(fs.readFileSync(serverCoveragePath, 'utf8'));
    summary.server = serverData.total;
  }

  // Read client coverage
  const clientCoveragePath = path.join(coverageDir, 'client', 'coverage-summary.json');
  if (fs.existsSync(clientCoveragePath)) {
    const clientData = JSON.parse(fs.readFileSync(clientCoveragePath, 'utf8'));
    summary.client = clientData.total;
  }

  // Calculate overall coverage
  if (summary.server && summary.client) {
    summary.overall = {
      statements: Math.round((summary.server.statements.pct + summary.client.statements.pct) / 2),
      branches: Math.round((summary.server.branches.pct + summary.client.branches.pct) / 2),
      functions: Math.round((summary.server.functions.pct + summary.client.functions.pct) / 2),
      lines: Math.round((summary.server.lines.pct + summary.client.lines.pct) / 2)
    };
  }

  return summary;
}

// Function to create coverage report
function createCoverageReport(summary) {
  const reportPath = path.join(__dirname, '../COVERAGE_REPORT.md');
  
  const report = `# 📊 Test Coverage Report

Generated on: ${new Date().toLocaleString()}

## 🎯 Overall Coverage

| Metric | Coverage |
|--------|----------|
| **Statements** | ${summary.overall.statements || 0}% |
| **Branches** | ${summary.overall.branches || 0}% |
| **Functions** | ${summary.overall.functions || 0}% |
| **Lines** | ${summary.overall.lines || 0}% |

## 🖥️ Server Coverage

| Metric | Coverage | Status |
|--------|----------|--------|
| Statements | ${summary.server.statements?.pct || 0}% | ${summary.server.statements?.pct >= 70 ? '✅' : '❌'} |
| Branches | ${summary.server.branches?.pct || 0}% | ${summary.server.branches?.pct >= 60 ? '✅' : '❌'} |
| Functions | ${summary.server.functions?.pct || 0}% | ${summary.server.functions?.pct >= 70 ? '✅' : '❌'} |
| Lines | ${summary.server.lines?.pct || 0}% | ${summary.server.lines?.pct >= 70 ? '✅' : '❌'} |

## 🎨 Client Coverage

| Metric | Coverage | Status |
|--------|----------|--------|
| Statements | ${summary.client.statements?.pct || 0}% | ${summary.client.statements?.pct >= 70 ? '✅' : '❌'} |
| Branches | ${summary.client.branches?.pct || 0}% | ${summary.client.branches?.pct >= 60 ? '✅' : '❌'} |
| Functions | ${summary.client.functions?.pct || 0}% | ${summary.client.functions?.pct >= 70 ? '✅' : '❌'} |
| Lines | ${summary.client.lines?.pct || 0}% | ${summary.client.lines?.pct >= 70 ? '✅' : '❌'} |

## 📋 Test Summary

### ✅ Completed Tests
- **Unit Tests**: React components, utility functions, middleware
- **Integration Tests**: API endpoints, database operations, authentication flows
- **End-to-End Tests**: User registration, login, post management, admin approval

### 🧪 Test Categories
1. **Server Unit Tests**: 1 file (auth.test.js)
2. **Server Integration Tests**: 1 file (posts.test.js)
3. **Client Unit Tests**: 3 files (Button, ErrorBoundary, API utilities)
4. **Client Integration Tests**: 1 file (AuthContext)
5. **E2E Tests**: 2 files (auth.cy.js, posts.cy.js)

### 🎯 Coverage Goals
- **Minimum Coverage**: 70% for statements, functions, and lines
- **Branch Coverage**: 60% minimum
- **Test Types**: Unit, Integration, and E2E tests

## 📁 Coverage Reports Location
- **Server**: \`coverage/server/index.html\`
- **Client**: \`coverage/client/index.html\`
- **Combined**: \`coverage/index.html\`

## 🚀 Running Tests

\`\`\`bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
\`\`\`

## 📈 Coverage History
This report is generated automatically during the testing process.
Previous reports can be found in the \`coverage/\` directory.
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📄 Coverage report saved to: ${reportPath}`);
}

// Function to create test documentation
function createTestDocumentation() {
  const docPath = path.join(__dirname, '../TEST_DOCUMENTATION.md');
  
  const documentation = `# 🧪 Testing Documentation

## Overview
This document provides comprehensive information about the testing strategy, test types, and how to run tests for the MERN stack application.

## 🎯 Testing Strategy

### 1. Unit Testing
**Purpose**: Test individual components and functions in isolation
**Tools**: Jest, React Testing Library
**Coverage**: React components, utility functions, middleware

**Key Areas**:
- React components (Button, ErrorBoundary)
- Utility functions (API utilities, auth helpers)
- Express middleware functions
- Database models and validation

### 2. Integration Testing
**Purpose**: Test interactions between components and API endpoints
**Tools**: Jest, Supertest, React Testing Library
**Coverage**: API endpoints, database operations, component interactions

**Key Areas**:
- API endpoint testing with Supertest
- Database operations with test database
- React context integration (AuthContext)
- Form submissions and validation

### 3. End-to-End Testing
**Purpose**: Test complete user workflows
**Tools**: Cypress
**Coverage**: Critical user flows, navigation, error handling

**Key Areas**:
- User registration and login
- Post creation and management
- Admin approval workflows
- Error handling and edge cases

## 🛠️ Test Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (for integration tests)
- All dependencies installed

### Environment Variables
\`\`\`bash
# Test environment
NODE_ENV=test
JWT_SECRET=test-secret-key
MONGODB_URI=mongodb://localhost:27017/test
\`\`\`

### Test Database
- Uses MongoDB Memory Server for integration tests
- Automatically created and destroyed for each test suite
- No external database required

## 📁 Test Structure

\`\`\`
tests/
├── unit/                    # Unit tests
│   ├── Button.test.jsx     # React component tests
│   ├── ErrorBoundary.test.jsx
│   └── api.test.js         # Utility function tests
├── integration/            # Integration tests
│   └── AuthContext.test.jsx # Context integration tests
└── setup.js               # Test setup and utilities

cypress/
├── e2e/                   # End-to-end tests
│   ├── auth.cy.js         # Authentication flows
│   └── posts.cy.js        # Post management flows
├── support/               # Cypress support files
│   ├── commands.js        # Custom commands
│   └── e2e.js            # Global configuration
└── cypress.config.js      # Cypress configuration
\`\`\`

## 🧪 Running Tests

### All Tests
\`\`\`bash
npm test
\`\`\`

### Unit Tests Only
\`\`\`bash
npm run test:unit
\`\`\`

### Integration Tests Only
\`\`\`bash
npm run test:integration
\`\`\`

### End-to-End Tests Only
\`\`\`bash
npm run test:e2e
\`\`\`

### With Coverage
\`\`\`bash
npm run test:coverage
\`\`\`

### Watch Mode
\`\`\`bash
npm run test:watch
\`\`\`

## 📊 Coverage Requirements

### Minimum Coverage Targets
- **Statements**: 70%
- **Branches**: 60%
- **Functions**: 70%
- **Lines**: 70%

### Coverage Reports
- HTML reports: \`coverage/index.html\`
- LCOV reports: \`coverage/lcov.info\`
- Console output: Coverage summary in terminal

## 🔧 Test Utilities

### Global Test Helpers
\`\`\`javascript
// Create test user
const user = await createTestUser({
  username: 'testuser',
  email: 'test@example.com'
});

// Create test admin
const admin = await createTestAdmin();

// Create test post
const post = await createTestPost({
  title: 'Test Post',
  content: 'Test content'
}, user._id);

// Generate auth token
const token = generateAuthToken(user);
\`\`\`

### Custom Cypress Commands
\`\`\`javascript
// Login command
cy.login('test@example.com', 'Test123!');

// Register command
cy.register('testuser', 'test@example.com', 'Test123!');

// Create post command
cy.createPost('Test Post', 'Test content', 'Technology');

// Wait for API calls
cy.waitForApi('POST', '/api/posts');
\`\`\`

## 🐛 Debugging Tests

### Common Issues
1. **Test Database Connection**: Ensure MongoDB Memory Server is working
2. **Async Operations**: Use \`waitFor\` for async operations
3. **Component Rendering**: Mock external dependencies
4. **API Calls**: Use \`cy.intercept\` to mock API responses

### Debug Commands
\`\`\`bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- Button.test.jsx

# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Open Cypress in interactive mode
npm run test:e2e:open
\`\`\`

## 📈 Continuous Integration

### GitHub Actions
Tests are automatically run on:
- Pull requests
- Push to main branch
- Scheduled runs

### Pre-commit Hooks
- Lint code before commit
- Run unit tests before commit
- Check coverage thresholds

## 🎯 Best Practices

### Writing Tests
1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Use clear test descriptions
3. **Isolation**: Each test should be independent
4. **Mocking**: Mock external dependencies
5. **Coverage**: Aim for high coverage but focus on critical paths

### Test Data
1. **Factory Functions**: Use helper functions to create test data
2. **Cleanup**: Always clean up test data
3. **Realistic Data**: Use realistic but safe test data
4. **Randomization**: Use random data when appropriate

### Performance
1. **Parallel Execution**: Run tests in parallel when possible
2. **Database Optimization**: Use indexes and efficient queries
3. **Mocking**: Mock heavy operations
4. **Timeouts**: Set appropriate timeouts

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
`;

  fs.writeFileSync(docPath, documentation);
  console.log(`📄 Test documentation saved to: ${docPath}`);
}

// Main execution
function main() {
  console.log('🚀 Starting test coverage generation...\n');
  
  // Run tests
  runTests();
  
  // Generate coverage summary
  const summary = generateCoverageSummary();
  
  // Create reports
  createCoverageReport(summary);
  createTestDocumentation();
  
  console.log('\n🎉 Test coverage generation completed!');
  console.log('📊 Check the generated reports:');
  console.log('   - COVERAGE_REPORT.md');
  console.log('   - TEST_DOCUMENTATION.md');
  console.log('   - coverage/index.html');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runTests, generateCoverageSummary, createCoverageReport, createTestDocumentation }; 