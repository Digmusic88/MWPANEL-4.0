/**
 * @archivo: emailAutomationService.ts
 * @módulo: Services - Email Automation System
 * @función: Servicio para gestión de automatizaciones de email desde frontend
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @actualizado: 2025-07-14 - Corregido para usar apiClient correcto
 */

import { apiClient } from './apiClient';

// Interfaces para tipado
export interface EmailAutomation {
  id: string;
  name: string;
  eventType: string;
  isActive: boolean;
  recipientType: string;
  templateId: string;
  template?: {
    id: string;
    name: string;
    subject: string;
  };
  reminderDaysBefore?: number;
  reminderTime?: string;
  conditions?: string;
  sendOnlyOnce: boolean;
  maxEmailsPerDay?: number;
  totalEmailsSent: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

export interface CreateEmailAutomationDto {
  name: string;
  eventType: string;
  templateId: string;
  recipientType: string;
  reminderDaysBefore?: number;
  reminderTime?: string;
  conditions?: string;
  sendOnlyOnce?: boolean;
  maxEmailsPerDay?: number;
  isActive?: boolean;
}

export interface UpdateEmailAutomationDto {
  name?: string;
  eventType?: string;
  templateId?: string;
  recipientType?: string;
  reminderDaysBefore?: number;
  reminderTime?: string;
  conditions?: string;
  sendOnlyOnce?: boolean;
  maxEmailsPerDay?: number;
  isActive?: boolean;
}

export interface EmailEventType {
  value: string;
  label: string;
  description: string;
}

export interface EmailRecipientType {
  value: string;
  label: string;
  description: string;
}

export interface AutomationStats {
  total: number;
  active: number;
  totalEmailsSent: number;
  byEventType: Array<{
    eventType: string;
    count: number;
  }>;
  byRecipientType: Array<{
    recipientType: string;
    count: number;
  }>;
}

/**
 * Servicio para gestión de automatizaciones de email
 */
export class EmailAutomationService {
  private readonly baseUrl = '/communications/email-automation';

  /**
   * Obtiene todas las automatizaciones
   */
  async getAllAutomations(): Promise<EmailAutomation[]> {
    const response = await apiClient.get(this.baseUrl);
    return response.data;
  }

  /**
   * Obtiene automatizaciones activas
   */
  async getActiveAutomations(): Promise<EmailAutomation[]> {
    const response = await apiClient.get(`${this.baseUrl}/active`);
    return response.data;
  }

  /**
   * Obtiene estadísticas de automatizaciones
   */
  async getAutomationStats(): Promise<AutomationStats> {
    const response = await apiClient.get(`${this.baseUrl}/stats`);
    return response.data;
  }

  /**
   * Obtiene tipos de eventos disponibles
   */
  async getEventTypes(): Promise<EmailEventType[]> {
    const response = await apiClient.get(`${this.baseUrl}/event-types`);
    return response.data;
  }

  /**
   * Obtiene tipos de destinatarios disponibles
   */
  async getRecipientTypes(): Promise<EmailRecipientType[]> {
    const response = await apiClient.get(`${this.baseUrl}/recipient-types`);
    return response.data;
  }

  /**
   * Obtiene una automatización por ID
   */
  async getAutomationById(id: string): Promise<EmailAutomation> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Crea una nueva automatización
   */
  async createAutomation(data: CreateEmailAutomationDto): Promise<EmailAutomation> {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data;
  }

  /**
   * Actualiza una automatización existente
   */
  async updateAutomation(id: string, data: UpdateEmailAutomationDto): Promise<EmailAutomation> {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  /**
   * Activa/desactiva una automatización
   */
  async toggleAutomationActive(id: string): Promise<EmailAutomation> {
    const response = await apiClient.put(`${this.baseUrl}/${id}/toggle-active`);
    return response.data;
  }

  /**
   * Elimina una automatización
   */
  async deleteAutomation(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Test manual de automatización de cumpleaños
   */
  async testBirthdayAutomation(): Promise<{ message: string }> {
    const response = await apiClient.post(`${this.baseUrl}/test-birthday`);
    return response.data;
  }
}

// Instancia singleton del servicio
export const emailAutomationService = new EmailAutomationService();