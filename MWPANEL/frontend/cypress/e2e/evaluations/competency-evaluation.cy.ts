/// <reference types="cypress" />

describe('Competency-based Evaluation Flow', () => {
  beforeEach(() => {
    cy.loginAsTeacher();
    cy.navigateToModule('evaluations');
  });

  it('should display evaluation dashboard', () => {
    // Check main sections
    cy.get('[data-testid="evaluation-dashboard"]').should('be.visible');
    cy.get('[data-testid="class-selector"]').should('be.visible');
    cy.get('[data-testid="subject-selector"]').should('be.visible');
    
    // Check evaluation options
    cy.contains('Nueva Evaluación').should('be.visible');
    cy.contains('Evaluaciones Pendientes').should('be.visible');
    cy.contains('Historial').should('be.visible');
  });

  it('should create a new competency evaluation', () => {
    // Click new evaluation
    cy.get('[data-testid="new-evaluation-btn"]').click();
    
    // Select class and subject
    cy.get('select[data-testid="class-selector"]').select('1º Primaria A');
    cy.get('select[data-testid="subject-selector"]').select('Matemáticas');
    
    // Wait for students to load
    cy.waitForApi('getClassStudents');
    
    // Select evaluation type
    cy.get('input[value="competency"]').check();
    
    // Select competencies to evaluate
    cy.get('[data-testid="competency-tree"]').should('be.visible');
    
    // Expand competency
    cy.get('[data-testid="competency-CCL"]').click();
    cy.get('[data-testid="specific-CCL1"]').check();
    cy.get('[data-testid="specific-CCL2"]').check();
    
    // Add another competency
    cy.get('[data-testid="competency-STEM"]').click();
    cy.get('[data-testid="specific-STEM1"]').check();
    
    // Continue to evaluation
    cy.get('[data-testid="continue-btn"]').click();
    
    // Should show student list with selected competencies
    cy.get('[data-testid="evaluation-grid"]').should('be.visible');
    cy.get('thead').should('contain', 'CCL1');
    cy.get('thead').should('contain', 'CCL2');
    cy.get('thead').should('contain', 'STEM1');
  });

  it('should evaluate students with rubric', () => {
    // Create evaluation first
    cy.get('[data-testid="new-evaluation-btn"]').click();
    cy.get('select[data-testid="class-selector"]').select('1º Primaria A');
    cy.get('select[data-testid="subject-selector"]').select('Lengua');
    
    // Select rubric evaluation
    cy.get('input[value="rubric"]').check();
    
    // Select or create rubric
    cy.get('[data-testid="rubric-selector"]').click();
    cy.get('[data-testid="rubric-reading-comprehension"]').click();
    
    // Continue
    cy.get('[data-testid="continue-btn"]').click();
    
    // Evaluate first student
    cy.get('tbody tr').first().find('[data-testid="evaluate-btn"]').click();
    
    // Fill rubric
    cy.get('[data-testid="rubric-modal"]').should('be.visible');
    
    // Score each criterion
    cy.get('[data-testid="criterion-1-level-3"]').click(); // Satisfactorio
    cy.get('[data-testid="criterion-2-level-4"]').click(); // Excelente
    cy.get('[data-testid="criterion-3-level-2"]').click(); // En desarrollo
    
    // Add observations
    cy.get('textarea[data-testid="observations"]').type('Muestra buen progreso en comprensión lectora.');
    
    // Save evaluation
    cy.get('[data-testid="save-evaluation"]').click();
    
    // Verify saved
    cy.contains('Evaluación guardada').should('be.visible');
    
    // Check that student row shows as evaluated
    cy.get('tbody tr').first().should('have.class', 'evaluated');
  });

  it('should generate competency radar chart', () => {
    // Navigate to student profile
    cy.navigateToModule('students');
    cy.get('tbody tr').first().find('[data-testid="view-profile"]').click();
    
    // Go to evaluations tab
    cy.get('[data-testid="tab-evaluations"]').click();
    
    // Check radar chart
    cy.get('[data-testid="competency-radar-chart"]').should('be.visible');
    
    // Verify competencies shown
    cy.get('[data-testid="competency-legend"]').should('contain', 'CCL');
    cy.get('[data-testid="competency-legend"]').should('contain', 'STEM');
    cy.get('[data-testid="competency-legend"]').should('contain', 'CD');
    
    // Check average scores
    cy.get('[data-testid="average-score"]').should('be.visible');
  });

  it('should handle bulk evaluation', () => {
    // Start new evaluation
    cy.get('[data-testid="new-evaluation-btn"]').click();
    cy.get('select[data-testid="class-selector"]').select('2º Primaria B');
    cy.get('select[data-testid="subject-selector"]').select('Ciencias');
    
    // Select quick evaluation mode
    cy.get('input[value="quick"]').check();
    
    // Select criteria
    cy.get('[data-testid="criteria-selector"]').click();
    cy.get('[data-testid="criterion-participation"]').check();
    cy.get('[data-testid="criterion-homework"]').check();
    cy.get('[data-testid="criterion-test"]').check();
    
    // Continue
    cy.get('[data-testid="continue-btn"]').click();
    
    // Use bulk actions
    cy.get('[data-testid="select-all-students"]').check();
    cy.get('[data-testid="bulk-score-btn"]').click();
    
    // Set default scores
    cy.get('input[data-testid="bulk-participation"]').type('8');
    cy.get('input[data-testid="bulk-homework"]').type('7');
    cy.get('input[data-testid="bulk-test"]').type('7.5');
    
    // Apply to all
    cy.get('[data-testid="apply-bulk-scores"]').click();
    
    // Verify all students have scores
    cy.get('tbody tr').each(($row) => {
      cy.wrap($row).find('[data-testid="score-participation"]').should('have.value', '8');
    });
    
    // Save all evaluations
    cy.get('[data-testid="save-all-evaluations"]').click();
    
    // Confirm
    cy.get('[data-testid="confirm-save-all"]').click();
    
    // Verify success
    cy.contains('25 evaluaciones guardadas', { timeout: 10000 }).should('be.visible');
  });

  it('should export evaluation report', () => {
    // Go to reports section
    cy.get('[data-testid="evaluation-reports"]').click();
    
    // Select evaluation period
    cy.get('select[data-testid="evaluation-period"]').select('Primera Evaluación');
    
    // Select class
    cy.get('select[data-testid="report-class"]').select('1º Primaria A');
    
    // Select report type
    cy.get('input[value="detailed"]').check();
    
    // Generate report
    cy.get('[data-testid="generate-report"]').click();
    
    // Wait for generation
    cy.contains('Generando informe...', { timeout: 5000 }).should('be.visible');
    
    // Verify download
    cy.get('[data-testid="download-report"]', { timeout: 15000 }).should('be.visible');
    
    // Preview report
    cy.get('[data-testid="preview-report"]').click();
    
    // Check preview modal
    cy.get('[data-testid="report-preview-modal"]').should('be.visible');
    cy.get('[data-testid="report-preview-modal"]').should('contain', 'Informe de Evaluación');
    cy.get('[data-testid="report-preview-modal"]').should('contain', '1º Primaria A');
  });

  it('should handle evaluation history', () => {
    // Go to history
    cy.get('[data-testid="evaluation-history"]').click();
    
    // Check filters
    cy.get('[data-testid="history-filters"]').should('be.visible');
    
    // Filter by date range
    cy.get('input[data-testid="date-from"]').type('2024-01-01');
    cy.get('input[data-testid="date-to"]').type('2024-12-31');
    
    // Apply filters
    cy.get('[data-testid="apply-filters"]').click();
    
    // Check results
    cy.get('[data-testid="history-table"]').should('be.visible');
    cy.get('tbody tr').should('have.length.at.least', 1);
    
    // View evaluation details
    cy.get('tbody tr').first().find('[data-testid="view-details"]').click();
    
    // Check details modal
    cy.get('[data-testid="evaluation-details-modal"]').should('be.visible');
    cy.get('[data-testid="evaluation-details-modal"]').should('contain', 'Detalles de Evaluación');
    
    // Check can edit if recent
    cy.get('[data-testid="edit-evaluation"]').should('exist');
  });
});