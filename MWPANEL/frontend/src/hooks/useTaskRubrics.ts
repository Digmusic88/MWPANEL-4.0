import { useState, useEffect } from 'react';
import { message } from 'antd';
import apiClient from '@services/apiClient';

export interface RubricLevel {
  id: string;
  name: string;
  description: string;
  scoreValue: number;
  color: string;
  order: number;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  order: number;
}

export interface RubricCell {
  id: string;
  criterionId: string;
  levelId: string;
  content: string; // Backend usa 'content', no 'description'
  description?: string; // Alias opcional para compatibilidad
}

export interface Rubric {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  criteria: RubricCriterion[];
  levels: RubricLevel[];
  cells: RubricCell[];
}

export interface SelectedCell {
  criterionId: string;
  levelId: string;
}

export interface GradeWithRubricRequest {
  selectedCells: SelectedCell[];
  teacherFeedback?: string;
  privateNotes?: string;
}

export interface RubricGradeResponse {
  finalGrade: number;
  percentage: number;
  selectedCells: SelectedCell[];
  teacherFeedback?: string;
  rubricAssessmentId: string;
}

const useTaskRubrics = () => {
  const [loading, setLoading] = useState(false);

  // Función para obtener una rúbrica por ID
  const getRubric = async (rubricId: string): Promise<Rubric | null> => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/rubrics/${rubricId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching rubric:', error);
      message.error('Error al cargar la rúbrica');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Función para calificar con rúbrica
  const gradeSubmissionWithRubric = async (
    submissionId: string,
    gradeData: GradeWithRubricRequest
  ): Promise<RubricGradeResponse | null> => {
    try {
      setLoading(true);
      const response = await apiClient.post(
        `/tasks/submissions/${submissionId}/grade-with-rubric`,
        gradeData
      );
      message.success('Calificación con rúbrica guardada exitosamente');
      return response.data;
    } catch (error: any) {
      console.error('Error grading with rubric:', error);
      const errorMessage = error.response?.data?.message || 'Error al calificar con rúbrica';
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener la evaluación existente de una tarea con rúbrica
  const getTaskRubricAssessment = async (submissionId: string): Promise<RubricGradeResponse | null> => {
    try {
      const response = await apiClient.get(
        `/tasks/submissions/${submissionId}/rubric-assessment`
      );
      return response.data;
    } catch (error: any) {
      // Si no existe evaluación previa, no es un error
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching task rubric assessment:', error);
      return null;
    }
  };

  return {
    loading,
    getRubric,
    gradeSubmissionWithRubric,
    getTaskRubricAssessment,
  };
};

export default useTaskRubrics;