import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '../services/apiClient';
import { useAuthStore } from '../store/authStore';

interface StudentGrade {
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  averageGrade: number | null;
  taskAverage: number | null;
  activityAverage: number | null;
  competencyAverage: number | null;
  gradedTasks: number;
  pendingTasks: number;
  activityAssessments: number;
  lastUpdated: Date | null;
  overallSummary: {
    overallAverage: number | null;
    totalSubjects: number;
    totalGradedItems: number;
    totalPendingTasks: number;
    lastActivityDate: Date | null;
  } | null;
}

interface ClassGrade {
  assignment: {
    id: string;
    subject: {
      id: string;
      name: string;
      code: string;
    };
    classGroup: {
      id: string;
      name: string;
    };
  };
  students: StudentGrade[];
  statistics: {
    totalStudents: number;
    studentsWithGrades: number;
    classAverage: number | null;
    highestGrade: number | null;
    lowestGrade: number | null;
    passingRate: number | null;
    needingAttention: number;
  };
}

interface OverallStatistics {
  totalClasses: number;
  totalStudents: number;
  totalStudentsWithGrades: number;
  overallAverage: number | null;
  totalNeedingAttention: number;
}

interface TeacherCentralizedGrades {
  centralizedGrades: ClassGrade[];
  overallStatistics: OverallStatistics;
  academicPeriod: {
    current: string;
    year: string;
  };
}

export const useTeacherSimplifiedGrades = () => {
  const [data, setData] = useState<TeacherCentralizedGrades | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchCentralizedGrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🎯 Fetching centralized grades using FIXED endpoint...');
      
      // Use the correct endpoint where we fixed the data
      const teacherId = user?.teacherId;
      if (!teacherId) {
        throw new Error('No se encontró el ID del profesor');
      }
      
      console.log('🔍 Using teacherId:', teacherId);
      const response = await api.get(`/centralized-grades/teacher/${teacherId}/summary`);
      
      console.log('✅ RAW API Response:', response.data);
      
      // Transform the centralized-grades response to match the expected format
      const transformedData = {
        centralizedGrades: response.data.subjectSummaries?.map((summary: any) => ({
          assignment: {
            id: summary.assignment?.id || 'unknown',
            subject: summary.subject || { id: 'unknown', name: 'Sin nombre', code: 'SIN' },
            classGroup: summary.assignment?.classGroup || { id: 'unknown', name: 'Sin grupo' }
          },
          students: summary.grades?.map((grade: any) => ({
            studentId: grade.studentId,
            studentName: grade.student?.fullName || 'Estudiante desconocido',
            enrollmentNumber: grade.student?.enrollmentNumber || 'N/A',
            averageGrade: grade.finalGrade || null,
            taskAverage: grade.finalGrade || null,
            activityAverage: null,
            competencyAverage: null,
            gradedTasks: 1,
            pendingTasks: 0,
            activityAssessments: 0,
            lastUpdated: new Date(),
            overallSummary: null
          })) || [],
          statistics: {
            totalStudents: summary.studentCount || 0,
            studentsWithGrades: summary.grades?.length || 0,
            classAverage: summary.averageGrade || null,
            highestGrade: null,
            lowestGrade: null,
            passingRate: summary.passingRate || null,
            needingAttention: 0
          }
        })) || [],
        overallStatistics: {
          totalClasses: response.data.totalSubjects || 0,
          totalStudents: response.data.totalStudents || 0,
          totalStudentsWithGrades: response.data.totalStudents || 0,
          overallAverage: response.data.overallAverage || null,
          totalNeedingAttention: 0
        },
        academicPeriod: {
          current: response.data.period || 'all',
          year: new Date().getFullYear().toString()
        }
      };
      
      console.log('✅ Centralized grades fetched (FIXED):', {
        classes: transformedData.overallStatistics.totalClasses,
        totalStudents: transformedData.overallStatistics.totalStudents,
        overallAverage: transformedData.overallStatistics.overallAverage,
      });
      
      setData(transformedData);
    } catch (err: any) {
      console.error('❌ Error fetching centralized grades:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error al cargar las calificaciones centralizadas';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user?.teacherId]);

  useEffect(() => {
    fetchCentralizedGrades();
  }, [fetchCentralizedGrades]);

  const refresh = useCallback(() => {
    fetchCentralizedGrades();
  }, [fetchCentralizedGrades]);

  return {
    data,
    loading,
    error,
    refresh,
  };
};