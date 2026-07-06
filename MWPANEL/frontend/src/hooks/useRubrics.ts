import { useState, useEffect } from 'react';
import { message } from 'antd';
import apiClient from '@services/apiClient';

// Interfaces para el sistema de rúbricas
export interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  order: number;
  weight: number;
  isActive: boolean;
}

export interface RubricLevel {
  id: string;
  name: string;
  description?: string;
  order: number;
  scoreValue: number;
  color: string;
  isActive: boolean;
}

export interface RubricCell {
  id: string;
  content: string;
  criterionId: string;
  levelId: string;
  criterion?: RubricCriterion;
  level?: RubricLevel;
}

export interface Rubric {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  isTemplate: boolean;
  isActive: boolean;
  isVisibleToFamilies: boolean;
  criteriaCount: number;
  levelsCount: number;
  maxScore: number;
  importSource?: string;
  originalImportData?: string;
  teacherId: string;
  subjectAssignmentId?: string;
  folderId?: string; // Campo para organización por carpetas
  sharedWith?: string[];
  criteria: RubricCriterion[];
  levels: RubricLevel[];
  cells: RubricCell[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRubricData {
  name: string;
  description?: string;
  isTemplate?: boolean;
  isVisibleToFamilies?: boolean;
  subjectAssignmentId?: string;
  maxScore?: number;
  criteria: Omit<RubricCriterion, 'id' | 'isActive'>[];
  levels: Omit<RubricLevel, 'id' | 'isActive'>[];
  cells: Omit<RubricCell, 'id' | 'criterion' | 'level'>[];
}

export interface ImportRubricData {
  name: string;
  description?: string;
  format: 'markdown' | 'csv';
  data: string;
  isTemplate?: boolean;
  isVisibleToFamilies?: boolean;
  subjectAssignmentId?: string;
}

export interface RubricAssessmentCriterion {
  criterionId: string;
  levelId: string;
  cellId: string;
  comments?: string;
}

export interface CreateRubricAssessmentData {
  activityAssessmentId: string;
  rubricId: string;
  studentId: string;
  comments?: string;
  criterionAssessments: RubricAssessmentCriterion[];
}

export interface RubricAssessment {
  id: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  comments?: string;
  isComplete: boolean;
  criterionAssessments: any[];
  student: any;
  rubric: Rubric;
  createdAt: string;
  updatedAt: string;
}

export const useRubrics = () => {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener todas las rúbricas del profesor
  const fetchRubrics = async (includeTemplates: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = includeTemplates ? '?includeTemplates=true' : '';
      const response = await apiClient.get(`/rubrics${params}`);
      setRubrics(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar rúbricas';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Obtener una rúbrica específica
  const fetchRubric = async (id: string): Promise<Rubric | null> => {
    try {
      const response = await apiClient.get(`/rubrics/${id}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar rúbrica';
      message.error(errorMessage);
      return null;
    }
  };

  // Crear una nueva rúbrica
  const createRubric = async (data: CreateRubricData): Promise<Rubric | null> => {
    try {
      setLoading(true);
      const response = await apiClient.post('/rubrics', data);
      const newRubric = response.data;
      setRubrics(prev => [newRubric, ...prev]);
      message.success('Rúbrica creada exitosamente');
      return newRubric;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al crear rúbrica';
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Importar rúbrica desde ChatGPT
  const importRubric = async (data: ImportRubricData): Promise<Rubric | null> => {
    try {
      setLoading(true);
      const response = await apiClient.post('/rubrics/import', data);
      const newRubric = response.data;
      setRubrics(prev => [newRubric, ...prev]);
      message.success('Rúbrica importada exitosamente');
      return newRubric;
    } catch (err: any) {
      console.error('Import error details:', err);
      let errorMessage = 'Error al importar rúbrica';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Mensajes específicos para errores comunes
      if (errorMessage.includes('parsear')) {
        errorMessage += '. Verifica que la tabla tenga el formato correcto con | separando las columnas.';
      }
      
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar una rúbrica
  const updateRubric = async (id: string, data: Partial<CreateRubricData & { status: 'draft' | 'active' | 'archived' }>): Promise<Rubric | null> => {
    try {
      setLoading(true);

      // DEBUGGING: Log exacto de datos enviados
      console.log('🔍 [useRubrics] updateRubric called with:', {
        id,
        dataKeys: Object.keys(data),
        criteriaCount: data.criteria?.length,
        levelsCount: data.levels?.length,
        cellsCount: data.cells?.length,
        fullData: JSON.stringify(data, null, 2)
      });

      const response = await apiClient.patch(`/rubrics/${id}`, data);
      const updatedRubric = response.data;
      setRubrics(prev => prev.map(r => r.id === id ? updatedRubric : r));
      message.success('Rúbrica actualizada exitosamente');
      return updatedRubric;
    } catch (err: any) {
      console.error('🚨 [useRubrics] updateRubric ERROR:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        fullError: err
      });

      const errorMessage = err.response?.data?.message || 'Error al actualizar rúbrica';

      // Si hay errores de validación, mostrarlos todos
      if (err.response?.data?.errors) {
        console.error('🚨 [useRubrics] Validation errors:', err.response.data.errors);
        err.response.data.errors.forEach((error: any) => {
          message.error(`${error.property}: ${JSON.stringify(error.constraints)}`);
        });
      }

      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Eliminar una rúbrica
  const deleteRubric = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      await apiClient.delete(`/rubrics/${id}`);
      setRubrics(prev => prev.filter(r => r.id !== id));
      message.success('Rúbrica eliminada exitosamente');
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al eliminar rúbrica';
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Publicar una rúbrica (cambiar estado a activo)
  const publishRubric = async (id: string): Promise<Rubric | null> => {
    try {
      setLoading(true);
      const response = await apiClient.patch(`/rubrics/${id}/publish`);
      const publishedRubric = response.data;
      setRubrics(prev => prev.map(r => r.id === id ? publishedRubric : r));
      message.success('Rúbrica publicada exitosamente');
      return publishedRubric;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al publicar rúbrica';
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Crear evaluación con rúbrica
  const createAssessment = async (data: CreateRubricAssessmentData): Promise<RubricAssessment | null> => {
    try {
      const response = await apiClient.post('/rubrics/assessments', data);
      message.success('Evaluación creada exitosamente');
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al crear evaluación';
      message.error(errorMessage);
      return null;
    }
  };

  // Obtener evaluación por ID
  const fetchAssessment = async (id: string): Promise<RubricAssessment | null> => {
    try {
      const response = await apiClient.get(`/rubrics/assessments/${id}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar evaluación';
      message.error(errorMessage);
      return null;
    }
  };

  // Generar colores automáticos para niveles
  const generateColors = (levelCount: number): string[] => {
    if (levelCount === 1) {
      return ['#4CAF50']; // Verde para un solo nivel
    }

    const colors: string[] = [];
    const startColor = { r: 255, g: 76, b: 76 }; // Rojo #FF4C4C
    const endColor = { r: 76, g: 175, b: 80 };   // Verde #4CAF50

    for (let i = 0; i < levelCount; i++) {
      const ratio = i / (levelCount - 1);
      
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
      
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      colors.push(hex.toUpperCase());
    }

    return colors;
  };

  // Calcular puntuación total de una evaluación
  const calculateScore = (
    criterionAssessments: Array<{
      criterion: { weight: number };
      selectedLevel: { scoreValue: number };
    }>,
    maxScore: number = 100,
    allLevels?: Array<{ scoreValue: number }>
  ): { totalScore: number; maxPossibleScore: number; percentage: number } => {
    let weightedSum = 0;
    let maxPossibleWeightedSum = 0;
    
    // FIXED: Use the maximum possible level value from all rubric levels, not just selected ones
    let maxPossibleLevelValue: number;
    if (allLevels && allLevels.length > 0) {
      maxPossibleLevelValue = Math.max(...allLevels.map(level => level.scoreValue));
    } else {
      // Fallback: if allLevels not provided, use old behavior for backwards compatibility
      maxPossibleLevelValue = Math.max(...criterionAssessments.map(ca => ca.selectedLevel.scoreValue));
      console.warn('[RUBRIC CALC] allLevels parameter not provided, using fallback calculation');
    }
    
    for (const assessment of criterionAssessments) {
      const weight = assessment.criterion.weight;
      const selectedLevelValue = assessment.selectedLevel.scoreValue;
      
      weightedSum += weight * selectedLevelValue;
      maxPossibleWeightedSum += weight * maxPossibleLevelValue;
    }
    
    const percentage = maxPossibleWeightedSum > 0 ? (weightedSum / maxPossibleWeightedSum) * 100 : 0;
    const totalScore = (percentage / 100) * maxScore;
    const maxPossibleScore = maxScore;
    
    return {
      totalScore: Math.round(totalScore * 100) / 100,
      maxPossibleScore,
      percentage: Math.round(percentage * 10) / 10, // ALSO FIXED: Use * 10 / 10 for proper 1 decimal place rounding
    };
  };

  // Compartir rúbrica con otros profesores
  const shareRubric = async (id: string, teacherIds: string[]): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await apiClient.post(`/rubrics/${id}/share`, { teacherIds });
      const sharedRubric = response.data;
      setRubrics(prev => prev.map(r => r.id === id ? sharedRubric : r));
      message.success('Rúbrica compartida exitosamente');
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al compartir rúbrica';
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Retirar acceso de rúbrica compartida
  const unshareRubric = async (id: string, teacherIds: string[]): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await apiClient.post(`/rubrics/${id}/unshare`, { teacherIds });
      const unsharedRubric = response.data;
      setRubrics(prev => prev.map(r => r.id === id ? unsharedRubric : r));
      message.success('Acceso retirado exitosamente');
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al retirar acceso';
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Obtener lista de profesores colegas
  const fetchColleagues = async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/rubrics/colleagues');
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al obtener colegas';
      message.error(errorMessage);
      return [];
    }
  };

  // Obtener rúbricas compartidas conmigo
  const fetchSharedWithMe = async (): Promise<Rubric[]> => {
    try {
      console.log('useRubrics - Calling /rubrics/shared-with-me');
      const response = await apiClient.get('/rubrics/shared-with-me');
      console.log('useRubrics - Response:', response.data);
      return response.data;
    } catch (err: any) {
      console.error('useRubrics - Error:', err);
      const errorMessage = err.response?.data?.message || 'Error al obtener rúbricas compartidas';
      message.error(errorMessage);
      return [];
    }
  };

  return {
    rubrics,
    loading,
    error,
    fetchRubrics,
    fetchRubric,
    createRubric,
    importRubric,
    updateRubric,
    deleteRubric,
    publishRubric,
    createAssessment,
    fetchAssessment,
    shareRubric,
    unshareRubric,
    fetchColleagues,
    fetchSharedWithMe,
    generateColors,
    calculateScore,
  };
};

export default useRubrics;