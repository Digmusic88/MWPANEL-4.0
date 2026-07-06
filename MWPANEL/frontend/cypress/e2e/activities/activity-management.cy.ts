/// <reference types="cypress" />

describe('Activity and Task Management', () => {
  beforeEach(() => {
    cy.loginAsTeacher();
    cy.navigateToModule('activities');
  });

  afterEach(() => {
    cy.cleanupTestData();
  });

  it('should display activities dashboard', () => {
    // Check main sections
    cy.get('[data-testid="activities-dashboard"]').should('be.visible');
    cy.contains('Actividades Activas').should('be.visible');
    cy.contains('Próximas Entregas').should('be.visible');
    cy.contains('Pendientes de Corrección').should('be.visible');
  });

  it('should create a new activity', () => {
    // Click create button
    cy.get('[data-testid="create-activity-btn"]').click();
    
    // Fill activity details
    cy.get('input[name="title"]').type('Práctica de Matemáticas');
    cy.get('textarea[name="description"]').type('Resolver los ejercicios del capítulo 5');
    
    // Select type
    cy.get('select[name="type"]').select('task');
    
    // Select subject and class
    cy.get('select[name="subjectId"]').select('Matemáticas');
    cy.get('select[name="classGroupId"]').select('1º Primaria A');
    
    // Set due date (7 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    cy.get('input[name="dueDate"]').type(dueDate.toISOString().split('T')[0]);
    
    // Add instructions
    cy.get('[data-testid="add-instructions"]').click();
    cy.get('textarea[name="instructions"]').type('1. Leer la teoría\n2. Resolver ejercicios 1-10\n3. Enviar foto de la libreta');
    
    // Add attachments
    cy.get('[data-testid="add-attachment"]').click();
    cy.fixture('math-exercises.pdf').then((fileContent) => {
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(fileContent),
        fileName: 'ejercicios.pdf',
        mimeType: 'application/pdf',
      });
    });
    
    // Save activity
    cy.get('button[type="submit"]').click();
    
    // Verify success
    cy.contains('Actividad creada exitosamente').should('be.visible');
    
    // Store activity ID
    cy.url().should('include', '/activities/');
    cy.location('pathname').then((path) => {
      const activityId = path.split('/').pop();
      cy.wrap(activityId).as('testActivityId');
    });
  });

  it('should create activity with rubric', () => {
    // Create activity
    cy.get('[data-testid="create-activity-btn"]').click();
    
    // Basic details
    cy.get('input[name="title"]').type('Presentación Oral');
    cy.get('select[name="type"]').select('presentation');
    cy.get('select[name="subjectId"]').select('Lengua');
    cy.get('select[name="classGroupId"]').select('2º Primaria B');
    
    // Enable rubric evaluation
    cy.get('input[name="useRubric"]').check();
    
    // Create new rubric
    cy.get('[data-testid="create-rubric-btn"]').click();
    
    // Add criteria
    cy.get('[data-testid="add-criterion"]').click();
    cy.get('input[name="criteria[0].name"]').type('Contenido');
    cy.get('textarea[name="criteria[0].description"]').type('Claridad y organización del contenido');
    
    cy.get('[data-testid="add-criterion"]').click();
    cy.get('input[name="criteria[1].name"]').type('Expresión Oral');
    cy.get('textarea[name="criteria[1].description"]').type('Fluidez, volumen y pronunciación');
    
    // Define levels for each criterion
    ['Excelente', 'Satisfactorio', 'En desarrollo', 'Inicial'].forEach((level, index) => {
      cy.get(`input[name="levels[${index}].name"]`).should('have.value', level);
      cy.get(`input[name="levels[${index}].points"]`).should('have.value', 4 - index);
    });
    
    // Save rubric
    cy.get('[data-testid="save-rubric"]').click();
    
    // Complete activity creation
    cy.get('button[type="submit"]').click();
    
    // Verify
    cy.contains('Actividad con rúbrica creada').should('be.visible');
  });

  it('should manage student submissions', () => {
    // Create test activity first
    cy.createTestActivity({
      title: 'Test Submission Activity',
      type: 'task',
    });
    
    // Go to activity details
    cy.get('@testActivityId').then((activityId) => {
      cy.visit(`/teacher/activities/${activityId}`);
    });
    
    // Check submissions tab
    cy.get('[data-testid="tab-submissions"]').click();
    
    // Should show student list
    cy.get('[data-testid="submissions-table"]').should('be.visible');
    
    // Simulate student submission (would normally be done by student)
    cy.get('tbody tr').first().find('[data-testid="submission-status"]').should('contain', 'Pendiente');
    
    // Grade submission
    cy.get('tbody tr').first().find('[data-testid="grade-submission"]').click();
    
    // Grade modal
    cy.get('[data-testid="grade-modal"]').should('be.visible');
    
    // Add score
    cy.get('input[name="score"]').type('8.5');
    
    // Add feedback
    cy.get('textarea[name="feedback"]').type('Buen trabajo. Revisa el ejercicio 5.');
    
    // Save grade
    cy.get('[data-testid="save-grade"]').click();
    
    // Verify
    cy.contains('Calificación guardada').should('be.visible');
    cy.get('tbody tr').first().find('[data-testid="submission-score"]').should('contain', '8.5');
  });

  it('should handle activity notifications', () => {
    // Create activity with notifications
    cy.get('[data-testid="create-activity-btn"]').click();
    
    // Fill basic info
    cy.get('input[name="title"]').type('Tarea con Notificaciones');
    cy.get('select[name="type"]').select('homework');
    
    // Enable notifications
    cy.get('[data-testid="notifications-section"]').click();
    cy.get('input[name="enableNotifications"]').check();
    
    // Configure notifications
    cy.get('input[name="notifyOnCreate"]').check();
    cy.get('input[name="notifyBeforeDue"]').check();
    cy.get('select[name="notifyBeforeDays"]').select('2');
    cy.get('input[name="notifyOnGrade"]').check();
    
    // Save
    cy.get('button[type="submit"]').click();
    
    // Verify notification sent
    cy.contains('Notificaciones enviadas a estudiantes').should('be.visible');
  });

  it('should duplicate an activity', () => {
    // Find an existing activity
    cy.get('[data-testid="activities-list"] tbody tr').first().find('[data-testid="activity-actions"]').click();
    cy.get('[data-testid="duplicate-activity"]').click();
    
    // Modify duplicated activity
    cy.get('input[name="title"]').should('contain.value', 'Copia de');
    cy.get('input[name="title"]').clear().type('Nueva Versión - Práctica');
    
    // Change class
    cy.get('select[name="classGroupId"]').select('1º Primaria B');
    
    // Update due date
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + 14);
    cy.get('input[name="dueDate"]').clear().type(newDueDate.toISOString().split('T')[0]);
    
    // Save
    cy.get('button[type="submit"]').click();
    
    // Verify
    cy.contains('Actividad duplicada exitosamente').should('be.visible');
  });

  it('should archive completed activities', () => {
    // Go to completed activities
    cy.get('[data-testid="filter-status"]').select('completed');
    
    // Select activities to archive
    cy.get('[data-testid="select-all"]').check();
    
    // Bulk archive
    cy.get('[data-testid="bulk-actions"]').click();
    cy.get('[data-testid="bulk-archive"]').click();
    
    // Confirm
    cy.get('[data-testid="confirm-archive"]').click();
    
    // Verify
    cy.contains('Actividades archivadas').should('be.visible');
    
    // Check archived section
    cy.get('[data-testid="filter-status"]').select('archived');
    cy.get('[data-testid="activities-list"] tbody tr').should('have.length.at.least', 1);
  });

  it('should generate activity report', () => {
    // Go to activity analytics
    cy.get('[data-testid="activity-analytics"]').click();
    
    // Select date range
    cy.get('input[data-testid="analytics-from"]').type('2024-01-01');
    cy.get('input[data-testid="analytics-to"]').type('2024-12-31');
    
    // Generate report
    cy.get('[data-testid="generate-analytics"]').click();
    
    // Check analytics display
    cy.get('[data-testid="completion-rate-chart"]').should('be.visible');
    cy.get('[data-testid="average-score-chart"]').should('be.visible');
    cy.get('[data-testid="submission-timeline"]').should('be.visible');
    
    // Export data
    cy.get('[data-testid="export-analytics"]').click();
    cy.get('[data-testid="export-format"]').select('excel');
    cy.get('[data-testid="confirm-export"]').click();
    
    // Verify download started
    cy.contains('Descargando informe...').should('be.visible');
  });
});