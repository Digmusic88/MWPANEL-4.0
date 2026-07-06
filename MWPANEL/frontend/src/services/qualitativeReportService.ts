/**
 * @archivo: qualitativeReportService.ts
 * @módulo: Teacher - Qualitative Reports
 * @función: Servicio API para informes cualitativos de profesores
 */

import apiClient from './apiClient';

// ===== TYPES =====

export interface StudentInfo {
  id: string;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  classGroup?: string;
}

export interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  photoUrl?: string;
}

export interface QualitativeReport {
  id: string;
  studentId: string;
  student: StudentInfo | null;
  author: TeacherInfo | null;
  contextTag: string;
  content: string;
  priority: number;
  priorityLabel: string;
  visibleToFamily: boolean;
  createdAt: string;
  updatedAt: string;
  wasEdited: boolean;
}

export interface AssignedStudent {
  permissionId: string;
  student: StudentInfo | null;
  hasReport: boolean;
  reportsCount: number;
  reports: { id: string; contextTag: string; updatedAt: string }[];
  createdAt: string;
}

export interface CreateReportDto {
  studentId: string;
  contextTag: string;
  content: string;
  priority?: number;
  visibleToFamily?: boolean;
  academicYearId?: string;
}

export interface UpdateReportDto {
  contextTag?: string;
  content?: string;
  priority?: number;
  visibleToFamily?: boolean;
}

export interface StudentReportStats {
  totalReports: number;
  byContext: { contextTag: string; count: number }[];
  byPriority: { priority: number; count: number }[];
  lastReportDate: string | null;
}

export interface ContextTags {
  predefined: string[];
  used: string[];
  all: string[];
}

// ===== API SERVICE =====

const qualitativeReportService = {
  // ===== VISTA DEL PROFESOR =====

  /**
   * Obtener estudiantes asignados (solicitudes de informe)
   */
  async getMyAssignments(academicYearId?: string): Promise<{
    data: AssignedStudent[];
    meta: { total: number; withReports: number; pending: number };
  }> {
    const response = await apiClient.get('/qualitative-reports/my-assignments', {
      params: { academicYearId },
    });
    return response.data;
  },

  /**
   * Obtener mis informes escritos
   */
  async getMyReports(academicYearId?: string): Promise<QualitativeReport[]> {
    const response = await apiClient.get('/qualitative-reports/my-reports', {
      params: { academicYearId },
    });
    return response.data.data;
  },

  /**
   * Crear un informe
   */
  async createReport(data: CreateReportDto): Promise<QualitativeReport> {
    const response = await apiClient.post('/qualitative-reports', data);
    return response.data.data;
  },

  /**
   * Actualizar un informe
   */
  async updateReport(id: string, data: UpdateReportDto): Promise<QualitativeReport> {
    const response = await apiClient.patch(`/qualitative-reports/${id}`, data);
    return response.data.data;
  },

  /**
   * Eliminar un informe
   */
  async deleteReport(id: string): Promise<void> {
    await apiClient.delete(`/qualitative-reports/${id}`);
  },

  /**
   * Obtener informe existente para un estudiante
   */
  async getExistingReport(
    studentId: string,
    contextTag?: string,
    academicYearId?: string,
  ): Promise<QualitativeReport | null> {
    const response = await apiClient.get(`/qualitative-reports/for-student/${studentId}`, {
      params: { contextTag, academicYearId },
    });
    return response.data.data;
  },

  /**
   * Obtener etiquetas de contexto disponibles
   */
  async getContextTags(academicYearId?: string): Promise<ContextTags> {
    const response = await apiClient.get('/qualitative-reports/context-tags', {
      params: { academicYearId },
    });
    return response.data.data;
  },

  // ===== VISTA DEL TUTOR =====

  /**
   * Obtener todos los informes de un estudiante
   */
  async getStudentReports(
    studentId: string,
    academicYearId?: string,
  ): Promise<{
    timeline: QualitativeReport[];
    byContext: { context: string; reports: QualitativeReport[]; count: number }[];
    stats: StudentReportStats;
  }> {
    const response = await apiClient.get(`/qualitative-reports/student/${studentId}`, {
      params: { academicYearId },
    });
    return response.data.data;
  },

  /**
   * Dashboard del tutor: ver todos los informes de estudiantes tutorados
   */
  async getTutorDashboard(academicYearId?: string): Promise<TutorDashboardData> {
    const response = await apiClient.get('/qualitative-reports/tutor-dashboard', {
      params: { academicYearId },
    });
    return {
      classGroups: response.data.data,
      summary: response.data.summary,
    };
  },
};

// ===== TYPES FOR TUTOR DASHBOARD =====

export interface TutorStudentReport {
  id: string;
  contextTag: string;
  content: string;
  priority: number;
  priorityLabel: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface TutorStudent {
  id: string;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  reports: TutorStudentReport[];
  totalReports: number;
  hasHighPriority: boolean;
  lastReportDate: string | null;
}

export interface TutorClassGroup {
  id: string;
  name: string;
  students: TutorStudent[];
  totalStudents: number;
  totalReports: number;
  studentsWithReports: number;
}

export interface TutorDashboardSummary {
  totalGroups: number;
  totalStudents: number;
  totalReports: number;
  studentsWithReports: number;
  highPriorityCount: number;
}

export interface TutorDashboardData {
  classGroups: TutorClassGroup[];
  summary: TutorDashboardSummary;
}

// ===== PDF DOWNLOADS =====

/**
 * Descargar PDF de un estudiante individual
 */
export const downloadStudentReportPdf = async (
  studentId: string,
  studentName: string,
  academicYearId?: string,
): Promise<void> => {
  const response = await apiClient.get(
    `/qualitative-reports/tutor-pdf/student/${studentId}`,
    {
      params: { academicYearId },
      responseType: 'blob',
    },
  );

  // Crear enlace de descarga
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Informe_${studentName.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Descargar PDF con todos los estudiantes
 */
export const downloadAllStudentsReportPdf = async (
  academicYearId?: string,
): Promise<void> => {
  const response = await apiClient.get(
    '/qualitative-reports/tutor-pdf/all',
    {
      params: { academicYearId },
      responseType: 'blob',
    },
  );

  // Crear enlace de descarga
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fecha = new Date().toISOString().slice(0, 10);
  link.download = `Informes_Tutorados_${fecha}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default qualitativeReportService;
