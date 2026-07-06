/**
 * @service: accommodationService
 * @module: DUA (Diseño Universal para el Aprendizaje)
 * @description: Servicio para gestión de acomodaciones DUA
 * @features: CRUD, workflow de aprobación, efectividad, plantillas, analytics
 */

import apiClient from './apiClient';
import {
  DuaAccommodation,
  AccommodationEffectiveness,
  CreateAccommodationDto,
  UpdateAccommodationDto,
  ApproveAccommodationDto,
  RejectAccommodationDto,
  CreateEffectivenessDto,
  AccommodationFilters,
  EffectivenessFilters,
  AccommodationType,
  AccommodationStatus,
  AccommodationAnalytics,
} from '../types/dua.types';

// Base URL para endpoints de acomodaciones
const BASE_URL = '/dua/accommodations';

/**
 * Servicio de Acomodaciones DUA
 */
export const accommodationService = {
  /**
   * Obtener acomodaciones con filtros
   */
  async getAccommodations(filters?: AccommodationFilters) {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.duaProfileId) params.append('duaProfileId', filters.duaProfileId);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.createdById) params.append('createdById', filters.createdById);
      if (filters.isTemplate !== undefined) params.append('isTemplate', filters.isTemplate.toString());
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
    }

    const response = await apiClient.get(`${BASE_URL}?${params.toString()}`);
    return response.data;
  },

  /**
   * Obtener acomodación por ID
   */
  async getAccommodationById(id: string): Promise<DuaAccommodation> {
    const response = await apiClient.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Crear nueva acomodación
   */
  async createAccommodation(data: CreateAccommodationDto): Promise<DuaAccommodation> {
    const response = await apiClient.post(BASE_URL, data);
    return response.data;
  },

  /**
   * Actualizar acomodación
   */
  async updateAccommodation(id: string, data: UpdateAccommodationDto): Promise<DuaAccommodation> {
    const response = await apiClient.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  /**
   * Enviar acomodación para aprobación
   */
  async submitForApproval(id: string): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${BASE_URL}/${id}/submit-approval`);
    return response.data;
  },

  /**
   * Aprobar acomodación
   */
  async approveAccommodation(id: string, data: ApproveAccommodationDto): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${BASE_URL}/${id}/approve`, data);
    return response.data;
  },

  /**
   * Rechazar acomodación
   */
  async rejectAccommodation(id: string, data: RejectAccommodationDto): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${BASE_URL}/${id}/reject`, data);
    return response.data;
  },

  /**
   * Activar acomodación
   */
  async activateAccommodation(id: string): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${BASE_URL}/${id}/activate`);
    return response.data;
  },

  /**
   * Suspender acomodación
   */
  async suspendAccommodation(id: string, reason: string): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${BASE_URL}/${id}/suspend`, { reason });
    return response.data;
  },

  /**
   * Obtener plantillas de acomodaciones
   */
  async getTemplates(type?: AccommodationType): Promise<DuaAccommodation[]> {
    const params = type ? `?type=${type}` : '';
    const response = await apiClient.get(`${BASE_URL}/templates/list${params}`);
    return response.data;
  },

  /**
   * Crear acomodación desde plantilla
   */
  async createFromTemplate(
    templateId: string,
    duaProfileId: string,
    customizations: Partial<CreateAccommodationDto>
  ): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${BASE_URL}/templates/${templateId}/use`, {
      duaProfileId,
      customizations,
    });
    return response.data;
  },

  /**
   * Crear registro de efectividad
   */
  async createEffectivenessRecord(data: CreateEffectivenessDto): Promise<AccommodationEffectiveness> {
    const response = await apiClient.post(`${BASE_URL}/effectiveness`, data);
    return response.data;
  },

  /**
   * Obtener registros de efectividad
   */
  async getEffectivenessRecords(filters?: EffectivenessFilters) {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.accommodationId) params.append('accommodationId', filters.accommodationId);
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.evaluatedById) params.append('evaluatedById', filters.evaluatedById);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.minRating) params.append('minRating', filters.minRating.toString());
      if (filters.onlyEffective !== undefined) params.append('onlyEffective', filters.onlyEffective.toString());
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
    }

    const response = await apiClient.get(`${BASE_URL}/effectiveness/list?${params.toString()}`);
    return response.data;
  },

  /**
   * Obtener analytics de acomodaciones
   */
  async getAccommodationAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
    type?: AccommodationType;
    educationalLevel?: string;
  }): Promise<AccommodationAnalytics> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.type) params.append('type', filters.type);
      if (filters.educationalLevel) params.append('educationalLevel', filters.educationalLevel);
    }

    const response = await apiClient.get(`${BASE_URL}/analytics/overview?${params.toString()}`);
    return response.data;
  },

  /**
   * Obtener sugerencias de acomodaciones basadas en necesidades educativas
   */
  async getSuggestionsForNeeds(educationalNeeds: string[]): Promise<DuaAccommodation[]> {
    const response = await apiClient.post(`${BASE_URL}/suggestions`, { educationalNeeds });
    return response.data;
  },

  /**
   * Validar una acomodación antes de crearla
   */
  async validateAccommodation(data: CreateAccommodationDto): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await apiClient.post(`${BASE_URL}/validate`, data);
    return response.data;
  },

  /**
   * Duplicar una acomodación existente
   */
  async duplicateAccommodation(id: string, targetDuaProfileId: string): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${BASE_URL}/${id}/duplicate`, { targetDuaProfileId });
    return response.data;
  },

  /**
   * Exportar acomodaciones a PDF
   */
  async exportAccommodationsToPDF(filters?: AccommodationFilters): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.duaProfileId) params.append('duaProfileId', filters.duaProfileId);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
    }

    const response = await apiClient.get(`${BASE_URL}/export/pdf?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Importar acomodaciones desde Excel
   */
  async importFromExcel(file: File): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${BASE_URL}/import/excel`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Obtener historial de cambios de una acomodación
   */
  async getAccommodationHistory(id: string): Promise<any[]> {
    const response = await apiClient.get(`${BASE_URL}/${id}/history`);
    return response.data;
  },

  /**
   * Buscar acomodaciones por texto
   */
  async searchAccommodations(query: string, filters?: AccommodationFilters): Promise<DuaAccommodation[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
    }

    const response = await apiClient.get(`${BASE_URL}/search?${params.toString()}`);
    return response.data;
  },

  /**
   * Obtener estadísticas de uso de plantillas
   */
  async getTemplateStats(): Promise<{
    templateId: string;
    name: string;
    usageCount: number;
    averageEffectiveness: number;
  }[]> {
    const response = await apiClient.get(`${BASE_URL}/templates/stats`);
    return response.data;
  },

  /**
   * Programar revisión de efectividad
   */
  async scheduleEffectivenessReview(
    accommodationId: string,
    reviewDate: Date,
    notes?: string
  ): Promise<void> {
    await apiClient.post(`${BASE_URL}/${accommodationId}/schedule-review`, {
      reviewDate,
      notes,
    });
  },

  /**
   * Obtener acomodaciones pendientes de revisión
   */
  async getPendingReviews(): Promise<DuaAccommodation[]> {
    const response = await apiClient.get(`${BASE_URL}/pending-reviews`);
    return response.data;
  },

  /**
   * Marcar acomodación como favorita/plantilla
   */
  async toggleTemplate(id: string, isTemplate: boolean): Promise<DuaAccommodation> {
    const response = await apiClient.patch(`${BASE_URL}/${id}/template`, { isTemplate });
    return response.data;
  },

  /**
   * Obtener resumen de acomodaciones por estudiante
   */
  async getStudentAccommodationSummary(studentId: string): Promise<{
    total: number;
    active: number;
    byType: Record<AccommodationType, number>;
    averageEffectiveness: number;
  }> {
    const response = await apiClient.get(`${BASE_URL}/student/${studentId}/summary`);
    return response.data;
  },

  /**
   * Comparar efectividad entre acomodaciones
   */
  async compareAccommodations(accommodationIds: string[]): Promise<{
    accommodations: Array<{
      id: string;
      name: string;
      type: AccommodationType;
      averageEffectiveness: number;
      implementationCost: number;
      studentSatisfaction: number;
    }>;
    recommendation: string;
  }> {
    const response = await apiClient.post(`${BASE_URL}/compare`, { accommodationIds });
    return response.data;
  },
};