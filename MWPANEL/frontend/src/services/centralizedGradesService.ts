/**
 * @archivo: centralizedGradesService.ts
 * @módulo: Frontend Services
 * @función: Servicio para integración con API de calificaciones centralizadas
 * @crítico: SÍ - Servicio principal para datos reales
 * @actualizado: Julio 2025 - Integración completa con backend
 */

import apiClient from './apiClient';

// Interfaces locales (coinciden con backend)
export interface CentralizedGrade {
  id: string;
  studentId: string;
  student: {
    id: string;
    fullName: string;
    enrollmentNumber: string;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  finalGrade: number;
  achievementLevel: string;
  isPassing: boolean;
  trend: 'accelerating' | 'steady' | 'concerning';
  needsAttention: boolean;
  breakdown: GradeBreakdown[];
  metrics: GradeMetrics;
  aiInsights?: AIInsights;
  teacherComments?: string;
  lastUpdate: string;
  status: 'draft' | 'provisional' | 'final' | 'archived';
}

export interface GradeBreakdown {
  component: string;
  rawScore: number;
  normalizedScore: number;
  weight: number;
  weightedScore: number;
  itemCount: number;
  confidence: number;
}

export interface GradeMetrics {
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  averageScore: number;
  dataQuality: number;
}

export interface AIInsights {
  overallAssessment: string;
  strengthAreas: string[];
  improvementAreas: string[];
  recommendations: string[];
  competencyAlignment?: any;
  learningProgress?: any;
  generatedAt: string;
  modelVersion: string;
}

export interface GradeConfiguration {
  id: string;
  teacherId: string;
  subjectId: string;
  courseId?: string;
  educationalLevelId: string;
  weightConfiguration: any;
  defaultScale: string;
  passingGrade: number;
  enableAIAssessments: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherSummary {
  teacherId: string;
  teacher: {
    id: string;
    fullName: string;
  };
  totalStudents: number;
  totalSubjects: number;
  averageGrade: number;
  pendingGrades: number;
  needsAttentionCount: number;
  subjectSummaries: ClassSummary[];
  isEmpty?: boolean;
  message?: string;
}

export interface ClassSummary {
  classGroup?: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  subjectAssignmentId?: string;
  assignment?: {
    id: string;
    classGroup: {
      id: string;
      name: string;
    };
  };
  studentCount: number;
  averageGrade: number | null;
  passingRate: number | null;
  lastUpdate?: string;
}

export interface CalculationRequest {
  studentId: string;
  subjectAssignmentId: string;
  period?: string;
  forceRecalculation?: boolean;
  includeAI?: boolean;
}

export interface BulkCalculationRequest {
  subjectAssignmentId: string;
  studentIds?: string[];
  period?: string;
  forceRecalculation?: boolean;
  includeAI?: boolean;
}

export interface PublishRequest {
  gradeIds: string[];
  comments?: string;
  notifyFamilies?: boolean;
  targetStatus: 'provisional' | 'final';
}

export interface ReportGenerationRequest {
  type: 'individual' | 'class' | 'summary';
  format: 'pdf' | 'excel';
  studentId?: string;
  subjectAssignmentId?: string;
  period?: string;
  includeAI?: boolean;
}

class CentralizedGradesService {
  private baseUrl = '/centralized-grades';

  /**
   * Obtiene resumen del profesor (clases y asignaturas)
   */
  async getTeacherSummary(teacherId: string): Promise<TeacherSummary> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/teacher/${teacherId}/summary`);
      const data = response.data;
      
      // Defensive programming - ensure required fields exist
      return {
        teacher: data?.teacher ?? { id: teacherId, name: 'Profesor desconocido' },
        period: data?.period ?? 'all',
        totalSubjects: data?.totalSubjects ?? 0,
        totalStudents: data?.totalStudents ?? 0,
        overallAverage: data?.overallAverage ?? 0,
        subjectSummaries: data?.subjectSummaries ?? [],
        isEmpty: data?.isEmpty ?? true,
        message: data?.message ?? 'No hay datos disponibles'
      };
    } catch (error) {
      console.error('Error al obtener resumen del profesor:', error);
      // Return safe fallback data instead of throwing
      return {
        teacher: { id: teacherId, name: 'Profesor desconocido' },
        period: 'all',
        totalSubjects: 0,
        totalStudents: 0,
        overallAverage: 0,
        subjectSummaries: [],
        isEmpty: true,
        message: 'Error al cargar datos del profesor'
      };
    }
  }

  /**
   * Obtiene calificaciones de una clase específica
   */
  async getClassGrades(subjectAssignmentId: string, period?: string): Promise<CentralizedGrade[]> {
    console.log('🚀 FRONTEND SERVICE: getClassGrades called', { subjectAssignmentId, period });
    
    // VALIDATION: Check input parameters
    if (!subjectAssignmentId || typeof subjectAssignmentId !== 'string') {
      console.error('❌ INVALID subjectAssignmentId in service:', subjectAssignmentId);
      throw new Error('ID de asignatura inválido');
    }
    
    const params = period ? { period } : {};
    const url = `${this.baseUrl}/class/${subjectAssignmentId}`;
    console.log('🚀 FRONTEND SERVICE: Making request to', url);
    
    try {
      const response = await apiClient.get(url, { params });
      
      console.log('🚀 FRONTEND SERVICE: Received response', response.data);
      
      // VALIDATION: Check if response is valid
      if (!response || !response.data) {
        console.error('❌ EMPTY RESPONSE from API');
        throw new Error('Respuesta vacía del servidor');
      }
      
      const data = response.data;
      
      // VALIDATION: Check response structure
      if (!data || typeof data !== 'object') {
        console.error('❌ INVALID response data type:', typeof data);
        throw new Error('Formato de respuesta inválido');
      }
      
      // Backend returns { grades: [...], statistics: {...} }
      // We need to extract and transform the grades array
      if (!data.grades || !Array.isArray(data.grades)) {
        console.warn('⚠️ Invalid response structure from backend:', data);
        // If there's no grades array but response is successful, return empty array
        return [];
      }
      
      console.log('📊 PROCESSING', data.grades.length, 'grades from backend');
      
      // Transform backend structure to frontend CentralizedGrade interface
      const transformedGrades = data.grades.map((grade: any, index: number) => {
        try {
          // VALIDATION: Check if grade object is valid
          if (!grade || typeof grade !== 'object') {
            console.warn(`⚠️ Invalid grade object at index ${index}:`, grade);
            return null;
          }
          
          // VALIDATION: Check if student data is valid
          if (!grade.student || typeof grade.student !== 'object' || !grade.student.id) {
            console.warn(`⚠️ Invalid student data at index ${index}:`, grade.student);
            return null;
          }
          
          return {
            id: `${grade.student.id}-${subjectAssignmentId}`, // Generate ID from student + assignment
            studentId: grade.student.id,
            student: {
              id: grade.student.id,
              fullName: grade.student.fullName || 'Sin nombre',
              enrollmentNumber: grade.student.enrollmentNumber || '',
            },
            subject: {
              id: subjectAssignmentId, // Use assignment as subject reference
              name: '', // Will be filled from context
              code: '', // Will be filled from context
            },
            finalGrade: (grade.finalGrade !== null && typeof grade.finalGrade === 'number') ? grade.finalGrade : 0,
            achievementLevel: grade.achievementLevel || 'Sin datos',
            isPassing: grade.isPassing || false,
            needsAttention: grade.needsAttention || false,
            trend: grade.trend || 'steady',
            lastUpdate: grade.lastUpdate || new Date().toISOString(),
            hasData: grade.hasData || false,
            breakdown: Array.isArray(grade.breakdown) ? grade.breakdown : [],
            metrics: grade.metrics || { totalItems: 0, completedItems: 0, pendingItems: 0, averageScore: 0, dataQuality: 0 },
            status: grade.status || 'draft'
            // Removed spread operator to prevent overriding cleaned finalGrade
          };
        } catch (transformError) {
          console.error(`❌ Error transforming grade at index ${index}:`, transformError, grade);
          return null;
        }
      });
      
      // Filter out null entries from transformation errors
      const validGrades = transformedGrades.filter(grade => grade !== null);
      
      console.log('✅ SUCCESSFULLY TRANSFORMED', validGrades.length, 'valid grades out of', data.grades.length);
      
      return validGrades;
      
    } catch (error) {
      console.error('❌ API ERROR in getClassGrades:', error);
      
      // Re-throw with more specific error message
      if (error?.response?.status === 404) {
        throw new Error('No se encontraron calificaciones para esta clase');
      } else if (error?.response?.status === 403) {
        throw new Error('No tienes permisos para acceder a estas calificaciones');
      } else if (error?.response?.status >= 500) {
        throw new Error('Error del servidor. Inténtalo de nuevo');
      } else if (error?.message?.includes('Network Error')) {
        throw new Error('Error de conexión. Verifica tu conexión a internet');
      } else {
        throw error; // Re-throw original error
      }
    }
  }

  /**
   * Obtiene calificaciones detalladas de una clase específica (con estudiantes)
   */
  async getClassDetailedGrades(subjectAssignmentId: string, period?: string): Promise<any> {
    const params = period ? { period } : {};
    const response = await apiClient.get(`${this.baseUrl}/class/${subjectAssignmentId}`, { params });
    return response.data;
  }

  /**
   * Obtiene el breakdown detallado de un estudiante específico
   */
  async getStudentGradeBreakdown(
    studentId: string, 
    subjectAssignmentId: string, 
    period?: string
  ): Promise<any> {
    const params = period ? { period } : {};
    const response = await apiClient.get(
      `${this.baseUrl}/student/${studentId}/breakdown/${subjectAssignmentId}`, 
      { params }
    );
    return response.data;
  }

  /**
   * Obtiene calificación de un estudiante específico
   */
  async getStudentGrade(
    studentId: string, 
    subjectAssignmentId: string, 
    period?: string
  ): Promise<CentralizedGrade> {
    const params = { subjectAssignmentId, ...(period ? { period } : {}) };
    const response = await apiClient.get(`${this.baseUrl}/student/${studentId}`, { params });
    return response.data;
  }

  /**
   * Calcula calificación centralizada individual
   */
  async calculateGrade(request: CalculationRequest): Promise<CentralizedGrade> {
    console.log('🚀 CALCULATE GRADE - Request payload:', JSON.stringify(request, null, 2));
    console.log('🚀 CALCULATE GRADE - StudentId:', request.studentId);
    console.log('🚀 CALCULATE GRADE - SubjectAssignmentId:', request.subjectAssignmentId);
    
    const response = await apiClient.post(`${this.baseUrl}/calculate`, request);
    return response.data;
  }

  /**
   * Calcula calificaciones en lote
   */
  async bulkCalculateGrades(request: BulkCalculationRequest): Promise<{
    processed: number;
    errors: number;
    results: CentralizedGrade[];
  }> {
    const response = await apiClient.post(`${this.baseUrl}/calculate/bulk`, request);
    return response.data;
  }

  /**
   * Publica calificaciones
   */
  async publishGrades(request: PublishRequest): Promise<{
    published: number;
    errors: number;
    failedGrades: string[];
  }> {
    const response = await apiClient.post(`${this.baseUrl}/publish`, request);
    return response.data;
  }

  /**
   * Obtiene configuración de calificaciones
   */
  async getGradeConfiguration(
    teacherId: string,
    subjectId: string,
    educationalLevelId?: string
  ): Promise<GradeConfiguration> {
    const params = { teacherId, subjectId, ...(educationalLevelId ? { educationalLevelId } : {}) };
    const response = await apiClient.get(`${this.baseUrl}/configurations`, { params });
    return response.data;
  }

  /**
   * Crea o actualiza configuración de calificaciones
   */
  async saveGradeConfiguration(config: Partial<GradeConfiguration>): Promise<GradeConfiguration> {
    if (config.id) {
      const response = await apiClient.put(`${this.baseUrl}/configurations/${config.id}`, config);
      return response.data;
    } else {
      const response = await apiClient.post(`${this.baseUrl}/configurations`, config);
      return response.data;
    }
  }

  /**
   * Elimina configuración de calificaciones
   */
  async deleteGradeConfiguration(configId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/configurations/${configId}`);
  }

  /**
   * Obtiene lista de configuraciones para un profesor
   */
  async getTeacherConfigurations(teacherId: string): Promise<GradeConfiguration[]> {
    const response = await apiClient.get(`${this.baseUrl}/configurations/teacher/${teacherId}`);
    return response.data;
  }

  /**
   * Genera reporte
   */
  async generateReport(request: ReportGenerationRequest): Promise<Blob> {
    const response = await apiClient.post(`${this.baseUrl}/reports/generate`, request, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Obtiene datos para dashboard de analytics
   */
  async getAnalyticsDashboard(
    teacherId: string,
    period?: string
  ): Promise<{
    summary: any;
    trends: any;
    distributions: any;
    alerts: any[];
  }> {
    const params = { teacherId, ...(period ? { period } : {}) };
    const response = await apiClient.get(`${this.baseUrl}/analytics/dashboard`, { params });
    return response.data;
  }

  /**
   * Actualiza comentarios de profesor
   */
  async updateTeacherComments(
    gradeId: string,
    comments: string
  ): Promise<CentralizedGrade> {
    const response = await apiClient.patch(`${this.baseUrl}/${gradeId}/comments`, { comments });
    return response.data;
  }

  /**
   * Cambia estado de calificación
   */
  async updateGradeStatus(
    gradeId: string,
    status: 'draft' | 'provisional' | 'final' | 'archived'
  ): Promise<CentralizedGrade> {
    const response = await apiClient.patch(`${this.baseUrl}/${gradeId}/status`, { status });
    return response.data;
  }

  /**
   * Fuerza recálculo de todas las calificaciones de un profesor
   */
  async forceFullRecalculation(teacherId: string): Promise<{
    processed: number;
    errors: number;
  }> {
    const response = await apiClient.post(`${this.baseUrl}/force-recalculation`, { teacherId });
    return response.data;
  }

  /**
   * Obtiene historial de cambios de una calificación
   */
  async getGradeHistory(gradeId: string): Promise<any[]> {
    const response = await apiClient.get(`${this.baseUrl}/${gradeId}/history`);
    return response.data;
  }
}

export const centralizedGradesService = new CentralizedGradesService();