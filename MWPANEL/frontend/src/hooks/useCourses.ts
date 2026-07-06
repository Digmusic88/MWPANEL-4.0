import { useState, useEffect } from 'react';
import apiClient from '@services/apiClient';
import { message } from 'antd';

export interface Course {
  id: string;
  name: string;
  code?: string;
  description?: string;
  order: number;
  academicYear?: string;
  ageReference?: number;
  cycle?: {
    id: string;
    name: string;
    order: number;
    educationalLevel?: {
      id: string;
      name: string;
      code: string;
    };
  };
}

const useCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/class-groups/available-courses');
      setCourses(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar cursos';
      setError(errorMessage);
      setCourses([]);
      console.error('Error loading courses:', error);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getCoursesByLevel = async (educationalLevelId: string): Promise<Course[]> => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/class-groups/available-courses?levelId=${educationalLevelId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar cursos del nivel';
      message.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (data: Partial<Course>) => {
    // TEMPORARY FIX: Return error since courses endpoint doesn't exist
    console.warn('createCourse called but skipped - courses endpoint not available');
    message.error('La funcionalidad de cursos no está disponible actualmente');
    throw new Error('Courses endpoint not available');
  };

  const updateCourse = async (id: string, data: Partial<Course>) => {
    // TEMPORARY FIX: Return error since courses endpoint doesn't exist
    console.warn('updateCourse called but skipped - courses endpoint not available');
    message.error('La funcionalidad de cursos no está disponible actualmente');
    throw new Error('Courses endpoint not available');
  };

  const deleteCourse = async (id: string) => {
    // TEMPORARY FIX: Return error since courses endpoint doesn't exist
    console.warn('deleteCourse called but skipped - courses endpoint not available');
    message.error('La funcionalidad de cursos no está disponible actualmente');
    throw new Error('Courses endpoint not available');
  };

  return {
    courses,
    loading,
    error,
    fetchCourses,
    getCoursesByLevel,
    createCourse,
    updateCourse,
    deleteCourse,
  };
};

export default useCourses;