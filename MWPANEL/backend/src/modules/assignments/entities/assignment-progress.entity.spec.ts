/**
 * @archivo: assignment-progress.entity.spec.ts
 * @módulo: Assignments - Tests Unitarios
 * @función: Tests para AssignmentProgress entity
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * COBERTURA DE TESTS:
 * - Virtual properties principales
 * - Métodos de actualización de progreso
 * - Cálculos de efectividad y engagement
 * - Estados y transiciones de progreso
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 1.6
 */

import { AssignmentProgress, ProgressStatus } from './assignment-progress.entity';

describe('AssignmentProgress Entity', () => {
  let progress: AssignmentProgress;

  beforeEach(() => {
    progress = new AssignmentProgress();
    progress.id = 'test-progress-id';
    progress.campaignId = 'test-campaign-id';
    progress.userId = 'test-user-id';
    progress.resourceId = 'test-resource-id';
    progress.status = ProgressStatus.NOT_STARTED;
    progress.timeSpent = 0;
    progress.viewCount = 0;
    progress.interactionCount = 0;
    progress.downloadCount = 0;
    progress.completionPercentage = 0;
  });

  describe('hasStarted getter', () => {
    it('should return false when status is NOT_STARTED', () => {
      progress.status = ProgressStatus.NOT_STARTED;
      expect(progress.hasStarted).toBe(false);
    });

    it('should return true when status is IN_PROGRESS', () => {
      progress.status = ProgressStatus.IN_PROGRESS;
      expect(progress.hasStarted).toBe(true);
    });

    it('should return true when status is COMPLETED', () => {
      progress.status = ProgressStatus.COMPLETED;
      expect(progress.hasStarted).toBe(true);
    });

    it('should return true when status is REVIEWED', () => {
      progress.status = ProgressStatus.REVIEWED;
      expect(progress.hasStarted).toBe(true);
    });
  });

  describe('isCompleted getter', () => {
    it('should return true when status is COMPLETED', () => {
      progress.status = ProgressStatus.COMPLETED;
      expect(progress.isCompleted).toBe(true);
    });

    it('should return true when status is REVIEWED', () => {
      progress.status = ProgressStatus.REVIEWED;
      expect(progress.isCompleted).toBe(true);
    });

    it('should return false when status is IN_PROGRESS', () => {
      progress.status = ProgressStatus.IN_PROGRESS;
      expect(progress.isCompleted).toBe(false);
    });

    it('should return false when status is NOT_STARTED', () => {
      progress.status = ProgressStatus.NOT_STARTED;
      expect(progress.isCompleted).toBe(false);
    });
  });

  describe('timeSpentFormatted getter', () => {
    it('should return "0 min" for zero time', () => {
      progress.timeSpent = 0;
      expect(progress.timeSpentFormatted).toBe('0 min');
    });

    it('should format seconds only', () => {
      progress.timeSpent = 45;
      expect(progress.timeSpentFormatted).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      progress.timeSpent = 125; // 2 minutes 5 seconds
      expect(progress.timeSpentFormatted).toBe('2min 5s');
    });

    it('should format hours and minutes', () => {
      progress.timeSpent = 3720; // 1 hour 2 minutes
      expect(progress.timeSpentFormatted).toBe('1h 2min');
    });

    it('should format hours only', () => {
      progress.timeSpent = 3600; // 1 hour exactly
      expect(progress.timeSpentFormatted).toBe('1h 0min');
    });
  });

  describe('daysSinceLastAccess getter', () => {
    it('should return null when lastAccessedAt is null', () => {
      progress.lastAccessedAt = null;
      expect(progress.daysSinceLastAccess).toBeNull();
    });

    it('should return correct days for past dates', () => {
      const threeDaysAgo = new Date(Date.now() - (3 * 86400000));
      progress.lastAccessedAt = threeDaysAgo;
      expect(progress.daysSinceLastAccess).toBe(3);
    });

    it('should return 0 for today', () => {
      progress.lastAccessedAt = new Date();
      expect(progress.daysSinceLastAccess).toBe(0);
    });
  });

  describe('isInactive getter', () => {
    it('should return true when more than 3 days since last access and not completed', () => {
      const fourDaysAgo = new Date(Date.now() - (4 * 86400000));
      progress.lastAccessedAt = fourDaysAgo;
      progress.status = ProgressStatus.IN_PROGRESS;
      
      expect(progress.isInactive).toBe(true);
    });

    it('should return false when completed even if old', () => {
      const fourDaysAgo = new Date(Date.now() - (4 * 86400000));
      progress.lastAccessedAt = fourDaysAgo;
      progress.status = ProgressStatus.COMPLETED;
      
      expect(progress.isInactive).toBe(false);
    });

    it('should return false when recently accessed', () => {
      const yesterday = new Date(Date.now() - 86400000);
      progress.lastAccessedAt = yesterday;
      progress.status = ProgressStatus.IN_PROGRESS;
      
      expect(progress.isInactive).toBe(false);
    });
  });

  describe('averageRating getter', () => {
    it('should return null when no ratings exist', () => {
      progress.selfRating = null;
      progress.teacherRating = null;
      expect(progress.averageRating).toBeNull();
    });

    it('should return self rating when only self rating exists', () => {
      progress.selfRating = 4;
      progress.teacherRating = null;
      expect(progress.averageRating).toBe(4);
    });

    it('should return teacher rating when only teacher rating exists', () => {
      progress.selfRating = null;
      progress.teacherRating = 5;
      expect(progress.averageRating).toBe(5);
    });

    it('should return average when both ratings exist', () => {
      progress.selfRating = 3;
      progress.teacherRating = 5;
      expect(progress.averageRating).toBe(4);
    });
  });

  describe('startProgress method', () => {
    it('should update status to IN_PROGRESS when not started', () => {
      progress.status = ProgressStatus.NOT_STARTED;
      progress.startProgress();
      
      expect(progress.status).toBe(ProgressStatus.IN_PROGRESS);
      expect(progress.startedAt).toBeInstanceOf(Date);
      expect(progress.lastAccessedAt).toBeInstanceOf(Date);
    });

    it('should not change status when already started', () => {
      progress.status = ProgressStatus.IN_PROGRESS;
      const originalStartedAt = new Date();
      progress.startedAt = originalStartedAt;
      
      progress.startProgress();
      
      expect(progress.status).toBe(ProgressStatus.IN_PROGRESS);
      expect(progress.startedAt).toBe(originalStartedAt);
    });
  });

  describe('recordActivity method', () => {
    it('should update last accessed time and view count', () => {
      const initialTime = progress.lastAccessedAt;
      const initialViews = progress.viewCount;
      
      progress.recordActivity({});
      
      expect(progress.lastAccessedAt).not.toBe(initialTime);
      expect(progress.viewCount).toBe(initialViews + 1);
    });

    it('should add time spent when provided', () => {
      progress.timeSpent = 100;
      progress.recordActivity({ timeSpent: 50 });
      
      expect(progress.timeSpent).toBe(150);
    });

    it('should increment interaction count when interaction type provided', () => {
      progress.interactionCount = 5;
      progress.recordActivity({ interactionType: 'CLICK' });
      
      expect(progress.interactionCount).toBe(6);
    });

    it('should record interaction events', () => {
      progress.interactionEvents = null;
      progress.recordActivity({ 
        interactionType: 'SCROLL',
        eventData: { scrollPosition: 100 }
      });
      
      expect(progress.interactionEvents).toHaveLength(1);
      expect(progress.interactionEvents[0].eventType).toBe('SCROLL');
      expect(progress.interactionEvents[0].eventData.scrollPosition).toBe(100);
    });

    it('should start progress if not started', () => {
      progress.status = ProgressStatus.NOT_STARTED;
      progress.recordActivity({});
      
      expect(progress.status).toBe(ProgressStatus.IN_PROGRESS);
    });
  });

  describe('markAsCompleted method', () => {
    it('should update status and completion fields', () => {
      progress.status = ProgressStatus.IN_PROGRESS;
      
      progress.markAsCompleted();
      
      expect(progress.status).toBe(ProgressStatus.COMPLETED);
      expect(progress.completedAt).toBeInstanceOf(Date);
      expect(progress.lastAccessedAt).toBeInstanceOf(Date);
      expect(progress.completionPercentage).toBe(100);
    });
  });

  describe('recordDownload method', () => {
    it('should increment download count and record activity', () => {
      progress.downloadCount = 2;
      progress.viewCount = 5;
      
      progress.recordDownload();
      
      expect(progress.downloadCount).toBe(3);
      expect(progress.viewCount).toBe(6); // recordActivity increments this
    });
  });

  describe('addStudentFeedback method', () => {
    it('should set self rating and feedback', () => {
      progress.addStudentFeedback(4, 'Great resource!', 3, true);
      
      expect(progress.selfRating).toBe(4);
      expect(progress.feedback).toBe('Great resource!');
      expect(progress.difficultyPerceived).toBe(3);
      expect(progress.learningOutcomeAchieved).toBe(true);
      expect(progress.lastAccessedAt).toBeInstanceOf(Date);
    });

    it('should clamp ratings to valid range', () => {
      progress.addStudentFeedback(0); // Below minimum
      expect(progress.selfRating).toBe(1);
      
      progress.addStudentFeedback(10); // Above maximum
      expect(progress.selfRating).toBe(5);
    });
  });

  describe('addTeacherFeedback method', () => {
    it('should set teacher rating and notes', () => {
      progress.status = ProgressStatus.COMPLETED;
      
      progress.addTeacherFeedback(5, 'Excellent work!');
      
      expect(progress.teacherRating).toBe(5);
      expect(progress.teacherNotes).toBe('Excellent work!');
      expect(progress.reviewedAt).toBeInstanceOf(Date);
      expect(progress.status).toBe(ProgressStatus.REVIEWED);
    });

    it('should clamp teacher ratings to valid range', () => {
      progress.addTeacherFeedback(0);
      expect(progress.teacherRating).toBe(1);
      
      progress.addTeacherFeedback(6);
      expect(progress.teacherRating).toBe(5);
    });
  });

  describe('updateCompletionPercentage method', () => {
    it('should update completion percentage within bounds', () => {
      progress.updateCompletionPercentage(75);
      expect(progress.completionPercentage).toBe(75);
      
      progress.updateCompletionPercentage(-10);
      expect(progress.completionPercentage).toBe(0);
      
      progress.updateCompletionPercentage(150);
      expect(progress.completionPercentage).toBe(100);
    });

    it('should mark as completed when reaching 100%', () => {
      progress.status = ProgressStatus.IN_PROGRESS;
      
      progress.updateCompletionPercentage(100);
      
      expect(progress.status).toBe(ProgressStatus.COMPLETED);
      expect(progress.completedAt).toBeInstanceOf(Date);
    });

    it('should not mark as completed if already completed', () => {
      progress.status = ProgressStatus.REVIEWED;
      const originalCompletedAt = new Date();
      progress.completedAt = originalCompletedAt;
      
      progress.updateCompletionPercentage(100);
      
      expect(progress.status).toBe(ProgressStatus.REVIEWED);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values gracefully', () => {
      progress.selfRating = null;
      progress.teacherRating = undefined;
      progress.engagementScore = null;
      
      expect(progress.averageRating).toBeNull();
      expect(() => progress.addStudentFeedback(3)).not.toThrow();
    });

    it('should handle empty interaction events array', () => {
      progress.interactionEvents = [];
      
      expect(() => progress.recordActivity({ interactionType: 'TEST' })).not.toThrow();
      expect(progress.interactionEvents).toHaveLength(1);
    });
  });
});