/**
 * @archivo: useUnifiedGrades.ts
 * @módulo: Frontend Hooks
 * @función: Hook para gestión del Sistema Unificado de Calificaciones 0-100
 * @crítico: SÍ - Hook principal para integración con el nuevo sistema
 * @creado: 2025-08-23 - Hook integrado con sistema unificado
 */

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useAuthStore } from '../store/authStore';
import {
  unifiedGradingService,
  UnifiedGrade,
  GradingScale,
  StudentUnifiedGrades,
  StudentAnalytics,
  ConvertGradeRequest,
  ConvertGradeResponse,
  WeightedAverageResponse,
  BatchConvertResponse,
  MigrationResponse,
} from '../services/unifiedGradingService';

// =====================================================
// INTERFACES DEL HOOK
// =====================================================

interface UseUnifiedGradesState {
  // Data
  studentGrades: StudentUnifiedGrades | null;
  availableScales: GradingScale[];
  studentAnalytics: StudentAnalytics | null;
  selectedScale: GradingScale | null;
  
  // UI State
  loading: boolean;
  converting: boolean;
  saving: boolean;
  migrating: boolean;
  analyzing: boolean;
  
  // Error handling
  error: string | null;
}

interface UseUnifiedGradesActions {
  // Grade operations
  convertGrade: (request: ConvertGradeRequest) => Promise<ConvertGradeResponse | null>;
  saveUnifiedGrade: (gradeData: Partial<UnifiedGrade>) => Promise<UnifiedGrade | null>;
  batchConvertGrades: (requests: ConvertGradeRequest[]) => Promise<BatchConvertResponse | null>;
  
  // Data fetching
  fetchStudentGrades: (studentId?: string, filters?: any) => Promise<void>;
  fetchAllGrades: (filters?: any) => Promise<void>;
  fetchAvailableScales: () => Promise<void>;
  fetchStudentAnalytics: (studentId: string, academicYearId?: string) => Promise<void>;
  getWeightedAverage: (studentId: string, subjectId: string, academicYearId?: string, evaluationPeriod?: string) => Promise<WeightedAverageResponse | null>;
  
  // Admin operations
  migrateExistingGrades: (limit?: number) => Promise<MigrationResponse | null>;
  
  // Utility functions
  getGradeColor: (value: number) => string;
  getQualityLabel: (value: number) => string;
  getProgressStatus: (value: number) => 'success' | 'normal' | 'exception' | 'active';
  formatGradeForDisplay: (grade: UnifiedGrade) => any;
  
  // State management
  setSelectedScale: (scale: GradingScale | null) => void;
  clearError: () => void;
  resetState: () => void;
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export const useUnifiedGrades = (): UseUnifiedGradesState & UseUnifiedGradesActions => {
  // State
  const [state, setState] = useState<UseUnifiedGradesState>({
    studentGrades: null,
    availableScales: [],
    studentAnalytics: null,
    selectedScale: null,
    loading: false,
    converting: false,
    saving: false,
    migrating: false,
    analyzing: false,
    error: null,
  });

  const { user } = useAuthStore();

  // =====================================================
  // UTILIDADES
  // =====================================================

  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    const errorMessage = error?.message || error?.response?.data?.message || 'Error desconocido';
    setState(prev => ({ ...prev, error: errorMessage }));
    message.error(errorMessage);
  }, []);

  const updateLoadingState = useCallback((key: keyof UseUnifiedGradesState, value: boolean) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  // =====================================================
  // ACCIONES PRINCIPALES
  // =====================================================

  const convertGrade = useCallback(async (request: ConvertGradeRequest): Promise<ConvertGradeResponse | null> => {
    try {
      updateLoadingState('converting', true);
      setState(prev => ({ ...prev, error: null }));

      const result = await unifiedGradingService.convertGrade(request);
      
      message.success(`Calificación convertida: ${result.original_value} → ${result.hundred_scale_value}`);
      return result;
    } catch (error: any) {
      handleError(error, 'convertGrade');
      return null;
    } finally {
      updateLoadingState('converting', false);
    }
  }, [handleError, updateLoadingState]);

  const saveUnifiedGrade = useCallback(async (gradeData: Partial<UnifiedGrade>): Promise<UnifiedGrade | null> => {
    try {
      updateLoadingState('saving', true);
      setState(prev => ({ ...prev, error: null }));

      const result = await unifiedGradingService.saveUnifiedGrade(gradeData);
      
      message.success('Calificación guardada exitosamente');
      return result;
    } catch (error: any) {
      handleError(error, 'saveUnifiedGrade');
      return null;
    } finally {
      updateLoadingState('saving', false);
    }
  }, [handleError, updateLoadingState]);

  const batchConvertGrades = useCallback(async (requests: ConvertGradeRequest[]): Promise<BatchConvertResponse | null> => {
    try {
      updateLoadingState('converting', true);
      setState(prev => ({ ...prev, error: null }));

      const result = await unifiedGradingService.batchConvertGrades(requests);
      
      message.success(`Conversión masiva completada: ${result.successful}/${result.total} exitosas`);
      return result;
    } catch (error: any) {
      handleError(error, 'batchConvertGrades');
      return null;
    } finally {
      updateLoadingState('converting', false);
    }
  }, [handleError, updateLoadingState]);

  const fetchStudentGrades = useCallback(async (studentId?: string, filters?: any): Promise<void> => {
    try {
      updateLoadingState('loading', true);
      setState(prev => ({ ...prev, error: null }));

      const options = {
        studentId,
        subjectId: filters?.subjectId,
        scale: filters?.scale || 'standard',
        period: filters?.period
      };

      const result = await unifiedGradingService.getAllGrades(options);
      
      // Convert the new format to the expected format
      const adaptedResult = {
        student_id: studentId || 'all',
        total_grades: result.totalCount,
        grades: result.grades
      };
      
      setState(prev => ({ ...prev, studentGrades: adaptedResult }));
    } catch (error: any) {
      handleError(error, 'fetchStudentGrades');
    } finally {
      updateLoadingState('loading', false);
    }
  }, [handleError, updateLoadingState]);

  const fetchAllGrades = useCallback(async (filters?: any): Promise<void> => {
    try {
      updateLoadingState('loading', true);
      setState(prev => ({ ...prev, error: null }));

      const options = {
        subjectId: filters?.subjectId,
        scale: filters?.scale || 'standard',
        period: filters?.period
      };

      const result = await unifiedGradingService.getAllGrades(options);
      
      // Convert the new format to the expected format for all grades
      const adaptedResult = {
        student_id: 'all',
        total_grades: result.totalCount,
        grades: result.grades
      };
      
      setState(prev => ({ ...prev, studentGrades: adaptedResult }));
    } catch (error: any) {
      handleError(error, 'fetchAllGrades');
    } finally {
      updateLoadingState('loading', false);
    }
  }, [handleError, updateLoadingState]);

  const fetchAvailableScales = useCallback(async (): Promise<void> => {
    try {
      updateLoadingState('loading', true);
      setState(prev => ({ ...prev, error: null }));

      const result = await unifiedGradingService.getAvailableScales();
      setState(prev => ({ 
        ...prev, 
        availableScales: result,
        selectedScale: result.find(scale => scale.is_default) || result[0] || null
      }));
    } catch (error: any) {
      handleError(error, 'fetchAvailableScales');
    } finally {
      updateLoadingState('loading', false);
    }
  }, [handleError, updateLoadingState]);

  const fetchStudentAnalytics = useCallback(async (studentId: string, academicYearId?: string): Promise<void> => {
    try {
      updateLoadingState('analyzing', true);
      setState(prev => ({ ...prev, error: null }));

      const result = await unifiedGradingService.getStudentAnalytics(studentId, academicYearId);
      setState(prev => ({ ...prev, studentAnalytics: result }));
    } catch (error: any) {
      handleError(error, 'fetchStudentAnalytics');
    } finally {
      updateLoadingState('analyzing', false);
    }
  }, [handleError, updateLoadingState]);

  const getWeightedAverage = useCallback(async (
    studentId: string, 
    subjectId: string, 
    academicYearId?: string, 
    evaluationPeriod?: string
  ): Promise<WeightedAverageResponse | null> => {
    try {
      updateLoadingState('loading', true);
      setState(prev => ({ ...prev, error: null }));

      const result = await unifiedGradingService.getWeightedAverage(
        studentId, 
        subjectId, 
        academicYearId, 
        evaluationPeriod
      );
      return result;
    } catch (error: any) {
      handleError(error, 'getWeightedAverage');
      return null;
    } finally {
      updateLoadingState('loading', false);
    }
  }, [handleError, updateLoadingState]);

  const migrateExistingGrades = useCallback(async (limit: number = 100): Promise<MigrationResponse | null> => {
    if (user?.role !== 'admin') {
      message.error('Solo los administradores pueden realizar migraciones');
      return null;
    }

    try {
      updateLoadingState('migrating', true);
      setState(prev => ({ ...prev, error: null }));

      const result = await unifiedGradingService.migrateExistingGrades(limit);
      
      message.success(`Migración completada: ${result.migrated} registros migrados`);
      if (result.errors > 0) {
        message.warning(`${result.errors} registros tuvieron errores durante la migración`);
      }
      
      return result;
    } catch (error: any) {
      handleError(error, 'migrateExistingGrades');
      return null;
    } finally {
      updateLoadingState('migrating', false);
    }
  }, [user, handleError, updateLoadingState]);

  // =====================================================
  // FUNCIONES DE UTILIDAD
  // =====================================================

  const getGradeColor = useCallback((value: number): string => {
    return unifiedGradingService.getGradeColor(value);
  }, []);

  const getQualityLabel = useCallback((value: number): string => {
    return unifiedGradingService.getQualityLabel(value);
  }, []);

  const getProgressStatus = useCallback((value: number): 'success' | 'normal' | 'exception' | 'active' => {
    return unifiedGradingService.getProgressStatus(value);
  }, []);

  const formatGradeForDisplay = useCallback((grade: UnifiedGrade) => {
    return unifiedGradingService.formatGradeForDisplay(grade);
  }, []);

  // =====================================================
  // GESTIÓN DE ESTADO
  // =====================================================

  const setSelectedScale = useCallback((scale: GradingScale | null) => {
    setState(prev => ({ ...prev, selectedScale: scale }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      studentGrades: null,
      availableScales: [],
      studentAnalytics: null,
      selectedScale: null,
      loading: false,
      converting: false,
      saving: false,
      migrating: false,
      analyzing: false,
      error: null,
    });
  }, []);

  // =====================================================
  // EFECTOS
  // =====================================================

  // Cargar escalas disponibles al montar el hook
  useEffect(() => {
    fetchAvailableScales();
  }, [fetchAvailableScales]);

  // =====================================================
  // RETURN HOOK
  // =====================================================

  return {
    // State
    ...state,
    
    // Actions
    convertGrade,
    saveUnifiedGrade,
    batchConvertGrades,
    fetchStudentGrades,
    fetchAllGrades,
    fetchAvailableScales,
    fetchStudentAnalytics,
    getWeightedAverage,
    migrateExistingGrades,
    
    // Utilities
    getGradeColor,
    getQualityLabel,
    getProgressStatus,
    formatGradeForDisplay,
    
    // State management
    setSelectedScale,
    clearError,
    resetState,
  };
};

export default useUnifiedGrades;