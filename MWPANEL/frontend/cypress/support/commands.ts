/// <reference types="cypress" />

// Custom commands for MW Panel E2E tests

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login to MW Panel
       * @param email - User email
       * @param password - User password
       */
      login(email: string, password: string): Chainable<void>;
      
      /**
       * Login as admin user
       */
      loginAsAdmin(): Chainable<void>;
      
      /**
       * Login as teacher user
       */
      loginAsTeacher(): Chainable<void>;
      
      /**
       * Login as student user
       */
      loginAsStudent(): Chainable<void>;
      
      /**
       * Login as family user
       */
      loginAsFamily(): Chainable<void>;
      
      /**
       * Logout from MW Panel
       */
      logout(): Chainable<void>;
      
      /**
       * Navigate to a specific module
       */
      navigateToModule(module: string): Chainable<void>;
      
      /**
       * Wait for API request to complete
       */
      waitForApi(alias: string): Chainable<void>;
      
      /**
       * Create a test student
       */
      createTestStudent(data: any): Chainable<void>;
      
      /**
       * Create a test activity
       */
      createTestActivity(data: any): Chainable<void>;
      
      /**
       * Clean up test data
       */
      cleanupTestData(): Chainable<void>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  
  // Wait for login form
  cy.get('form').should('be.visible');
  
  // Fill credentials
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  
  // Submit form
  cy.get('button[type="submit"]').click();
  
  // Wait for redirect
  cy.url().should('not.include', '/login');
  
  // Verify authentication
  cy.window().its('localStorage.access_token').should('exist');
});

// Login shortcuts
Cypress.Commands.add('loginAsAdmin', () => {
  cy.login(Cypress.env('ADMIN_EMAIL'), Cypress.env('ADMIN_PASSWORD'));
  cy.url().should('include', '/admin');
});

Cypress.Commands.add('loginAsTeacher', () => {
  cy.login(Cypress.env('TEACHER_EMAIL'), Cypress.env('TEACHER_PASSWORD'));
  cy.url().should('include', '/teacher');
});

Cypress.Commands.add('loginAsStudent', () => {
  cy.login(Cypress.env('STUDENT_EMAIL'), Cypress.env('STUDENT_PASSWORD'));
  cy.url().should('include', '/student');
});

Cypress.Commands.add('loginAsFamily', () => {
  cy.login(Cypress.env('FAMILY_EMAIL'), Cypress.env('FAMILY_PASSWORD'));
  cy.url().should('include', '/family');
});

// Logout command
Cypress.Commands.add('logout', () => {
  // Click user menu
  cy.get('[data-testid="user-menu"]').click();
  
  // Click logout
  cy.get('[data-testid="logout-button"]').click();
  
  // Verify redirect to login
  cy.url().should('include', '/login');
  
  // Verify token removed
  cy.window().its('localStorage.access_token').should('not.exist');
});

// Navigate to module
Cypress.Commands.add('navigateToModule', (module: string) => {
  // Click sidebar menu item
  cy.get(`[data-testid="menu-${module}"]`).click();
  
  // Wait for navigation
  cy.url().should('include', `/${module}`);
  
  // Wait for content to load
  cy.get('main').should('be.visible');
});

// Wait for API
Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.intercept('GET', `${Cypress.env('API_URL')}/**`).as(alias);
  cy.wait(`@${alias}`, { timeout: 10000 });
});

// Create test student
Cypress.Commands.add('createTestStudent', (data: any) => {
  const studentData = {
    firstName: data.firstName || 'Test',
    lastName: data.lastName || 'Student',
    email: data.email || `test.student.${Date.now()}@mwpanel.com`,
    dni: data.dni || `${Date.now()}X`,
    birthDate: data.birthDate || '2010-01-01',
    enrollmentNumber: data.enrollmentNumber || `TEST${Date.now()}`,
    ...data,
  };
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/students`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('access_token')}`,
    },
    body: studentData,
  }).then((response) => {
    expect(response.status).to.eq(201);
    // Store student ID for cleanup
    cy.wrap(response.body.id).as('testStudentId');
  });
});

// Create test activity
Cypress.Commands.add('createTestActivity', (data: any) => {
  const activityData = {
    title: data.title || 'Test Activity',
    description: data.description || 'Test activity description',
    type: data.type || 'task',
    dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ...data,
  };
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/activities`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('access_token')}`,
    },
    body: activityData,
  }).then((response) => {
    expect(response.status).to.eq(201);
    // Store activity ID for cleanup
    cy.wrap(response.body.id).as('testActivityId');
  });
});

// Cleanup test data
Cypress.Commands.add('cleanupTestData', () => {
  // Clean up test student if exists
  cy.get('@testStudentId').then((studentId) => {
    if (studentId) {
      cy.request({
        method: 'DELETE',
        url: `${Cypress.env('API_URL')}/students/${studentId}`,
        headers: {
          Authorization: `Bearer ${window.localStorage.getItem('access_token')}`,
        },
        failOnStatusCode: false,
      });
    }
  });
  
  // Clean up test activity if exists
  cy.get('@testActivityId').then((activityId) => {
    if (activityId) {
      cy.request({
        method: 'DELETE',
        url: `${Cypress.env('API_URL')}/activities/${activityId}`,
        headers: {
          Authorization: `Bearer ${window.localStorage.getItem('access_token')}`,
        },
        failOnStatusCode: false,
      });
    }
  });
});

// Export empty object to make this a module
export {};