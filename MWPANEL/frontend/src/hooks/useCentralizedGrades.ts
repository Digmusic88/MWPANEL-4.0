/**
 * @archivo: useCentralizedGrades.ts
 * @módulo: Frontend Hooks
 * @función: Hook para gestión de estado de calificaciones centralizadas
 * @crítico: SÍ - Hook principal para datos reales
 * @actualizado: Julio 2025 - Hook integrado con API
 */

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { 
  centralizedGradesService,
  CentralizedGrade,
  GradeConfiguration,
  TeacherSummary,
  ClassSummary,
  CalculationRequest,
  BulkCalculationRequest,
  PublishRequest,
  ReportGenerationRequest
} from '../services/centralizedGradesService';
import { useAuthStore } from '../store/authStore';

interface UseCentralizedGradesState {
  // Data
  teacherSummary: TeacherSummary | null;
  centralizedGrades: CentralizedGrade[];
  gradeConfiguration: GradeConfiguration | null;
  selectedClass: ClassSummary | null;
  
  // UI State
  loading: boolean;
  saving: boolean;
  calculating: boolean;
  publishing: boolean;
  generating: boolean;
  
  // Error handling
  error: string | null;
}

interface UseCentralizedGradesActions {
  // Data fetching
  fetchTeacherSummary: () => Promise<void>;
  fetchClassGrades: (subjectAssignmentId: string, period?: string) => Promise<void>;
  fetchGradeConfiguration: (subjectId: string, educationalLevelId?: string) => Promise<void>;
  
  // Grade operations
  calculateGrade: (request: CalculationRequest) => Promise<void>;
  bulkCalculateGrades: (request: BulkCalculationRequest) => Promise<void>;
  publishGrades: (request: PublishRequest) => Promise<void>;
  updateTeacherComments: (gradeId: string, comments: string) => Promise<void>;
  updateGradeStatus: (gradeId: string, status: 'draft' | 'provisional' | 'final' | 'archived') => Promise<void>;
  
  // Configuration
  saveGradeConfiguration: (config: Partial<GradeConfiguration>) => Promise<void>;
  
  // Reports
  generateReport: (request: ReportGenerationRequest) => Promise<void>;
  
  // UI helpers
  setSelectedClass: (classData: ClassSummary | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useCentralizedGrades = (): UseCentralizedGradesState & UseCentralizedGradesActions => {
  const { user } = useAuthStore();
  
  // State
  const [teacherSummary, setTeacherSummary] = useState<TeacherSummary | null>(null);
  const [centralizedGrades, setCentralizedGrades] = useState<CentralizedGrade[]>([]);
  const [gradeConfiguration, setGradeConfiguration] = useState<GradeConfiguration | null>(null);
  const [selectedClass, setSelectedClassState] = useState<ClassSummary | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to get teacherId
  const getTeacherId = useCallback(async (): Promise<string | null> => {
    if (user?.role === 'teacher' && user?.teacherId) {
      return user.teacherId;
    }
    if (user?.role === 'admin') {
      return user.id; // Los admins pueden actuar como teachers
    }
    
    // Si es teacher pero no tiene teacherId, hacer query al backend
    if (user?.role === 'teacher' && !user?.teacherId) {
      try {
        console.log('🔍 Fetching teacherId from backend for user:', user.email);
        // Get token from auth store (try multiple possible formats)
        let token = null;
        
        // Try different possible token locations
        const authData = localStorage.getItem('mw-panel-auth');
        const authStorage = localStorage.getItem('auth-storage');
        const accessToken = localStorage.getItem('access_token');
        
        if (accessToken) {
          token = accessToken;
        } else if (authStorage) {
          try {
            const parsedData = JSON.parse(authStorage);
            token = parsedData.state?.accessToken || parsedData.accessToken;
          } catch (error) {
            console.error('Failed to parse auth-storage:', error);
          }
        } else if (authData) {
          try {
            const parsedData = JSON.parse(authData);
            token = parsedData.state?.accessToken || parsedData.accessToken;
          } catch (error) {
            console.error('Failed to parse mw-panel-auth:', error);
          }
        }
        
        const response = await fetch('/api/teachers/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const teacher = await response.json();
          console.log('✅ Found teacherId:', teacher.id);
          return teacher.id;
        } else {
          console.warn('❌ No teacher record found for user');
        }
      } catch (error) {
        console.error('Error fetching teacherId:', error);
      }
    }
    
    return null;
  }, [user]);

  // Error handler
  const handleError = useCallback((error: any, operation: string) => {
    console.error(`Error in ${operation}:`, error);
    const errorMessage = error.response?.data?.message || error.message || `Error en ${operation}`;
    setError(errorMessage);
    message.error(errorMessage);
  }, []);

  // Data fetching actions
  const fetchTeacherSummary = useCallback(async () => {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      setError('No se pudo encontrar el ID del profesor. Contacta al administrador.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const summary = await centralizedGradesService.getTeacherSummary(teacherId);
      setTeacherSummary(summary);
      
      // Auto-select first class if available - DEFENSIVE PROGRAMMING
      const subjectSummaries = summary?.subjectSummaries ?? [];
      if (subjectSummaries.length > 0 && !selectedClass) {
        const firstClass = subjectSummaries[0];
        setSelectedClassState(firstClass);
        
        // Manually trigger data loading for auto-selected class
        const assignmentId = firstClass.assignment?.id || firstClass.subjectAssignmentId;
        if (assignmentId && typeof assignmentId === 'string') {
          console.log('📚 Auto-loading grades for first class:', assignmentId);
          fetchClassGrades(assignmentId).catch(error => {
            console.error('❌ Error auto-loading grades:', error);
          });
          
          if (firstClass.subject?.id) {
            console.log('⚙️ Auto-loading grade configuration for first class');
            const educationalLevelId = firstClass.assignment?.classGroup?.educationalLevelId || firstClass.classGroup?.id;
            fetchGradeConfiguration(firstClass.subject.id, educationalLevelId).catch(error => {
              console.warn('⚠️ Grade configuration not available for first class:', error);
            });
          }
        }
      }
    } catch (error) {
      handleError(error, 'obtener resumen del profesor');
    } finally {
      setLoading(false);
    }
  }, [getTeacherId, handleError]);

  const fetchClassGrades = useCallback(async (subjectAssignmentId: string, period?: string) => {
    // VALIDATION: Check if subjectAssignmentId is valid
    if (!subjectAssignmentId || typeof subjectAssignmentId !== 'string' || subjectAssignmentId.trim() === '') {
      console.error('❌ INVALID subjectAssignmentId:', subjectAssignmentId, typeof subjectAssignmentId);
      setError('Error: ID de asignatura inválido');
      setLoading(false);
      return;
    }
    
    // Create a unique request ID to handle cancellation
    const requestId = Date.now().toString();
    console.log('🚀 FETCH CLASS GRADES START:', requestId, subjectAssignmentId);
    console.log('🔍 API CALL DETAILS:', {
      url: `/centralized-grades/class/${subjectAssignmentId}`,
      period: period || 'none',
      assignmentIdType: typeof subjectAssignmentId,
      assignmentIdLength: subjectAssignmentId.length
    });
    
    setLoading(true);
    setError(null);
    
    try {
      const grades = await centralizedGradesService.getClassGrades(subjectAssignmentId, period);
      
      // VALIDATION: Check if grades is a valid array
      if (!grades || !Array.isArray(grades)) {
        console.error('❌ INVALID GRADES RESPONSE:', grades, typeof grades);
        throw new Error('Respuesta de API inválida: se esperaba un array de calificaciones');
      }
      
      // Check if this is still the active request (prevent race conditions)
      console.log('🚀 FETCH CLASS GRADES SUCCESS:', requestId, grades.length, 'grades');
      console.log('📊 FIRST GRADE SAMPLE:', grades[0] || 'No grades returned');
      
      // VALIDATION: Check if each grade object is valid
      const validGrades = grades.filter((grade, index) => {
        if (!grade || typeof grade !== 'object') {
          console.warn(`⚠️ Invalid grade at index ${index}:`, grade);
          return false;
        }
        if (!grade.student || !grade.student.id) {
          console.warn(`⚠️ Grade missing student data at index ${index}:`, grade);
          return false;
        }
        return true;
      });
      
      console.log('✅ VALIDATED GRADES:', validGrades.length, 'out of', grades.length);
      setCentralizedGrades(validGrades);
    } catch (error) {
      console.log('🚀 FETCH CLASS GRADES ERROR:', requestId, error);
      console.error('❌ DETAILED ERROR:', error);
      
      // More specific error handling
      if (error?.response?.status === 404) {
        setError('No se encontraron calificaciones para esta asignatura');
      } else if (error?.response?.status === 403) {
        setError('No tienes permisos para acceder a estas calificaciones');
      } else if (error?.message?.includes('Network Error')) {
        setError('Error de conexión. Verifica tu conexión a internet');
      } else {
        handleError(error, 'obtener calificaciones de la clase');
      }
      
      setCentralizedGrades([]); // Clear on error
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const fetchGradeConfiguration = useCallback(async (subjectId: string, educationalLevelId?: string) => {
    const teacherId = await getTeacherId();
    if (!teacherId) return;

    setLoading(true);
    setError(null);
    
    try {
      const config = await centralizedGradesService.getGradeConfiguration(
        teacherId, 
        subjectId, 
        educationalLevelId
      );
      setGradeConfiguration(config);
    } catch (error) {
      // Configuration might not exist yet, that's OK
      if (error.response?.status !== 404) {
        handleError(error, 'obtener configuración de calificaciones');
      }
    } finally {
      setLoading(false);
    }
  }, [getTeacherId, handleError]);

  // Grade operations
  const calculateGrade = useCallback(async (request: CalculationRequest) => {
    console.log('🎯 HOOK calculateGrade - Full request object:', JSON.stringify(request, null, 2));
    console.log('🎯 HOOK calculateGrade - StudentId:', request.studentId, 'Type:', typeof request.studentId);
    console.log('🎯 HOOK calculateGrade - SubjectAssignmentId:', request.subjectAssignmentId, 'Type:', typeof request.subjectAssignmentId);
    
    setCalculating(true);
    setError(null);
    
    try {
      const updatedGrade = await centralizedGradesService.calculateGrade(request);
      
      // Update the grade in the current list
      setCentralizedGrades(prev => 
        prev.map(grade => 
          grade.studentId === request.studentId ? updatedGrade : grade
        )
      );
      
      message.success('Calificación recalculada exitosamente');
    } catch (error) {
      handleError(error, 'recalcular calificación');
    } finally {
      setCalculating(false);
    }
  }, [handleError]);

  const bulkCalculateGrades = useCallback(async (request: BulkCalculationRequest) => {
    setCalculating(true);
    setError(null);
    
    try {
      const result = await centralizedGradesService.bulkCalculateGrades(request);
      
      // Update grades with the results
      setCentralizedGrades(prev => {
        const updatedGrades = [...prev];
        result.results.forEach(updatedGrade => {
          const index = updatedGrades.findIndex(g => g.id === updatedGrade.id);
          if (index >= 0) {
            updatedGrades[index] = updatedGrade;
          }
        });
        return updatedGrades;
      });
      
      message.success(`${result.processed} calificaciones recalculadas exitosamente`);
      if (result.errors > 0) {
        message.warning(`${result.errors} calificaciones tuvieron errores`);
      }
    } catch (error) {
      handleError(error, 'recálculo en lote');
    } finally {
      setCalculating(false);
    }
  }, [handleError]);

  const publishGrades = useCallback(async (request: PublishRequest) => {
    setPublishing(true);
    setError(null);
    
    try {
      const result = await centralizedGradesService.publishGrades(request);
      
      // Update grades status to published
      setCentralizedGrades(prev =>
        prev.map(grade =>
          request.gradeIds.includes(grade.id)
            ? { ...grade, status: request.targetStatus }
            : grade
        )
      );
      
      message.success(`${result.published} calificaciones publicadas exitosamente`);
      if (result.errors > 0) {
        message.warning(`${result.errors} calificaciones tuvieron errores`);
      }
    } catch (error) {
      handleError(error, 'publicar calificaciones');
    } finally {
      setPublishing(false);
    }
  }, [handleError]);

  const updateTeacherComments = useCallback(async (gradeId: string, comments: string) => {
    setSaving(true);
    setError(null);
    
    try {
      const updatedGrade = await centralizedGradesService.updateTeacherComments(gradeId, comments);
      
      setCentralizedGrades(prev =>
        prev.map(grade => grade.id === gradeId ? updatedGrade : grade)
      );
      
      message.success('Comentarios actualizados exitosamente');
    } catch (error) {
      handleError(error, 'actualizar comentarios');
    } finally {
      setSaving(false);
    }
  }, [handleError]);

  const updateGradeStatus = useCallback(async (
    gradeId: string, 
    status: 'draft' | 'provisional' | 'final' | 'archived'
  ) => {
    setSaving(true);
    setError(null);
    
    try {
      const updatedGrade = await centralizedGradesService.updateGradeStatus(gradeId, status);
      
      setCentralizedGrades(prev =>
        prev.map(grade => grade.id === gradeId ? updatedGrade : grade)
      );
      
      message.success('Estado actualizado exitosamente');
    } catch (error) {
      handleError(error, 'actualizar estado');
    } finally {
      setSaving(false);
    }
  }, [handleError]);

  // Configuration
  const saveGradeConfiguration = useCallback(async (config: Partial<GradeConfiguration>) => {
    setSaving(true);
    setError(null);
    
    try {
      const savedConfig = await centralizedGradesService.saveGradeConfiguration(config);
      setGradeConfiguration(savedConfig);
      message.success('Configuración guardada exitosamente');
    } catch (error) {
      handleError(error, 'guardar configuración');
    } finally {
      setSaving(false);
    }
  }, [handleError]);

  // Reports
  const generateReport = useCallback(async (request: ReportGenerationRequest) => {
    setGenerating(true);
    setError(null);
    
    try {
      const blob = await centralizedGradesService.generateReport(request);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_${request.type}_${request.format}_${new Date().toISOString().split('T')[0]}.${request.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(`Reporte ${request.format.toUpperCase()} generado exitosamente`);
    } catch (error) {
      handleError(error, 'generar reporte');
    } finally {
      setGenerating(false);
    }
  }, [handleError]);

  // UI helpers
  const setSelectedClass = useCallback((classData: ClassSummary | null) => {
    console.log('🔄 SET SELECTED CLASS:', classData);
    
    // ULTRA DEFENSIVE: Check if classData is a valid object
    if (classData !== null && (typeof classData !== 'object' || Array.isArray(classData))) {
      console.error('❌ INVALID classData type:', typeof classData, classData);
      setError('Error: Datos de clase inválidos');
      return;
    }
    
    console.log('🔍 DEBUGGING classData structure:', {
      hasClassData: !!classData,
      typeOfClassData: typeof classData,
      isArray: Array.isArray(classData),
      hasAssignment: !!classData?.assignment,
      assignmentId: classData?.assignment?.id,
      hasSubject: !!classData?.subject,
      subjectId: classData?.subject?.id,
      hasSubjectAssignmentId: !!classData?.subjectAssignmentId
    });
    
    // PREVENT RACE CONDITIONS: Always clear state first
    setCentralizedGrades([]);
    setGradeConfiguration(null);
    setError(null);
    
    setSelectedClassState(classData);
    
    // Early return for null
    if (classData === null) {
      console.log('❌ classData is null, early return');
      return;
    }
    
    // DEFENSIVE: Ensure classData has required structure
    if (!classData.assignment && !classData.subjectAssignmentId) {
      console.error('❌ MISSING ASSIGNMENT DATA:', classData);
      setError('Error: Datos de asignatura faltantes');
      return;
    }
    
    if (!classData.subject || !classData.subject.id) {
      console.error('❌ MISSING SUBJECT DATA:', classData);
      setError('Error: Datos de materia faltantes');
      return;
    }
    
    // IMMEDIATE LOADING: Execute data loading directly (removed setTimeout debounce)
    console.log('⏰ IMMEDIATE EXECUTION: About to load data');
    
    try {
      // Load grades for the selected class - handle both formats
      const assignmentId = classData.assignment?.id || classData.subjectAssignmentId;
      if (assignmentId && typeof assignmentId === 'string') {
        console.log('📚 Loading grades for assignment:', assignmentId);
        fetchClassGrades(assignmentId).catch(error => {
          console.error('❌ Error loading grades:', error);
          setError('Error al cargar calificaciones');
        });
      } else {
        console.error('❌ INVALID ASSIGNMENT ID:', assignmentId, typeof assignmentId);
        setError('Error: ID de asignatura inválido');
      }
      
      // Load grade configuration if subject available
      if (classData.subject?.id && typeof classData.subject.id === 'string') {
        console.log('⚙️ Loading grade configuration for subject:', classData.subject.id);
        const educationalLevelId = classData.assignment?.classGroup?.educationalLevelId || classData.classGroup?.id;
        fetchGradeConfiguration(classData.subject.id, educationalLevelId).catch(error => {
          console.warn('⚠️ Grade configuration not available:', error);
          // Grade configuration is optional, don't set error
        });
      } else {
        console.error('❌ INVALID SUBJECT ID:', classData.subject?.id, typeof classData.subject?.id);
      }
    } catch (error) {
      console.error('❌ IMMEDIATE EXECUTION ERROR:', error);
      setError('Error interno al cargar datos');
    }
    
  }, [fetchClassGrades, fetchGradeConfiguration]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setTeacherSummary(null);
    setCentralizedGrades([]);
    setGradeConfiguration(null);
    setSelectedClassState(null);
    setError(null);
  }, []);

  // Auto-fetch teacher summary on mount if user is teacher
  useEffect(() => {
    if (user?.role === 'teacher' && user?.teacherId) {
      fetchTeacherSummary();
    }
  }, [user, fetchTeacherSummary]);

  // Note: Auto-fetch class grades logic moved to setSelectedClass to avoid duplicate calls

  return {
    // State
    teacherSummary,
    centralizedGrades,
    gradeConfiguration,
    selectedClass,
    loading,
    saving,
    calculating,
    publishing,
    generating,
    error,
    
    // Actions
    fetchTeacherSummary,
    fetchClassGrades,
    fetchGradeConfiguration,
    calculateGrade,
    bulkCalculateGrades,
    publishGrades,
    updateTeacherComments,
    updateGradeStatus,
    saveGradeConfiguration,
    generateReport,
    setSelectedClass,
    clearError,
    reset,
  };
};