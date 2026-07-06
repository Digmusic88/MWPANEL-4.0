import { useState, useEffect } from 'react';
import apiClient from '@services/apiClient';
import { message } from 'antd';
import { unifiedGradingService, UnifiedGrade, StudentUnifiedGrades } from '@services/unifiedGradingService';

export interface SubjectGrade {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherFirstName?: string | null;
  teacherLastName?: string | null;
  totalEvaluations?: number; // Total count of all evaluations (exams + tasks + activities)
  averageGrade: number | null;
  taskAverage?: number | null;
  activityAverage?: number | null;
  competencyAverage?: number | null;
  examAverage?: number | null; // Test Yourself average
  gradedTasks: number;
  pendingTasks: number;
  examGradedCount?: number; // Number of graded Test Yourself exams
  examPendingCount?: number; // Number of pending Test Yourself exams
  activityAssessments: number;
  lastUpdated: Date | null;
}

export interface GradeDetail {
  id: string;
  type: 'task' | 'activity' | 'evaluation' | 'exam';
  title: string;
  grade: number;
  maxGrade: number;
  weight?: number;
  gradedAt: Date;
  feedback?: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

export interface StudentGrades {
  student: {
    id: string;
    enrollmentNumber: string;
    firstName: string;
    lastName: string;
    classGroup?: {
      id: string;
      name: string;
    };
    educationalLevel?: {
      id: string;
      name: string;
    };
    user?: {
      id: string;
      profile?: {
        avatar?: string;
      };
    };
  };
  summary: {
    overallAverage: number;
    totalSubjects: number;
    totalGradedItems: number;
    totalPendingTasks: number;
    lastActivityDate?: Date;
  };
  subjectGrades: SubjectGrade[];
  recentGrades: GradeDetail[];
  academicPeriod: {
    current: string;
    year: string;
  };
}

export interface ClassGrades {
  classGroup: {
    id: string;
    name: string;
    level: string;
    course: string;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  students: Array<{
    id: string;
    enrollmentNumber: string;
    firstName: string;
    lastName: string;
    grades: {
      taskAverage: number;
      activityAverage: number;
      testYourselfAverage?: number;
      overallAverage: number;
      gradedTasks: number;
      pendingTasks: number;
      lastActivity?: Date;
    };
  }>;
  statistics: {
    classAverage: number;
    highestGrade: number;
    lowestGrade: number;
    passingRate: number;
  };
}

const useGrades = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get student grades
  const getStudentGrades = async (studentId: string): Promise<StudentGrades | null> => {
    // Validate studentId to prevent undefined API calls
    if (!studentId || studentId === 'undefined' || studentId === 'null') {
      console.warn('getStudentGrades called with invalid studentId:', studentId);
      console.trace('Stack trace for getStudentGrades with undefined:');
      setError('ID de estudiante no válido');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/grades/student/${studentId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar calificaciones';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get my grades (student)
  const getMyGrades = async (academicYearId?: string): Promise<StudentGrades | null> => {
    try {
      setLoading(true);
      setError(null);
      const query = academicYearId ? `?academicYearId=${academicYearId}` : '';
      const response = await apiClient.get(`/grades/my-grades${query}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar mis calificaciones';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get family children grades
  const getFamilyChildrenGrades = async (): Promise<StudentGrades[]> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/grades/family/children');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar calificaciones de los hijos';
      setError(errorMessage);
      message.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get specific child grades (family)
  const getFamilyChildGrades = async (
    studentId: string,
    academicYearId?: string,
  ): Promise<StudentGrades | null> => {
    try {
      setLoading(true);
      setError(null);
      const query = academicYearId ? `?academicYearId=${academicYearId}` : '';
      const response = await apiClient.get(`/grades/family/child/${studentId}${query}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar calificaciones del hijo';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get class grades (teacher)
  const getClassGrades = async (classGroupId: string, subjectId: string): Promise<ClassGrades | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/grades/teacher/class/${classGroupId}/subject/${subjectId}`);
      
      console.log('📊 Class grades data from backend:', response.data);
      return response.data || null;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar calificaciones de la clase';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get teacher classes summary
  const getTeacherClassesSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/grades/teacher/my-classes');
      
      return response.data || [];
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar resumen de clases';
      setError(errorMessage);
      message.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get school overview (admin)
  const getSchoolGradesOverview = async (filters?: {
    levelId?: string;
    courseId?: string;
    classGroupId?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters?.levelId) params.append('levelId', filters.levelId);
      if (filters?.courseId) params.append('courseId', filters.courseId);
      if (filters?.classGroupId) params.append('classGroupId', filters.classGroupId);
      
      const response = await apiClient.get(`/grades/admin/overview?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar resumen de calificaciones';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Export student grades as PDF
  const exportStudentGrades = async (studentId: string, period?: string) => {
    try {
      setLoading(true);
      const params = period ? `?period=${period}` : '';
      const response = await apiClient.get(`/grades/export/student/${studentId}${params}`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `calificaciones-${studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Calificaciones exportadas exitosamente');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al exportar calificaciones';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // MÉTODOS DEL SISTEMA UNIFICADO (INTEGRADOS)
  // =====================================================

  // Obtener calificaciones unificadas del estudiante
  const getStudentUnifiedGrades = async (studentId: string, filters?: any): Promise<StudentUnifiedGrades | null> => {
    try {
      setLoading(true);
      setError(null);
      return await unifiedGradingService.getStudentGrades(studentId, filters);
    } catch (error: any) {
      const errorMessage = error.message || 'Error al cargar calificaciones unificadas';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Obtener mis calificaciones unificadas (estudiante logueado)
  const getMyUnifiedGrades = async (filters?: any): Promise<StudentUnifiedGrades | null> => {
    try {
      setLoading(true);
      setError(null);
      // Obtener el estudiante actual desde el contexto de auth
      const currentUser = await apiClient.get('/auth/me');
      if (currentUser.data?.student?.id) {
        return await unifiedGradingService.getStudentGrades(currentUser.data.student.id, filters);
      }
      throw new Error('No se pudo identificar al estudiante actual');
    } catch (error: any) {
      const errorMessage = error.message || 'Error al cargar mis calificaciones unificadas';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Obtener promedio ponderado en sistema unificado
  const getUnifiedWeightedAverage = async (
    studentId: string, 
    subjectId: string, 
    academicYearId?: string, 
    evaluationPeriod?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      return await unifiedGradingService.getWeightedAverage(studentId, subjectId, academicYearId, evaluationPeriod);
    } catch (error: any) {
      const errorMessage = error.message || 'Error al calcular promedio ponderado';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Obtener análisis de rendimiento del estudiante
  const getStudentAnalytics = async (studentId: string, academicYearId?: string) => {
    try {
      setLoading(true);
      setError(null);
      return await unifiedGradingService.getStudentAnalytics(studentId, academicYearId);
    } catch (error: any) {
      const errorMessage = error.message || 'Error al obtener análisis del estudiante';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Convertir calificación legacy a sistema unificado
  const convertLegacyGrade = async (originalValue: number, originalScale: string = 'numeric_100') => {
    try {
      setLoading(true);
      setError(null);
      return await unifiedGradingService.convertLegacyGrade(originalValue, originalScale);
    } catch (error: any) {
      const errorMessage = error.message || 'Error en conversión de calificación';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FUNCIONES DE UTILIDAD PARA COMPATIBILIDAD
  // =====================================================

  // Adaptar datos legacy al nuevo sistema
  const adaptLegacyGradeToUnified = (legacyGrade: SubjectGrade) => {
    return {
      original_value: legacyGrade.averageGrade,
      hundred_scale_value: legacyGrade.averageGrade, // Asumir que ya está en base 100
      quality_level: unifiedGradingService.getQualityLabel(legacyGrade.averageGrade),
      color: unifiedGradingService.getGradeColor(legacyGrade.averageGrade),
      progress_status: unifiedGradingService.getProgressStatus(legacyGrade.averageGrade),
    };
  };

  // Obtener colores y etiquetas usando el nuevo sistema
  const getGradeColor = (value: number) => unifiedGradingService.getGradeColor(value);
  const getQualityLabel = (value: number) => unifiedGradingService.getQualityLabel(value);
  const getProgressStatus = (value: number) => unifiedGradingService.getProgressStatus(value);

  return {
    // Métodos existentes (compatibilidad hacia atrás)
    loading,
    error,
    getStudentGrades,
    getMyGrades,
    getFamilyChildrenGrades,
    getFamilyChildGrades,
    getClassGrades,
    getTeacherClassesSummary,
    getSchoolGradesOverview,
    exportStudentGrades,
    
    // Nuevos métodos del sistema unificado
    getStudentUnifiedGrades,
    getMyUnifiedGrades,
    getUnifiedWeightedAverage,
    getStudentAnalytics,
    convertLegacyGrade,
    
    // Funciones de utilidad
    adaptLegacyGradeToUnified,
    getGradeColor,
    getQualityLabel,
    getProgressStatus,
  };
};

export default useGrades;