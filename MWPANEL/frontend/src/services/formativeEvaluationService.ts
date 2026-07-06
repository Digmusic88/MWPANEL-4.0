/**
 * @archivo: formativeEvaluationService.ts
 * @módulo: Services (Evaluación Formativa)
 * @función: Servicio para gestión de observaciones formativas y seguimiento continuo
 * @crítico: SÍ - Núcleo del sistema de evaluación continua competencial
 * @dependencias: apiClient, competenciesService
 * @relacionado_con: Competencias específicas, DUA, situaciones de aprendizaje
 */

import { apiClient } from './apiClient';
import { SpecificCompetency } from './competenciesService';

// Types for Formative Evaluation
export interface FormativeObservation {
  id: string;
  studentId: string;
  teacherId: string;
  specificCompetencyId: string;
  evaluationCriterionId?: string;
  learningSituationId?: string;
  classGroupId: string;
  observationDateTime: string;
  context: string;
  observedBehavior: string;
  progressIndicator: 'EMERGING' | 'DEVELOPING' | 'ACHIEVING' | 'EXCEEDING';
  notes?: string;
  evidences: string[];
  isSignificant: boolean;
  requiresFollowUp: boolean;
  followUpNotes?: string;
  tags: string[];
  visibility: 'TEACHER_ONLY' | 'FAMILY_VISIBLE' | 'STUDENT_VISIBLE';
  createdAt: string;
  updatedAt: string;

  // Relaciones
  student?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  teacher?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  specificCompetency?: SpecificCompetency;
  evaluationCriterion?: {
    id: string;
    description: string;
    code: string;
  };
  learningSituation?: {
    id: string;
    title: string;
  };
  classGroup?: {
    id: string;
    name: string;
  };
}

export interface CreateObservationData {
  studentId: string;
  specificCompetencyId: string;
  evaluationCriterionId?: string;
  learningSituationId?: string;
  classGroupId: string;
  context: string;
  observedBehavior: string;
  progressIndicator: 'EMERGING' | 'DEVELOPING' | 'ACHIEVING' | 'EXCEEDING';
  notes?: string;
  evidences?: string[];
  isSignificant?: boolean;
  requiresFollowUp?: boolean;
  followUpNotes?: string;
  tags?: string[];
  visibility?: 'TEACHER_ONLY' | 'FAMILY_VISIBLE' | 'STUDENT_VISIBLE';
}

export interface UpdateObservationData extends Partial<CreateObservationData> {
  observationDateTime?: string;
}

export interface ObservationFilters {
  studentId?: string;
  teacherId?: string;
  specificCompetencyId?: string;
  evaluationCriterionId?: string;
  learningSituationId?: string;
  classGroupId?: string;
  progressIndicator?: 'EMERGING' | 'DEVELOPING' | 'ACHIEVING' | 'EXCEEDING';
  isSignificant?: boolean;
  requiresFollowUp?: boolean;
  visibility?: 'TEACHER_ONLY' | 'FAMILY_VISIBLE' | 'STUDENT_VISIBLE';
  startDate?: string;
  endDate?: string;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface StudentProgress {
  studentId: string;
  student: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  totalObservations: number;
  recentObservations: FormativeObservation[];
  competencyProgress: {
    competencyId: string;
    competencyName: string;
    totalObservations: number;
    latestProgress: 'EMERGING' | 'DEVELOPING' | 'ACHIEVING' | 'EXCEEDING';
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';
    avgProgressScore: number;
    observationsByIndicator: {
      EMERGING: number;
      DEVELOPING: number;
      ACHIEVING: number;
      EXCEEDING: number;
    };
  }[];
  timeline: {
    date: string;
    observations: number;
    avgProgressScore: number;
    significantObservations: number;
  }[];
  followUpItems: {
    observationId: string;
    competencyName: string;
    notes: string;
    date: string;
  }[];
  strongAreas: string[];
  improvementAreas: string[];
}

export interface TeacherDashboard {
  totalObservations: number;
  observationsThisWeek: number;
  studentsObserved: number;
  significantObservations: number;
  followUpRequired: number;
  recentObservations: FormativeObservation[];
  competencyCoverage: {
    totalCompetencies: number;
    observedCompetencies: number;
    percentage: number;
  };
  progressDistribution: {
    EMERGING: number;
    DEVELOPING: number;
    ACHIEVING: number;
    EXCEEDING: number;
  };
  activeStudents: {
    studentId: string;
    studentName: string;
    lastObservation: string;
    totalObservations: number;
    avgProgress: number;
  }[];
  alertsAndReminders: {
    type: 'FOLLOW_UP' | 'INACTIVITY' | 'CONCERNING_TREND';
    message: string;
    studentId?: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}

export interface CompetencyAnalysis {
  competencyId: string;
  competencyName: string;
  totalObservations: number;
  studentsObserved: number;
  avgProgressScore: number;
  progressDistribution: {
    EMERGING: number;
    DEVELOPING: number;
    ACHIEVING: number;
    EXCEEDING: number;
  };
  timeline: {
    date: string;
    observations: number;
    avgScore: number;
  }[];
  studentPerformance: {
    studentId: string;
    studentName: string;
    observations: number;
    latestProgress: string;
    trend: string;
  }[];
  improvementSuggestions: string[];
}

/**
 * Servicio para gestión de evaluación formativa
 * Sistema de observaciones continuas para seguimiento del progreso competencial
 */
class FormativeEvaluationService {
  private readonly baseUrl = '/formative-evaluation';

  // ========== CRUD OBSERVACIONES ==========

  /**
   * Obtener observaciones formativas con filtros
   */
  async getObservations(filters: ObservationFilters = {}): Promise<{
    data: FormativeObservation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/observations`, { params: filters });
    return response.data;
  }

  /**
   * Obtener observación por ID
   */
  async getObservation(id: string): Promise<FormativeObservation> {
    const response = await apiClient.get(`${this.baseUrl}/observations/${id}`);
    return response.data;
  }

  /**
   * Crear nueva observación formativa
   */
  async createObservation(data: CreateObservationData): Promise<FormativeObservation> {
    const response = await apiClient.post(`${this.baseUrl}/observations`, data);
    return response.data;
  }

  /**
   * Actualizar observación existente
   */
  async updateObservation(id: string, data: UpdateObservationData): Promise<FormativeObservation> {
    const response = await apiClient.put(`${this.baseUrl}/observations/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar observación
   */
  async deleteObservation(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/observations/${id}`);
  }

  // ========== PROGRESO DEL ESTUDIANTE ==========

  /**
   * Obtener progreso completo de un estudiante
   */
  async getStudentProgress(
    studentId: string,
    filters?: {
      competencyId?: string;
      startDate?: string;
      endDate?: string;
      includeTimeline?: boolean;
    }
  ): Promise<StudentProgress> {
    const response = await apiClient.get(`${this.baseUrl}/students/${studentId}/progress`, { params: filters });
    return response.data;
  }

  /**
   * Obtener progreso de múltiples estudiantes (vista profesor)
   */
  async getMultipleStudentsProgress(
    studentIds: string[],
    filters?: {
      competencyId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<StudentProgress[]> {
    const response = await apiClient.post(`${this.baseUrl}/students/progress`, {
      studentIds,
      ...filters
    });
    return response.data;
  }

  /**
   * Obtener progreso de una clase completa
   */
  async getClassProgress(
    classGroupId: string,
    filters?: {
      competencyId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    classGroup: {
      id: string;
      name: string;
      academicYear: string;
    };
    studentsProgress: StudentProgress[];
    classSummary: {
      totalObservations: number;
      avgProgressScore: number;
      progressDistribution: {
        EMERGING: number;
        DEVELOPING: number;
        ACHIEVING: number;
        EXCEEDING: number;
      };
      competencyCoverage: {
        totalCompetencies: number;
        observedCompetencies: number;
        percentage: number;
      };
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/classes/${classGroupId}/progress`, { params: filters });
    return response.data;
  }

  // ========== DASHBOARD PROFESOR ==========

  /**
   * Obtener dashboard completo del profesor
   */
  async getTeacherDashboard(filters?: {
    classGroupId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TeacherDashboard> {
    const response = await apiClient.get(`${this.baseUrl}/teacher/dashboard`, { params: filters });
    return response.data;
  }

  /**
   * Obtener observaciones recientes del profesor
   */
  async getRecentObservations(limit: number = 10): Promise<FormativeObservation[]> {
    const response = await apiClient.get(`${this.baseUrl}/teacher/recent-observations`, {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Obtener estudiantes que requieren seguimiento
   */
  async getStudentsRequiringFollowUp(): Promise<{
    studentId: string;
    studentName: string;
    observationId: string;
    competencyName: string;
    followUpNotes: string;
    observationDate: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[]> {
    const response = await apiClient.get(`${this.baseUrl}/teacher/follow-up-required`);
    return response.data;
  }

  // ========== ANÁLISIS DE COMPETENCIAS ==========

  /**
   * Obtener análisis detallado de una competencia específica
   */
  async getCompetencyAnalysis(
    competencyId: string,
    filters?: {
      classGroupId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<CompetencyAnalysis> {
    const response = await apiClient.get(`${this.baseUrl}/competencies/${competencyId}/analysis`, { params: filters });
    return response.data;
  }

  /**
   * Comparar progreso entre competencias
   */
  async compareCompetencies(
    competencyIds: string[],
    filters?: {
      classGroupId?: string;
      studentId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    competencies: CompetencyAnalysis[];
    comparison: {
      mostDeveloped: { competencyId: string; competencyName: string; avgScore: number };
      leastDeveloped: { competencyId: string; competencyName: string; avgScore: number };
      trends: {
        competencyId: string;
        trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
        changePercent: number;
      }[];
    };
  }> {
    const response = await apiClient.post(`${this.baseUrl}/competencies/compare`, {
      competencyIds,
      ...filters
    });
    return response.data;
  }

  // ========== BÚSQUEDA Y FILTROS ==========

  /**
   * Búsqueda avanzada de observaciones
   */
  async searchObservations(query: string, filters?: {
    studentId?: string;
    competencyId?: string;
    progressIndicator?: string;
    isSignificant?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    observations: FormativeObservation[];
    total: number;
    highlights: {
      observationId: string;
      matchingText: string;
    }[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/search`, {
      params: { query, ...filters }
    });
    return response.data;
  }

  /**
   * Obtener tags más utilizados
   */
  async getPopularTags(): Promise<{
    tag: string;
    count: number;
    category?: string;
  }[]> {
    const response = await apiClient.get(`${this.baseUrl}/popular-tags`);
    return response.data;
  }

  /**
   * Sugerir tags basados en el contexto
   */
  async suggestTags(context: string, observedBehavior: string): Promise<string[]> {
    const response = await apiClient.post(`${this.baseUrl}/suggest-tags`, {
      context,
      observedBehavior
    });
    return response.data;
  }

  // ========== EVIDENCIAS ==========

  /**
   * Subir evidencia para una observación
   */
  async uploadEvidence(observationId: string, file: File): Promise<{
    url: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/observations/${observationId}/evidence`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  }

  /**
   * Eliminar evidencia de una observación
   */
  async deleteEvidence(observationId: string, evidenceUrl: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/observations/${observationId}/evidence`, {
      data: { evidenceUrl }
    });
  }

  // ========== ESTADÍSTICAS Y REPORTES ==========

  /**
   * Obtener estadísticas generales del sistema formativo
   */
  async getFormativeStats(filters?: {
    teacherId?: string;
    classGroupId?: string;
    subjectId?: string;
    academicYear?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalObservations: number;
    totalStudents: number;
    avgObservationsPerStudent: number;
    progressDistribution: {
      EMERGING: number;
      DEVELOPING: number;
      ACHIEVING: number;
      EXCEEDING: number;
    };
    observationTrends: {
      date: string;
      count: number;
      significantCount: number;
    }[];
    mostActiveTeachers: {
      teacherId: string;
      teacherName: string;
      observationCount: number;
    }[];
    competencyMastery: {
      competencyId: string;
      competencyName: string;
      masteryPercentage: number;
    }[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/stats`, { params: filters });
    return response.data;
  }

  /**
   * Generar reporte de progreso estudiantil
   */
  async generateStudentReport(
    studentId: string,
    format: 'PDF' | 'EXCEL',
    filters?: {
      startDate?: string;
      endDate?: string;
      includeCompetencies?: string[];
    }
  ): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/students/${studentId}/report`, {
      params: { format, ...filters },
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Generar reporte de clase
   */
  async generateClassReport(
    classGroupId: string,
    format: 'PDF' | 'EXCEL',
    filters?: {
      startDate?: string;
      endDate?: string;
      includeCompetencies?: string[];
    }
  ): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/classes/${classGroupId}/report`, {
      params: { format, ...filters },
      responseType: 'blob'
    });
    return response.data;
  }

  // ========== VALIDACIONES ==========

  /**
   * Validar observación antes de guardar
   */
  async validateObservation(data: CreateObservationData): Promise<{
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    const response = await apiClient.post(`${this.baseUrl}/validate-observation`, data);
    return response.data;
  }

  /**
   * Verificar duplicados potenciales
   */
  async checkDuplicates(data: {
    studentId: string;
    specificCompetencyId: string;
    context: string;
    observedBehavior: string;
  }): Promise<{
    hasPotentialDuplicates: boolean;
    similarObservations: {
      id: string;
      similarity: number;
      observationDateTime: string;
      context: string;
      observedBehavior: string;
    }[];
  }> {
    const response = await apiClient.post(`${this.baseUrl}/check-duplicates`, data);
    return response.data;
  }

  // ========== NOTIFICACIONES Y SEGUIMIENTO ==========

  /**
   * Marcar observación como revisada
   */
  async markAsReviewed(observationId: string): Promise<FormativeObservation> {
    const response = await apiClient.patch(`${this.baseUrl}/observations/${observationId}/reviewed`);
    return response.data;
  }

  /**
   * Configurar recordatorios de seguimiento
   */
  async setFollowUpReminder(observationId: string, reminderDate: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/observations/${observationId}/reminder`, {
      reminderDate
    });
  }

  /**
   * Obtener recordatorios pendientes
   */
  async getPendingReminders(): Promise<{
    observationId: string;
    studentName: string;
    competencyName: string;
    reminderDate: string;
    followUpNotes: string;
  }[]> {
    const response = await apiClient.get(`${this.baseUrl}/teacher/pending-reminders`);
    return response.data;
  }
}

export const formativeEvaluationService = new FormativeEvaluationService();
export default formativeEvaluationService;