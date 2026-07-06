/**
 * @archivo: campaign-target.entity.ts
 * @módulo: Assignments (Sistema Avanzado de Asignaciones)
 * @función: Entidad para targets de asignación multi-tipo
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Entidad que representa los diferentes tipos de targets a los que se puede asignar una campaña.
 * Soporta múltiples tipos: individuos, clases, materias, niveles educativos, y grupos personalizados.
 * Incluye configuración específica por target y seguimiento de progreso.
 * 
 * RELACIONES:
 * - N:1 con AssignmentCampaign (campaña padre)
 * - FK dinámico basado en target_type (Individual, Class, Subject, etc.)
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

/**
 * ENUM: Target Types
 * Define los diferentes tipos de targets soportados
 */
export enum TargetType {
  INDIVIDUAL = 'INDIVIDUAL',       // Usuario individual (estudiante)
  CLASS = 'CLASS',                 // Clase completa (class_groups)
  SUBJECT = 'SUBJECT',             // Materia específica (subjects)
  GRADE_LEVEL = 'GRADE_LEVEL',     // Nivel educativo (educational_levels)
  CUSTOM_GROUP = 'CUSTOM_GROUP'    // Grupo personalizado definido por el profesor
}

/**
 * ENUM: Target Status
 * Estados del progreso del target en la campaña
 */
export enum TargetStatus {
  PENDING = 'PENDING',       // Asignación creada pero no iniciada
  ACTIVE = 'ACTIVE',         // Target tiene actividad en progreso
  COMPLETED = 'COMPLETED',   // Target ha completado toda la campaña
  SKIPPED = 'SKIPPED'        // Target marcado como omitido
}

@Entity('campaign_targets')
@Unique('UQ_campaign_target', ['campaignId', 'targetType', 'targetId'])
@Index('IDX_campaign_targets_type_id', ['targetType', 'targetId'])
@Index('IDX_campaign_targets_campaign_status', ['campaignId', 'status'])
export class CampaignTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === RELACIÓN CON CAMPAÑA ===
  @Column()
  @Index('IDX_campaign_targets_campaignId')
  campaignId: string;

  // === CONFIGURACIÓN DEL TARGET ===
  @Column({
    type: 'enum',
    enum: TargetType
  })
  targetType: TargetType;

  @Column({ comment: 'FK dinámico basado en targetType' })
  targetId: string;

  @Column({ 
    type: 'jsonb', 
    nullable: true,
    comment: 'Metadatos específicos del target (nombre, detalles adicionales, etc.)'
  })
  targetMetadata: Record<string, any>;

  // === CONFIGURACIÓN ESPECÍFICA DEL TARGET ===
  @Column({ type: 'text', nullable: true })
  personalizedInstructions: string;

  @Column({ type: 'timestamp', nullable: true })
  customDueDate: Date;

  @Column({ 
    type: 'decimal', 
    precision: 3, 
    scale: 2, 
    default: 1.0,
    comment: 'Factor de ajuste de dificultad (0.5 = más fácil, 1.5 = más difícil)'
  })
  difficultyAdjustment: number;

  // === ESTADO DEL TARGET ===
  @Column({
    type: 'enum',
    enum: TargetStatus,
    default: TargetStatus.PENDING
  })
  status: TargetStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  // === MÉTRICAS POR TARGET ===
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  @Column({ type: 'int', default: 0, comment: 'Tiempo total empleado en segundos' })
  timeSpent: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActivity: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  totalIndividuals: number; // Para targets de grupo (clase, materia, etc.)

  @Column({ type: 'int', default: 0 })
  completedIndividuals: number;

  // === METADATOS ===
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // === RELACIONES ===
  @ManyToOne(() => AssignmentCampaign, campaign => campaign.campaignTargets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: AssignmentCampaign;

  // === MÉTODOS VIRTUALES Y HELPERS ===

  /**
   * Obtiene el nombre legible del target basado en metadata
   */
  get displayName(): string {
    if (this.targetMetadata?.name) {
      return this.targetMetadata.name;
    }
    
    switch (this.targetType) {
      case TargetType.INDIVIDUAL:
        return this.targetMetadata?.fullName || `Usuario ${this.targetId}`;
      case TargetType.CLASS:
        return this.targetMetadata?.className || `Clase ${this.targetId}`;
      case TargetType.SUBJECT:
        return this.targetMetadata?.subjectName || `Materia ${this.targetId}`;
      case TargetType.GRADE_LEVEL:
        return this.targetMetadata?.levelName || `Nivel ${this.targetId}`;
      case TargetType.CUSTOM_GROUP:
        return this.targetMetadata?.groupName || `Grupo ${this.targetId}`;
      default:
        return `Target ${this.targetId}`;
    }
  }

  /**
   * Verifica si el target está activo
   */
  get isActive(): boolean {
    return this.status === TargetStatus.ACTIVE;
  }

  /**
   * Verifica si el target está completado
   */
  get isCompleted(): boolean {
    return this.status === TargetStatus.COMPLETED;
  }

  /**
   * Calcula días desde la última actividad
   */
  get daysSinceLastActivity(): number | null {
    if (!this.lastActivity) return null;
    
    const now = new Date();
    const diffTime = now.getTime() - this.lastActivity.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica si el target está inactivo por mucho tiempo
   */
  get isStale(): boolean {
    const daysSince = this.daysSinceLastActivity;
    return daysSince !== null && daysSince > 7;
  }

  /**
   * Obtiene la fecha límite efectiva (personalizada o de campaña)
   */
  get effectiveDueDate(): Date | null {
    return this.customDueDate || this.campaign?.dueDate || null;
  }

  /**
   * Verifica si el target está atrasado
   */
  get isOverdue(): boolean {
    const dueDate = this.effectiveDueDate;
    if (!dueDate) return false;
    
    return new Date() > dueDate && !this.isCompleted;
  }

  /**
   * Calcula días restantes hasta la fecha límite
   */
  get daysUntilDue(): number | null {
    const dueDate = this.effectiveDueDate;
    if (!dueDate) return null;
    
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtiene el nivel de urgencia del target
   */
  get urgencyLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (this.isCompleted) return 'LOW';
    if (this.isOverdue) return 'CRITICAL';
    
    const daysUntilDue = this.daysUntilDue;
    if (!daysUntilDue) return 'LOW';
    
    if (daysUntilDue <= 1) return 'HIGH';
    if (daysUntilDue <= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calcula la tasa de completado para targets de grupo
   */
  get groupCompletionRate(): number {
    if (this.totalIndividuals === 0) return 0;
    return Number((this.completedIndividuals / this.totalIndividuals * 100).toFixed(2));
  }

  /**
   * Verifica si el target es un grupo o individual
   */
  get isGroupTarget(): boolean {
    return [TargetType.CLASS, TargetType.SUBJECT, TargetType.GRADE_LEVEL, TargetType.CUSTOM_GROUP]
      .includes(this.targetType);
  }

  /**
   * Obtiene el tiempo empleado formateado
   */
  get timeSpentFormatted(): string {
    if (this.timeSpent === 0) return '0 min';
    
    const totalMinutes = Math.floor(this.timeSpent / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} h`;
    } else {
      return `${hours}h ${minutes}min`;
    }
  }

  /**
   * Actualiza el progreso del target
   */
  updateProgress(progressPercentage: number): void {
    this.progressPercentage = Math.min(100, Math.max(0, progressPercentage));
    this.lastActivity = new Date();
    
    if (this.progressPercentage === 100 && this.status !== TargetStatus.COMPLETED) {
      this.markAsCompleted();
    } else if (this.progressPercentage > 0 && this.status === TargetStatus.PENDING) {
      this.status = TargetStatus.ACTIVE;
    }
  }

  /**
   * Marca el target como completado
   */
  markAsCompleted(): void {
    this.status = TargetStatus.COMPLETED;
    this.progressPercentage = 100;
    this.completedAt = new Date();
    this.lastActivity = new Date();
  }

  /**
   * Añade tiempo empleado al total
   */
  addTimeSpent(additionalSeconds: number): void {
    this.timeSpent += additionalSeconds;
    this.lastActivity = new Date();
  }

  /**
   * Actualiza el conteo de individuos completados (para targets de grupo)
   */
  updateGroupProgress(completedCount: number, totalCount?: number): void {
    if (totalCount !== undefined) {
      this.totalIndividuals = totalCount;
    }
    this.completedIndividuals = completedCount;
    
    if (this.totalIndividuals > 0) {
      const newProgress = (this.completedIndividuals / this.totalIndividuals) * 100;
      this.updateProgress(newProgress);
    }
  }
}