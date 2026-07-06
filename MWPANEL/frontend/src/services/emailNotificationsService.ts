/**
 * @archivo: emailNotificationsService.ts
 * @función: Servicio para gestión de notificaciones por email
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @propósito: Comunicación con backend para plantillas, historial y estadísticas
 */

import apiClient from './apiClient';

export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  availableVariables: string;
  isActive: boolean;
  isSystem: boolean;
  createdById?: string;
  lastEditedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailNotification {
  id: string;
  recipientId: string;
  recipientEmail: string;
  templateId?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateData?: string;
  status: 'pending' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'complained';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  providerMessageId?: string;
  providerResponse?: string;
  triggerEvent?: string;
  triggerResourceId?: string;
  triggerResourceType?: string;
  triggeredById?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  bouncedAt?: string;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: string;
  isTest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotificationPreferences {
  id: string;
  userId: string;
  emailNotificationsEnabled: boolean;
  preferredLanguage: string;
  enableGradeNotifications: boolean;
  enableAssignmentReminders: boolean;
  enableEventReminders: boolean;
  enableTeacherMessages: boolean;
  enableChildGradeUpdates: boolean;
  enableChildAbsenceAlerts: boolean;
  enableSchoolEvents: boolean;
  enableTeacherCommunications: boolean;
  enableNewAssignments: boolean;
  enableAdminMessages: boolean;
  enableSystemIncidents: boolean;
  enableClassUpdates: boolean;
  enableSystemErrors: boolean;
  enableBackupReports: boolean;
  enableUserActivity: boolean;
  enableSecurityAlerts: boolean;
  enableWelcomeEmails: boolean;
  enablePasswordResetEmails: boolean;
  enableMaintenanceAlerts: boolean;
  notificationFrequency: string;
  preferredNotificationTime: string;
  enableRichHtmlEmails: boolean;
  enableEmailImages: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byTemplate: Record<string, number>;
  last24Hours: number;
  last7Days: number;
}

export interface SendTestEmailDto {
  to: string;
  templateType: string;
  subject?: string;
  templateData?: Record<string, any>;
}

export interface SendCustomEmailDto {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

class EmailNotificationsService {
  // Gestión de plantillas
  async getTemplates(): Promise<EmailTemplate[]> {
    const response = await apiClient.get('/communications/email-templates');
    return response.data;
  }

  async getTemplate(id: string): Promise<EmailTemplate> {
    const response = await apiClient.get(`/communications/email-templates/${id}`);
    return response.data;
  }

  async createTemplate(template: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await apiClient.post('/communications/email-templates', template);
    return response.data;
  }

  async updateTemplate(id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await apiClient.put(`/communications/email-templates/${id}`, template);
    return response.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/communications/email-templates/${id}`);
  }

  async previewTemplate(id: string, templateData: Record<string, any>): Promise<{ html: string; text: string }> {
    const response = await apiClient.post(`/communications/email-templates/${id}/preview`, { templateData });
    return response.data;
  }

  // Historial de notificaciones
  async getUserEmailHistory(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    templateType?: string;
    recipientEmail?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    notifications: EmailNotification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/communications/email-notifications/history', { params });
    return response.data;
  }

  async getAllEmailHistory(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    templateType?: string;
    recipientEmail?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    notifications: EmailNotification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/communications/email-notifications/complete-history', { params });
    return response.data;
  }

  async getNotification(id: string): Promise<EmailNotification> {
    const response = await apiClient.get(`/communications/email-notifications/${id}`);
    return response.data;
  }

  // Estadísticas
  async getStats(): Promise<EmailStats> {
    const response = await apiClient.get('/communications/email-notifications/stats');
    return response.data;
  }

  // Envío de emails
  async sendTestEmail(data: SendTestEmailDto): Promise<EmailNotification> {
    const response = await apiClient.post('/communications/email-notifications/send-test', data);
    return response.data;
  }

  async sendCustomEmail(data: SendCustomEmailDto): Promise<EmailNotification> {
    const response = await apiClient.post('/communications/email-notifications/send-custom', data);
    return response.data;
  }

  // Preferencias de usuario
  async getUserPreferences(userId?: string): Promise<UserNotificationPreferences> {
    const url = userId 
      ? `/communications/notification-preferences/user/${userId}`
      : '/communications/notification-preferences/my';
    const response = await apiClient.get(url);
    return response.data;
  }

  async updateUserPreferences(
    userId: string, 
    preferences: Partial<UserNotificationPreferences>
  ): Promise<UserNotificationPreferences> {
    const response = await apiClient.put(`/communications/notification-preferences/user/${userId}`, preferences);
    return response.data;
  }

  async updateMyPreferences(preferences: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences> {
    const response = await apiClient.put('/communications/notification-preferences/my', preferences);
    return response.data;
  }

  async bulkUpdatePreferences(updates: Array<{
    userId: string;
    preferences: Partial<UserNotificationPreferences>;
  }>): Promise<void> {
    await apiClient.post('/communications/notification-preferences/bulk-update', { updates });
  }

  // Automatización de emails - Funcionalidad activa  
  async getAllTemplates(): Promise<EmailTemplate[]> {
    return this.getTemplates();
  }

  async getAllAutomations(): Promise<any[]> {
    const response = await apiClient.get('/communications/email-automation');
    return response.data;
  }

  async getAutomationStats(): Promise<any> {
    const response = await apiClient.get('/communications/email-automation/stats');
    return response.data;
  }

  async getRecipientTypes(): Promise<any[]> {
    const response = await apiClient.get('/communications/email-automation/recipient-types');
    return response.data;
  }

  async getEventTypes(): Promise<any[]> {
    const response = await apiClient.get('/communications/email-automation/event-types');
    return response.data;
  }

  async createAutomation(automation: any): Promise<any> {
    const response = await apiClient.post('/communications/email-automation', automation);
    return response.data;
  }

  async updateAutomation(id: string, automation: any): Promise<any> {
    const response = await apiClient.put(`/communications/email-automation/${id}`, automation);
    return response.data;
  }

  async deleteAutomation(id: string): Promise<void> {
    await apiClient.delete(`/communications/email-automation/${id}`);
  }

  async toggleAutomationActive(id: string): Promise<any> {
    const response = await apiClient.put(`/communications/email-automation/${id}/toggle-active`);
    return response.data;
  }
}

export default new EmailNotificationsService();