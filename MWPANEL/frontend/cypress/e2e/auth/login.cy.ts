/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login form', () => {
    // Check form elements
    cy.get('form').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    
    // Check branding
    cy.contains('MW Panel').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    // Try to submit empty form
    cy.get('button[type="submit"]').click();
    
    // Check validation messages
    cy.contains('El email es requerido').should('be.visible');
    cy.contains('La contraseña es requerida').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    // Enter invalid credentials
    cy.get('input[type="email"]').type('invalid@email.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    // Check error message
    cy.contains('Credenciales inválidas').should('be.visible');
  });

  describe('Role-based login', () => {
    it('should login as admin and redirect to admin dashboard', () => {
      cy.loginAsAdmin();
      
      // Verify redirect
      cy.url().should('include', '/admin/dashboard');
      
      // Verify admin menu items
      cy.get('[data-testid="menu-users"]').should('be.visible');
      cy.get('[data-testid="menu-settings"]').should('be.visible');
    });

    it('should login as teacher and redirect to teacher dashboard', () => {
      cy.loginAsTeacher();
      
      // Verify redirect
      cy.url().should('include', '/teacher/dashboard');
      
      // Verify teacher menu items
      cy.get('[data-testid="menu-students"]').should('be.visible');
      cy.get('[data-testid="menu-evaluations"]').should('be.visible');
      cy.get('[data-testid="menu-activities"]').should('be.visible');
    });

    it('should login as student and redirect to student dashboard', () => {
      cy.loginAsStudent();
      
      // Verify redirect
      cy.url().should('include', '/student/dashboard');
      
      // Verify student menu items
      cy.get('[data-testid="menu-grades"]').should('be.visible');
      cy.get('[data-testid="menu-tasks"]').should('be.visible');
    });

    it('should login as family and redirect to family dashboard', () => {
      cy.loginAsFamily();
      
      // Verify redirect
      cy.url().should('include', '/family/dashboard');
      
      // Verify family menu items
      cy.get('[data-testid="menu-children"]').should('be.visible');
      cy.get('[data-testid="menu-messages"]').should('be.visible');
    });
  });

  describe('Logout flow', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should logout successfully', () => {
      // Logout
      cy.logout();
      
      // Verify redirect to login
      cy.url().should('include', '/login');
      
      // Try to access protected route
      cy.visit('/admin/dashboard');
      
      // Should redirect back to login
      cy.url().should('include', '/login');
    });
  });

  describe('Session persistence', () => {
    it('should maintain session on page refresh', () => {
      cy.loginAsAdmin();
      
      // Refresh page
      cy.reload();
      
      // Should still be logged in
      cy.url().should('include', '/admin/dashboard');
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should handle expired token gracefully', () => {
      cy.loginAsAdmin();
      
      // Simulate expired token
      cy.window().then((win) => {
        // Set an invalid token
        win.localStorage.setItem('access_token', 'invalid-token');
      });
      
      // Try to access API
      cy.visit('/admin/users');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });
});