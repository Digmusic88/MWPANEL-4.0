/**
 * @archivo: assignment-permissions.guard.ts
 * @módulo: Assignments - Guards
 * @función: Guard principal para permisos granulares de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Guard especializado para validar permisos granulares en el sistema de asignaciones.
 * Implementa RBAC/ABAC híbrido con validación de contexto y recursos específicos.
 * 
 * FUNCIONALIDADES:
 * - Validación de permisos por rol y acción
 * - Control de acceso basado en atributos (ABAC)
 * - Validación de ownership de recursos
 * - Permisos contextuales dinámicos
 * - Logging de auditoría de acceso
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.5
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentCampaign } from '../entities/assignment-campaign.entity';
import { CampaignTarget } from '../entities/campaign-target.entity';
import { AssignmentProgress } from '../entities/assignment-progress.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Tipos de permisos granulares
 */
export enum AssignmentPermission {
  // Permisos de campaña
  CREATE_CAMPAIGN = 'assignment:campaign:create',
  READ_CAMPAIGN = 'assignment:campaign:read',
  UPDATE_CAMPAIGN = 'assignment:campaign:update',
  DELETE_CAMPAIGN = 'assignment:campaign:delete',
  ACTIVATE_CAMPAIGN = 'assignment:campaign:activate',
  CLONE_CAMPAIGN = 'assignment:campaign:clone',
  
  // Permisos de progreso
  VIEW_PROGRESS = 'assignment:progress:view',
  UPDATE_PROGRESS = 'assignment:progress:update',
  RECORD_ACTIVITY = 'assignment:progress:record',
  MARK_COMPLETE = 'assignment:progress:complete',
  
  // Permisos de analytics
  VIEW_ANALYTICS = 'assignment:analytics:view',
  VIEW_DETAILED_ANALYTICS = 'assignment:analytics:detailed',
  EXPORT_DATA = 'assignment:analytics:export',
  
  // Permisos administrativos
  MANAGE_ASSIGNMENTS = 'assignment:admin:manage',
  BULK_OPERATIONS = 'assignment:admin:bulk',
  SYSTEM_CONFIG = 'assignment:admin:config',
  
  // Permisos de reportes
  GENERATE_REPORTS = 'assignment:reports:generate',
  ACCESS_STUDENT_REPORTS = 'assignment:reports:student',
  ACCESS_CLASS_REPORTS = 'assignment:reports:class',
}

/**
 * Contexto de acceso para validación granular
 */
export interface AccessContext {
  userId: string;
  userRole: string;
  campaignId?: string;
  targetUserId?: string;
  classId?: string;
  action: string;
  resource?: any;
}

/**
 * Metadata para permisos requeridos
 */
export const ASSIGNMENT_PERMISSIONS_KEY = 'assignment_permissions';
export const AssignmentPermissions = (...permissions: AssignmentPermission[]) =>
  Reflector.createDecorator<AssignmentPermission[]>()(permissions);

@Injectable()
export class AssignmentPermissionsGuard implements CanActivate {
  private readonly logger = new Logger(AssignmentPermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(AssignmentCampaign)
    private readonly campaignRepository: Repository<AssignmentCampaign>,
    @InjectRepository(CampaignTarget)
    private readonly targetRepository: Repository<CampaignTarget>,
    @InjectRepository(AssignmentProgress)
    private readonly progressRepository: Repository<AssignmentProgress>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<AssignmentPermission[]>(
      ASSIGNMENT_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No requiere permisos específicos
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const accessContext: AccessContext = {
      userId: user.userId,
      userRole: user.role,
      campaignId: request.params.id || request.body.campaignId,
      targetUserId: request.params.userId || request.query.userId,
      classId: request.params.classId || request.body.classId,
      action: `${request.method}:${request.route?.path || request.url}`,
    };

    try {
      // Validar cada permiso requerido
      for (const permission of requiredPermissions) {
        const hasPermission = await this.validatePermission(permission, accessContext);
        if (!hasPermission) {
          this.logAccessDenied(accessContext, permission);
          throw new ForbiddenException(
            `Acceso denegado: Se requiere permiso ${permission}`,
          );
        }
      }

      this.logAccessGranted(accessContext, requiredPermissions);
      return true;
    } catch (error) {
      this.logger.error(
        `Error validando permisos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Valida un permiso específico en el contexto dado
   */
  private async validatePermission(
    permission: AssignmentPermission,
    context: AccessContext,
  ): Promise<boolean> {
    // Administradores tienen todos los permisos
    if (context.userRole === 'admin') {
      return true;
    }

    switch (permission) {
      case AssignmentPermission.CREATE_CAMPAIGN:
        return await this.canCreateCampaign(context);
      
      case AssignmentPermission.READ_CAMPAIGN:
        return await this.canReadCampaign(context);
      
      case AssignmentPermission.UPDATE_CAMPAIGN:
        return await this.canUpdateCampaign(context);
      
      case AssignmentPermission.DELETE_CAMPAIGN:
        return await this.canDeleteCampaign(context);
      
      case AssignmentPermission.ACTIVATE_CAMPAIGN:
        return await this.canActivateCampaign(context);
      
      case AssignmentPermission.VIEW_PROGRESS:
        return await this.canViewProgress(context);
      
      case AssignmentPermission.UPDATE_PROGRESS:
        return await this.canUpdateProgress(context);
      
      case AssignmentPermission.RECORD_ACTIVITY:
        return await this.canRecordActivity(context);
      
      case AssignmentPermission.MARK_COMPLETE:
        return await this.canMarkComplete(context);
      
      case AssignmentPermission.VIEW_ANALYTICS:
        return await this.canViewAnalytics(context);
      
      case AssignmentPermission.VIEW_DETAILED_ANALYTICS:
        return await this.canViewDetailedAnalytics(context);
      
      case AssignmentPermission.EXPORT_DATA:
        return await this.canExportData(context);
      
      case AssignmentPermission.GENERATE_REPORTS:
        return await this.canGenerateReports(context);
      
      case AssignmentPermission.ACCESS_STUDENT_REPORTS:
        return await this.canAccessStudentReports(context);
      
      case AssignmentPermission.ACCESS_CLASS_REPORTS:
        return await this.canAccessClassReports(context);
      
      case AssignmentPermission.BULK_OPERATIONS:
        return await this.canPerformBulkOperations(context);
      
      case AssignmentPermission.SYSTEM_CONFIG:
        return await this.canConfigureSystem(context);
      
      default:
        this.logger.warn(`Permiso desconocido: ${permission}`);
        return false;
    }
  }

  // === VALIDADORES DE PERMISOS ESPECÍFICOS ===

  private async canCreateCampaign(context: AccessContext): Promise<boolean> {
    // Teachers y admins pueden crear campañas
    return ['admin', 'teacher'].includes(context.userRole);
  }

  private async canReadCampaign(context: AccessContext): Promise<boolean> {
    if (!context.campaignId) return true; // Lista general

    // Verificar acceso específico a la campaña
    return await this.hasAccessToCampaign(context.campaignId, context.userId, context.userRole);
  }

  private async canUpdateCampaign(context: AccessContext): Promise<boolean> {
    if (!context.campaignId) return false;

    const campaign = await this.campaignRepository.findOne({
      where: { id: context.campaignId },
    });

    if (!campaign) return false;

    // Solo el creador o admin pueden modificar
    return context.userRole === 'admin' || campaign.createdById === context.userId;
  }

  private async canDeleteCampaign(context: AccessContext): Promise<boolean> {
    if (!context.campaignId) return false;

    const campaign = await this.campaignRepository.findOne({
      where: { id: context.campaignId },
    });

    if (!campaign) return false;

    // Solo el creador o admin pueden eliminar, y solo si está en DRAFT
    const canDelete = context.userRole === 'admin' || campaign.createdById === context.userId;
    return canDelete && campaign.status === 'DRAFT';
  }

  private async canActivateCampaign(context: AccessContext): Promise<boolean> {
    if (!context.campaignId) return false;

    const campaign = await this.campaignRepository.findOne({
      where: { id: context.campaignId },
    });

    if (!campaign) return false;

    // Solo el creador o admin pueden activar
    return context.userRole === 'admin' || campaign.createdById === context.userId;
  }

  private async canViewProgress(context: AccessContext): Promise<boolean> {
    // Admins y teachers pueden ver cualquier progreso
    if (['admin', 'teacher'].includes(context.userRole)) return true;

    // Students solo pueden ver su propio progreso
    if (context.userRole === 'student') {
      return !context.targetUserId || context.targetUserId === context.userId;
    }

    // Families pueden ver progreso de sus hijos
    if (context.userRole === 'family') {
      return await this.isUserFamilyMember(context.userId, context.targetUserId);
    }

    return false;
  }

  private async canUpdateProgress(context: AccessContext): Promise<boolean> {
    // Solo teachers y admins pueden actualizar progreso de otros
    if (['admin', 'teacher'].includes(context.userRole)) return true;

    // Students pueden actualizar su propio progreso
    if (context.userRole === 'student') {
      return !context.targetUserId || context.targetUserId === context.userId;
    }

    return false;
  }

  private async canRecordActivity(context: AccessContext): Promise<boolean> {
    // Cualquier usuario autenticado puede registrar su propia actividad
    if (!context.targetUserId || context.targetUserId === context.userId) return true;

    // Teachers y admins pueden registrar actividad de otros
    return ['admin', 'teacher'].includes(context.userRole);
  }

  private async canMarkComplete(context: AccessContext): Promise<boolean> {
    // Students pueden marcar como completado su propio trabajo
    if (context.userRole === 'student') {
      return !context.targetUserId || context.targetUserId === context.userId;
    }

    // Teachers y admins pueden marcar completado para otros
    return ['admin', 'teacher'].includes(context.userRole);
  }

  private async canViewAnalytics(context: AccessContext): Promise<boolean> {
    // Teachers y admins pueden ver analytics básicos
    return ['admin', 'teacher'].includes(context.userRole);
  }

  private async canViewDetailedAnalytics(context: AccessContext): Promise<boolean> {
    // Solo admins pueden ver analytics detallados
    return context.userRole === 'admin';
  }

  private async canExportData(context: AccessContext): Promise<boolean> {
    // Teachers y admins pueden exportar datos
    return ['admin', 'teacher'].includes(context.userRole);
  }

  private async canGenerateReports(context: AccessContext): Promise<boolean> {
    // Teachers y admins pueden generar reportes
    return ['admin', 'teacher'].includes(context.userRole);
  }

  private async canAccessStudentReports(context: AccessContext): Promise<boolean> {
    // Admins y teachers pueden acceder a reportes de estudiantes
    if (['admin', 'teacher'].includes(context.userRole)) return true;

    // Students pueden acceder a sus propios reportes
    if (context.userRole === 'student') {
      return !context.targetUserId || context.targetUserId === context.userId;
    }

    // Families pueden acceder a reportes de sus hijos
    if (context.userRole === 'family') {
      return await this.isUserFamilyMember(context.userId, context.targetUserId);
    }

    return false;
  }

  private async canAccessClassReports(context: AccessContext): Promise<boolean> {
    if (!context.classId) return false;

    // Admins pueden acceder a cualquier reporte de clase
    if (context.userRole === 'admin') return true;

    // Teachers pueden acceder a reportes de sus clases
    if (context.userRole === 'teacher') {
      return await this.isTeacherOfClass(context.userId, context.classId);
    }

    return false;
  }

  private async canPerformBulkOperations(context: AccessContext): Promise<boolean> {
    // Solo admins pueden realizar operaciones masivas
    return context.userRole === 'admin';
  }

  private async canConfigureSystem(context: AccessContext): Promise<boolean> {
    // Solo admins pueden configurar el sistema
    return context.userRole === 'admin';
  }

  // === MÉTODOS AUXILIARES ===

  private async hasAccessToCampaign(
    campaignId: string,
    userId: string,
    userRole: string,
  ): Promise<boolean> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['campaignTargets'],
    });

    if (!campaign) return false;

    // Admin y creador tienen acceso completo
    if (userRole === 'admin' || campaign.createdById === userId) return true;

    // Verificar si el usuario está en los targets de la campaña
    return await this.isUserInCampaignTargets(userId, userRole, campaign.campaignTargets);
  }

  private async isUserInCampaignTargets(
    userId: string,
    userRole: string,
    targets: CampaignTarget[],
  ): Promise<boolean> {
    for (const target of targets) {
      switch (target.targetType) {
        case 'INDIVIDUAL':
          if (target.targetId === userId) return true;
          break;
        
        case 'CLASS':
          if (await this.isUserInClass(userId, target.targetId)) return true;
          break;
        
        case 'SUBJECT':
          if (userRole === 'teacher' && await this.teachesSubject(userId, target.targetId)) return true;
          if (userRole === 'student' && await this.studiesSubject(userId, target.targetId)) return true;
          break;
        
        case 'GRADE_LEVEL':
          if (await this.isUserInGradeLevel(userId, target.targetId)) return true;
          break;
        
        case 'CUSTOM_GROUP':
          if (await this.isUserInCustomGroup(userId, target.targetId)) return true;
          break;
      }
    }
    
    return false;
  }

  private async isUserFamilyMember(familyId: string, studentId: string): Promise<boolean> {
    // TODO: Implementar lógica de relaciones familiares
    // Por ahora, retorna false
    return false;
  }

  private async isTeacherOfClass(teacherId: string, classId: string): Promise<boolean> {
    // TODO: Implementar lógica de verificación teacher-class
    // Por ahora, retorna false
    return false;
  }

  private async isUserInClass(userId: string, classId: string): Promise<boolean> {
    // TODO: Implementar lógica de verificación user-class
    // Por ahora, retorna false
    return false;
  }

  private async teachesSubject(teacherId: string, subjectId: string): Promise<boolean> {
    // TODO: Implementar lógica de verificación teacher-subject
    // Por ahora, retorna false
    return false;
  }

  private async studiesSubject(studentId: string, subjectId: string): Promise<boolean> {
    // TODO: Implementar lógica de verificación student-subject
    // Por ahora, retorna false
    return false;
  }

  private async isUserInGradeLevel(userId: string, gradeLevel: string): Promise<boolean> {
    // TODO: Implementar lógica de verificación user-grade
    // Por ahora, retorna false
    return false;
  }

  private async isUserInCustomGroup(userId: string, groupId: string): Promise<boolean> {
    // TODO: Implementar lógica de verificación user-custom-group
    // Por ahora, retorna false
    return false;
  }

  // === LOGGING DE AUDITORÍA ===

  private logAccessGranted(context: AccessContext, permissions: AssignmentPermission[]): void {
    this.logger.log(
      `Access GRANTED - User: ${context.userId} (${context.userRole}), Action: ${context.action}, Permissions: [${permissions.join(', ')}]`,
    );
  }

  private logAccessDenied(context: AccessContext, permission: AssignmentPermission): void {
    this.logger.warn(
      `Access DENIED - User: ${context.userId} (${context.userRole}), Action: ${context.action}, Required: ${permission}`,
    );
  }
}