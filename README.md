[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=19897325&assignment_repo_type=AssignmentRepo)
# Testing and Debugging MERN Applications

This assignment focuses on implementing comprehensive testing strategies for a MERN stack application, including unit testing, integration testing, and end-to-end testing, along with debugging techniques.

## Assignment Overview

You will:
1. Set up testing environments for both client and server
2. Write unit tests for React components and server functions
3. Implement integration tests for API endpoints
4. Create end-to-end tests for critical user flows
5. Apply debugging techniques for common MERN stack issues

## Project Structure

```
mern-testing/
├── client/                 # React front-end
│   ├── src/                # React source code
│   │   ├── components/     # React components
│   │   ├── tests/          # Client-side tests
│   │   │   ├── unit/       # Unit tests
│   │   │   └── integration/ # Integration tests
│   │   └── App.jsx         # Main application component
│   └── cypress/            # End-to-end tests
├── server/                 # Express.js back-end
│   ├── src/                # Server source code
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   └── middleware/     # Custom middleware
│   └── tests/              # Server-side tests
│       ├── unit/           # Unit tests
│       └── integration/    # Integration tests
├── jest.config.js          # Jest configuration
└── package.json            # Project dependencies
```

## Getting Started

1. Accept the GitHub Classroom assignment invitation
2. Clone your personal repository that was created by GitHub Classroom
3. Follow the setup instructions in the `Week6-Assignment.md` file
4. Explore the starter code and existing tests
5. Complete the tasks outlined in the assignment

## Files Included

- `Week6-Assignment.md`: Detailed assignment instructions
- Starter code for a MERN application with basic test setup:
  - Sample React components with test files
  - Express routes with test files
  - Jest and testing library configurations
  - Example tests for reference

## Requirements

- Node.js (v18 or higher)
- MongoDB (local installation or Atlas account)
- npm or yarn
- Basic understanding of testing concepts

## Testing Tools

- Jest: JavaScript testing framework
- React Testing Library: Testing utilities for React
- Supertest: HTTP assertions for API testing
- Cypress/Playwright: End-to-end testing framework
- MongoDB Memory Server: In-memory MongoDB for testing

## Submission

Your work will be automatically submitted when you push to your GitHub Classroom repository. Make sure to:

1. Complete all required tests (unit, integration, and end-to-end)
2. Achieve at least 70% code coverage for unit tests
3. Document your testing strategy in the README.md
4. Include screenshots of your test coverage reports
5. Demonstrate debugging techniques in your code

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Cypress Documentation](https://docs.cypress.io/)
- [MongoDB Testing Best Practices](https://www.mongodb.com/blog/post/mongodb-testing-best-practices) 

---

## 🧪 Testing Strategy

### Unit Testing
- **Client:** Used Jest and React Testing Library to test utility functions and React components in isolation.
- **Server:** Used Jest to test utility functions and Express middleware.
- **Coverage Goal:** Achieved at least 70% code coverage for unit tests.

### Integration Testing
- **API Endpoints:** Used Supertest to test Express routes and database interactions.
- **React Integration:** Tested components that interact with APIs and forms.

### End-to-End Testing
- **Tool:** Cypress (or Playwright)
- **Flows Tested:** Registration, login, CRUD operations, navigation, and error handling.

---

## 📝 Example Test Coverage Report

_Add a screenshot of your coverage report here (e.g., from Jest or Cypress)._

![Test Coverage Screenshot](./coverage/example-coverage.png)

---

## 🐞 Debugging Techniques

- **Server-side Logging:** Used custom logger middleware to track API requests and errors.
- **React Error Boundaries:** Implemented error boundaries to catch and display UI errors.
- **Global Error Handler:** Added a global error handler in Express to catch and format server errors.
- **Browser DevTools:** Used Chrome DevTools for client-side debugging and inspecting network requests.
- **Performance Monitoring:** Used React Profiler and server logs to identify and optimize slow operations.

---

## ✅ How to Run Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only end-to-end tests
npm run test:e2e
```

---

## 📸 Screenshots

Place your screenshots in the `coverage/` or `screenshots/` folder in your project root. Reference them here using markdown:

```markdown
![Test Coverage Screenshot](./coverage/your-coverage-screenshot.png)
![Cypress E2E Tests](./coverage/cypress-tests.png)
```

Example:

![Test Coverage Screenshot](./coverage/your-coverage-screenshot.png)
![Cypress E2E Tests](./coverage/cypress-tests.png)

---

## 🏆 Extra Features / Notes

- [ ] List any extra features, improvements, or notes about your implementation. 