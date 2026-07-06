/**
 * @archivo: assignmentsService.ts
 * @módulo: Services - Assignments API
 * @función: Servicio para comunicación con APIs de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Servicio que maneja todas las comunicaciones con las APIs del
 * sistema de asignaciones, incluyendo CRUD, analytics y progress tracking.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.1
 */

import { apiClient } from './apiClient';
import {
  AssignmentCampaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignListResponse,
  CampaignFilters,
  PaginationQuery,
  AssignmentProgress,
  ProgressDashboardResponse,
  AnalyticsOverviewResponse,
  RecordActivityDto,
  UpdateProgressDto,
  CompleteResourceDto,
  ProgressFilters,
  BulkOperationResult
} from '../types/assignments';

/**
 * Base URL para las APIs de asignaciones
 */
const ASSIGNMENTS_BASE_URL = '/assignments';

/**
 * Servicio de campañas de asignación
 */
export class AssignmentCampaignService {
  /**
   * Obtener lista de campañas con filtros y paginación
   */
  static async getCampaigns(
    filters: CampaignFilters = {},
    pagination: PaginationQuery = { page: 1, limit: 20 }
  ): Promise<CampaignListResponse> {
    const params = new URLSearchParams();
    
    // Filtros
    if (filters.status) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters.type) {
      filters.type.forEach(type => params.append('type', type));
    }
    if (filters.createdById) {
      params.append('createdById', filters.createdById);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.tags) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    if (filters.dateRange?.start) {
      params.append('startDate', filters.dateRange.start.toString());
    }
    if (filters.dateRange?.end) {
      params.append('endDate', filters.dateRange.end.toString());
    }

    // Paginación
    params.append('page', pagination.page?.toString() || '1');
    params.append('limit', pagination.limit?.toString() || '20');
    if (pagination.sortBy) {
      params.append('sortBy', pagination.sortBy);
    }
    if (pagination.sortOrder) {
      params.append('sortOrder', pagination.sortOrder);
    }

    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/campaigns?${params.toString()}`);
    return response.data;
  }

  /**
   * Obtener campaña por ID
   */
  static async getCampaignById(id: string): Promise<AssignmentCampaign> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/campaigns/${id}`);
    return response.data;
  }

  /**
   * Crear nueva campaña
   */
  static async createCampaign(data: CreateCampaignDto): Promise<AssignmentCampaign> {
    const response = await apiClient.post(`${ASSIGNMENTS_BASE_URL}/campaigns`, data);
    return response.data;
  }

  /**
   * Actualizar campaña existente
   */
  static async updateCampaign(id: string, data: UpdateCampaignDto): Promise<AssignmentCampaign> {
    const response = await apiClient.patch(`${ASSIGNMENTS_BASE_URL}/campaigns/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar campaña
   */
  static async deleteCampaign(id: string): Promise<void> {
    await apiClient.delete(`${ASSIGNMENTS_BASE_URL}/campaigns/${id}`);
  }

  /**
   * Activar campaña
   */
  static async activateCampaign(id: string): Promise<AssignmentCampaign> {
    const response = await apiClient.patch(`${ASSIGNMENTS_BASE_URL}/campaigns/${id}/activate`);
    return response.data;
  }

  /**
   * Pausar campaña
   */
  static async pauseCampaign(id: string): Promise<AssignmentCampaign> {
    const response = await apiClient.patch(`${ASSIGNMENTS_BASE_URL}/campaigns/${id}/pause`);
    return response.data;
  }

  /**
   * Archivar campaña
   */
  static async archiveCampaign(id: string): Promise<AssignmentCampaign> {
    const response = await apiClient.patch(`${ASSIGNMENTS_BASE_URL}/campaigns/${id}/archive`);
    return response.data;
  }

  /**
   * Clonar campaña
   */
  static async cloneCampaign(id: string, newTitle?: string): Promise<AssignmentCampaign> {
    const response = await apiClient.post(`${ASSIGNMENTS_BASE_URL}/campaigns/${id}/clone`, {
      title: newTitle
    });
    return response.data;
  }

  /**
   * Operaciones masivas
   */
  static async bulkUpdateStatus(
    campaignIds: string[], 
    status: string
  ): Promise<BulkOperationResult> {
    const response = await apiClient.patch(`${ASSIGNMENTS_BASE_URL}/campaigns/bulk-update`, {
      ids: campaignIds,
      operation: 'updateStatus',
      params: { status }
    });
    return response.data;
  }

  /**
   * Eliminar múltiples campañas
   */
  static async bulkDelete(campaignIds: string[]): Promise<BulkOperationResult> {
    const response = await apiClient.patch(`${ASSIGNMENTS_BASE_URL}/campaigns/bulk-delete`, {
      ids: campaignIds
    });
    return response.data;
  }

  /**
   * Duplicar múltiples campañas
   */
  static async bulkClone(campaignIds: string[]): Promise<BulkOperationResult> {
    const response = await apiClient.patch(`${ASSIGNMENTS_BASE_URL}/campaigns/bulk-clone`, {
      ids: campaignIds
    });
    return response.data;
  }

  /**
   * Obtener estadísticas de campaña
   */
  static async getCampaignStats(id: string): Promise<any> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/campaigns/${id}/stats`);
    return response.data;
  }

  /**
   * Exportar campañas
   */
  static async exportCampaigns(
    filters: CampaignFilters = {},
    format: 'csv' | 'excel' | 'pdf' = 'excel'
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    // Aplicar filtros (similar a getCampaigns)
    if (filters.status) {
      filters.status.forEach(status => params.append('status', status));
    }
    
    const response = await apiClient.get(
      `${ASSIGNMENTS_BASE_URL}/campaigns/export?${params.toString()}`,
      { responseType: 'blob' }
    );
    return response.data;
  }
}

/**
 * Servicio de seguimiento de progreso
 */
export class ProgressTrackingService {
  /**
   * Obtener dashboard de progreso de usuario
   */
  static async getUserProgressDashboard(userId: string): Promise<ProgressDashboardResponse> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/progress/dashboard/${userId}`);
    return response.data;
  }

  /**
   * Obtener progreso de usuario en campaña específica
   */
  static async getUserCampaignProgress(
    userId: string, 
    campaignId: string
  ): Promise<AssignmentProgress[]> {
    const response = await apiClient.get(
      `${ASSIGNMENTS_BASE_URL}/progress/user/${userId}/campaign/${campaignId}`
    );
    return response.data;
  }

  /**
   * Registrar actividad
   */
  static async recordActivity(data: RecordActivityDto): Promise<void> {
    await apiClient.post(`${ASSIGNMENTS_BASE_URL}/progress/activity`, data);
  }

  /**
   * Actualizar progreso
   */
  static async updateProgress(
    campaignId: string, 
    resourceId: string, 
    data: UpdateProgressDto
  ): Promise<AssignmentProgress> {
    const response = await apiClient.patch(
      `${ASSIGNMENTS_BASE_URL}/progress/${campaignId}/${resourceId}`, 
      data
    );
    return response.data;
  }

  /**
   * Marcar recurso como completado
   */
  static async completeResource(data: CompleteResourceDto): Promise<AssignmentProgress> {
    const response = await apiClient.patch(
      `${ASSIGNMENTS_BASE_URL}/progress/complete`, 
      data
    );
    return response.data;
  }

  /**
   * Obtener actividades recientes
   */
  static async getRecentActivities(
    userId?: string, 
    limit: number = 10
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    params.append('limit', limit.toString());

    const response = await apiClient.get(
      `${ASSIGNMENTS_BASE_URL}/progress/activities/recent?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obtener progreso de campaña para todos los usuarios
   */
  static async getCampaignProgress(
    campaignId: string,
    filters: ProgressFilters = {}
  ): Promise<AssignmentProgress[]> {
    const params = new URLSearchParams();
    params.append('campaignId', campaignId);
    
    if (filters.status) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters.completionRange?.min !== undefined) {
      params.append('minCompletion', filters.completionRange.min.toString());
    }
    if (filters.completionRange?.max !== undefined) {
      params.append('maxCompletion', filters.completionRange.max.toString());
    }

    const response = await apiClient.get(
      `${ASSIGNMENTS_BASE_URL}/progress?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Generar reporte de progreso
   */
  static async generateProgressReport(
    campaignId: string,
    format: 'pdf' | 'excel' = 'pdf'
  ): Promise<Blob> {
    const response = await apiClient.get(
      `${ASSIGNMENTS_BASE_URL}/progress/reports/${campaignId}?format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Obtener alertas de progreso
   */
  static async getProgressAlerts(): Promise<any[]> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/progress/alerts`);
    return response.data;
  }

  /**
   * Marcar alerta como leída
   */
  static async markAlertAsRead(alertId: string): Promise<void> {
    await apiClient.patch(`${ASSIGNMENTS_BASE_URL}/progress/alerts/${alertId}/read`);
  }
}

/**
 * Servicio de analytics
 */
export class AssignmentAnalyticsService {
  /**
   * Obtener analytics generales
   */
  static async getOverview(): Promise<AnalyticsOverviewResponse> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/analytics/overview`);
    return response.data;
  }

  /**
   * Obtener analytics detallados
   */
  static async getDetailedAnalytics(): Promise<any> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/analytics/detailed`);
    return response.data;
  }

  /**
   * Obtener métricas de engagement
   */
  static async getEngagementMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(
      `${ASSIGNMENTS_BASE_URL}/analytics/engagement?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obtener métricas de performance
   */
  static async getPerformanceMetrics(): Promise<any> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/analytics/performance`);
    return response.data;
  }

  /**
   * Obtener tendencias de uso
   */
  static async getUsageTrends(
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<any> {
    const response = await apiClient.get(
      `${ASSIGNMENTS_BASE_URL}/analytics/trends?period=${period}`
    );
    return response.data;
  }

  /**
   * Obtener comparación de campañas
   */
  static async compareCampaigns(campaignIds: string[]): Promise<any> {
    const response = await apiClient.post(
      `${ASSIGNMENTS_BASE_URL}/analytics/compare`, 
      { campaignIds }
    );
    return response.data;
  }

  /**
   * Obtener analytics de recursos
   */
  static async getResourceAnalytics(): Promise<any> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/analytics/resources`);
    return response.data;
  }

  /**
   * Obtener analytics de usuarios
   */
  static async getUserAnalytics(): Promise<any> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/analytics/users`);
    return response.data;
  }
}

/**
 * Servicio de utilidades
 */
export class AssignmentUtilitiesService {
  /**
   * Validar configuración de campaña
   */
  static async validateCampaignConfig(data: CreateCampaignDto): Promise<any> {
    const response = await apiClient.post(
      `${ASSIGNMENTS_BASE_URL}/utilities/validate-config`, 
      data
    );
    return response.data;
  }

  /**
   * Obtener recursos disponibles para asignación
   */
  static async getAvailableResources(
    filters: { type?: string; subject?: string; level?: string } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const response = await apiClient.get(
      `${ASSIGNMENTS_BASE_URL}/utilities/available-resources?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obtener targets disponibles
   */
  static async getAvailableTargets(): Promise<any> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/utilities/available-targets`);
    return response.data;
  }

  /**
   * Estimar tiempo de campaña
   */
  static async estimateCampaignTime(data: {
    resources: { id: string; estimatedTime: number }[];
    targets: { type: string; count: number }[];
  }): Promise<{ totalTime: number; avgTime: number; maxTime: number }> {
    const response = await apiClient.post(
      `${ASSIGNMENTS_BASE_URL}/utilities/estimate-time`, 
      data
    );
    return response.data;
  }

  /**
   * Obtener plantillas de campaña
   */
  static async getCampaignTemplates(): Promise<any[]> {
    const response = await apiClient.get(`${ASSIGNMENTS_BASE_URL}/utilities/templates`);
    return response.data;
  }

  /**
   * Crear plantilla desde campaña
   */
  static async createTemplateFromCampaign(
    campaignId: string, 
    templateName: string
  ): Promise<any> {
    const response = await apiClient.post(
      `${ASSIGNMENTS_BASE_URL}/utilities/create-template`, 
      { campaignId, name: templateName }
    );
    return response.data;
  }
}

/**
 * Servicio principal que combina todos los servicios
 */
export const assignmentsService = {
  campaigns: AssignmentCampaignService,
  progress: ProgressTrackingService,
  analytics: AssignmentAnalyticsService,
  utilities: AssignmentUtilitiesService
};

export default assignmentsService;