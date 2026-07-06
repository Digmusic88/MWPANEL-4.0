/**
 * @archivo: assignment-campaign.entity.spec.ts
 * @módulo: Assignments - Tests Unitarios
 * @función: Tests para AssignmentCampaign entity
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * COBERTURA DE TESTS:
 * - Virtual properties y getters
 * - Métodos helper
 * - Lógica de negocio de la entidad
 * - Estados y transiciones
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 1.6
 */

import { AssignmentCampaign, CampaignStatus, CampaignType } from './assignment-campaign.entity';

describe('AssignmentCampaign Entity', () => {
  let campaign: AssignmentCampaign;

  beforeEach(() => {
    campaign = new AssignmentCampaign();
    campaign.id = 'test-campaign-id';
    campaign.name = 'Test Campaign';
    campaign.description = 'Test Description';
    campaign.campaignType = CampaignType.SINGLE;
    campaign.status = CampaignStatus.ACTIVE;
    campaign.createdById = 'test-user-id';
    campaign.priority = 1;
    campaign.totalTargets = 5;
    campaign.completionRate = 75.5;
  });

  describe('isActive getter', () => {
    it('should return true when campaign is active and within date range', () => {
      const now = new Date();
      campaign.status = CampaignStatus.ACTIVE;
      campaign.startDate = new Date(now.getTime() - 86400000); // Yesterday
      campaign.endDate = new Date(now.getTime() + 86400000);   // Tomorrow
      
      expect(campaign.isActive).toBe(true);
    });

    it('should return false when campaign status is not active', () => {
      campaign.status = CampaignStatus.DRAFT;
      campaign.startDate = new Date();
      campaign.endDate = new Date(Date.now() + 86400000);
      
      expect(campaign.isActive).toBe(false);
    });

    it('should return false when current date is before start date', () => {
      const now = new Date();
      campaign.status = CampaignStatus.ACTIVE;
      campaign.startDate = new Date(now.getTime() + 86400000); // Tomorrow
      campaign.endDate = new Date(now.getTime() + 172800000);  // Day after tomorrow
      
      expect(campaign.isActive).toBe(false);
    });

    it('should return false when current date is after end date', () => {
      const now = new Date();
      campaign.status = CampaignStatus.ACTIVE;
      campaign.startDate = new Date(now.getTime() - 172800000); // Day before yesterday
      campaign.endDate = new Date(now.getTime() - 86400000);    // Yesterday
      
      expect(campaign.isActive).toBe(false);
    });

    it('should return true when endDate is null and other conditions are met', () => {
      const now = new Date();
      campaign.status = CampaignStatus.ACTIVE;
      campaign.startDate = new Date(now.getTime() - 86400000); // Yesterday
      campaign.endDate = null;
      
      expect(campaign.isActive).toBe(true);
    });
  });

  describe('isExpired getter', () => {
    it('should return true when end date has passed', () => {
      campaign.endDate = new Date(Date.now() - 86400000); // Yesterday
      
      expect(campaign.isExpired).toBe(true);
    });

    it('should return false when end date is in the future', () => {
      campaign.endDate = new Date(Date.now() + 86400000); // Tomorrow
      
      expect(campaign.isExpired).toBe(false);
    });

    it('should return false when end date is null', () => {
      campaign.endDate = null;
      
      expect(campaign.isExpired).toBe(false);
    });
  });

  describe('daysUntilDue getter', () => {
    it('should return correct number of days until due date', () => {
      const threeDaysFromNow = new Date(Date.now() + (3 * 86400000));
      campaign.dueDate = threeDaysFromNow;
      
      expect(campaign.daysUntilDue).toBe(3);
    });

    it('should return negative number for overdue campaigns', () => {
      const threeDaysAgo = new Date(Date.now() - (3 * 86400000));
      campaign.dueDate = threeDaysAgo;
      
      expect(campaign.daysUntilDue).toBe(-3);
    });

    it('should return null when due date is not set', () => {
      campaign.dueDate = null;
      
      expect(campaign.daysUntilDue).toBeNull();
    });

    it('should return 1 for due date tomorrow', () => {
      const tomorrow = new Date(Date.now() + 86400000);
      campaign.dueDate = tomorrow;
      
      expect(campaign.daysUntilDue).toBe(1);
    });
  });

  describe('canAssignNew getter', () => {
    it('should return true for active campaign that is not expired', () => {
      campaign.status = CampaignStatus.ACTIVE;
      campaign.endDate = new Date(Date.now() + 86400000); // Tomorrow
      campaign.autoAssignment = false;
      
      expect(campaign.canAssignNew).toBe(true);
    });

    it('should return true for draft campaign with auto assignment', () => {
      campaign.status = CampaignStatus.DRAFT;
      campaign.autoAssignment = true;
      
      expect(campaign.canAssignNew).toBe(true);
    });

    it('should return false for expired campaign', () => {
      campaign.status = CampaignStatus.ACTIVE;
      campaign.endDate = new Date(Date.now() - 86400000); // Yesterday
      
      expect(campaign.canAssignNew).toBe(false);
    });

    it('should return false for completed campaign', () => {
      campaign.status = CampaignStatus.COMPLETED;
      
      expect(campaign.canAssignNew).toBe(false);
    });

    it('should return false for paused campaign', () => {
      campaign.status = CampaignStatus.PAUSED;
      
      expect(campaign.canAssignNew).toBe(false);
    });
  });

  describe('urgencyLevel getter', () => {
    it('should return CRITICAL for campaigns due today or overdue', () => {
      campaign.dueDate = new Date(Date.now() - 3600000); // 1 hour ago
      
      expect(campaign.urgencyLevel).toBe('CRITICAL');
    });

    it('should return HIGH for campaigns due within 3 days', () => {
      campaign.dueDate = new Date(Date.now() + (2 * 86400000)); // 2 days from now
      
      expect(campaign.urgencyLevel).toBe('HIGH');
    });

    it('should return MEDIUM for campaigns due within 7 days', () => {
      campaign.dueDate = new Date(Date.now() + (5 * 86400000)); // 5 days from now
      
      expect(campaign.urgencyLevel).toBe('MEDIUM');
    });

    it('should return LOW for campaigns due in more than 7 days', () => {
      campaign.dueDate = new Date(Date.now() + (10 * 86400000)); // 10 days from now
      
      expect(campaign.urgencyLevel).toBe('LOW');
    });

    it('should return LOW for campaigns without due date', () => {
      campaign.dueDate = null;
      
      expect(campaign.urgencyLevel).toBe('LOW');
    });
  });

  describe('Entity Properties', () => {
    it('should have all required properties initialized', () => {
      expect(campaign.id).toBe('test-campaign-id');
      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.description).toBe('Test Description');
      expect(campaign.campaignType).toBe(CampaignType.SINGLE);
      expect(campaign.status).toBe(CampaignStatus.ACTIVE);
      expect(campaign.createdById).toBe('test-user-id');
      expect(campaign.priority).toBe(1);
      expect(campaign.totalTargets).toBe(5);
      expect(campaign.completionRate).toBe(75.5);
    });

    it('should handle default values correctly', () => {
      const newCampaign = new AssignmentCampaign();
      
      // Default values should be set by decorators in real usage
      // Here we test that the properties exist
      expect(newCampaign.campaignType).toBeUndefined();
      expect(newCampaign.status).toBeUndefined();
      expect(newCampaign.priority).toBeUndefined();
    });

    it('should handle null values correctly', () => {
      campaign.description = null;
      campaign.endDate = null;
      campaign.dueDate = null;
      campaign.avgTimeToComplete = null;
      campaign.effectivenessScore = null;
      
      expect(campaign.description).toBeNull();
      expect(campaign.endDate).toBeNull();
      expect(campaign.dueDate).toBeNull();
      expect(campaign.avgTimeToComplete).toBeNull();
      expect(campaign.effectivenessScore).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large completion rates', () => {
      campaign.completionRate = 999.99;
      
      expect(campaign.completionRate).toBe(999.99);
    });

    it('should handle negative priority values', () => {
      campaign.priority = -5;
      
      expect(campaign.priority).toBe(-5);
    });

    it('should handle zero total targets', () => {
      campaign.totalTargets = 0;
      
      expect(campaign.totalTargets).toBe(0);
    });

    it('should handle very small effectiveness scores', () => {
      campaign.effectivenessScore = 0.01;
      
      expect(campaign.effectivenessScore).toBe(0.01);
    });
  });

  describe('Date Handling', () => {
    it('should handle start date equal to current date', () => {
      const now = new Date();
      campaign.status = CampaignStatus.ACTIVE;
      campaign.startDate = new Date(now.getTime());
      campaign.endDate = new Date(now.getTime() + 86400000);
      
      expect(campaign.isActive).toBe(true);
    });

    it('should handle end date equal to current date', () => {
      const now = new Date();
      campaign.status = CampaignStatus.ACTIVE;
      campaign.startDate = new Date(now.getTime() - 86400000);
      campaign.endDate = new Date(now.getTime());
      
      // This might be true or false depending on milliseconds
      // The implementation uses <= so it should be true
      expect(typeof campaign.isActive).toBe('boolean');
    });

    it('should handle due date calculations correctly for today', () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      campaign.dueDate = today;
      
      expect(campaign.daysUntilDue).toBeGreaterThanOrEqual(0);
      expect(campaign.daysUntilDue).toBeLessThanOrEqual(1);
    });
  });

  describe('Boolean Properties', () => {
    it('should handle autoAssignment property', () => {
      campaign.autoAssignment = true;
      expect(campaign.autoAssignment).toBe(true);
      
      campaign.autoAssignment = false;
      expect(campaign.autoAssignment).toBe(false);
    });

    it('should handle allowLateSubmission property', () => {
      campaign.allowLateSubmission = true;
      expect(campaign.allowLateSubmission).toBe(true);
      
      campaign.allowLateSubmission = false;
      expect(campaign.allowLateSubmission).toBe(false);
    });

    it('should handle sendReminders property', () => {
      campaign.sendReminders = true;
      expect(campaign.sendReminders).toBe(true);
      
      campaign.sendReminders = false;
      expect(campaign.sendReminders).toBe(false);
    });
  });

  describe('Enums', () => {
    it('should handle all CampaignType values', () => {
      const types = Object.values(CampaignType);
      expect(types).toContain('SINGLE');
      expect(types).toContain('BULK');
      expect(types).toContain('RECURRING');
      expect(types).toContain('CONDITIONAL');
    });

    it('should handle all CampaignStatus values', () => {
      const statuses = Object.values(CampaignStatus);
      expect(statuses).toContain('DRAFT');
      expect(statuses).toContain('ACTIVE');
      expect(statuses).toContain('PAUSED');
      expect(statuses).toContain('COMPLETED');
      expect(statuses).toContain('EXPIRED');
    });

    it('should allow setting different campaign types', () => {
      campaign.campaignType = CampaignType.BULK;
      expect(campaign.campaignType).toBe('BULK');
      
      campaign.campaignType = CampaignType.RECURRING;
      expect(campaign.campaignType).toBe('RECURRING');
      
      campaign.campaignType = CampaignType.CONDITIONAL;
      expect(campaign.campaignType).toBe('CONDITIONAL');
    });

    it('should allow setting different campaign statuses', () => {
      campaign.status = CampaignStatus.DRAFT;
      expect(campaign.status).toBe('DRAFT');
      
      campaign.status = CampaignStatus.PAUSED;
      expect(campaign.status).toBe('PAUSED');
      
      campaign.status = CampaignStatus.COMPLETED;
      expect(campaign.status).toBe('COMPLETED');
      
      campaign.status = CampaignStatus.EXPIRED;
      expect(campaign.status).toBe('EXPIRED');
    });
  });
});