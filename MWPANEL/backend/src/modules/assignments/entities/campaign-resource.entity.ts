/**
 * @archivo: campaign-resource.entity.ts
 * @módulo: Assignments (Sistema Avanzado de Asignaciones)
 * @función: Entidad para recursos incluidos en campañas
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Entidad que representa la relación entre campañas y recursos educativos.
 * Una campaña puede incluir múltiples recursos, cada uno con configuración específica.
 * Incluye seguimiento de analytics por recurso dentro de la campaña.
 * 
 * RELACIONES:
 * - N:1 con AssignmentCampaign (campaña padre)
 * - N:1 con EducationalResource (recurso educativo)
 * 
 * ESTADO ACTUAL: NUEVA IMPLEMENTACIÓN - STEP 1.2
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { AssignmentCampaign } from './assignment-campaign.entity';
import { EducationalResource } from '../../educational-resources/entities/educational-resource.entity';

@Entity('campaign_resources')
@Unique('UQ_campaign_resource', ['campaignId', 'resourceId'])
@Index('IDX_campaign_resources_campaign_order', ['campaignId', 'orderIndex'])
export class CampaignResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === RELACIONES PRINCIPALES ===
  @Column()
  @Index('IDX_campaign_resources_campaignId')
  campaignId: string;

  @Column()
  @Index('IDX_campaign_resources_resourceId')
  resourceId: string;

  // === CONFIGURACIÓN POR RECURSO ===
  @Column({ type: 'boolean', default: true })
  isRequired: boolean;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'int', nullable: true, comment: 'Tiempo estimado en minutos' })
  estimatedTime: number;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  // === SEGUIMIENTO Y ANALYTICS POR RECURSO ===
  @Column({ type: 'int', default: 0 })
  viewsCount: number;

  @Column({ type: 'int', default: 0 })
  completionsCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  avgRating: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  avgTimeSpent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionRate: number;

  // === METADATOS ===
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // === RELACIONES ===
  @ManyToOne(() => AssignmentCampaign, campaign => campaign.campaignResources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: AssignmentCampaign;

  @ManyToOne(() => EducationalResource, { eager: true })
  @JoinColumn({ name: 'resourceId' })
  resource: EducationalResource;

  // === MÉTODOS VIRTUALES Y HELPERS ===

  /**
   * Calcula la efectividad del recurso en esta campaña
   */
  get effectivenessScore(): number {
    if (this.viewsCount === 0) return 0;
    
    const completionWeight = 0.4;
    const ratingWeight = 0.3;
    const engagementWeight = 0.3;
    
    const completionScore = this.completionRate / 100;
    const ratingScore = this.avgRating ? this.avgRating / 5 : 0;
    const engagementScore = Math.min(this.completionsCount / this.viewsCount, 1);
    
    return Number((
      (completionScore * completionWeight) +
      (ratingScore * ratingWeight) +
      (engagementScore * engagementWeight)
    ).toFixed(2));
  }

  /**
   * Verifica si el recurso está teniendo un rendimiento bajo
   */
  get isUnderperforming(): boolean {
    return this.viewsCount >= 5 && (
      this.completionRate < 30 ||
      (this.avgRating && this.avgRating < 2.5) ||
      this.effectivenessScore < 0.3
    );
  }

  /**
   * Obtiene el tiempo estimado formateado
   */
  get estimatedTimeFormatted(): string {
    if (!this.estimatedTime) return 'No especificado';
    
    const hours = Math.floor(this.estimatedTime / 60);
    const minutes = this.estimatedTime % 60;
    
    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} h`;
    } else {
      return `${hours}h ${minutes}min`;
    }
  }

  /**
   * Calcula la diferencia entre tiempo estimado y real
   */
  get timeVariance(): number | null {
    if (!this.estimatedTime || !this.avgTimeSpent) return null;
    
    const estimatedMinutes = this.estimatedTime;
    const actualMinutes = this.avgTimeSpent / 60; // avgTimeSpent está en segundos
    
    return Number(((actualMinutes - estimatedMinutes) / estimatedMinutes * 100).toFixed(1));
  }

  /**
   * Obtiene el nivel de dificultad percibido basado en métricas
   */
  get perceivedDifficulty(): 'EASY' | 'MEDIUM' | 'HARD' | 'UNKNOWN' {
    if (this.viewsCount < 3) return 'UNKNOWN';
    
    const timeVariance = this.timeVariance;
    const completionRate = this.completionRate;
    
    if (completionRate >= 80 && (timeVariance === null || timeVariance <= 20)) {
      return 'EASY';
    } else if (completionRate >= 60 && (timeVariance === null || timeVariance <= 50)) {
      return 'MEDIUM';
    } else {
      return 'HARD';
    }
  }

  /**
   * Incrementa el contador de visualizaciones
   */
  incrementViews(): void {
    this.viewsCount += 1;
  }

  /**
   * Incrementa el contador de completados y recalcula métricas
   */
  incrementCompletions(): void {
    this.completionsCount += 1;
    this.updateCompletionRate();
  }

  /**
   * Actualiza la tasa de completado
   */
  private updateCompletionRate(): void {
    if (this.viewsCount > 0) {
      this.completionRate = Number((this.completionsCount / this.viewsCount * 100).toFixed(2));
    }
  }

  /**
   * Actualiza la calificación promedio
   */
  updateAverageRating(newRating: number, totalRatings: number): void {
    if (totalRatings === 1) {
      this.avgRating = newRating;
    } else {
      const currentTotal = (this.avgRating || 0) * (totalRatings - 1);
      this.avgRating = Number(((currentTotal + newRating) / totalRatings).toFixed(2));
    }
  }

  /**
   * Actualiza el tiempo promedio empleado
   */
  updateAverageTimeSpent(newTimeSpent: number, totalSessions: number): void {
    if (totalSessions === 1) {
      this.avgTimeSpent = newTimeSpent;
    } else {
      const currentTotal = (this.avgTimeSpent || 0) * (totalSessions - 1);
      this.avgTimeSpent = Number(((currentTotal + newTimeSpent) / totalSessions).toFixed(2));
    }
  }
}