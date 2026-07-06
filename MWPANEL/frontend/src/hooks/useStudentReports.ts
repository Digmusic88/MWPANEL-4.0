/**
 * @archivo: useStudentReports.ts
 * @módulo: Student Reports (Visión 360º)
 * @función: Hook personalizado para gestión de reportes de estudiantes
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import studentReportsService, {
  Report,
  StudentReportsResponse,
  StudentReportStats,
  SubjectsAndCategories,
  CreateReportDto,
  UpdateReportDto,
  QueryReportsParams,
} from '../services/studentReportsService';

interface UseStudentReportsReturn {
  // Data
  reports: Report[];
  groupedBySubject: StudentReportsResponse['bySubject'];
  groupedByCustomTag: StudentReportsResponse['byCustomTag'];
  stats: StudentReportStats | null;
  subjectsAndCategories: SubjectsAndCategories | null;
  myReports: Report[];

  // Pagination
  total: number;
  page: number;
  limit: number;

  // Loading states
  loading: boolean;
  loadingStats: boolean;
  loadingSubjects: boolean;
  loadingMyReports: boolean;
  saving: boolean;

  // Error
  error: string | null;

  // Actions
  fetchStudentReports: (studentId: string, params?: QueryReportsParams) => Promise<void>;
  fetchStudentStats: (studentId: string, academicYearId?: string) => Promise<void>;
  fetchSubjectsAndCategories: (studentId: string, academicYearId?: string) => Promise<void>;
  fetchMyReports: (params?: QueryReportsParams) => Promise<void>;
  createReport: (data: CreateReportDto) => Promise<Report | null>;
  updateReport: (reportId: string, data: UpdateReportDto) => Promise<Report | null>;
  deleteReport: (reportId: string) => Promise<boolean>;
  clearError: () => void;
}

export function useStudentReports(): UseStudentReportsReturn {
  // Data state
  const [reports, setReports] = useState<Report[]>([]);
  const [groupedBySubject, setGroupedBySubject] = useState<StudentReportsResponse['bySubject']>([]);
  const [groupedByCustomTag, setGroupedByCustomTag] = useState<StudentReportsResponse['byCustomTag']>([]);
  const [stats, setStats] = useState<StudentReportStats | null>(null);
  const [subjectsAndCategories, setSubjectsAndCategories] = useState<SubjectsAndCategories | null>(null);
  const [myReports, setMyReports] = useState<Report[]>([]);

  // Pagination
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingMyReports, setLoadingMyReports] = useState(false);
  const [saving, setSaving] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Obtiene los reportes de un estudiante
   */
  const fetchStudentReports = useCallback(
    async (studentId: string, params?: QueryReportsParams) => {
      setLoading(true);
      setError(null);
      try {
        const result = await studentReportsService.getStudentReports(studentId, params);
        setReports(result.data.timeline);
        setGroupedBySubject(result.data.bySubject);
        setGroupedByCustomTag(result.data.byCustomTag);
        setTotal(result.meta.total);
        setPage(result.meta.page);
        setLimit(result.meta.limit);
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Error al cargar los reportes';
        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Obtiene estadísticas de reportes de un estudiante
   */
  const fetchStudentStats = useCallback(
    async (studentId: string, academicYearId?: string) => {
      setLoadingStats(true);
      try {
        const result = await studentReportsService.getStudentStats(studentId, academicYearId);
        setStats(result);
      } catch (err: any) {
        console.error('Error fetching student stats:', err);
      } finally {
        setLoadingStats(false);
      }
    },
    []
  );

  /**
   * Obtiene las asignaturas del profesor y categorías disponibles
   */
  const fetchSubjectsAndCategories = useCallback(
    async (studentId: string, academicYearId?: string) => {
      setLoadingSubjects(true);
      try {
        const result = await studentReportsService.getSubjectsAndCategories(
          studentId,
          academicYearId
        );
        setSubjectsAndCategories(result);
      } catch (err: any) {
        console.error('Error fetching subjects and categories:', err);
        // Fallback a categorías vacías
        setSubjectsAndCategories({
          subjects: [],
          customCategories: [
            'Comportamiento',
            'Reunión',
            'General',
            'Tutoría',
            'Extraescolar',
            'Convivencia',
            'Académico General',
            'Salud/Bienestar',
            'Comunicación Familiar',
            'Otro',
          ],
        });
      } finally {
        setLoadingSubjects(false);
      }
    },
    []
  );

  /**
   * Obtiene los reportes creados por el profesor actual
   */
  const fetchMyReports = useCallback(
    async (params?: QueryReportsParams) => {
      setLoadingMyReports(true);
      try {
        const result = await studentReportsService.getMyReports(params);
        setMyReports(result.data);
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Error al cargar tus reportes';
        message.error(errorMessage);
      } finally {
        setLoadingMyReports(false);
      }
    },
    []
  );

  /**
   * Crea un nuevo reporte
   */
  const createReport = useCallback(
    async (data: CreateReportDto): Promise<Report | null> => {
      setSaving(true);
      setError(null);
      try {
        const report = await studentReportsService.createReport(data);
        // Actualizar lista local
        setReports((prev) => [report, ...prev]);
        return report;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Error al crear el reporte';
        setError(errorMessage);
        message.error(errorMessage);
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  /**
   * Actualiza un reporte existente
   */
  const updateReport = useCallback(
    async (reportId: string, data: UpdateReportDto): Promise<Report | null> => {
      setSaving(true);
      setError(null);
      try {
        const updatedReport = await studentReportsService.updateReport(reportId, data);
        // Actualizar en la lista local
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? updatedReport : r))
        );
        return updatedReport;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Error al actualizar el reporte';
        setError(errorMessage);
        message.error(errorMessage);
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  /**
   * Elimina un reporte
   */
  const deleteReport = useCallback(
    async (reportId: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        await studentReportsService.deleteReport(reportId);
        // Eliminar de la lista local
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        message.success('Reporte eliminado correctamente');
        return true;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Error al eliminar el reporte';
        setError(errorMessage);
        message.error(errorMessage);
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return {
    // Data
    reports,
    groupedBySubject,
    groupedByCustomTag,
    stats,
    subjectsAndCategories,
    myReports,

    // Pagination
    total,
    page,
    limit,

    // Loading states
    loading,
    loadingStats,
    loadingSubjects,
    loadingMyReports,
    saving,

    // Error
    error,

    // Actions
    fetchStudentReports,
    fetchStudentStats,
    fetchSubjectsAndCategories,
    fetchMyReports,
    createReport,
    updateReport,
    deleteReport,
    clearError,
  };
}

export default useStudentReports;
