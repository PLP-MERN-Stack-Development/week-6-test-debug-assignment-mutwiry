// client/cypress/e2e/posts.cy.js
describe('Post Management', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.seedTestData();
  });

  describe('Post Creation', () => {
    beforeEach(() => {
      cy.register('postcreator', 'creator@example.com', 'Test123!');
    });

    it('should create a new post successfully', () => {
      cy.visit('/create-post');
      cy.waitForPageLoad();

      const postData = {
        title: 'Test Post Title',
        content: 'This is a test post content with some details.',
        category: 'Technology',
        tags: 'test, cypress, e2e',
        featuredImage: 'https://example.com/image.jpg'
      };

      // Fill post form
      cy.get('[data-testid="title-input"]').type(postData.title);
      cy.get('[data-testid="content-input"]').type(postData.content);
      cy.get('[data-testid="category-select"]').select(postData.category);
      cy.get('[data-testid="tags-input"]').type(postData.tags);
      cy.get('[data-testid="featured-image-input"]').type(postData.featuredImage);

      // Submit form
      cy.get('[data-testid="submit-button"]').click();

      // Check success message
      cy.contains('Post created successfully').should('be.visible');
      cy.url().should('include', '/my-posts');
    });

    it('should show validation errors for required fields', () => {
      cy.visit('/create-post');
      cy.get('[data-testid="submit-button"]').click();

      cy.contains('Title is required').should('be.visible');
      cy.contains('Content is required').should('be.visible');
      cy.contains('Category is required').should('be.visible');
    });

    it('should generate unique slug from title', () => {
      cy.visit('/create-post');
      cy.get('[data-testid="title-input"]').type('My Test Post');
      cy.get('[data-testid="content-input"]').type('Test content');
      cy.get('[data-testid="category-select"]').select('Technology');
      cy.get('[data-testid="submit-button"]').click();

      cy.contains('Post created successfully').should('be.visible');
      
      // Check that slug was generated
      cy.visit('/my-posts');
      cy.contains('my-test-post').should('be.visible');
    });

    it('should handle duplicate slug by appending timestamp', () => {
      // Create first post
      cy.createPost('Duplicate Title', 'First post content', 'Technology');
      
      // Create second post with same title
      cy.visit('/create-post');
      cy.get('[data-testid="title-input"]').type('Duplicate Title');
      cy.get('[data-testid="content-input"]').type('Second post content');
      cy.get('[data-testid="category-select"]').select('Technology');
      cy.get('[data-testid="submit-button"]').click();

      cy.contains('Post created successfully').should('be.visible');
      
      // Both posts should exist with different slugs
      cy.visit('/my-posts');
      cy.contains('duplicate-title').should('be.visible');
      cy.contains('duplicate-title-').should('be.visible');
    });
  });

  describe('My Posts Management', () => {
    beforeEach(() => {
      cy.register('postmanager', 'manager@example.com', 'Test123!');
    });

    it('should display user posts with correct status', () => {
      // Create a post
      cy.createPost('My First Post', 'Post content', 'Technology');
      
      cy.visit('/my-posts');
      cy.contains('My First Post').should('be.visible');
      cy.contains('Pending Approval').should('be.visible');
    });

    it('should allow editing own posts', () => {
      cy.createPost('Editable Post', 'Original content', 'Technology');
      
      cy.visit('/my-posts');
      cy.get('[data-testid="edit-post-button"]').first().click();
      
      cy.get('[data-testid="title-input"]').clear().type('Updated Post Title');
      cy.get('[data-testid="content-input"]').clear().type('Updated content');
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('Post updated successfully').should('be.visible');
      cy.contains('Updated Post Title').should('be.visible');
    });

    it('should allow deleting own posts', () => {
      cy.createPost('Deletable Post', 'Post content', 'Technology');
      
      cy.visit('/my-posts');
      cy.get('[data-testid="delete-post-button"]').first().click();
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      cy.contains('Post deleted successfully').should('be.visible');
      cy.contains('Deletable Post').should('not.exist');
    });

    it('should show post details correctly', () => {
      cy.createPost('Detailed Post', 'Detailed content with markdown', 'Technology');
      
      cy.visit('/my-posts');
      cy.get('[data-testid="view-post-button"]').first().click();
      
      cy.contains('Detailed Post').should('be.visible');
      cy.contains('Detailed content with markdown').should('be.visible');
      cy.contains('Technology').should('be.visible');
    });
  });

  describe('Admin Approval Queue', () => {
    let adminUser;
    let regularUser;

    beforeEach(() => {
      // Create admin user
      cy.register('adminuser', 'admin@example.com', 'Test123!');
      cy.request('POST', 'http://localhost:5000/api/test/make-admin', {
        email: 'admin@example.com'
      });
      
      // Create regular user and post
      cy.register('regularuser', 'regular@example.com', 'Test123!');
      cy.login('regular@example.com', 'Test123!');
      cy.createPost('Pending Post', 'Post content', 'Technology');
      cy.logout();
      
      // Login as admin
      cy.login('admin@example.com', 'Test123!');
    });

    it('should display pending posts in admin queue', () => {
      cy.visit('/admin/approval-queue');
      cy.contains('Pending Post').should('be.visible');
      cy.contains('Pending Approval').should('be.visible');
    });

    it('should allow admin to approve posts', () => {
      cy.visit('/admin/approval-queue');
      cy.get('[data-testid="approve-post-button"]').first().click();
      
      cy.get('[data-testid="approval-reason"]').type('Great content!');
      cy.get('[data-testid="confirm-approve-button"]').click();
      
      cy.contains('Post approved successfully').should('be.visible');
      cy.contains('Approved').should('be.visible');
    });

    it('should allow admin to reject posts', () => {
      cy.visit('/admin/approval-queue');
      cy.get('[data-testid="reject-post-button"]').first().click();
      
      cy.get('[data-testid="rejection-reason"]').type('Content violates guidelines');
      cy.get('[data-testid="confirm-reject-button"]').click();
      
      cy.contains('Post rejected successfully').should('be.visible');
      cy.contains('Rejected').should('be.visible');
    });

    it('should show post details in approval queue', () => {
      cy.visit('/admin/approval-queue');
      cy.get('[data-testid="view-post-details"]').first().click();
      
      cy.contains('Pending Post').should('be.visible');
      cy.contains('Post content').should('be.visible');
      cy.contains('regularuser').should('be.visible');
    });

    it('should filter posts by status', () => {
      // Approve one post first
      cy.visit('/admin/approval-queue');
      cy.get('[data-testid="approve-post-button"]').first().click();
      cy.get('[data-testid="approval-reason"]').type('Approved');
      cy.get('[data-testid="confirm-approve-button"]').click();
      
      // Check filters
      cy.get('[data-testid="filter-pending"]').click();
      cy.contains('Pending Post').should('not.exist');
      
      cy.get('[data-testid="filter-approved"]').click();
      cy.contains('Pending Post').should('be.visible');
    });
  });

  describe('Post Categories', () => {
    beforeEach(() => {
      cy.register('categoryuser', 'category@example.com', 'Test123!');
    });

    it('should load categories from API', () => {
      cy.visit('/create-post');
      cy.get('[data-testid="category-select"]').should('contain', 'Technology');
      cy.get('[data-testid="category-select"]').should('contain', 'Science');
      cy.get('[data-testid="category-select"]').should('contain', 'Health');
    });

    it('should filter posts by category', () => {
      cy.createPost('Tech Post', 'Tech content', 'Technology');
      cy.createPost('Science Post', 'Science content', 'Science');
      
      cy.visit('/my-posts');
      cy.get('[data-testid="filter-technology"]').click();
      cy.contains('Tech Post').should('be.visible');
      cy.contains('Science Post').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.register('erroruser', 'error@example.com', 'Test123!');
    });

    it('should handle API errors gracefully', () => {
      // Mock API failure
      cy.intercept('POST', '/api/posts', { statusCode: 500, body: { message: 'Server error' } });
      
      cy.visit('/create-post');
      cy.get('[data-testid="title-input"]').type('Error Test Post');
      cy.get('[data-testid="content-input"]').type('Test content');
      cy.get('[data-testid="category-select"]').select('Technology');
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('Failed to create post').should('be.visible');
    });

    it('should handle network errors', () => {
      cy.intercept('POST', '/api/posts', { forceNetworkError: true });
      
      cy.visit('/create-post');
      cy.get('[data-testid="title-input"]').type('Network Error Post');
      cy.get('[data-testid="content-input"]').type('Test content');
      cy.get('[data-testid="category-select"]').select('Technology');
      cy.get('[data-testid="submit-button"]').click();
      
      cy.contains('Network error').should('be.visible');
    });
  });
}); 