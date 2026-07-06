/**
 * @archivo: teacherAccessService.ts
 * @módulo: Admin - Teacher Student Access
 * @función: Servicio API para gestión de accesos de profesores a estudiantes
 */

import apiClient from './apiClient';

// ===== TYPES =====

export interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
}

export interface StudentInfo {
  id: string;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

export interface AcademicYearInfo {
  id: string;
  name: string;
}

export interface GrantedByInfo {
  id: string;
  firstName: string;
  lastName: string;
}

export type AccessType = 'read' | 'write' | 'full';
export type AccessReason =
  | 'tutor'
  | 'support'
  | 'coordinator'
  | 'counselor'
  | 'substitute'
  | 'special_needs'
  | 'admin_override'
  | 'other';

export interface TeacherStudentAccess {
  id: string;
  teacher: TeacherInfo | null;
  student: StudentInfo | null;
  academicYear: AcademicYearInfo | null;
  accessType: AccessType;
  accessTypeLabel: string;
  reason: AccessReason;
  reasonLabel: string;
  notes: string | null;
  isActive: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  isValid: boolean;
  grantedBy: GrantedByInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccessDto {
  teacherId: string;
  studentId: string;
  academicYearId: string;
  accessType: AccessType;
  reason: AccessReason;
  notes?: string;
  expiresAt?: string;
}

export interface UpdateAccessDto {
  accessType?: AccessType;
  reason?: AccessReason;
  notes?: string;
  expiresAt?: string | null;
  isActive?: boolean;
}

export interface QueryAccessDto {
  teacherId?: string;
  studentId?: string;
  academicYearId?: string;
  accessType?: AccessType;
  reason?: AccessReason;
  isActive?: boolean;
}

export interface AccessOption {
  value: string;
  label: string;
}

export interface BulkAssignDto {
  teacherId: string;
  academicYearId: string;
  studentIds: string[];
  accessType?: AccessType;
  reason?: AccessReason;
  notes?: string;
}

export interface BulkAssignAllDto {
  teacherId: string;
  academicYearId: string;
  accessType?: AccessType;
  reason?: AccessReason;
  notes?: string;
}

export interface BulkAssignResult {
  created: number;
  skipped: number;
  total: number;
}

// ===== API SERVICE =====

const teacherAccessService = {
  /**
   * Crear un nuevo acceso
   */
  async createAccess(data: CreateAccessDto): Promise<TeacherStudentAccess> {
    const response = await apiClient.post('/teacher-student-access', data);
    return response.data.data;
  },

  /**
   * Actualizar un acceso existente
   */
  async updateAccess(id: string, data: UpdateAccessDto): Promise<TeacherStudentAccess> {
    const response = await apiClient.patch(`/teacher-student-access/${id}`, data);
    return response.data.data;
  },

  /**
   * Eliminar un acceso
   */
  async deleteAccess(id: string): Promise<void> {
    await apiClient.delete(`/teacher-student-access/${id}`);
  },

  /**
   * Desactivar un acceso (soft delete)
   */
  async deactivateAccess(id: string): Promise<TeacherStudentAccess> {
    const response = await apiClient.patch(`/teacher-student-access/${id}/deactivate`);
    return response.data.data;
  },

  /**
   * Obtener un acceso por ID
   */
  async getAccess(id: string): Promise<TeacherStudentAccess> {
    const response = await apiClient.get(`/teacher-student-access/${id}`);
    return response.data.data;
  },

  /**
   * Listar todos los accesos con filtros
   */
  async getAllAccess(query?: QueryAccessDto): Promise<TeacherStudentAccess[]> {
    const response = await apiClient.get('/teacher-student-access', { params: query });
    return response.data.data;
  },

  /**
   * Obtener accesos de un profesor específico
   */
  async getByTeacher(
    teacherId: string,
    academicYearId?: string,
    activeOnly = true
  ): Promise<TeacherStudentAccess[]> {
    const response = await apiClient.get(`/teacher-student-access/by-teacher/${teacherId}`, {
      params: { academicYearId, activeOnly },
    });
    return response.data.data;
  },

  /**
   * Obtener profesores con acceso a un estudiante
   */
  async getByStudent(
    studentId: string,
    academicYearId?: string,
    activeOnly = true
  ): Promise<TeacherStudentAccess[]> {
    const response = await apiClient.get(`/teacher-student-access/by-student/${studentId}`, {
      params: { academicYearId, activeOnly },
    });
    return response.data.data;
  },

  /**
   * Copiar accesos de un año a otro
   */
  async copyToNewYear(
    fromAcademicYearId: string,
    toAcademicYearId: string
  ): Promise<{ copiedCount: number; message: string }> {
    const response = await apiClient.post('/teacher-student-access/copy-to-year', {
      fromAcademicYearId,
      toAcademicYearId,
    });
    return response.data.data;
  },

  /**
   * Obtener tipos de acceso disponibles
   */
  async getAccessTypes(): Promise<AccessOption[]> {
    const response = await apiClient.get('/teacher-student-access/options/access-types');
    return response.data.data;
  },

  /**
   * Obtener razones de acceso disponibles
   */
  async getAccessReasons(): Promise<AccessOption[]> {
    const response = await apiClient.get('/teacher-student-access/options/reasons');
    return response.data.data;
  },

  /**
   * Asignar acceso a una selección de alumnos para un profesor
   */
  async bulkAssign(data: BulkAssignDto): Promise<BulkAssignResult> {
    const response = await apiClient.post('/teacher-student-access/bulk-assign', data);
    return response.data.data;
  },

  /**
   * Asignar acceso masivo a TODOS los alumnos activos para un profesor
   */
  async bulkAssignAll(data: BulkAssignAllDto): Promise<BulkAssignResult> {
    const response = await apiClient.post('/teacher-student-access/bulk-assign-all', data);
    return response.data.data;
  },
};

export default teacherAccessService;
