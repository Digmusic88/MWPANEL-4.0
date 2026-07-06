/**
 * @archivo: progress-tracking.service.ts
 * @módulo: Assignments - Services
 * @función: Servicio para tracking detallado de progreso de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Servicio especializado en el seguimiento y análisis del progreso individual
 * de estudiantes en las asignaciones. Maneja métricas, engagement y analytics.
 * 
 * FUNCIONALIDADES:
 * - Tracking de actividad en tiempo real
 * - Cálculo de métricas de engagement
 * - Generación de reportes de progreso
 * - Análisis de efectividad de recursos
 * - Alertas y notificaciones automáticas
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.2
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  AssignmentProgress,
  ProgressStatus,
} from '../entities/assignment-progress.entity';
import { AssignmentCampaign } from '../entities/assignment-campaign.entity';
import { CampaignTarget } from '../entities/campaign-target.entity';
import { CampaignResource } from '../entities/campaign-resource.entity';
import { User } from '../../users/entities/user.entity';

/**
 * DTO para registrar actividad
 */
export interface RecordActivityDto {
  campaignId: string;
  resourceId: string;
  activityType: 'VIEW' | 'DOWNLOAD' | 'INTERACTION' | 'TIME_SPENT' | 'COMPLETION';
  activityData: {
    duration?: number; // segundos
    pageViews?: number;
    interactions?: Array<{
      type: string;
      timestamp: Date;
      data: Record<string, any>;
    }>;
    completionPercentage?: number;
    contextData?: Record<string, any>;
  };
  timestamp: Date;
}

/**
 * DTO para marcar completado
 */
export interface MarkCompletionDto {
  campaignId: string;
  resourceId: string;
  completionData: {
    selfRating?: number; // 1-5
    feedback?: string;
    learningOutcomeAchieved?: boolean;
    difficultyPerceived?: number; // 1-5
    timeSpent: number; // segundos totales
    finalCompletionPercentage?: number;
  };
}

/**
 * Interface para dashboard de progreso de estudiante
 */
export interface StudentProgressDashboard {
  activeCampaigns: Array<{
    campaignId: string;
    name: string;
    dueDate?: Date;
    progressPercentage: number;
    resourcesCompleted: number;
    resourcesTotal: number;
    estimatedTimeRemaining: number; // minutos
    urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    nextResource?: {
      id: string;
      title: string;
      type: string;
      estimatedTime: number;
    };
  }>;
  completedCampaigns: Array<{
    campaignId: string;
    name: string;
    completedAt: Date;
    totalTimeSpent: number;
    avgRating: number;
    effectivenessScore: number;
  }>;
  upcomingDeadlines: Array<{
    campaignId: string;
    name: string;
    dueDate: Date;
    daysRemaining: number;
    progressPercentage: number;
    isOverdue: boolean;
  }>;
  achievements: Array<{
    type: 'COMPLETION' | 'SPEED' | 'ENGAGEMENT' | 'QUALITY';
    title: string;
    description: string;
    earnedAt: Date;
    icon: string;
  }>;
  overallStats: {
    totalCampaignsAssigned: number;
    totalCampaignsCompleted: number;
    averageCompletionTime: number;
    averageRating: number;
    totalTimeSpent: number;
    currentStreak: number;
  };
}

/**
 * Interface para reporte de progreso
 */
export interface ProgressReport {
  summary: {
    totalProgress: number;
    completedCampaigns: number;
    activeCampaigns: number;
    overdueCampaigns: number;
    averageEngagement: number;
  };
  campaignBreakdown: Array<{
    campaignId: string;
    name: string;
    progress: number;
    timeSpent: number;
    lastActivity: Date;
    status: ProgressStatus;
    resourceDetails: Array<{
      resourceId: string;
      title: string;
      status: ProgressStatus;
      timeSpent: number;
      completionPercentage: number;
      engagementScore: number;
    }>;
  }>;
  recommendations: Array<{
    type: 'FOCUS_AREA' | 'TIME_MANAGEMENT' | 'RESOURCE_DIFFICULTY' | 'ENGAGEMENT';
    title: string;
    description: string;
    actionItems: string[];
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  trends: {
    engagementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    completionTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    timeManagementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
}

@Injectable()
export class ProgressTrackingService {
  private readonly logger = new Logger(ProgressTrackingService.name);

  constructor(
    @InjectRepository(AssignmentProgress)
    private readonly progressRepository: Repository<AssignmentProgress>,
    @InjectRepository(AssignmentCampaign)
    private readonly campaignRepository: Repository<AssignmentCampaign>,
    @InjectRepository(CampaignTarget)
    private readonly targetRepository: Repository<CampaignTarget>,
    @InjectRepository(CampaignResource)
    private readonly campaignResourceRepository: Repository<CampaignResource>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Registrar actividad de usuario
   */
  async recordActivity(
    userId: string,
    activityData: RecordActivityDto,
  ): Promise<AssignmentProgress> {
    this.logger.log(
      `Recording activity for user ${userId} on campaign ${activityData.campaignId}`,
    );

    // Buscar o crear registro de progreso
    let progress = await this.progressRepository.findOne({
      where: {
        userId,
        campaignId: activityData.campaignId,
        resourceId: activityData.resourceId,
      },
    });

    if (!progress) {
      // Crear nuevo registro de progreso si no existe
      progress = this.progressRepository.create({
        userId,
        campaignId: activityData.campaignId,
        resourceId: activityData.resourceId,
        status: ProgressStatus.NOT_STARTED,
      });
    }

    // Registrar la actividad usando el método de la entidad
    progress.recordActivity({
      timeSpent: activityData.activityData.duration,
      interactionType: activityData.activityType,
      eventData: activityData.activityData,
    });

    // Actualizar porcentaje de completado si se proporciona
    if (activityData.activityData.completionPercentage !== undefined) {
      progress.updateCompletionPercentage(activityData.activityData.completionPercentage);
    }

    // Guardar progreso actualizado
    const savedProgress = await this.progressRepository.save(progress);

    // Actualizar métricas de la campaña y recursos
    await this.updateCampaignMetrics(activityData.campaignId);
    await this.updateResourceMetrics(activityData.resourceId);

    this.logger.log(`Activity recorded successfully for user ${userId}`);
    return savedProgress;
  }

  /**
   * Marcar recurso como completado
   */
  async markAsCompleted(
    userId: string,
    completionData: MarkCompletionDto,
  ): Promise<AssignmentProgress> {
    this.logger.log(
      `Marking resource as completed for user ${userId} on campaign ${completionData.campaignId}`,
    );

    const progress = await this.progressRepository.findOne({
      where: {
        userId,
        campaignId: completionData.campaignId,
        resourceId: completionData.resourceId,
      },
    });

    if (!progress) {
      throw new NotFoundException('Registro de progreso no encontrado');
    }

    // Marcar como completado usando método de la entidad
    progress.markAsCompleted();

    // Añadir feedback del estudiante
    if (completionData.completionData.selfRating) {
      progress.addStudentFeedback(
        completionData.completionData.selfRating,
        completionData.completionData.feedback,
        completionData.completionData.difficultyPerceived,
        completionData.completionData.learningOutcomeAchieved,
      );
    }

    // Actualizar tiempo total empleado
    progress.timeSpent = completionData.completionData.timeSpent;

    const savedProgress = await this.progressRepository.save(progress);

    // Verificar si la campaña completa está terminada para este usuario
    await this.checkCampaignCompletion(userId, completionData.campaignId);

    // Actualizar métricas
    await this.updateCampaignMetrics(completionData.campaignId);
    await this.updateResourceMetrics(completionData.resourceId);

    this.logger.log(`Resource marked as completed for user ${userId}`);
    return savedProgress;
  }

  /**
   * Obtener dashboard de progreso para estudiante
   */
  async getStudentProgressDashboard(studentId: string): Promise<StudentProgressDashboard> {
    this.logger.log(`Getting progress dashboard for student ${studentId}`);

    // Obtener campañas activas
    const activeCampaigns = await this.getActiveCampaignsForStudent(studentId);
    
    // Obtener campañas completadas
    const completedCampaigns = await this.getCompletedCampaignsForStudent(studentId);
    
    // Obtener próximas fechas límite
    const upcomingDeadlines = await this.getUpcomingDeadlinesForStudent(studentId);
    
    // Obtener logros
    const achievements = await this.getAchievementsForStudent(studentId);
    
    // Obtener estadísticas generales
    const overallStats = await this.getOverallStatsForStudent(studentId);

    return {
      activeCampaigns,
      completedCampaigns,
      upcomingDeadlines,
      achievements,
      overallStats,
    };
  }

  /**
   * Generar reporte de progreso detallado
   */
  async generateProgressReport(
    userIds: string[],
    campaignIds?: string[],
    dateRange?: { start: Date; end: Date },
  ): Promise<ProgressReport> {
    this.logger.log(`Generating progress report for ${userIds.length} users`);

    const whereConditions: any = {
      userId: In(userIds),
    };

    if (campaignIds?.length) {
      whereConditions.campaignId = In(campaignIds);
    }

    if (dateRange) {
      whereConditions.createdAt = Between(dateRange.start, dateRange.end);
    }

    const progressRecords = await this.progressRepository.find({
      where: whereConditions,
      relations: ['campaign', 'resource', 'user'],
      order: { createdAt: 'DESC' },
    });

    // Calcular resumen
    const summary = this.calculateProgressSummary(progressRecords);
    
    // Desglose por campaña
    const campaignBreakdown = await this.calculateCampaignBreakdown(progressRecords);
    
    // Generar recomendaciones
    const recommendations = this.generateRecommendations(progressRecords);
    
    // Analizar tendencias
    const trends = this.analyzeTrends(progressRecords);

    return {
      summary,
      campaignBreakdown,
      recommendations,
      trends,
    };
  }

  /**
   * Obtener progreso de una campaña específica
   */
  async getCampaignProgress(
    campaignId: string,
    includeIndividualProgress = false,
  ) {
    this.logger.log(`Getting campaign progress for campaign ${campaignId}`);

    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['campaignTargets', 'campaignResources'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaña no encontrada');
    }

    // Obtener todos los registros de progreso para esta campaña
    const progressRecords = await this.progressRepository.find({
      where: { campaignId },
      relations: includeIndividualProgress ? ['user', 'resource'] : [],
    });

    // Calcular métricas agregadas
    const totalRecords = progressRecords.length;
    const completedRecords = progressRecords.filter(p => p.isCompleted).length;
    const inProgressRecords = progressRecords.filter(
      p => p.status === ProgressStatus.IN_PROGRESS,
    ).length;

    const averageCompletionPercentage = totalRecords > 0 
      ? progressRecords.reduce((sum, p) => sum + p.completionPercentage, 0) / totalRecords
      : 0;

    const averageEngagement = totalRecords > 0
      ? progressRecords
          .filter(p => p.engagementScore !== null)
          .reduce((sum, p) => sum + (p.engagementScore || 0), 0) / 
        progressRecords.filter(p => p.engagementScore !== null).length
      : 0;

    const result = {
      campaign,
      metrics: {
        totalParticipants: totalRecords,
        completedParticipants: completedRecords,
        inProgressParticipants: inProgressRecords,
        completionRate: (completedRecords / totalRecords) * 100,
        averageCompletionPercentage,
        averageEngagement: averageEngagement || 0,
        totalTimeSpent: progressRecords.reduce((sum, p) => sum + p.timeSpent, 0),
        averageTimeSpent: totalRecords > 0 
          ? progressRecords.reduce((sum, p) => sum + p.timeSpent, 0) / totalRecords
          : 0,
      },
      individualProgress: includeIndividualProgress ? progressRecords : undefined,
    };

    return result;
  }

  // === MÉTODOS PRIVADOS ===

  private async updateCampaignMetrics(campaignId: string): Promise<void> {
    const progressRecords = await this.progressRepository.find({
      where: { campaignId },
    });

    if (progressRecords.length === 0) return;

    const completedCount = progressRecords.filter(p => p.isCompleted).length;
    const completionRate = (completedCount / progressRecords.length) * 100;

    const avgTimeToComplete = completedCount > 0
      ? progressRecords
          .filter(p => p.isCompleted)
          .reduce((sum, p) => sum + p.timeSpent, 0) / completedCount
      : null;

    const avgEngagement = progressRecords
      .filter(p => p.engagementScore !== null)
      .reduce((sum, p) => sum + (p.engagementScore || 0), 0) / 
      progressRecords.filter(p => p.engagementScore !== null).length || 0;

    // Actualizar métricas en la campaña
    await this.campaignRepository.update(campaignId, {
      completionRate: Number(completionRate.toFixed(2)),
      avgTimeToComplete: avgTimeToComplete ? Number(avgTimeToComplete.toFixed(2)) : null,
      effectivenessScore: Number(avgEngagement.toFixed(2)),
    });
  }

  private async updateResourceMetrics(resourceId: string): Promise<void> {
    const progressRecords = await this.progressRepository.find({
      where: { resourceId },
    });

    if (progressRecords.length === 0) return;

    const viewsCount = progressRecords.reduce((sum, p) => sum + p.viewCount, 0);
    const completionsCount = progressRecords.filter(p => p.isCompleted).length;
    const avgTimeSpent = progressRecords.length > 0
      ? progressRecords.reduce((sum, p) => sum + p.timeSpent, 0) / progressRecords.length
      : 0;

    // TODO: Actualizar métricas en CampaignResource
  }

  private async checkCampaignCompletion(userId: string, campaignId: string): Promise<void> {
    // Verificar si el usuario ha completado todos los recursos requeridos de la campaña
    const campaignResources = await this.campaignResourceRepository.find({
      where: { campaignId, isRequired: true },
    });

    const userProgress = await this.progressRepository.find({
      where: { userId, campaignId },
    });

    const requiredResourceIds = campaignResources.map(cr => cr.resourceId);
    const completedResourceIds = userProgress
      .filter(p => p.isCompleted)
      .map(p => p.resourceId);

    const allRequiredCompleted = requiredResourceIds.every(id => 
      completedResourceIds.includes(id),
    );

    if (allRequiredCompleted) {
      // TODO: Marcar target como completado y enviar notificaciones
      this.logger.log(`User ${userId} completed campaign ${campaignId}`);
    }
  }

  private async getActiveCampaignsForStudent(studentId: string) {
    // TODO: Implementar lógica para obtener campañas activas
    return [];
  }

  private async getCompletedCampaignsForStudent(studentId: string) {
    // TODO: Implementar lógica para obtener campañas completadas
    return [];
  }

  private async getUpcomingDeadlinesForStudent(studentId: string) {
    // TODO: Implementar lógica para obtener próximas fechas límite
    return [];
  }

  private async getAchievementsForStudent(studentId: string) {
    // TODO: Implementar sistema de logros
    return [];
  }

  private async getOverallStatsForStudent(studentId: string) {
    // TODO: Implementar estadísticas generales
    return {
      totalCampaignsAssigned: 0,
      totalCampaignsCompleted: 0,
      averageCompletionTime: 0,
      averageRating: 0,
      totalTimeSpent: 0,
      currentStreak: 0,
    };
  }

  private calculateProgressSummary(progressRecords: AssignmentProgress[]) {
    const total = progressRecords.length;
    const completed = progressRecords.filter(p => p.isCompleted).length;
    const active = progressRecords.filter(p => p.status === ProgressStatus.IN_PROGRESS).length;
    
    return {
      totalProgress: total > 0 ? (completed / total) * 100 : 0,
      completedCampaigns: completed,
      activeCampaigns: active,
      overdueCampaigns: 0, // TODO: Calcular overdue
      averageEngagement: 0, // TODO: Calcular engagement promedio
    };
  }

  private async calculateCampaignBreakdown(progressRecords: AssignmentProgress[]) {
    // TODO: Implementar desglose detallado por campaña
    return [];
  }

  private generateRecommendations(progressRecords: AssignmentProgress[]) {
    // TODO: Implementar algoritmo de recomendaciones
    return [];
  }

  private analyzeTrends(progressRecords: AssignmentProgress[]) {
    // TODO: Implementar análisis de tendencias
    return {
      engagementTrend: 'STABLE' as const,
      completionTrend: 'STABLE' as const,
      timeManagementTrend: 'STABLE' as const,
    };
  }
}