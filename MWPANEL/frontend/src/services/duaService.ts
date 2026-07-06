/**
 * @archivo: duaService.ts
 * @módulo: Services (DUA - Diseño Universal para el Aprendizaje)
 * @función: Servicio para gestión del sistema DUA y acomodaciones educativas
 * @crítico: SÍ - Sistema de accesibilidad y adaptaciones pedagógicas
 * @dependencias: apiClient, formativeEvaluationService
 * @relacionado_con: Evaluación formativa, competencias, situaciones de aprendizaje
 */

import { apiClient } from './apiClient';

// Types for DUA System
export interface DuaProfile {
  id: string;
  studentId: string;
  isActive: boolean;
  educationalNeeds: EducationalNeedType[];
  supportLevel: SupportLevel;
  representationPreferences: {
    visualPreferred?: boolean;
    auditoryPreferred?: boolean;
    kinestheticPreferred?: boolean;
    needsVisualSupports?: boolean;
    needsSimplifiedText?: boolean;
    preferredFontSize?: number;
    needsHighContrast?: boolean;
    needsColorCoding?: boolean;
  };
  expressionPreferences: {
    preferredResponseFormat?: 'written' | 'oral' | 'digital' | 'visual' | 'mixed';
    needsExtendedTime?: boolean;
    timeExtensionFactor?: number;
    preferredOutputTools?: string[];
    needsAlternativeAssessment?: boolean;
  };
  engagementPreferences: {
    needsFrequentFeedback?: boolean;
    preferredGroupSize?: 'individual' | 'small' | 'large' | 'mixed';
    needsMovementBreaks?: boolean;
    preferredRewards?: string[];
    needsAnxietySupport?: boolean;
    motivationalFactors?: string[];
  };
  strengthsAndInterests: {
    strengths?: string[];
    interests?: string[];
    motivators?: string[];
    learningStyle?: string;
  };
  clinicalInfo?: {
    diagnosis?: string[];
    medications?: string[];
    therapies?: string[];
    medicalRecommendations?: string[];
  };
  effectivenessHistory?: {
    successfulStrategies?: string[];
    unsuccessfulStrategies?: string[];
    parentalFeedback?: string[];
    studentFeedback?: string[];
  };
  createdAt: string;
  updatedAt: string;
  lastReviewDate?: string;
  
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
}

export interface DuaAccommodation {
  id: string;
  duaProfileId: string;
  category: AccommodationCategory;
  type: AccommodationType;
  name: string;
  description: string;
  specifications: {
    timeMultiplier?: number;
    fontSize?: number;
    speechRate?: number;
    breakFrequency?: number;
    groupSize?: number;
    specificInstructions?: string;
  };
  applicability: {
    subjects?: string[];
    activities?: string[];
    evaluations?: string[];
    environments?: string[];
  };
  status: AccommodationStatus;
  startDate: string;
  endDate?: string;
  isTemporary: boolean;
  approvedBy?: string;
  approvalDate?: string;
  effectivenessData?: {
    isEffective?: boolean;
    effectivenessScore?: number;
    lastReviewDate?: string;
    reviewNotes?: string;
    metrics?: {
      beforeScore?: number;
      afterScore?: number;
      improvementPercentage?: number;
    };
  };
  implementationNotes?: {
    requiredResources?: string[];
    trainingNeeded?: string[];
    estimatedCost?: number;
    implementationDifficulty?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  createdAt: string;
  updatedAt: string;
  
  // Relaciones
  duaProfile?: DuaProfile;
  approver?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

export enum EducationalNeedType {
  DYSLEXIA = 'DYSLEXIA',
  DYSCALCULIA = 'DYSCALCULIA',
  DYSGRAPHIA = 'DYSGRAPHIA',
  ADHD = 'ADHD',
  ASD = 'ASD',
  VISUAL_DISABILITY = 'VISUAL_DISABILITY',
  HEARING_DISABILITY = 'HEARING_DISABILITY',
  MOTOR_DISABILITY = 'MOTOR_DISABILITY',
  INTELLECTUAL_DISABILITY = 'INTELLECTUAL_DISABILITY',
  GIFTEDNESS = 'GIFTEDNESS',
  HIGH_ABILITIES = 'HIGH_ABILITIES',
  LANGUAGE_BARRIER = 'LANGUAGE_BARRIER',
  SOCIO_EMOTIONAL = 'SOCIO_EMOTIONAL',
  OTHER = 'OTHER'
}

export enum SupportLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  INTENSIVE = 'INTENSIVE'
}

export enum AccommodationCategory {
  PRESENTATION = 'PRESENTATION',
  RESPONSE = 'RESPONSE',
  SETTING = 'SETTING',
  TIMING_SCHEDULING = 'TIMING_SCHEDULING'
}

export enum AccommodationType {
  ENLARGED_TEXT = 'ENLARGED_TEXT',
  AUDIO_VERSION = 'AUDIO_VERSION',
  VISUAL_SUPPORTS = 'VISUAL_SUPPORTS',
  SIMPLIFIED_LANGUAGE = 'SIMPLIFIED_LANGUAGE',
  COLOR_CODING = 'COLOR_CODING',
  EXTENDED_TIME = 'EXTENDED_TIME',
  FREQUENT_BREAKS = 'FREQUENT_BREAKS',
  ORAL_RESPONSE = 'ORAL_RESPONSE',
  ASSISTIVE_TECHNOLOGY = 'ASSISTIVE_TECHNOLOGY',
  ALTERNATIVE_FORMAT = 'ALTERNATIVE_FORMAT',
  QUIET_ENVIRONMENT = 'QUIET_ENVIRONMENT',
  PREFERENTIAL_SEATING = 'PREFERENTIAL_SEATING',
  SMALL_GROUP = 'SMALL_GROUP',
  MOVEMENT_OPPORTUNITIES = 'MOVEMENT_OPPORTUNITIES',
  OTHER_ACCOMMODATION = 'OTHER_ACCOMMODATION'
}

export enum AccommodationStatus {
  PROPOSED = 'PROPOSED',
  APPROVED = 'APPROVED',
  IMPLEMENTED = 'IMPLEMENTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DISCONTINUED = 'DISCONTINUED'
}

export interface CreateDuaProfileData {
  studentId: string;
  educationalNeeds: EducationalNeedType[];
  supportLevel: SupportLevel;
  representationPreferences: DuaProfile['representationPreferences'];
  expressionPreferences: DuaProfile['expressionPreferences'];
  engagementPreferences: DuaProfile['engagementPreferences'];
  strengthsAndInterests: DuaProfile['strengthsAndInterests'];
  clinicalInfo?: DuaProfile['clinicalInfo'];
  effectivenessHistory?: DuaProfile['effectivenessHistory'];
}

export interface UpdateDuaProfileData extends Partial<CreateDuaProfileData> {
  isActive?: boolean;
  lastReviewDate?: string;
}

export interface CreateAccommodationData {
  duaProfileId: string;
  category: AccommodationCategory;
  type: AccommodationType;
  name: string;
  description: string;
  specifications: DuaAccommodation['specifications'];
  applicability: DuaAccommodation['applicability'];
  startDate: string;
  endDate?: string;
  isTemporary: boolean;
  implementationNotes?: DuaAccommodation['implementationNotes'];
}

export interface DuaFilters {
  studentId?: string;
  educationalNeed?: EducationalNeedType;
  supportLevel?: SupportLevel;
  isActive?: boolean;
  hasAccommodations?: boolean;
  lastReviewBefore?: string;
  lastReviewAfter?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AccommodationFilters {
  duaProfileId?: string;
  category?: AccommodationCategory;
  type?: AccommodationType;
  status?: AccommodationStatus;
  isTemporary?: boolean;
  isEffective?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DuaRecommendation {
  category: AccommodationCategory;
  type: AccommodationType;
  name: string;
  description: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  estimatedEffectiveness: number;
  requiredResources: string[];
  implementationComplexity: 'low' | 'medium' | 'high';
}

export interface DuaImpactAnalysis {
  student: {
    id: string;
    name: string;
  };
  duaProfile: DuaProfile;
  accommodations: DuaAccommodation[];
  impactMetrics: {
    beforeDuaScore: number;
    afterDuaScore: number;
    improvementPercentage: number;
    observationsPeriod: {
      total: number;
      beforeDua: number;
      afterDua: number;
    };
  };
  competencyProgress: {
    competencyId: string;
    competencyName: string;
    beforeScore: number;
    afterScore: number;
    improvement: number;
  }[];
  effectiveAccommodations: DuaAccommodation[];
  ineffectiveAccommodations: DuaAccommodation[];
  recommendations: string[];
}

/**
 * Servicio para gestión del sistema DUA (Diseño Universal para el Aprendizaje)
 * Gestiona perfiles de accesibilidad, acomodaciones y análisis de efectividad
 */
class DuaService {
  private readonly baseUrl = '/dua';

  // ========== PERFILES DUA ==========

  /**
   * Obtener perfiles DUA con filtros
   */
  async getProfiles(filters: DuaFilters = {}): Promise<{
    data: DuaProfile[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/profiles`, { params: filters });
    return response.data;
  }

  /**
   * Obtener perfil DUA por ID
   */
  async getProfile(id: string): Promise<DuaProfile> {
    const response = await apiClient.get(`${this.baseUrl}/profiles/${id}`);
    return response.data;
  }

  /**
   * Obtener perfil DUA de un estudiante específico
   */
  async getStudentProfile(studentId: string): Promise<DuaProfile | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/students/${studentId}/profile`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Crear nuevo perfil DUA
   */
  async createProfile(data: CreateDuaProfileData): Promise<DuaProfile> {
    const response = await apiClient.post(`${this.baseUrl}/profiles`, data);
    return response.data;
  }

  /**
   * Actualizar perfil DUA
   */
  async updateProfile(id: string, data: UpdateDuaProfileData): Promise<DuaProfile> {
    const response = await apiClient.put(`${this.baseUrl}/profiles/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar perfil DUA
   */
  async deleteProfile(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/profiles/${id}`);
  }

  /**
   * Activar/desactivar perfil DUA
   */
  async toggleProfileStatus(id: string, isActive: boolean): Promise<DuaProfile> {
    const response = await apiClient.patch(`${this.baseUrl}/profiles/${id}/status`, { isActive });
    return response.data;
  }

  // ========== ACOMODACIONES ==========

  /**
   * Obtener acomodaciones con filtros
   */
  async getAccommodations(filters: AccommodationFilters = {}): Promise<{
    data: DuaAccommodation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/accommodations`, { params: filters });
    return response.data;
  }

  /**
   * Obtener acomodación por ID
   */
  async getAccommodation(id: string): Promise<DuaAccommodation> {
    const response = await apiClient.get(`${this.baseUrl}/accommodations/${id}`);
    return response.data;
  }

  /**
   * Crear nueva acomodación
   */
  async createAccommodation(data: CreateAccommodationData): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${this.baseUrl}/accommodations`, data);
    return response.data;
  }

  /**
   * Actualizar acomodación
   */
  async updateAccommodation(id: string, data: Partial<CreateAccommodationData>): Promise<DuaAccommodation> {
    const response = await apiClient.put(`${this.baseUrl}/accommodations/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar acomodación
   */
  async deleteAccommodation(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/accommodations/${id}`);
  }

  // ========== WORKFLOW DE ACOMODACIONES ==========

  /**
   * Aprobar acomodación
   */
  async approveAccommodation(id: string, notes?: string): Promise<DuaAccommodation> {
    const response = await apiClient.patch(`${this.baseUrl}/accommodations/${id}/approve`, { notes });
    return response.data;
  }

  /**
   * Implementar acomodación
   */
  async implementAccommodation(id: string, implementationNotes?: string): Promise<DuaAccommodation> {
    const response = await apiClient.patch(`${this.baseUrl}/accommodations/${id}/implement`, { implementationNotes });
    return response.data;
  }

  /**
   * Descontinuar acomodación
   */
  async discontinueAccommodation(id: string, reason: string): Promise<DuaAccommodation> {
    const response = await apiClient.patch(`${this.baseUrl}/accommodations/${id}/discontinue`, { reason });
    return response.data;
  }

  /**
   * Revisar efectividad de acomodación
   */
  async reviewEffectiveness(id: string, data: {
    isEffective: boolean;
    effectivenessScore: number;
    reviewNotes: string;
    metrics?: {
      beforeScore: number;
      afterScore: number;
    };
  }): Promise<DuaAccommodation> {
    const response = await apiClient.patch(`${this.baseUrl}/accommodations/${id}/review`, data);
    return response.data;
  }

  /**
   * Enviar acomodación para aprobación
   */
  async submitForApproval(id: string): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${this.baseUrl}/accommodations/${id}/submit-approval`);
    return response.data;
  }

  /**
   * Rechazar acomodación
   */
  async rejectAccommodation(id: string, data: { reason: string; suggestions?: string[] }): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${this.baseUrl}/accommodations/${id}/reject`, data);
    return response.data;
  }

  /**
   * Activar acomodación
   */
  async activateAccommodation(id: string): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${this.baseUrl}/accommodations/${id}/activate`);
    return response.data;
  }

  /**
   * Suspender acomodación
   */
  async suspendAccommodation(id: string, reason: string): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${this.baseUrl}/accommodations/${id}/suspend`, { reason });
    return response.data;
  }

  /**
   * Obtener plantillas de acomodaciones
   */
  async getAccommodationTemplates(type?: AccommodationType): Promise<DuaAccommodation[]> {
    const params = type ? { type } : {};
    const response = await apiClient.get(`${this.baseUrl}/accommodations/templates`, { params });
    // El backend devuelve { templates: [...], categories: [...], types: [...] }
    // Extraemos solo los templates que es lo que espera el frontend
    return response.data.templates || [];
  }

  /**
   * Crear acomodación desde plantilla
   */
  async createFromTemplate(templateId: string, duaProfileId: string, customizations: any): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${this.baseUrl}/accommodations/templates/${templateId}/use`, {
      duaProfileId,
      customizations
    });
    return response.data;
  }

  /**
   * Crear registro de efectividad
   */
  async createEffectivenessRecord(data: any): Promise<any> {
    const response = await apiClient.post(`${this.baseUrl}/accommodations/effectiveness`, data);
    return response.data;
  }

  /**
   * Obtener registros de efectividad
   */
  async getEffectivenessRecords(filters?: any): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/accommodations/effectiveness/list`, { params: filters });
    return response.data;
  }

  /**
   * Obtener analytics de acomodaciones
   */
  async getAccommodationAnalytics(filters?: any): Promise<any> {
    const response = await apiClient.get(`${this.baseUrl}/accommodations/analytics/overview`, { params: filters });
    return response.data;
  }

  // ========== RECOMENDACIONES ==========

  /**
   * Generar recomendaciones de acomodaciones para un perfil
   */
  async generateRecommendations(profileId: string): Promise<DuaRecommendation[]> {
    const response = await apiClient.get(`${this.baseUrl}/profiles/${profileId}/recommendations`);
    return response.data;
  }

  /**
   * Obtener recomendaciones para un estudiante específico
   */
  async getStudentRecommendations(studentId: string): Promise<{
    hasProfile: boolean;
    profile?: DuaProfile;
    recommendations: DuaRecommendation[];
    suggestedProfileData?: Partial<CreateDuaProfileData>;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/students/${studentId}/recommendations`);
    return response.data;
  }

  /**
   * Aplicar recomendación como acomodación
   */
  async applyRecommendation(profileId: string, recommendation: DuaRecommendation): Promise<DuaAccommodation> {
    const response = await apiClient.post(`${this.baseUrl}/profiles/${profileId}/apply-recommendation`, {
      recommendation
    });
    return response.data;
  }

  // ========== ANÁLISIS DE IMPACTO ==========

  /**
   * Obtener análisis de impacto DUA para un estudiante
   */
  async getStudentImpact(studentId: string, filters?: {
    startDate?: string;
    endDate?: string;
    accommodationId?: string;
  }): Promise<DuaImpactAnalysis> {
    const response = await apiClient.get(`${this.baseUrl}/students/${studentId}/impact`, { params: filters });
    return response.data;
  }

  /**
   * Analizar efectividad de acomodaciones
   */
  async analyzeAccommodationEffectiveness(filters?: {
    profileId?: string;
    category?: AccommodationCategory;
    type?: AccommodationType;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalAccommodations: number;
    effectiveAccommodations: number;
    effectivenessRate: number;
    byCategory: {
      category: AccommodationCategory;
      total: number;
      effective: number;
      rate: number;
    }[];
    byType: {
      type: AccommodationType;
      total: number;
      effective: number;
      avgEffectivenessScore: number;
    }[];
    trends: {
      month: string;
      effectivenessRate: number;
      accommodationsReviewed: number;
    }[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/accommodations/effectiveness`, { params: filters });
    return response.data;
  }

  // ========== DASHBOARDS ==========

  /**
   * Obtener dashboard general DUA (administradores)
   */
  async getDashboardOverview(filters?: {
    academicYear?: string;
    educationalLevel?: string;
  }): Promise<{
    totalProfiles: number;
    activeProfiles: number;
    totalAccommodations: number;
    implementedAccommodations: number;
    effectivenessRate: number;
    needsDistribution: {
      need: EducationalNeedType;
      count: number;
      percentage: number;
    }[];
    supportLevelDistribution: {
      level: SupportLevel;
      count: number;
      percentage: number;
    }[];
    accommodationsByCategory: {
      category: AccommodationCategory;
      count: number;
      effectivenessRate: number;
    }[];
    recentActivity: {
      type: 'PROFILE_CREATED' | 'ACCOMMODATION_APPROVED' | 'EFFECTIVENESS_REVIEWED';
      description: string;
      date: string;
      studentName: string;
    }[];
    alerts: {
      type: 'REVIEW_DUE' | 'LOW_EFFECTIVENESS' | 'MISSING_PROFILE';
      message: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      studentId?: string;
    }[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/dashboard/overview`, { params: filters });
    return response.data;
  }

  /**
   * Obtener dashboard específico para profesores
   */
  async getTeacherDashboard(filters?: {
    classGroupId?: string;
  }): Promise<{
    myStudentsWithDua: number;
    pendingApprovals: number;
    effectivenessReviewsDue: number;
    studentsProgress: {
      studentId: string;
      studentName: string;
      hasProfile: boolean;
      accommodationsCount: number;
      lastReviewDate?: string;
      overallProgress: 'IMPROVING' | 'STABLE' | 'DECLINING';
    }[];
    recentObservations: {
      studentId: string;
      studentName: string;
      competencyName: string;
      progressIndicator: string;
      accommodationUsed?: string;
      date: string;
    }[];
    accommodationRequests: {
      id: string;
      studentName: string;
      type: AccommodationType;
      status: AccommodationStatus;
      requestDate: string;
    }[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/dashboard/teacher`, { params: filters });
    return response.data;
  }

  // ========== INTEGRACIÓN CON SITUACIONES DE APRENDIZAJE ==========

  /**
   * Generar plan DUA para una situación de aprendizaje específica
   */
  async generateLearningSituationPlan(
    learningSituationId: string,
    studentId?: string
  ): Promise<{
    learningSituation: {
      id: string;
      title: string;
      description: string;
    };
    student?: {
      id: string;
      name: string;
      duaProfile?: DuaProfile;
    };
    adaptations: {
      principle: 'REPRESENTATION' | 'ACTION_EXPRESSION' | 'ENGAGEMENT';
      adaptations: string[];
      specificAccommodations: DuaAccommodation[];
    }[];
    implementationPlan: {
      phase: string;
      activities: string[];
      accommodationsNeeded: string[];
      materials: string[];
    }[];
    assessmentAdaptations: {
      criterion: string;
      adaptations: string[];
      alternativeMethods: string[];
    }[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/learning-situations/${learningSituationId}/plan`, {
      params: studentId ? { studentId } : {}
    });
    return response.data;
  }

  // ========== BÚSQUEDA Y FILTROS ==========

  /**
   * Búsqueda avanzada en el sistema DUA
   */
  async search(query: string, filters?: {
    type?: 'profiles' | 'accommodations' | 'all';
    educationalNeed?: EducationalNeedType;
    supportLevel?: SupportLevel;
    category?: AccommodationCategory;
  }): Promise<{
    profiles: DuaProfile[];
    accommodations: DuaAccommodation[];
    total: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/search`, {
      params: { query, ...filters }
    });
    return response.data;
  }

  // ========== VALIDACIONES ==========

  /**
   * Validar datos de perfil DUA
   */
  async validateProfile(data: CreateDuaProfileData): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const response = await apiClient.post(`${this.baseUrl}/validate-profile`, data);
    return response.data;
  }

  /**
   * Validar acomodación
   */
  async validateAccommodation(data: CreateAccommodationData): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    conflicts: {
      accommodationId: string;
      reason: string;
    }[];
  }> {
    const response = await apiClient.post(`${this.baseUrl}/validate-accommodation`, data);
    return response.data;
  }

  // ========== EXPORTACIÓN E IMPORTACIÓN ==========

  /**
   * Exportar perfil DUA a PDF
   */
  async exportProfile(profileId: string): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/profiles/${profileId}/export`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Exportar informe de impacto a PDF
   */
  async exportImpactReport(studentId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/students/${studentId}/impact/export`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Importar plantilla de acomodaciones
   */
  async importAccommodationTemplate(file: File): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
    warnings: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/accommodations/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  }
}

export const duaService = new DuaService();
export default duaService;