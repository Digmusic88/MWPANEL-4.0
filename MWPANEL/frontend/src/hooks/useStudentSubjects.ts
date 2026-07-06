import { useState, useEffect } from 'react';
import apiClient from '@services/apiClient';
import { message } from 'antd';

export interface StudentSubject {
  id: string;
  name: string;
  code: string;
  teacherName?: string;
  averageGrade?: number;
  totalEvaluations?: number;
}

/**
 * Hook para obtener las asignaturas específicas del estudiante matriculado
 * (no todas las asignaturas de la plataforma)
 */
const useStudentSubjects = () => {
  console.log('🔍 [useStudentSubjects] Hook initializing...');
  
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentSubjects();
  }, []);

  const fetchStudentSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [useStudentSubjects] Fetching student subjects...');
      
      // Obtener las asignaturas desde el endpoint de calificaciones del estudiante
      const response = await apiClient.get('/grades/my-grades');
      const data = response.data;
      
      console.log('📊 [useStudentSubjects] Raw API response:', data);
      console.log('📋 [useStudentSubjects] SubjectGrades:', data.subjectGrades);
      
      // Extraer las asignaturas del estudiante matriculado
      const studentSubjects = (data.subjectGrades || []).map((subjectGrade: any) => ({
        id: subjectGrade.subjectId,
        name: subjectGrade.subjectName,
        code: subjectGrade.subjectCode,
        teacherName: subjectGrade.teacherName,
        averageGrade: subjectGrade.averageGrade,
        totalEvaluations: subjectGrade.gradedTasks,
      }));
      
      console.log('✅ [useStudentSubjects] Processed student subjects:', studentSubjects);
      console.log(`📈 [useStudentSubjects] Total student subjects: ${studentSubjects.length}`);
      
      setSubjects(studentSubjects);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar las asignaturas del estudiante';
      setError(errorMessage);
      // No mostrar error si el estudiante no tiene asignaturas aún
      if (error.response?.status !== 404) {
        console.warn('Error loading student subjects:', errorMessage);
      }
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    subjects,
    loading,
    error,
    refetch: fetchStudentSubjects,
  };
};

export default useStudentSubjects;