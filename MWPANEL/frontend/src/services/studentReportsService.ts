/**
 * @archivo: studentReportsService.ts
 * @módulo: Student Reports (Visión 360º)
 * @función: Servicio API para gestión de reportes de estudiantes
 */

import apiClient from './apiClient';

// ===== TYPES =====

export interface Author {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface Student {
  id: string;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

export interface AcademicYear {
  id: string;
  name: string;
}

export interface Report {
  id: string;
  studentId: string;
  student: Student | null;
  author: Author | null;
  subject: Subject | null;
  customTag: string | null;
  displayTag: string;
  tagType: 'subject' | 'custom';
  title: string | null;
  content: string;
  priority: number;
  priorityLabel: string;
  visibleToFamily: boolean;
  isArchived: boolean;
  academicYear: AcademicYear | null;
  createdAt: string;
  updatedAt: string;
  wasEdited: boolean;
}

export interface GroupedReports {
  subjectName?: string;
  subjectId?: string;
  subjectCode?: string;
  tag?: string;
  reports: Report[];
  count: number;
}

export interface StudentReportsResponse {
  timeline: Report[];
  bySubject: GroupedReports[];
  byCustomTag: GroupedReports[];
  totals: {
    total: number;
    bySubject: number;
    byCustomTag: number;
  };
}

export interface StudentReportStats {
  totalReports: number;
  bySubject: { subjectName: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byPriority: { priority: number; count: number }[];
  recentActivity: string | null;
}

export interface SubjectsAndCategories {
  subjects: Subject[];
  customCategories: string[];
}

export interface CreateReportDto {
  studentId: string;
  subjectId?: string;
  customTag?: string;
  content: string;
  title?: string;
  priority?: number;
  visibleToFamily?: boolean;
  academicYearId?: string;
}

export interface UpdateReportDto {
  subjectId?: string | null;
  customTag?: string | null;
  content?: string;
  title?: string | null;
  priority?: number;
  visibleToFamily?: boolean;
  isArchived?: boolean;
}

export interface QueryReportsParams {
  studentId?: string;
  authorTeacherId?: string;
  subjectId?: string;
  customTag?: string;
  academicYearId?: string;
  priority?: number;
  visibleToFamily?: boolean;
  includeArchived?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'subject';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  search?: string;
}

// ===== API SERVICE =====

const studentReportsService = {
  /**
   * Crea un nuevo reporte de estudiante
   */
  async createReport(data: CreateReportDto): Promise<Report> {
    const response = await apiClient.post('/student-reports', data);
    return response.data.data;
  },

  /**
   * Actualiza un reporte existente
   */
  async updateReport(reportId: string, data: UpdateReportDto): Promise<Report> {
    const response = await apiClient.patch(`/student-reports/${reportId}`, data);
    return response.data.data;
  },

  /**
   * Elimina un reporte
   */
  async deleteReport(reportId: string): Promise<void> {
    await apiClient.delete(`/student-reports/${reportId}`);
  },

  /**
   * Obtiene un reporte por ID
   */
  async getReportById(reportId: string): Promise<Report> {
    const response = await apiClient.get(`/student-reports/${reportId}`);
    return response.data.data;
  },

  /**
   * Obtiene todos los reportes de un estudiante (vista para tutores)
   */
  async getStudentReports(
    studentId: string,
    params?: QueryReportsParams
  ): Promise<{ data: StudentReportsResponse; meta: { total: number; page: number; limit: number } }> {
    const response = await apiClient.get(`/student-reports/student/${studentId}`, { params });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },

  /**
   * Obtiene estadísticas de reportes de un estudiante
   */
  async getStudentStats(
    studentId: string,
    academicYearId?: string
  ): Promise<StudentReportStats> {
    const response = await apiClient.get(`/student-reports/student/${studentId}/stats`, {
      params: { academicYearId },
    });
    return response.data.data;
  },

  /**
   * Obtiene los reportes creados por el profesor autenticado
   */
  async getMyReports(
    params?: QueryReportsParams
  ): Promise<{ data: Report[]; meta: { total: number; page: number; limit: number } }> {
    const response = await apiClient.get('/student-reports/my-reports', { params });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },

  /**
   * Obtiene las asignaturas que el profesor imparte al estudiante
   * y las categorías personalizadas disponibles
   */
  async getSubjectsAndCategories(
    studentId: string,
    academicYearId?: string
  ): Promise<SubjectsAndCategories> {
    const response = await apiClient.get(`/student-reports/subjects-for-student/${studentId}`, {
      params: { academicYearId },
    });
    return response.data.data;
  },

  /**
   * Obtiene las categorías predefinidas
   */
  async getCategories(): Promise<string[]> {
    const response = await apiClient.get('/student-reports/categories');
    return response.data.data;
  },
};

export default studentReportsService;
