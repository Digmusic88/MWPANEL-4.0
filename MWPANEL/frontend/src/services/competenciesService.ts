/**
 * @archivo: competenciesService.ts
 * @módulo: Services (Competencias)
 * @función: Servicio para gestión del sistema de competencias educativas
 * @crítico: SÍ - Núcleo del sistema de evaluación competencial
 * @dependencias: apiClient, tipos competencias
 * @relacionado_con: Sistema de evaluación formativa, DUA, situaciones de aprendizaje
 */

import { apiClient } from './apiClient';

// Types for Competencies System
export interface ExitProfile {
  id: string;
  code: string;
  name: string;
  description: string;
  stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA';
  operativeDescriptors: OperativeDescriptor[];
  createdAt: string;
  updatedAt: string;
}

export interface OperativeDescriptor {
  id: string;
  code: string;
  description: string;
  exitProfileId: string;
  cycle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpecificCompetency {
  id: string;
  name: string;
  description: string;
  code: string;
  subjectId: string;
  educationalLevelId: string;
  exitProfileId: string;
  evaluationCriteria: EvaluationCriterion[];
  basicKnowledge: BasicKnowledge[];
  createdAt: string;
  updatedAt: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  educationalLevel?: {
    id: string;
    name: string;
    stage: string;
  };
  exitProfile?: ExitProfile;
}

export interface EvaluationCriterion {
  id: string;
  description: string;
  code: string;
  specificCompetencyId: string;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface BasicKnowledge {
  id: string;
  description: string;
  code: string;
  specificCompetencyId: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetencyFilters {
  stage?: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA';
  subjectId?: string;
  educationalLevelId?: string;
  exitProfileId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CompetencyStats {
  totalSpecificCompetencies: number;
  totalEvaluationCriteria: number;
  totalBasicKnowledge: number;
  distribution: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  recentlyUpdated: SpecificCompetency[];
}

/**
 * Servicio para gestión del sistema de competencias educativas
 * Incluye Perfil de Salida, Competencias Específicas, Criterios de Evaluación y Saberes Básicos
 */
class CompetenciesService {
  private readonly baseUrl = '/competencies';
  
  constructor() {
    console.log('[CompetenciesService] Constructor - baseUrl:', this.baseUrl);
  }

  // ========== COMPETENCIAS CLAVE ==========

  /**
   * Obtener las 8 competencias clave
   */
  async getKeyCompetencies(): Promise<any[]> {
    try {
      // Use the full competencies endpoint path
      console.log('[CompetenciesService] getKeyCompetencies - Getting key competencies');
      const response = await apiClient.get(`${this.baseUrl}`);
      console.log('[CompetenciesService] getKeyCompetencies - Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CompetenciesService] getKeyCompetencies - Error:', error);
      return [];
    }
  }

  // ========== PERFIL DE SALIDA ==========

  /**
   * Obtener todos los perfiles de salida
   */
  async getExitProfiles(stage?: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA'): Promise<ExitProfile[]> {
    // Backend now supports stage parameter filtering
    const params = stage ? { stage } : {};
    const response = await apiClient.get(`${this.baseUrl}/exit-profiles`, { params });
    return response.data;
  }

  /**
   * Obtener perfil de salida por ID
   */
  async getExitProfile(id: string): Promise<ExitProfile> {
    const response = await apiClient.get(`${this.baseUrl}/exit-profiles/${id}`);
    return response.data;
  }

  /**
   * Obtener descriptores operativos de un perfil de salida
   */
  async getOperativeDescriptors(exitProfileId: string, cycle?: string): Promise<OperativeDescriptor[]> {
    try {
      const params = { exitProfileId };
      if (cycle) params.cycle = cycle;
      const response = await apiClient.get(`${this.baseUrl}/operative-descriptors`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching operative descriptors:', error);
      return [];
    }
  }

  /**
   * Obtener descriptores operativos por competencia y etapa
   */
  async getOperativeDescriptorsByCompetencyAndStage(
    competencyId: string, 
    stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA'
  ): Promise<OperativeDescriptor[]> {
    try {
      // Primero obtener el perfil de salida correspondiente a la etapa
      const exitProfiles = await this.getExitProfiles(stage);
      if (exitProfiles.length === 0) return [];
      
      const exitProfileId = exitProfiles[0].id;
      
      // Luego obtener los descriptores filtrando por competencia
      const params = { 
        exitProfileId,
        competencyId 
      };
      const response = await apiClient.get(`${this.baseUrl}/operative-descriptors`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching operative descriptors by competency and stage:', error);
      return [];
    }
  }

  // ========== COMPETENCIAS ESPECÍFICAS ==========

  /**
   * Obtener competencias específicas con filtros
   */
  async getSpecificCompetencies(filters: CompetencyFilters = {}): Promise<{
    data: SpecificCompetency[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/specific-competencies`, { params: filters });
    return response.data;
  }

  /**
   * Obtener competencia específica por ID
   */
  async getSpecificCompetency(id: string): Promise<SpecificCompetency> {
    const response = await apiClient.get(`${this.baseUrl}/specific-competencies/${id}`);
    return response.data;
  }

  /**
   * Crear nueva competencia específica
   */
  async createSpecificCompetency(data: {
    name: string;
    description: string;
    code: string;
    subjectId: string;
    educationalLevelId: string;
    exitProfileId: string;
  }): Promise<SpecificCompetency> {
    const response = await apiClient.post(`${this.baseUrl}/specific-competencies`, data);
    return response.data;
  }

  /**
   * Actualizar competencia específica
   */
  async updateSpecificCompetency(id: string, data: Partial<{
    name: string;
    description: string;
    code: string;
    subjectId: string;
    educationalLevelId: string;
    exitProfileId: string;
  }>): Promise<SpecificCompetency> {
    const response = await apiClient.put(`${this.baseUrl}/specific-competencies/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar competencia específica
   */
  async deleteSpecificCompetency(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/specific-competencies/${id}`);
  }

  // ========== CRITERIOS DE EVALUACIÓN ==========

  /**
   * Obtener criterios de evaluación de una competencia específica
   */
  async getEvaluationCriteria(specificCompetencyId: string): Promise<EvaluationCriterion[]> {
    const response = await apiClient.get(`${this.baseUrl}/specific-competencies/${specificCompetencyId}/criteria`);
    return response.data;
  }

  /**
   * Crear nuevo criterio de evaluación
   */
  async createEvaluationCriterion(specificCompetencyId: string, data: {
    description: string;
    code: string;
    weight: number;
  }): Promise<EvaluationCriterion> {
    const response = await apiClient.post(
      `${this.baseUrl}/specific-competencies/${specificCompetencyId}/criteria`,
      data
    );
    return response.data;
  }

  /**
   * Actualizar criterio de evaluación
   */
  async updateEvaluationCriterion(id: string, data: Partial<{
    description: string;
    code: string;
    weight: number;
  }>): Promise<EvaluationCriterion> {
    const response = await apiClient.put(`${this.baseUrl}/evaluation-criteria/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar criterio de evaluación
   */
  async deleteEvaluationCriterion(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/evaluation-criteria/${id}`);
  }

  // ========== SABERES BÁSICOS ==========

  /**
   * Obtener saberes básicos de una competencia específica
   */
  async getBasicKnowledge(specificCompetencyId: string): Promise<BasicKnowledge[]> {
    const response = await apiClient.get(`${this.baseUrl}/specific-competencies/${specificCompetencyId}/knowledge`);
    return response.data;
  }

  /**
   * Crear nuevo saber básico
   */
  async createBasicKnowledge(specificCompetencyId: string, data: {
    description: string;
    code: string;
    category: string;
  }): Promise<BasicKnowledge> {
    const response = await apiClient.post(
      `${this.baseUrl}/specific-competencies/${specificCompetencyId}/knowledge`,
      data
    );
    return response.data;
  }

  /**
   * Actualizar saber básico
   */
  async updateBasicKnowledge(id: string, data: Partial<{
    description: string;
    code: string;
    category: string;
  }>): Promise<BasicKnowledge> {
    const response = await apiClient.put(`${this.baseUrl}/basic-knowledge/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar saber básico
   */
  async deleteBasicKnowledge(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/basic-knowledge/${id}`);
  }

  // ========== ESTADÍSTICAS Y ANALYTICS ==========

  /**
   * Obtener estadísticas del sistema de competencias
   */
  async getCompetencyStats(filters?: {
    stage?: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA';
    subjectId?: string;
  }): Promise<CompetencyStats> {
    const response = await apiClient.get(`${this.baseUrl}/stats`, { params: filters });
    return response.data;
  }

  // ========== VALIDACIONES Y UTILIDADES ==========

  /**
   * Validar código único de competencia específica
   */
  async validateCompetencyCode(code: string, excludeId?: string): Promise<{ isValid: boolean; message?: string }> {
    const response = await apiClient.post(`${this.baseUrl}/validate-code`, {
      code,
      excludeId
    });
    return response.data;
  }

  /**
   * Obtener plantillas de competencias por etapa educativa
   */
  async getCompetencyTemplates(stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA'): Promise<{
    exitProfiles: ExitProfile[];
    suggestedStructure: {
      subjects: string[];
      competenciesPerSubject: number;
      criteriaPerCompetency: number;
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/templates/${stage}`);
    return response.data;
  }

  /**
   * Exportar competencias a Excel
   */
  async exportCompetencies(filters: CompetencyFilters = {}): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/export`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Importar competencias desde Excel
   */
  async importCompetencies(file: File): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
    warnings: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  }
}

export const competenciesService = new CompetenciesService();
export default competenciesService;