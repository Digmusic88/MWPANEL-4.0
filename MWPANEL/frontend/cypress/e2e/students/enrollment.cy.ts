/// <reference types="cypress" />

describe('Student Enrollment Flow', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.navigateToModule('students');
  });

  afterEach(() => {
    cy.cleanupTestData();
  });

  it('should display students list', () => {
    // Wait for students to load
    cy.waitForApi('getStudents');
    
    // Check table structure
    cy.get('table').should('be.visible');
    cy.get('thead').should('contain', 'Nombre');
    cy.get('thead').should('contain', 'Email');
    cy.get('thead').should('contain', 'Matrícula');
    cy.get('thead').should('contain', 'Clase');
  });

  it('should create a new student', () => {
    // Click create button
    cy.get('[data-testid="create-student-btn"]').click();
    
    // Fill form
    const studentData = {
      firstName: 'Test',
      lastName: 'Student',
      email: `test.student.${Date.now()}@mwpanel.com`,
      dni: `${Date.now()}X`,
      birthDate: '2010-01-01',
    };
    
    cy.get('input[name="firstName"]').type(studentData.firstName);
    cy.get('input[name="lastName"]').type(studentData.lastName);
    cy.get('input[name="email"]').type(studentData.email);
    cy.get('input[name="dni"]').type(studentData.dni);
    cy.get('input[name="birthDate"]').type(studentData.birthDate);
    
    // Select educational level
    cy.get('select[name="educationalLevelId"]').select('Primaria');
    
    // Submit form
    cy.get('button[type="submit"]').click();
    
    // Verify success message
    cy.contains('Estudiante creado exitosamente').should('be.visible');
    
    // Verify student appears in list
    cy.contains(`${studentData.firstName} ${studentData.lastName}`).should('be.visible');
    
    // Store for cleanup
    cy.get('tr').contains(studentData.email).parent('tr').find('[data-testid="student-id"]').then(($el) => {
      cy.wrap($el.text()).as('testStudentId');
    });
  });

  it('should edit student information', () => {
    // Create test student first
    cy.createTestStudent({
      firstName: 'Edit',
      lastName: 'Test',
    });
    
    // Find and click edit button
    cy.contains('Edit Test').parent('tr').find('[data-testid="edit-btn"]').click();
    
    // Update information
    cy.get('input[name="firstName"]').clear().type('Updated');
    cy.get('input[name="phone"]').type('+34 600 123 456');
    
    // Save changes
    cy.get('button[type="submit"]').click();
    
    // Verify success
    cy.contains('Estudiante actualizado exitosamente').should('be.visible');
    cy.contains('Updated Test').should('be.visible');
  });

  it('should assign student to class group', () => {
    // Create test student
    cy.createTestStudent({
      firstName: 'Class',
      lastName: 'Assignment',
    });
    
    // Find student and click assign class
    cy.contains('Class Assignment').parent('tr').find('[data-testid="assign-class-btn"]').click();
    
    // Select class group
    cy.get('select[name="classGroupId"]').select('1º Primaria A');
    
    // Confirm assignment
    cy.get('button[type="submit"]').click();
    
    // Verify success
    cy.contains('Estudiante asignado a clase exitosamente').should('be.visible');
    
    // Verify class appears in table
    cy.contains('Class Assignment').parent('tr').should('contain', '1º Primaria A');
  });

  it('should handle bulk import', () => {
    // Click import button
    cy.get('[data-testid="import-students-btn"]').click();
    
    // Upload CSV file
    cy.fixture('students-import.csv').then((fileContent) => {
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(fileContent),
        fileName: 'students.csv',
        mimeType: 'text/csv',
      });
    });
    
    // Preview import
    cy.get('[data-testid="preview-import"]').click();
    
    // Check preview table
    cy.get('[data-testid="import-preview-table"]').should('be.visible');
    cy.get('[data-testid="import-preview-table"]').find('tr').should('have.length.at.least', 2);
    
    // Confirm import
    cy.get('[data-testid="confirm-import"]').click();
    
    // Wait for import to complete
    cy.contains('Importación completada', { timeout: 30000 }).should('be.visible');
  });

  it('should search and filter students', () => {
    // Search by name
    cy.get('input[data-testid="search-input"]').type('Test');
    cy.get('[data-testid="search-btn"]').click();
    
    // Verify filtered results
    cy.get('tbody tr').each(($row) => {
      cy.wrap($row).should('contain', 'Test');
    });
    
    // Filter by class
    cy.get('select[data-testid="class-filter"]').select('1º Primaria A');
    
    // Verify filtered results
    cy.get('tbody tr').each(($row) => {
      cy.wrap($row).should('contain', '1º Primaria A');
    });
    
    // Clear filters
    cy.get('[data-testid="clear-filters"]').click();
    
    // Verify all students shown
    cy.waitForApi('getStudents');
  });

  it('should handle enrollment validation', () => {
    // Try to create student with existing email
    cy.get('[data-testid="create-student-btn"]').click();
    
    // Use existing email
    cy.get('input[name="firstName"]').type('Duplicate');
    cy.get('input[name="lastName"]').type('Email');
    cy.get('input[name="email"]').type(Cypress.env('STUDENT_EMAIL'));
    cy.get('input[name="dni"]').type('12345678Z');
    cy.get('input[name="birthDate"]').type('2010-01-01');
    
    // Submit
    cy.get('button[type="submit"]').click();
    
    // Verify error
    cy.contains('El email ya está en uso').should('be.visible');
  });

  it('should deactivate and reactivate student', () => {
    // Create test student
    cy.createTestStudent({
      firstName: 'Deactivate',
      lastName: 'Test',
    });
    
    // Find and deactivate
    cy.contains('Deactivate Test').parent('tr').find('[data-testid="status-toggle"]').click();
    
    // Confirm deactivation
    cy.get('[data-testid="confirm-deactivate"]').click();
    
    // Verify status changed
    cy.contains('Deactivate Test').parent('tr').should('contain', 'Inactivo');
    
    // Reactivate
    cy.contains('Deactivate Test').parent('tr').find('[data-testid="status-toggle"]').click();
    
    // Verify status changed back
    cy.contains('Deactivate Test').parent('tr').should('contain', 'Activo');
  });
});