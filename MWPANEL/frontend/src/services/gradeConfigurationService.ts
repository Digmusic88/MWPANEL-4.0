/**
 * @archivo: gradeConfigurationService.ts
 * @módulo: Frontend Services
 * @función: Servicio para gestionar configuraciones de ponderaciones de calificaciones
 * @crítico: SÍ - API para configuración del sistema de evaluación
 * @actualizado: Julio 2025 - Implementación nueva
 */

import apiClient from './apiClient';

export interface WeightConfiguration {
  [key: string]: {
    weight: number;
    enabled: boolean;
    minimumItems: number;
    scale: string;  // Campo requerido, no opcional
  };
}

export interface GradeConfiguration {
  id: string;
  teacherId: string;
  subjectId: string;
  courseId?: string;
  educationalLevelId: string;
  weightConfiguration: WeightConfiguration;
  defaultScale: string;
  roundingPolicy: string;
  passingGrade: number;
  minimumGrade: number;
  maximumGrade: number;
  useAcademicPeriods: boolean;
  academicPeriods: string[];
  notifyGradeUpdates: boolean;
  notifyFamilies: boolean;
  requireJustificationBelowPassing: boolean;
  enableAIAssessments: boolean;
  aiAssessmentWeight: number;
  aiAutoApprove: boolean;
  includeInReports: boolean;
  allowFamilyAccess: boolean;
  showDetailedBreakdown: boolean;
  customSettings?: any;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeConfigurationDto {
  teacherId: string;
  subjectId: string;
  courseId?: string;
  educationalLevelId: string;
  weightConfiguration: WeightConfiguration;
  defaultScale?: string;
  roundingPolicy?: string;
  passingGrade?: number;
  enableAIAssessments?: boolean;
}

export interface UpdateGradeConfigurationDto {
  weightConfiguration?: WeightConfiguration;
  defaultScale?: string;
  roundingPolicy?: string;
  passingGrade?: number;
  enableAIAssessments?: boolean;
  notes?: string;
}

class GradeConfigurationService {
  private baseUrl = '/grade-configurations';

  /**
   * Crear nueva configuración de ponderaciones
   */
  async createGradeConfiguration(data: CreateGradeConfigurationDto): Promise<GradeConfiguration> {
    const response = await apiClient.post<GradeConfiguration>(this.baseUrl, data);
    return response.data;
  }

  /**
   * Obtener configuraciones de ponderaciones del profesor actual
   */
  async getGradeConfigurations(params?: {
    teacherId?: string;
    subjectId?: string;
    educationalLevelId?: string;
  }): Promise<GradeConfiguration[]> {
    const response = await apiClient.get<GradeConfiguration[]>(this.baseUrl, { params });
    return response.data;
  }

  /**
   * Obtener configuración específica por ID
   */
  async getGradeConfigurationById(id: string): Promise<GradeConfiguration> {
    const response = await apiClient.get<GradeConfiguration>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Obtener configuración por teacher + subject
   */
  async getGradeConfigurationByTeacherAndSubject(
    teacherId: string,
    subjectId: string,
    courseId?: string
  ): Promise<GradeConfiguration | null> {
    try {
      const configurations = await this.getGradeConfigurations({
        teacherId,
        subjectId,
      });
      
      // Buscar configuración que coincida con el curso si se proporciona
      const match = configurations.find(config => 
        courseId ? config.courseId === courseId : !config.courseId
      );
      
      return match || null;
    } catch (error) {
      console.error('Error fetching grade configuration:', error);
      return null;
    }
  }

  /**
   * Actualizar configuración de ponderaciones
   */
  async updateGradeConfiguration(
    id: string,
    data: UpdateGradeConfigurationDto
  ): Promise<GradeConfiguration> {
    // 🔍 DEBUG: Log data being sent to backend
    console.log('🔍 [GradeConfigService] UPDATE Data being sent:', JSON.stringify(data, null, 2));
    if (data.weightConfiguration) {
      console.log('🔍 [GradeConfigService] Weight config details:');
      Object.entries(data.weightConfiguration).forEach(([key, config]) => {
        console.log(`  ${key}:`, {
          weight: config.weight,
          enabled: config.enabled,
          minimumItems: config.minimumItems,
          scale: config.scale || 'MISSING!',
          hasScale: !!config.scale
        });
      });
    }
    
    const response = await apiClient.put<GradeConfiguration>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar configuración de ponderaciones
   */
  async deleteGradeConfiguration(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Validar configuración de ponderaciones
   */
  validateWeightConfiguration(weights: WeightConfiguration): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Calcular peso total de componentes habilitados
    const enabledComponents = Object.entries(weights).filter(([, config]) => config.enabled);
    const totalWeight = enabledComponents.reduce((sum, [, config]) => sum + config.weight, 0);
    
    // Validar que los pesos sumen 100%
    if (Math.abs(totalWeight - 100) > 0.1) {
      errors.push(`Los pesos deben sumar 100%. Actual: ${totalWeight.toFixed(1)}%`);
    }
    
    // Validar que al menos un componente esté habilitado
    if (enabledComponents.length === 0) {
      errors.push('Debe haber al menos un componente de calificación habilitado');
    }
    
    // Validar rangos de peso
    enabledComponents.forEach(([componentKey, config]) => {
      if (config.weight < 0 || config.weight > 100) {
        errors.push(`El peso de ${componentKey} debe estar entre 0% y 100%`);
      }
      if (config.minimumItems < 1) {
        errors.push(`El número mínimo de elementos para ${componentKey} debe ser al menos 1`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Crear configuración por defecto para un profesor y materia
   */
  getDefaultWeightConfiguration(): WeightConfiguration {
    return {
      tasks: {
        weight: 40,
        enabled: true,
        minimumItems: 3,
        scale: 'numeric_0_100',
      },
      activities: {
        weight: 30,
        enabled: true,
        minimumItems: 5,
        scale: 'numeric_0_100',
      },
      evaluations: {
        weight: 20,
        enabled: true,
        minimumItems: 1,
        scale: 'competency_1_5',
      },
      rubrics: {
        weight: 10,
        enabled: true,
        minimumItems: 1,
        scale: 'rubric_based',
      },
      participation: {
        weight: 0,
        enabled: false,
        minimumItems: 10,
        scale: 'numeric_0_100',
      },
      ai_assessments: {
        weight: 0,
        enabled: false,
        minimumItems: 1,
        scale: 'numeric_0_100',
      },
    };
  }

  /**
   * Convertir configuración a formato de creación
   */
  prepareConfigurationForCreation(
    teacherId: string,
    subjectId: string,
    educationalLevelId: string,
    weightConfiguration: WeightConfiguration,
    courseId?: string
  ): CreateGradeConfigurationDto {
    return {
      teacherId,
      subjectId,
      educationalLevelId,
      courseId,
      weightConfiguration,
      defaultScale: 'numeric_0_100',
      roundingPolicy: 'round_half_up',
      passingGrade: 50.0,
      enableAIAssessments: weightConfiguration.ai_assessments?.enabled || false,
    };
  }
}

export const gradeConfigurationService = new GradeConfigurationService();