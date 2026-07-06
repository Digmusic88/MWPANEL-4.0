import { useState, useEffect } from 'react';
import apiClient from '@services/apiClient';
import { message } from 'antd';

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  credits?: number;
  educationalLevelId?: string;
  courseId?: string;
}

export interface SubjectAssignment {
  id: string;
  subjectId: string;
  classGroupId: string;
  teacherId: string;
  academicYearId: string;
  subject: Subject;
  classGroup: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

const useSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<SubjectAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/subjects');
      setSubjects(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar asignaturas';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherSubjects = async (teacherId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/subjects/assignments/teacher/${teacherId}`);
      setTeacherSubjects(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar asignaturas del profesor';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createSubject = async (data: Partial<Subject>) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/subjects', data);
      message.success('Asignatura creada exitosamente');
      await fetchSubjects();
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al crear asignatura';
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateSubject = async (id: string, data: Partial<Subject>) => {
    try {
      setLoading(true);
      const response = await apiClient.patch(`/subjects/${id}`, data);
      message.success('Asignatura actualizada exitosamente');
      await fetchSubjects();
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al actualizar asignatura';
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteSubject = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/subjects/${id}`);
      message.success('Asignatura eliminada exitosamente');
      await fetchSubjects();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al eliminar asignatura';
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    subjects,
    teacherSubjects,
    loading,
    error,
    fetchSubjects,
    fetchTeacherSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  };
};

export default useSubjects;