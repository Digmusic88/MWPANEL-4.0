/**
 * @archivo: assignment-campaign.entity.ts
 * @módulo: Assignments (Sistema Avanzado de Asignaciones)
 * @función: Entidad principal para campañas de asignación
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Entidad principal que representa una campaña de asignación de recursos.
 * Una campaña puede incluir múltiples recursos y múltiples targets.
 * Soporta asignaciones simples, bulk, recurrentes y condicionales.
 * 
 * RELACIONES:
 * - 1:N con CampaignResource (recursos incluidos en la campaña)
 * - 1:N con CampaignTarget (targets de la campaña)
 * - 1:N con AssignmentProgress (progreso individual)
 * - N:1 con User (creador de la campaña)
 * 
 * ESTADO ACTUAL: NUEVA IMPLEMENTACIÓN - STEP 1.2
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CampaignResource } from './campaign-resource.entity';
import { CampaignTarget } from './campaign-target.entity';
import { AssignmentProgress } from './assignment-progress.entity';
import { AssignmentCondition } from './assignment-condition.entity';

/**
 * ENUM: Campaign Types
 * Define los diferentes tipos de campañas de asignación soportados
 */
export enum CampaignType {
  SINGLE = 'SINGLE',           // Asignación única y simple
  BULK = 'BULK',               // Asignación masiva a múltiples targets
  RECURRING = 'RECURRING',     // Asignación recurrente (diaria/semanal/mensual)
  CONDITIONAL = 'CONDITIONAL'  // Asignación basada en condiciones específicas
}

/**
 * ENUM: Campaign Status
 * Estados del ciclo de vida de una campaña
 */
export enum CampaignStatus {
  DRAFT = 'DRAFT',           // Borrador, aún no activada
  ACTIVE = 'ACTIVE',         // Activa y en progreso
  PAUSED = 'PAUSED',         // Pausada temporalmente
  COMPLETED = 'COMPLETED',   // Completada exitosamente
  EXPIRED = 'EXPIRED',       // Expirada por fecha límite
  CANCELLED = 'CANCELLED'    // Cancelada por el usuario
}

@Entity('assignment_campaigns')
@Index('IDX_campaign_created_by_date', ['createdById', 'createdAt'])
@Index('IDX_campaign_status_priority', ['status', 'priority'])
@Index('IDX_campaign_dates', ['startDate', 'endDate', 'dueDate'])
export class AssignmentCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === IDENTIFICACIÓN Y DESCRIPCIÓN ===
  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
    default: CampaignType.SINGLE
  })
  campaignType: CampaignType;

  // === OWNERSHIP Y TIMESTAMPS ===
  @Column()
  @Index('IDX_assignment_campaigns_createdById')
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // === CONFIGURACIÓN TEMPORAL ===
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  // === ESTADO Y PRIORIDAD ===
  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT
  })
  status: CampaignStatus;

  @Column({ type: 'int', default: 0 })
  priority: number;

  // === CONFIGURACIÓN AVANZADA ===
  @Column({ type: 'boolean', default: false })
  autoAssignment: boolean;

  @Column({ type: 'boolean', default: true })
  allowLateSubmission: boolean;

  @Column({ type: 'boolean', default: true })
  sendReminders: boolean;

  // === METADATOS Y ANALYTICS ===
  @Column({ type: 'int', default: 0 })
  totalTargets: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  avgTimeToComplete: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  effectivenessScore: number;

  // === RELACIONES ===
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => CampaignResource, campaignResource => campaignResource.campaign)
  campaignResources: CampaignResource[];

  @OneToMany(() => CampaignTarget, campaignTarget => campaignTarget.campaign)
  campaignTargets: CampaignTarget[];

  @OneToMany(() => AssignmentProgress, progress => progress.campaign)
  assignmentProgress: AssignmentProgress[];

  @OneToMany(() => AssignmentCondition, condition => condition.campaign)
  assignmentConditions: AssignmentCondition[];

  // === MÉTODOS VIRTUALES Y HELPERS ===
  
  /**
   * Verifica si la campaña está actualmente activa
   */
  get isActive(): boolean {
    const now = new Date();
    return this.status === CampaignStatus.ACTIVE &&
           this.startDate <= now &&
           (!this.endDate || this.endDate >= now);
  }

  /**
   * Verifica si la campaña ha expirado
   */
  get isExpired(): boolean {
    const now = new Date();
    return this.endDate ? this.endDate < now : false;
  }

  /**
   * Calcula días restantes hasta la fecha límite
   */
  get daysUntilDue(): number | null {
    if (!this.dueDate) return null;
    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Verifica si la campaña permite nuevas asignaciones
   */
  get canAssignNew(): boolean {
    return this.status === CampaignStatus.ACTIVE &&
           !this.isExpired &&
           this.autoAssignment;
  }

  /**
   * Obtiene el nivel de urgencia basado en fechas
   */
  get urgencyLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const daysUntilDue = this.daysUntilDue;
    if (!daysUntilDue) return 'LOW';
    
    if (daysUntilDue < 1) return 'CRITICAL';
    if (daysUntilDue <= 3) return 'HIGH';
    if (daysUntilDue <= 7) return 'MEDIUM';
    return 'LOW';
  }
}