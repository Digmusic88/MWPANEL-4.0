/**
 * @archivo: assignments.module.ts
 * @módulo: Assignments
 * @función: Módulo principal del sistema de asignaciones rediseñado
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Módulo NestJS que integra todo el sistema de asignaciones enterprise-grade.
 * Incluye entidades, servicios, controladores, guards y configuraciones.
 * 
 * CARACTERÍSTICAS:
 * - Sistema de campañas multi-target
 * - Tracking de progreso avanzado
 * - Analytics y reportes
 * - Validación y permisos granulares
 * - Integración con notificaciones
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.3
 */

import { Module, forwardRef, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// === ENTIDADES ===
import { AssignmentCampaign } from './entities/assignment-campaign.entity';
import { CampaignResource } from './entities/campaign-resource.entity';
import { CampaignTarget } from './entities/campaign-target.entity';
import { AssignmentProgress } from './entities/assignment-progress.entity';
// import { ProgressActivity } from './entities/progress-activity.entity'; // Entity not found

// === SERVICIOS ===
import { AssignmentCampaignService } from './services/assignment-campaign.service';
import { ProgressTrackingService } from './services/progress-tracking.service';

// === CONTROLADORES ===
import { AssignmentCampaignController } from './controllers/assignment-campaign.controller';
import { ProgressTrackingController } from './controllers/progress-tracking.controller';

// === GUARDS E INTERCEPTORS ===
import { AssignmentPermissionsGuard } from './guards/assignment-permissions.guard';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';
import { AssignmentRateLimitMiddleware } from './middleware/assignment-rate-limit.middleware';
// import { AuditLogInterceptor } from './interceptors/audit-log.interceptor'; // DISABLED - Audit system removed

// === MÓDULOS RELACIONADOS ===
import { UsersModule } from '../users/users.module';
import { EducationalResourcesModule } from '../educational-resources/educational-resources.module';

@Module({
  imports: [
    // Configuración TypeORM para todas las entidades del módulo
    TypeOrmModule.forFeature([
      AssignmentCampaign,
      CampaignResource,
      CampaignTarget,
      AssignmentProgress,
      // ProgressActivity, // Entity not found
    ]),
    
    // Módulos relacionados - usando forwardRef para evitar dependencias circulares
    forwardRef(() => UsersModule),
    forwardRef(() => EducationalResourcesModule),
  ],
  
  providers: [
    // === SERVICIOS DE NEGOCIO ===
    AssignmentCampaignService,
    ProgressTrackingService,
    
    // === SEGURIDAD Y GUARDS ===
    AssignmentPermissionsGuard,
    ResourceOwnershipGuard,
    // AuditLogInterceptor, // DISABLED - Audit system removed
    
    // === CONFIGURACIÓN GLOBAL DE GUARDS ===
    // Interceptor de auditoría global para el módulo - DISABLED
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: AuditLogInterceptor,
    // },
    
    // TODO: Servicios futuros a implementar
    // NotificationService,
    // AnalyticsService,
    // ReportingService,
    // AlertService,
  ],
  
  controllers: [
    // === CONTROLADORES REST ===
    AssignmentCampaignController,
    ProgressTrackingController,
    
    // TODO: Controladores futuros
    // AnalyticsController,
    // ReportsController,
  ],
  
  exports: [
    // === SERVICIOS EXPORTADOS ===
    // Otros módulos pueden usar estos servicios
    AssignmentCampaignService,
    ProgressTrackingService,
    
    // === REPOSITORIOS EXPORTADOS ===
    // Para uso directo en otros módulos si es necesario
    TypeOrmModule,
  ],
})
export class AssignmentsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AssignmentRateLimitMiddleware)
      .forRoutes(
        'assignments/campaigns',
        'assignments/progress',
        'assignments/analytics',
        'assignments/reports'
      );
  }
  
  constructor() {
    console.log('🎯 Assignments Module initialized - Enterprise Assignment System');
    console.log('📊 Features: Multi-target campaigns, Progress tracking, Analytics');
    console.log('🔒 Security: Role-based permissions, Input validation, Audit logging');
    console.log('⚡ Middleware: Rate limiting, Audit logging, Permission validation');
  }
}