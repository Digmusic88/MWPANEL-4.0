/**
 * @archivo: audit-log.interceptor.ts
 * @módulo: Assignments - Interceptors
 * @función: Interceptor para logging de auditoría y tracking de acciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Interceptor que registra todas las acciones importantes realizadas
 * en el sistema de asignaciones para auditoría y compliance.
 * 
 * FUNCIONALIDADES:
 * - Logging completo de acciones CRUD
 * - Tracking de cambios de estado
 * - Registro de accesos a datos sensibles
 * - Metadatos contextuales de usuario
 * - Integración con sistemas de auditoría externos
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.5
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Tipos de eventos de auditoría
 */
export enum AuditEventType {
  // Eventos de campaña
  CAMPAIGN_CREATED = 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED',
  CAMPAIGN_DELETED = 'CAMPAIGN_DELETED',
  CAMPAIGN_STATUS_CHANGED = 'CAMPAIGN_STATUS_CHANGED',
  CAMPAIGN_CLONED = 'CAMPAIGN_CLONED',
  CAMPAIGN_VIEWED = 'CAMPAIGN_VIEWED',

  // Eventos de progreso
  PROGRESS_UPDATED = 'PROGRESS_UPDATED',
  ACTIVITY_RECORDED = 'ACTIVITY_RECORDED',
  RESOURCE_COMPLETED = 'RESOURCE_COMPLETED',
  PROGRESS_VIEWED = 'PROGRESS_VIEWED',

  // Eventos de analytics
  ANALYTICS_ACCESSED = 'ANALYTICS_ACCESSED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  DATA_EXPORTED = 'DATA_EXPORTED',

  // Eventos administrativos
  BULK_OPERATION = 'BULK_OPERATION',
  SYSTEM_CONFIG_CHANGED = 'SYSTEM_CONFIG_CHANGED',
  PERMISSIONS_GRANTED = 'PERMISSIONS_GRANTED',
  PERMISSIONS_DENIED = 'PERMISSIONS_DENIED',

  // Eventos de seguridad
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Configuración de auditoría
 */
export interface AuditConfig {
  eventType: AuditEventType;
  includeBody?: boolean;
  includeResponse?: boolean;
  includeHeaders?: boolean;
  sensitiveFields?: string[]; // Campos a omitir o encriptar
  description?: string;
}

/**
 * Entrada de log de auditoría
 */
export interface AuditLogEntry {
  eventId: string;
  eventType: AuditEventType;
  timestamp: Date;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  ip: string;
  userAgent: string;
  method: string;
  endpoint: string;
  resourceId?: string;
  resourceType?: string;
  description?: string;
  requestBody?: any;
  responseData?: any;
  success: boolean;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
}

/**
 * Metadata key para configuración de auditoría
 */
export const AUDIT_CONFIG_KEY = 'audit_config';
export const AuditLog = (config: AuditConfig) =>
  Reflector.createDecorator<AuditConfig>()(config);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditConfig = this.reflector.getAllAndOverride<AuditConfig>(
      AUDIT_CONFIG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditConfig) {
      return next.handle(); // Sin configuración de auditoría
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Preparar datos base del log
    const baseLogData = this.prepareBaseLogData(request, auditConfig);

    return next.handle().pipe(
      tap((data) => {
        // Operación exitosa
        const executionTime = Date.now() - startTime;
        this.logAuditEvent({
          ...baseLogData,
          eventId: baseLogData.eventId || this.generateEventId(),
          success: true,
          executionTime,
          responseData: auditConfig.includeResponse 
            ? this.sanitizeData(data, auditConfig.sensitiveFields)
            : undefined,
        } as AuditLogEntry);
      }),
      catchError((error) => {
        // Operación fallida
        const executionTime = Date.now() - startTime;
        this.logAuditEvent({
          ...baseLogData,
          eventId: baseLogData.eventId || this.generateEventId(),
          success: false,
          executionTime,
          error: error.message || 'Unknown error',
        } as AuditLogEntry);
        throw error; // Re-throw para no interferir con el flujo
      }),
    );
  }

  /**
   * Prepara los datos base del log de auditoría
   */
  private prepareBaseLogData(request: any, config: AuditConfig): Partial<AuditLogEntry> {
    const user = request.user;
    
    return {
      eventId: this.generateEventId(),
      eventType: config.eventType,
      timestamp: new Date(),
      userId: user?.userId,
      userRole: user?.role,
      userEmail: user?.email,
      ip: this.extractClientIP(request),
      userAgent: request.headers['user-agent'] || 'Unknown',
      method: request.method,
      endpoint: `${request.method} ${request.route?.path || request.url}`,
      resourceId: this.extractResourceId(request),
      resourceType: this.extractResourceType(request),
      description: config.description,
      requestBody: config.includeBody 
        ? this.sanitizeData(request.body, config.sensitiveFields)
        : undefined,
      metadata: this.extractMetadata(request, config),
    };
  }

  /**
   * Registra el evento de auditoría
   */
  private logAuditEvent(logEntry: AuditLogEntry): void {
    // Log estructurado para sistemas de auditoría
    const auditLog = {
      ...logEntry,
      level: logEntry.success ? 'INFO' : 'ERROR',
      category: 'ASSIGNMENT_AUDIT',
    };

    if (logEntry.success) {
      this.logger.log(JSON.stringify(auditLog));
    } else {
      this.logger.error(JSON.stringify(auditLog));
    }

    // Aquí se podría enviar a sistemas externos de auditoría
    this.sendToExternalAuditSystems(auditLog);

    // Log específicos para eventos críticos
    this.handleCriticalEvents(logEntry);
  }

  /**
   * Maneja eventos críticos que requieren atención especial
   */
  private handleCriticalEvents(logEntry: AuditLogEntry): void {
    const criticalEvents = [
      AuditEventType.CAMPAIGN_DELETED,
      AuditEventType.BULK_OPERATION,
      AuditEventType.SYSTEM_CONFIG_CHANGED,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.SUSPICIOUS_ACTIVITY,
    ];

    if (criticalEvents.includes(logEntry.eventType)) {
      this.logger.warn(
        `CRITICAL EVENT: ${logEntry.eventType} by ${logEntry.userId} (${logEntry.userRole}) from ${logEntry.ip}`,
      );

      // Enviar alertas adicionales si es necesario
      this.sendCriticalEventAlert(logEntry);
    }
  }

  /**
   * Extrae la IP real del cliente (considerando proxies)
   */
  private extractClientIP(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'Unknown'
    );
  }

  /**
   * Extrae el ID del recurso principal del request
   */
  private extractResourceId(request: any): string | undefined {
    return (
      request.params?.id ||
      request.params?.campaignId ||
      request.body?.campaignId ||
      request.query?.campaignId
    );
  }

  /**
   * Extrae el tipo de recurso del endpoint
   */
  private extractResourceType(request: any): string | undefined {
    const path = request.route?.path || request.url;
    
    if (path.includes('/campaigns')) return 'CAMPAIGN';
    if (path.includes('/progress')) return 'PROGRESS';
    if (path.includes('/analytics')) return 'ANALYTICS';
    if (path.includes('/reports')) return 'REPORT';
    
    return undefined;
  }

  /**
   * Extrae metadatos adicionales del contexto
   */
  private extractMetadata(request: any, config: AuditConfig): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Headers específicos si se requieren
    if (config.includeHeaders) {
      metadata.headers = {
        contentType: request.headers['content-type'],
        authorization: request.headers.authorization ? '[REDACTED]' : undefined,
        acceptLanguage: request.headers['accept-language'],
        referer: request.headers.referer,
      };
    }

    // Información de sesión
    if (request.session) {
      metadata.sessionId = request.session.id;
    }

    // Query parameters importantes
    if (request.query && Object.keys(request.query).length > 0) {
      metadata.queryParams = this.sanitizeData(request.query, config.sensitiveFields);
    }

    // Información del dispositivo/navegador
    const userAgent = request.headers['user-agent'];
    if (userAgent) {
      metadata.device = this.parseUserAgent(userAgent);
    }

    return metadata;
  }

  /**
   * Sanitiza datos removiendo campos sensibles
   */
  private sanitizeData(data: any, sensitiveFields?: string[]): any {
    if (!data || !sensitiveFields || sensitiveFields.length === 0) {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data));
    
    const removeFields = (obj: any, fields: string[]): void => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const field of fields) {
        if (field in obj) {
          obj[field] = '[REDACTED]';
        }
      }
      
      // Recursivo para objetos anidados
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          removeFields(obj[key], fields);
        }
      }
    };

    removeFields(sanitized, sensitiveFields);
    return sanitized;
  }

  /**
   * Parsea User-Agent básico para obtener información del dispositivo
   */
  private parseUserAgent(userAgent: string): any {
    return {
      isBot: /bot|crawler|spider/i.test(userAgent),
      isMobile: /mobile|android|iphone|ipad/i.test(userAgent),
      browser: this.extractBrowser(userAgent),
      os: this.extractOS(userAgent),
    };
  }

  /**
   * Extrae información básica del navegador
   */
  private extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Extrae información básica del sistema operativo
   */
  private extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Genera un ID único para el evento
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Envía logs a sistemas externos de auditoría
   */
  private sendToExternalAuditSystems(logEntry: any): void {
    // TODO: Implementar integración con sistemas externos
    // Ejemplos: Elasticsearch, Splunk, CloudWatch, etc.
    
    // Por ahora, solo almacenar localmente
    // En un entorno de producción, aquí se enviaría a:
    // - SIEM (Security Information and Event Management)
    // - Sistemas de compliance
    // - Bases de datos de auditoría especializadas
  }

  /**
   * Envía alertas para eventos críticos
   */
  private sendCriticalEventAlert(logEntry: AuditLogEntry): void {
    // TODO: Implementar sistema de alertas
    // Ejemplos: Email, Slack, webhook, SMS, etc.
    
    this.logger.error(
      `ALERT: Critical event ${logEntry.eventType} requires attention`,
      JSON.stringify(logEntry),
    );
  }
}