/**
 * @archivo: index.ts
 * @módulo: Assignments - Guards
 * @función: Exportaciones centralizadas de guards, decoradores y seguridad
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Archivo barril que exporta todos los componentes de seguridad y autorización
 * del módulo de asignaciones para facilitar las importaciones.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.5
 */

// === LOCAL TYPES ===
export enum LocalAuditEventType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ACCESS = 'access',
  BULK_UPDATE = 'bulk_update'
}

export enum LocalOwnershipType {
  CREATOR = 'creator',
  ASSIGNEE = 'assignee',
  MANAGER = 'manager'
}

export interface AuditConfig {
  eventType: LocalAuditEventType;
  description?: string;
  includeBody: boolean;
  includeResponse: boolean;
  includeHeaders: boolean;
  sensitiveFields: string[];
}

export interface OwnershipConfig {
  type?: LocalOwnershipType;
  paramName?: string;
  allowSelfAccess?: boolean;
  allowManagerAccess?: boolean;
  allowCreator?: boolean;
  allowTargets?: boolean;
  strict?: boolean;
}

// === GUARDS ===
export * from './assignment-permissions.guard';
export * from './resource-ownership.guard';

// === DECORATORS ===
export * from '../decorators/permissions.decorator';

// === MIDDLEWARE ===
export * from '../middleware/assignment-rate-limit.middleware';

// === INTERCEPTORS ===
// export * from '../interceptors/audit-log.interceptor'; // DISABLED - Audit system removed

// === TYPES Y ENUMS ===
export {
  AssignmentPermission,
  AccessContext,
} from './assignment-permissions.guard';

export {
  OwnershipType as ResourceOwnershipType,
  OwnershipConfig as ResourceOwnershipConfig,
} from './resource-ownership.guard';

// export {
//   AuditEventType as GuardAuditEventType,
//   AuditConfig as GuardAuditConfig,
//   AuditLogEntry,
// } from '../interceptors/audit-log.interceptor'; // DISABLED - Audit system removed

// === CONSTANTES Y CONFIGURACIÓN ===
export const ASSIGNMENT_SECURITY_CONFIG = {
  // Configuración de rate limiting por defecto
  DEFAULT_RATE_LIMITS: {
    student: {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 30,
    },
    teacher: {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 100,
    },
    family: {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 50,
    },
    admin: {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 500,
    },
  },
  
  // Eventos de auditoría críticos
  CRITICAL_AUDIT_EVENTS: [
    'CAMPAIGN_DELETED',
    'BULK_OPERATION',
    'SYSTEM_CONFIG_CHANGED',
    'UNAUTHORIZED_ACCESS',
    'SUSPICIOUS_ACTIVITY',
  ],
  
  // Campos sensibles a sanitizar en logs
  SENSITIVE_FIELDS: [
    'password',
    'token',
    'secret',
    'apiKey',
    'authToken',
    'refreshToken',
    'personalData',
  ],
  
  // Cache TTL para permisos (en milisegundos)
  PERMISSION_CACHE_TTL: 60 * 1000, // 1 minuto
  
  // Configuración de ownership por defecto
  DEFAULT_OWNERSHIP_CONFIG: {
    allowCreator: true,
    allowTargets: false,
    strict: true,
  },
};

// === UTILITY FUNCTIONS ===

/**
 * Crea configuración de auditoría básica
 */
export function createBasicAuditConfig(
  eventType: LocalAuditEventType,
  description?: string,
): AuditConfig {
  return {
    eventType,
    description,
    includeBody: false,
    includeResponse: false,
    includeHeaders: false,
    sensitiveFields: ASSIGNMENT_SECURITY_CONFIG.SENSITIVE_FIELDS,
  };
}

/**
 * Crea configuración de auditoría detallada
 */
export function createDetailedAuditConfig(
  eventType: LocalAuditEventType,
  description?: string,
): AuditConfig {
  return {
    eventType,
    description,
    includeBody: true,
    includeResponse: true,
    includeHeaders: true,
    sensitiveFields: ASSIGNMENT_SECURITY_CONFIG.SENSITIVE_FIELDS,
  };
}

/**
 * Crea configuración de ownership básica
 */
export function createOwnershipConfig(
  type: LocalOwnershipType,
  paramName?: string,
  options?: Partial<OwnershipConfig>,
): OwnershipConfig {
  return {
    type,
    paramName: paramName || 'id',
    ...ASSIGNMENT_SECURITY_CONFIG.DEFAULT_OWNERSHIP_CONFIG,
    ...options,
  };
}

/**
 * Verifica si un evento es crítico
 */
export function isCriticalEvent(eventType: LocalAuditEventType): boolean {
  return ASSIGNMENT_SECURITY_CONFIG.CRITICAL_AUDIT_EVENTS.includes(eventType as string);
}

/**
 * Obtiene límite de rate para un rol
 */
export function getRateLimitForRole(role: string): { windowMs: number; maxRequests: number } {
  const config = ASSIGNMENT_SECURITY_CONFIG.DEFAULT_RATE_LIMITS[role as keyof typeof ASSIGNMENT_SECURITY_CONFIG.DEFAULT_RATE_LIMITS];
  return config || ASSIGNMENT_SECURITY_CONFIG.DEFAULT_RATE_LIMITS.student;
}

// === VALIDATION HELPERS ===

/**
 * Valida si un usuario tiene un rol específico
 */
export function hasRole(user: any, roles: string[]): boolean {
  return user && roles.includes(user.role);
}

/**
 * Valida si un usuario es admin
 */
export function isAdmin(user: any): boolean {
  return hasRole(user, ['admin']);
}

/**
 * Valida si un usuario es profesor
 */
export function isTeacher(user: any): boolean {
  return hasRole(user, ['teacher', 'admin']);
}

/**
 * Valida si un usuario es estudiante
 */
export function isStudent(user: any): boolean {
  return hasRole(user, ['student']);
}

/**
 * Valida si un usuario es familia
 */
export function isFamily(user: any): boolean {
  return hasRole(user, ['family']);
}

/**
 * Extrae el ID de usuario del request
 */
export function extractUserId(request: any): string | undefined {
  return request.user?.userId ||
         request.params?.userId ||
         request.body?.userId ||
         request.query?.userId;
}

/**
 * Extrae el ID de recurso del request
 */
export function extractResourceId(request: any): string | undefined {
  return request.params?.id ||
         request.params?.campaignId ||
         request.body?.campaignId ||
         request.query?.campaignId;
}

/**
 * Crea contexto de acceso básico
 */
export function createAccessContext(request: any): any {
  const user = request.user;
  return {
    userId: user?.userId || '',
    userRole: user?.role || '',
    campaignId: extractResourceId(request),
    targetUserId: request.params?.userId || request.query?.userId,
    classId: request.params?.classId || request.body?.classId,
    action: `${request.method}:${request.route?.path || request.url}`,
  };
}

// === ERROR MESSAGES ===
export const SECURITY_ERROR_MESSAGES = {
  UNAUTHORIZED: 'Usuario no autenticado',
  FORBIDDEN: 'Acceso denegado',
  INSUFFICIENT_PERMISSIONS: 'Permisos insuficientes',
  RESOURCE_NOT_FOUND: 'Recurso no encontrado',
  OWNERSHIP_REQUIRED: 'Se requiere ser propietario del recurso',
  RATE_LIMIT_EXCEEDED: 'Demasiadas solicitudes. Intenta más tarde.',
  INVALID_ROLE: 'Rol de usuario inválido',
  CAMPAIGN_NOT_EDITABLE: 'La campaña no se puede editar en su estado actual',
  BULK_OPERATION_DENIED: 'Operaciones masivas no permitidas',
};

// === SECURITY POLICIES ===
export const SECURITY_POLICIES = {
  // Roles que pueden crear campañas
  CAMPAIGN_CREATORS: ['admin', 'teacher'],
  
  // Roles que pueden ver analytics
  ANALYTICS_VIEWERS: ['admin', 'teacher'],
  
  // Roles que pueden realizar operaciones masivas
  BULK_OPERATORS: ['admin'],
  
  // Roles que pueden configurar el sistema
  SYSTEM_CONFIGURATORS: ['admin'],
  
  // Roles que pueden generar reportes
  REPORT_GENERATORS: ['admin', 'teacher'],
  
  // Roles que pueden exportar datos
  DATA_EXPORTERS: ['admin', 'teacher'],
};

/**
 * Verifica si un usuario puede realizar una operación según las políticas
 */
export function canPerformOperation(
  user: any, 
  operation: keyof typeof SECURITY_POLICIES,
): boolean {
  const allowedRoles = SECURITY_POLICIES[operation];
  return hasRole(user, allowedRoles);
}