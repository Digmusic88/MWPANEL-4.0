/**
 * @archivo: resource-ownership.guard.ts
 * @módulo: Assignments - Guards
 * @función: Guard para validar ownership de recursos y campañas
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Guard especializado para validar que los usuarios solo puedan acceder
 * a recursos que les pertenecen o tienen permisos específicos.
 * 
 * FUNCIONALIDADES:
 * - Validación de ownership de campañas
 * - Verificación de acceso a progreso individual
 * - Control de acceso basado en relaciones
 * - Validación de contexto dinámico
 * - Cache de permisos para performance
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.5
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentCampaign } from '../entities/assignment-campaign.entity';
import { AssignmentProgress } from '../entities/assignment-progress.entity';
import { CampaignTarget } from '../entities/campaign-target.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Tipos de ownership que se pueden validar
 */
export enum OwnershipType {
  CAMPAIGN = 'campaign',
  PROGRESS = 'progress',
  TARGET = 'target',
  SELF = 'self',
  FAMILY_MEMBER = 'family_member',
  CLASS_MEMBER = 'class_member',
  SUBJECT_RELATED = 'subject_related',
}

/**
 * Configuración de ownership
 */
export interface OwnershipConfig {
  type: OwnershipType;
  paramName?: string; // Nombre del parámetro que contiene el ID (default: 'id')
  allowRoles?: string[]; // Roles que siempre tienen acceso
  allowCreator?: boolean; // Si permitir al creador del recurso
  allowTargets?: boolean; // Si permitir a usuarios que son targets
  strict?: boolean; // Si usar validación estricta
}

/**
 * Metadata para ownership
 */
export const OWNERSHIP_KEY = 'ownership';
export const RequireOwnership = (config: OwnershipConfig) =>
  Reflector.createDecorator<OwnershipConfig>()(config);

/**
 * Cache simple para permisos (evitar queries repetidas)
 */
interface PermissionCache {
  [key: string]: {
    result: boolean;
    timestamp: number;
  };
}

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(ResourceOwnershipGuard.name);
  private readonly permissionCache: PermissionCache = {};
  private readonly CACHE_TTL = 60000; // 1 minuto

  constructor(
    private reflector: Reflector,
    @InjectRepository(AssignmentCampaign)
    private readonly campaignRepository: Repository<AssignmentCampaign>,
    @InjectRepository(AssignmentProgress)
    private readonly progressRepository: Repository<AssignmentProgress>,
    @InjectRepository(CampaignTarget)
    private readonly targetRepository: Repository<CampaignTarget>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ownershipConfig = this.reflector.getAllAndOverride<OwnershipConfig>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!ownershipConfig) {
      return true; // No requiere validación de ownership
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const resourceId = this.extractResourceId(request, ownershipConfig.paramName);
    if (!resourceId && ownershipConfig.strict !== false) {
      throw new ForbiddenException('ID de recurso requerido');
    }

    try {
      const hasAccess = await this.validateOwnership(
        ownershipConfig,
        resourceId,
        user,
        request,
      );

      if (!hasAccess) {
        this.logAccessDenied(user.userId, ownershipConfig.type, resourceId);
        throw new ForbiddenException(
          `No tienes permisos para acceder a este ${ownershipConfig.type}`,
        );
      }

      this.logAccessGranted(user.userId, ownershipConfig.type, resourceId);
      return true;
    } catch (error) {
      this.logger.error(
        `Error validando ownership: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Valida el ownership según la configuración
   */
  private async validateOwnership(
    config: OwnershipConfig,
    resourceId: string,
    user: any,
    request: any,
  ): Promise<boolean> {
    // Verificar cache primero
    const cacheKey = `${config.type}:${resourceId}:${user.userId}`;
    const cached = this.permissionCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    let result = false;

    // Verificar roles permitidos
    if (config.allowRoles && config.allowRoles.includes(user.role)) {
      result = true;
    } else {
      // Validar según el tipo de ownership
      switch (config.type) {
        case OwnershipType.CAMPAIGN:
          result = await this.validateCampaignOwnership(resourceId, user, config);
          break;
        
        case OwnershipType.PROGRESS:
          result = await this.validateProgressOwnership(resourceId, user, config);
          break;
        
        case OwnershipType.TARGET:
          result = await this.validateTargetOwnership(resourceId, user, config);
          break;
        
        case OwnershipType.SELF:
          result = await this.validateSelfAccess(resourceId, user, request);
          break;
        
        case OwnershipType.FAMILY_MEMBER:
          result = await this.validateFamilyMemberAccess(resourceId, user);
          break;
        
        case OwnershipType.CLASS_MEMBER:
          result = await this.validateClassMemberAccess(resourceId, user);
          break;
        
        case OwnershipType.SUBJECT_RELATED:
          result = await this.validateSubjectRelatedAccess(resourceId, user);
          break;
        
        default:
          this.logger.warn(`Tipo de ownership desconocido: ${config.type}`);
          result = false;
      }
    }

    // Guardar en cache
    this.permissionCache[cacheKey] = {
      result,
      timestamp: Date.now(),
    };

    return result;
  }

  /**
   * Valida ownership de campaña
   */
  private async validateCampaignOwnership(
    campaignId: string,
    user: any,
    config: OwnershipConfig,
  ): Promise<boolean> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: config.allowTargets ? ['campaignTargets'] : [],
    });

    if (!campaign) {
      throw new NotFoundException('Campaña no encontrada');
    }

    // Verificar si es el creador
    if (config.allowCreator !== false && campaign.createdById === user.userId) {
      return true;
    }

    // Verificar si está en los targets
    if (config.allowTargets && campaign.campaignTargets) {
      return await this.isUserInTargets(user, campaign.campaignTargets);
    }

    return false;
  }

  /**
   * Valida ownership de progreso
   */
  private async validateProgressOwnership(
    progressId: string,
    user: any,
    config: OwnershipConfig,
  ): Promise<boolean> {
    const progress = await this.progressRepository.findOne({
      where: { id: progressId },
      relations: ['campaign'],
    });

    if (!progress) {
      throw new NotFoundException('Progreso no encontrado');
    }

    // El usuario propietario del progreso
    if (progress.userId === user.userId) {
      return true;
    }

    // El creador de la campaña asociada
    if (config.allowCreator !== false && progress.campaign?.createdById === user.userId) {
      return true;
    }

    // Teachers pueden ver progreso de sus estudiantes
    if (user.role === 'teacher') {
      return await this.isTeacherOfStudent(user.userId, progress.userId);
    }

    // Families pueden ver progreso de sus hijos
    if (user.role === 'family') {
      return await this.isFamilyOfStudent(user.userId, progress.userId);
    }

    return false;
  }

  /**
   * Valida ownership de target
   */
  private async validateTargetOwnership(
    targetId: string,
    user: any,
    config: OwnershipConfig,
  ): Promise<boolean> {
    const target = await this.targetRepository.findOne({
      where: { id: targetId },
      relations: ['campaign'],
    });

    if (!target) {
      throw new NotFoundException('Target no encontrado');
    }

    // El creador de la campaña asociada
    if (config.allowCreator !== false && target.campaign?.createdById === user.userId) {
      return true;
    }

    // Verificar si el usuario está incluido en este target
    return await this.isUserIncludedInTarget(user, target);
  }

  /**
   * Valida acceso a sí mismo
   */
  private async validateSelfAccess(
    userId: string,
    user: any,
    request: any,
  ): Promise<boolean> {
    // El usuario accede a sus propios datos
    if (userId === user.userId) {
      return true;
    }

    // Permitir si no se especifica userId (acceso general)
    if (!userId) {
      return true;
    }

    // Teachers pueden acceder a datos de sus estudiantes
    if (user.role === 'teacher') {
      return await this.isTeacherOfStudent(user.userId, userId);
    }

    // Families pueden acceder a datos de sus hijos
    if (user.role === 'family') {
      return await this.isFamilyOfStudent(user.userId, userId);
    }

    return false;
  }

  /**
   * Valida acceso familiar
   */
  private async validateFamilyMemberAccess(
    studentId: string,
    user: any,
  ): Promise<boolean> {
    if (user.role !== 'family') return false;
    
    return await this.isFamilyOfStudent(user.userId, studentId);
  }

  /**
   * Valida acceso por clase
   */
  private async validateClassMemberAccess(
    classId: string,
    user: any,
  ): Promise<boolean> {
    // Teachers pueden acceder a sus clases
    if (user.role === 'teacher') {
      return await this.isTeacherOfClass(user.userId, classId);
    }

    // Students pueden acceder a sus clases
    if (user.role === 'student') {
      return await this.isStudentInClass(user.userId, classId);
    }

    return false;
  }

  /**
   * Valida acceso por materia
   */
  private async validateSubjectRelatedAccess(
    subjectId: string,
    user: any,
  ): Promise<boolean> {
    // Teachers pueden acceder a materias que enseñan
    if (user.role === 'teacher') {
      return await this.teachesSubject(user.userId, subjectId);
    }

    // Students pueden acceder a materias que estudian
    if (user.role === 'student') {
      return await this.studiesSubject(user.userId, subjectId);
    }

    return false;
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Extrae el ID del recurso del request
   */
  private extractResourceId(request: any, paramName: string = 'id'): string {
    return request.params[paramName] || 
           request.body[paramName] || 
           request.query[paramName];
  }

  /**
   * Verifica si el usuario está incluido en los targets
   */
  private async isUserInTargets(user: any, targets: CampaignTarget[]): Promise<boolean> {
    for (const target of targets) {
      if (await this.isUserIncludedInTarget(user, target)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Verifica si el usuario está incluido en un target específico
   */
  private async isUserIncludedInTarget(user: any, target: CampaignTarget): Promise<boolean> {
    switch (target.targetType) {
      case 'INDIVIDUAL':
        return target.targetId === user.userId;
      
      case 'CLASS':
        return await this.isStudentInClass(user.userId, target.targetId);
      
      case 'SUBJECT':
        if (user.role === 'student') {
          return await this.studiesSubject(user.userId, target.targetId);
        }
        if (user.role === 'teacher') {
          return await this.teachesSubject(user.userId, target.targetId);
        }
        return false;
      
      case 'GRADE_LEVEL':
        return await this.isUserInGradeLevel(user.userId, target.targetId);
      
      case 'CUSTOM_GROUP':
        return await this.isUserInCustomGroup(user.userId, target.targetId);
      
      default:
        return false;
    }
  }

  // === MÉTODOS DE RELACIÓN (TODO: Implementar con repositorios reales) ===

  private async isTeacherOfStudent(teacherId: string, studentId: string): Promise<boolean> {
    // TODO: Implementar lógica real con repositorios
    return false;
  }

  private async isFamilyOfStudent(familyId: string, studentId: string): Promise<boolean> {
    // TODO: Implementar lógica real con repositorios
    return false;
  }

  private async isTeacherOfClass(teacherId: string, classId: string): Promise<boolean> {
    // TODO: Implementar lógica real con repositorios
    return false;
  }

  private async isStudentInClass(studentId: string, classId: string): Promise<boolean> {
    // TODO: Implementar lógica real con repositorios
    return false;
  }

  private async teachesSubject(teacherId: string, subjectId: string): Promise<boolean> {
    // TODO: Implementar lógica real con repositorios
    return false;
  }

  private async studiesSubject(studentId: string, subjectId: string): Promise<boolean> {
    // TODO: Implementar lógica real con repositorios
    return false;
  }

  private async isUserInGradeLevel(userId: string, gradeLevel: string): Promise<boolean> {
    // TODO: Implementar lógica real con repositorios
    return false;
  }

  private async isUserInCustomGroup(userId: string, groupId: string): Promise<boolean> {
    // TODO: Implementar lógica real con repositorios
    return false;
  }

  // === LOGGING ===

  private logAccessGranted(userId: string, type: string, resourceId: string): void {
    this.logger.log(
      `Ownership Access GRANTED - User: ${userId}, Type: ${type}, Resource: ${resourceId}`,
    );
  }

  private logAccessDenied(userId: string, type: string, resourceId: string): void {
    this.logger.warn(
      `Ownership Access DENIED - User: ${userId}, Type: ${type}, Resource: ${resourceId}`,
    );
  }

  /**
   * Limpiar cache periódicamente
   */
  clearExpiredCache(): void {
    const now = Date.now();
    Object.keys(this.permissionCache).forEach(key => {
      if (now - this.permissionCache[key].timestamp > this.CACHE_TTL) {
        delete this.permissionCache[key];
      }
    });
  }
}