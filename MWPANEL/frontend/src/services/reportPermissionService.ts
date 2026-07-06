/**
 * @archivo: reportPermissionService.ts
 * @módulo: Admin - Report Permissions
 * @función: Servicio API para gestión de permisos de informes por el Admin
 */

import apiClient from './apiClient';

// Re-export types for components
export type { AssignByMultipleGroupsDto };

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
  classGroup?: string;
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

export interface ReportPermission {
  id: string;
  teacher: TeacherInfo | null;
  student: StudentInfo | null;
  academicYear: AcademicYearInfo | null;
  grantedBy: GrantedByInfo | null;
  adminNote: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BulkAssignDto {
  teacherId: string;
  studentIds: string[];
  academicYearId: string;
  adminNote?: string;
}

export interface AssignByGroupDto {
  teacherId: string;
  classGroupId: string;
  academicYearId: string;
  adminNote?: string;
}

export interface AssignByMultipleGroupsDto {
  teacherId: string;
  classGroupIds: string[];
  academicYearId: string;
  adminNote?: string;
}

export interface PermissionStats {
  totalPermissions: number;
  activePermissions: number;
  teachersWithPermissions: number;
  studentsWithReporters: number;
}

// ===== API SERVICE =====

const reportPermissionService = {
  /**
   * Asignación masiva de permisos
   */
  async bulkAssign(data: BulkAssignDto): Promise<{ created: number; skipped: number }> {
    const response = await apiClient.post('/report-permissions/bulk-assign', data);
    return response.data.data;
  },

  /**
   * Asignación por grupo de clase (un solo grupo)
   */
  async assignByGroup(data: AssignByGroupDto): Promise<{ created: number; skipped: number }> {
    const response = await apiClient.post('/report-permissions/assign-by-group', data);
    return response.data.data;
  },

  /**
   * Asignación por múltiples grupos de clase
   */
  async assignByMultipleGroups(data: AssignByMultipleGroupsDto): Promise<{ created: number; skipped: number }> {
    const response = await apiClient.post('/report-permissions/assign-by-multiple-groups', data);
    return response.data.data;
  },

  /**
   * Revocar permisos masivamente
   */
  async bulkRevoke(permissionIds: string[]): Promise<{ revoked: number }> {
    const response = await apiClient.post('/report-permissions/bulk-revoke', { permissionIds });
    return response.data.data;
  },

  /**
   * Desactivar permisos (soft delete)
   */
  async deactivate(permissionIds: string[]): Promise<{ deactivated: number }> {
    const response = await apiClient.post('/report-permissions/deactivate', { permissionIds });
    return response.data.data;
  },

  /**
   * Listar todos los permisos
   */
  async getAll(query?: {
    teacherId?: string;
    studentId?: string;
    academicYearId?: string;
    activeOnly?: boolean;
  }): Promise<ReportPermission[]> {
    const response = await apiClient.get('/report-permissions', { params: query });
    return response.data.data;
  },

  /**
   * Obtener estadísticas
   */
  async getStats(academicYearId?: string): Promise<PermissionStats> {
    const response = await apiClient.get('/report-permissions/stats', {
      params: { academicYearId },
    });
    return response.data.data;
  },

  /**
   * Actualizar un permiso
   */
  async update(id: string, data: { isActive?: boolean; adminNote?: string }): Promise<ReportPermission> {
    const response = await apiClient.patch(`/report-permissions/${id}`, data);
    return response.data.data;
  },

  /**
   * Eliminar un permiso
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/report-permissions/${id}`);
  },
};

export default reportPermissionService;
