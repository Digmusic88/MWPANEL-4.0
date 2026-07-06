/**
 * @archivo: learningSituationsService.ts
 * @módulo: Services (Situaciones de Aprendizaje)
 * @función: Servicio para gestión de situaciones de aprendizaje del sistema competencial
 * @crítico: SÍ - Metodología pedagógica del sistema LOMLOE
 * @dependencias: apiClient, competenciesService
 * @relacionado_con: Evaluación formativa, competencias específicas, DUA
 */

import { apiClient } from './apiClient';
import { SpecificCompetency } from './competenciesService';

// Types for Learning Situations
export interface LearningSituation {
  id: string;
  title: string;
  description: string;
  context: string;
  challenge: string;
  startDate: string;
  endDate: string;
  estimatedSessions: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  methodologies: string[];
  resources: string[];
  spaces: string[];
  expectedProducts: string[];
  duaAdaptations: {
    multipleRepresentations: string[];
    multipleActions: string[];
    multipleEngagements: string[];
  } | null;
  assessmentTools: string[];
  successCriteria: {
    criterion: string;
    weight: number;
  }[] | null;
  sharedWith: string[] | null;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Relaciones
  teacherId: string;
  classGroupId: string;
  subjectId: string;
  teacher?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  classGroup?: {
    id: string;
    name: string;
    academicYear: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  specificCompetencies?: SpecificCompetency[];
  assessments?: LearningSituationAssessment[];
}

export interface LearningSituationAssessment {
  id: string;
  learningSituationId: string;
  studentId: string;
  competencyId: string;
  criterionId: string;
  score: number;
  observations: string;
  evidences: string[];
  assessmentDate: string;
  teacher?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  student?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

export interface CreateLearningSituationData {
  title: string;
  description: string;
  context: string;
  challenge: string;
  startDate: string;
  endDate: string;
  estimatedSessions: number;
  methodologies: string[];
  resources: string[];
  spaces: string[];
  expectedProducts: string[];
  duaAdaptations?: {
    multipleRepresentations: string[];
    multipleActions: string[];
    multipleEngagements: string[];
  };
  assessmentTools: string[];
  successCriteria?: {
    criterion: string;
    weight: number;
  }[];
  classGroupId: string;
  subjectId: string;
  competencyIds: string[];
  isTemplate?: boolean;
}

export interface UpdateLearningSituationData extends Partial<CreateLearningSituationData> {
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  sharedWith?: string[];
}

export interface LearningSituationFilters {
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  teacherId?: string;
  classGroupId?: string;
  subjectId?: string;
  competencyId?: string;
  isTemplate?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface LearningSituationStats {
  total: number;
  byStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
  bySubject: {
    subjectName: string;
    count: number;
    avgSessions: number;
  }[];
  recentlyCreated: LearningSituation[];
  mostUsedMethodologies: {
    methodology: string;
    count: number;
  }[];
  avgSessionsPerSituation: number;
  competencyCoverage: {
    totalCompetencies: number;
    coveredCompetencies: number;
    percentage: number;
  };
}

/**
 * Servicio para gestión de situaciones de aprendizaje
 * Metodología pedagógica central del sistema competencial LOMLOE
 */
class LearningSituationsService {
  private readonly baseUrl = '/learning-situations';

  // ========== CRUD BÁSICO ==========

  /**
   * Obtener situaciones de aprendizaje con filtros y paginación
   */
  async getLearningSituations(filters: LearningSituationFilters = {}): Promise<{
    data: LearningSituation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await apiClient.get(this.baseUrl, { params: filters });
    return response.data;
  }

  /**
   * Obtener situación de aprendizaje por ID con relaciones completas
   */
  async getLearningSituation(id: string): Promise<LearningSituation> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Crear nueva situación de aprendizaje
   */
  async createLearningSituation(data: CreateLearningSituationData): Promise<LearningSituation> {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data;
  }

  /**
   * Actualizar situación de aprendizaje
   */
  async updateLearningSituation(id: string, data: UpdateLearningSituationData): Promise<LearningSituation> {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar situación de aprendizaje
   */
  async deleteLearningSituation(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // ========== GESTIÓN DE ESTADO ==========

  /**
   * Cambiar estado de situación de aprendizaje
   */
  async updateStatus(id: string, status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'): Promise<LearningSituation> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}/status`, { status });
    return response.data;
  }

  /**
   * Activar situación de aprendizaje (cambiar de DRAFT a ACTIVE)
   */
  async activateLearningSituation(id: string): Promise<LearningSituation> {
    return this.updateStatus(id, 'ACTIVE');
  }

  /**
   * Completar situación de aprendizaje
   */
  async completeLearningSituation(id: string): Promise<LearningSituation> {
    return this.updateStatus(id, 'COMPLETED');
  }

  /**
   * Archivar situación de aprendizaje
   */
  async archiveLearningSituation(id: string): Promise<LearningSituation> {
    return this.updateStatus(id, 'ARCHIVED');
  }

  // ========== COMPETENCIAS Y EVALUACIÓN ==========

  /**
   * Actualizar competencias específicas asociadas
   */
  async updateCompetencies(id: string, competencyIds: string[]): Promise<LearningSituation> {
    const response = await apiClient.put(`${this.baseUrl}/${id}/competencies`, { competencyIds });
    return response.data;
  }

  /**
   * Obtener evaluaciones de una situación de aprendizaje
   */
  async getAssessments(id: string, filters?: {
    studentId?: string;
    competencyId?: string;
  }): Promise<LearningSituationAssessment[]> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/assessments`, { params: filters });
    return response.data;
  }

  /**
   * Crear evaluación de situación de aprendizaje
   */
  async createAssessment(learningSituationId: string, data: {
    studentId: string;
    competencyId: string;
    criterionId: string;
    score: number;
    observations: string;
    evidences?: string[];
  }): Promise<LearningSituationAssessment> {
    const response = await apiClient.post(`${this.baseUrl}/${learningSituationId}/assessments`, data);
    return response.data;
  }

  /**
   * Actualizar evaluación
   */
  async updateAssessment(assessmentId: string, data: Partial<{
    score: number;
    observations: string;
    evidences: string[];
  }>): Promise<LearningSituationAssessment> {
    const response = await apiClient.put(`${this.baseUrl}/assessments/${assessmentId}`, data);
    return response.data;
  }

  /**
   * Eliminar evaluación
   */
  async deleteAssessment(assessmentId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/assessments/${assessmentId}`);
  }

  // ========== COLABORACIÓN Y COMPARTIR ==========

  /**
   * Compartir situación con otros profesores
   */
  async shareWithTeachers(id: string, teacherIds: string[]): Promise<LearningSituation> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/share`, { teacherIds });
    return response.data;
  }

  /**
   * Dejar de compartir con un profesor
   */
  async unshareWithTeacher(id: string, teacherId: string): Promise<LearningSituation> {
    const response = await apiClient.delete(`${this.baseUrl}/${id}/share/${teacherId}`);
    return response.data;
  }

  /**
   * Obtener situaciones compartidas conmigo
   */
  async getSharedWithMe(): Promise<LearningSituation[]> {
    const response = await apiClient.get(`${this.baseUrl}/shared-with-me`);
    return response.data;
  }

  /**
   * Convertir situación en plantilla
   */
  async convertToTemplate(id: string): Promise<LearningSituation> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/convert-to-template`);
    return response.data;
  }

  /**
   * Clonar situación desde plantilla
   */
  async cloneFromTemplate(templateId: string, data: {
    title: string;
    classGroupId: string;
    startDate: string;
    endDate: string;
  }): Promise<LearningSituation> {
    const response = await apiClient.post(`${this.baseUrl}/clone/${templateId}`, data);
    return response.data;
  }

  // ========== PLANTILLAS ==========

  /**
   * Obtener plantillas disponibles
   */
  async getTemplates(filters?: {
    subjectId?: string;
    createdBy?: string;
    search?: string;
  }): Promise<LearningSituation[]> {
    const response = await apiClient.get(`${this.baseUrl}/templates`, { params: filters });
    return response.data;
  }

  /**
   * Obtener plantillas públicas del sistema
   */
  async getSystemTemplates(): Promise<LearningSituation[]> {
    const response = await apiClient.get(`${this.baseUrl}/system-templates`);
    return response.data;
  }

  // ========== ESTADÍSTICAS Y ANALYTICS ==========

  /**
   * Obtener estadísticas de situaciones de aprendizaje
   */
  async getStats(filters?: {
    teacherId?: string;
    classGroupId?: string;
    subjectId?: string;
    academicYear?: string;
  }): Promise<LearningSituationStats> {
    const response = await apiClient.get(`${this.baseUrl}/stats`, { params: filters });
    return response.data;
  }

  /**
   * Obtener progreso de una situación de aprendizaje
   */
  async getProgress(id: string): Promise<{
    totalStudents: number;
    assessedStudents: number;
    avgScore: number;
    completionPercentage: number;
    competencyProgress: {
      competencyId: string;
      competencyName: string;
      avgScore: number;
      assessedStudents: number;
    }[];
    timeline: {
      date: string;
      assessments: number;
      avgScore: number;
    }[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/progress`);
    return response.data;
  }

  // ========== BÚSQUEDA Y FILTROS ==========

  /**
   * Búsqueda avanzada de situaciones de aprendizaje
   */
  async search(query: string, filters?: {
    status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
    subjectId?: string;
    competencyId?: string;
    methodology?: string;
    includeShared?: boolean;
    includeTemplates?: boolean;
  }): Promise<{
    situations: LearningSituation[];
    templates: LearningSituation[];
    total: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/search`, {
      params: { query, ...filters }
    });
    return response.data;
  }

  /**
   * Obtener metodologías más utilizadas
   */
  async getPopularMethodologies(): Promise<{
    methodology: string;
    count: number;
    description?: string;
  }[]> {
    const response = await apiClient.get(`${this.baseUrl}/popular-methodologies`);
    return response.data;
  }

  /**
   * Obtener recursos más utilizados
   */
  async getPopularResources(): Promise<{
    resource: string;
    count: number;
    category?: string;
  }[]> {
    const response = await apiClient.get(`${this.baseUrl}/popular-resources`);
    return response.data;
  }

  // ========== VALIDACIONES ==========

  /**
   * Validar título único de situación
   */
  async validateTitle(title: string, excludeId?: string): Promise<{
    isValid: boolean;
    message?: string;
    suggestions?: string[];
  }> {
    const response = await apiClient.post(`${this.baseUrl}/validate-title`, {
      title,
      excludeId
    });
    return response.data;
  }

  /**
   * Validar fechas de situación
   */
  async validateDates(startDate: string, endDate: string, classGroupId: string): Promise<{
    isValid: boolean;
    conflicts?: {
      situationId: string;
      title: string;
      startDate: string;
      endDate: string;
    }[];
    message?: string;
  }> {
    const response = await apiClient.post(`${this.baseUrl}/validate-dates`, {
      startDate,
      endDate,
      classGroupId
    });
    return response.data;
  }

  // ========== EXPORTACIÓN E IMPORTACIÓN ==========

  /**
   * Exportar situaciones a PDF
   */
  async exportToPdf(id: string): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/export/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Exportar múltiples situaciones a Excel
   */
  async exportToExcel(filters: LearningSituationFilters = {}): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/export/excel`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Duplicar situación de aprendizaje
   */
  async duplicate(id: string, data: {
    title: string;
    classGroupId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LearningSituation> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/duplicate`, data);
    return response.data;
  }
}

export const learningSituationsService = new LearningSituationsService();
export default learningSituationsService;