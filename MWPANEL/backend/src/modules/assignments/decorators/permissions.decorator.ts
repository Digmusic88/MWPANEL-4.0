/**
 * @archivo: permissions.decorator.ts
 * @módulo: Assignments - Decorators
 * @función: Decoradores para permisos y autorización simplificada
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Decoradores que simplifican la aplicación de guards de permisos
 * y validación de ownership en controladores y métodos.
 * 
 * FUNCIONALIDADES:
 * - Decoradores de permisos granulares
 * - Combinación automática de guards
 * - Configuración de ownership simplificada
 * - Validaciones de rol contextuales
 * - Metadatos de autorización
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.5
 */

import { applyDecorators, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { 
  AssignmentPermissionsGuard, 
  AssignmentPermission,
  AssignmentPermissions,
} from '../guards/assignment-permissions.guard';
import {
  ResourceOwnershipGuard,
  OwnershipType,
  RequireOwnership,
} from '../guards/resource-ownership.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Configuración completa de autorización
 */
export interface AuthorizationConfig {
  roles?: UserRole[];
  permissions?: AssignmentPermission[];
  ownership?: {
    type: OwnershipType;
    paramName?: string;
    allowCreator?: boolean;
    allowTargets?: boolean;
    strict?: boolean;
  };
  requireAuth?: boolean;
}

/**
 * Decorador principal que combina autenticación, roles, permisos y ownership
 */
export function RequireAssignmentAuth(config: AuthorizationConfig) {
  const decorators = [];

  // Siempre requerir autenticación JWT
  if (config.requireAuth !== false) {
    decorators.push(UseGuards(AuthGuard('jwt')));
  }

  // Aplicar guard de roles si se especifican
  if (config.roles && config.roles.length > 0) {
    decorators.push(Roles(...config.roles));
    decorators.push(UseGuards(RolesGuard));
  }

  // Aplicar guard de permisos si se especifican
  if (config.permissions && config.permissions.length > 0) {
    decorators.push(AssignmentPermissions(...config.permissions));
    decorators.push(UseGuards(AssignmentPermissionsGuard));
  }

  // Aplicar guard de ownership si se especifica
  if (config.ownership) {
    decorators.push(RequireOwnership(config.ownership));
    decorators.push(UseGuards(ResourceOwnershipGuard));
  }

  return applyDecorators(...decorators);
}

// === DECORADORES ESPECÍFICOS DE CAMPAÑA ===

/**
 * Decorador para operaciones de creación de campaña
 */
export function CanCreateCampaign() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN, UserRole.TEACHER],
    permissions: [AssignmentPermission.CREATE_CAMPAIGN],
  });
}

/**
 * Decorador para operaciones de lectura de campaña
 */
export function CanReadCampaign() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.READ_CAMPAIGN],
    ownership: {
      type: OwnershipType.CAMPAIGN,
      allowCreator: true,
      allowTargets: true,
    },
  });
}

/**
 * Decorador para operaciones de actualización de campaña
 */
export function CanUpdateCampaign() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.UPDATE_CAMPAIGN],
    ownership: {
      type: OwnershipType.CAMPAIGN,
      allowCreator: true,
      strict: true,
    },
  });
}

/**
 * Decorador para operaciones de eliminación de campaña
 */
export function CanDeleteCampaign() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.DELETE_CAMPAIGN],
    ownership: {
      type: OwnershipType.CAMPAIGN,
      allowCreator: true,
      strict: true,
    },
  });
}

/**
 * Decorador para activación de campaña
 */
export function CanActivateCampaign() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.ACTIVATE_CAMPAIGN],
    ownership: {
      type: OwnershipType.CAMPAIGN,
      allowCreator: true,
      strict: true,
    },
  });
}

/**
 * Decorador para clonación de campaña
 */
export function CanCloneCampaign() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN, UserRole.TEACHER],
    permissions: [AssignmentPermission.CLONE_CAMPAIGN],
    ownership: {
      type: OwnershipType.CAMPAIGN,
      allowCreator: true,
      allowTargets: true,
    },
  });
}

// === DECORADORES ESPECÍFICOS DE PROGRESO ===

/**
 * Decorador para visualización de progreso
 */
export function CanViewProgress() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.VIEW_PROGRESS],
    ownership: {
      type: OwnershipType.SELF,
      paramName: 'userId',
      allowCreator: true,
    },
  });
}

/**
 * Decorador para actualización de progreso
 */
export function CanUpdateProgress() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.UPDATE_PROGRESS],
    ownership: {
      type: OwnershipType.SELF,
      paramName: 'userId',
      allowCreator: true,
    },
  });
}

/**
 * Decorador para registro de actividad
 */
export function CanRecordActivity() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.RECORD_ACTIVITY],
  });
}

/**
 * Decorador para marcar como completado
 */
export function CanMarkComplete() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.MARK_COMPLETE],
    ownership: {
      type: OwnershipType.SELF,
      paramName: 'userId',
      allowCreator: true,
    },
  });
}

// === DECORADORES ESPECÍFICOS DE ANALYTICS ===

/**
 * Decorador para analytics básicos
 */
export function CanViewAnalytics() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN, UserRole.TEACHER],
    permissions: [AssignmentPermission.VIEW_ANALYTICS],
  });
}

/**
 * Decorador para analytics detallados
 */
export function CanViewDetailedAnalytics() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN],
    permissions: [AssignmentPermission.VIEW_DETAILED_ANALYTICS],
  });
}

/**
 * Decorador para exportación de datos
 */
export function CanExportData() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN, UserRole.TEACHER],
    permissions: [AssignmentPermission.EXPORT_DATA],
  });
}

// === DECORADORES ESPECÍFICOS DE REPORTES ===

/**
 * Decorador para generación de reportes
 */
export function CanGenerateReports() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN, UserRole.TEACHER],
    permissions: [AssignmentPermission.GENERATE_REPORTS],
  });
}

/**
 * Decorador para acceso a reportes de estudiante
 */
export function CanAccessStudentReports() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.ACCESS_STUDENT_REPORTS],
    ownership: {
      type: OwnershipType.SELF,
      paramName: 'userId',
      allowCreator: true,
    },
  });
}

/**
 * Decorador para acceso a reportes de clase
 */
export function CanAccessClassReports() {
  return RequireAssignmentAuth({
    permissions: [AssignmentPermission.ACCESS_CLASS_REPORTS],
    ownership: {
      type: OwnershipType.CLASS_MEMBER,
      paramName: 'classId',
    },
  });
}

// === DECORADORES ADMINISTRATIVOS ===

/**
 * Decorador para operaciones masivas
 */
export function CanPerformBulkOperations() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN],
    permissions: [AssignmentPermission.BULK_OPERATIONS],
  });
}

/**
 * Decorador para configuración del sistema
 */
export function CanConfigureSystem() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN],
    permissions: [AssignmentPermission.SYSTEM_CONFIG],
  });
}

/**
 * Decorador para gestión completa de asignaciones
 */
export function CanManageAssignments() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN],
    permissions: [AssignmentPermission.MANAGE_ASSIGNMENTS],
  });
}

// === DECORADORES CONTEXTUALES ===

/**
 * Decorador para endpoints de estudiante
 */
export function StudentEndpoint() {
  return RequireAssignmentAuth({
    roles: [UserRole.STUDENT, UserRole.ADMIN, UserRole.TEACHER],
    ownership: {
      type: OwnershipType.SELF,
      strict: false,
    },
  });
}

/**
 * Decorador para endpoints de familia
 */
export function FamilyEndpoint() {
  return RequireAssignmentAuth({
    roles: [UserRole.FAMILY, UserRole.ADMIN],
    ownership: {
      type: OwnershipType.FAMILY_MEMBER,
      paramName: 'studentId',
    },
  });
}

/**
 * Decorador para endpoints de profesor
 */
export function TeacherEndpoint() {
  return RequireAssignmentAuth({
    roles: [UserRole.TEACHER, UserRole.ADMIN],
  });
}

/**
 * Decorador para endpoints administrativos
 */
export function AdminEndpoint() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN],
  });
}

// === DECORADORES COMBINADOS ===

/**
 * Decorador para dashboard de profesor
 */
export function TeacherDashboard() {
  return RequireAssignmentAuth({
    roles: [UserRole.TEACHER, UserRole.ADMIN],
    permissions: [
      AssignmentPermission.VIEW_ANALYTICS,
      AssignmentPermission.ACCESS_CLASS_REPORTS,
    ],
  });
}

/**
 * Decorador para dashboard de estudiante
 */
export function StudentDashboard() {
  return RequireAssignmentAuth({
    roles: [UserRole.STUDENT, UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY],
    permissions: [AssignmentPermission.VIEW_PROGRESS],
    ownership: {
      type: OwnershipType.SELF,
      paramName: 'studentId',
      allowCreator: true,
    },
  });
}

/**
 * Decorador para operaciones de campaña completa
 */
export function CampaignFullAccess() {
  return RequireAssignmentAuth({
    roles: [UserRole.ADMIN, UserRole.TEACHER],
    permissions: [
      AssignmentPermission.READ_CAMPAIGN,
      AssignmentPermission.UPDATE_CAMPAIGN,
      AssignmentPermission.VIEW_PROGRESS,
    ],
    ownership: {
      type: OwnershipType.CAMPAIGN,
      allowCreator: true,
      allowTargets: false,
    },
  });
}

// === UTILIDADES ===

/**
 * Decorador personalizable para casos específicos
 */
export function CustomAssignmentAuth(
  permissions: AssignmentPermission[],
  roles?: UserRole[],
  ownershipType?: OwnershipType,
  ownershipParam?: string,
) {
  return RequireAssignmentAuth({
    roles,
    permissions,
    ownership: ownershipType ? {
      type: ownershipType,
      paramName: ownershipParam,
      allowCreator: true,
      allowTargets: ownershipType === OwnershipType.CAMPAIGN,
    } : undefined,
  });
}

/**
 * Decorador solo para autenticación (sin permisos específicos)
 */
export function RequireAuth() {
  return RequireAssignmentAuth({});
}

/**
 * Decorador que permite acceso público (sin autenticación)
 */
export function PublicEndpoint() {
  return RequireAssignmentAuth({
    requireAuth: false,
  });
}