/**
 * @archivo: assignment-progress.entity.ts
 * @módulo: Assignments (Sistema Avanzado de Asignaciones)
 * @función: Entidad para tracking detallado de progreso individual
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Entidad que rastrea el progreso individual de cada usuario con cada recurso
 * en cada campaña. Proporciona métricas detalladas de engagement, tiempo empleado,
 * evaluaciones y feedback tanto de estudiantes como profesores.
 * 
 * RELACIONES:
 * - N:1 con AssignmentCampaign (campaña)
 * - N:1 con User (usuario que realiza el progreso)
 * - N:1 con EducationalResource (recurso específico)
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
  Check,
} from 'typeorm';
import { AssignmentCampaign } from './assignment-campaign.entity';
import { User } from '../../users/entities/user.entity';
import { EducationalResource } from '../../educational-resources/entities/educational-resource.entity';

/**
 * ENUM: Progress Status
 * Estados del progreso individual con un recurso específico
 */
export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED',   // No ha comenzado a interactuar
  IN_PROGRESS = 'IN_PROGRESS',   // Ha iniciado pero no completado
  COMPLETED = 'COMPLETED',       // Ha completado el recurso
  REVIEWED = 'REVIEWED',         // Profesor ha revisado y dado feedback
  SKIPPED = 'SKIPPED'            // Usuario o profesor marcó como omitido
}

@Entity('assignment_progress')
@Unique('UQ_user_campaign_resource', ['userId', 'campaignId', 'resourceId'])
@Index('IDX_assignment_progress_user_status', ['userId', 'status'])
@Index('IDX_assignment_progress_campaign_completion', ['campaignId', 'status'])
@Index('IDX_assignment_progress_resource_progress', ['resourceId', 'status'])
@Check('CHK_ratings_range', 'self_rating BETWEEN 1 AND 5 AND teacher_rating BETWEEN 1 AND 5')
@Check('CHK_difficulty_range', 'difficulty_perceived BETWEEN 1 AND 5')
@Check('CHK_engagement_score', 'engagement_score BETWEEN 0 AND 1')
export class AssignmentProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === RELACIONES PRINCIPALES ===
  @Column()
  @Index('IDX_assignment_progress_campaignId')
  campaignId: string;

  @Column()
  @Index('IDX_assignment_progress_userId')
  userId: string;

  @Column({ nullable: true })
  @Index('IDX_assignment_progress_resourceId')
  resourceId: string;

  // === ESTADO DEL PROGRESO ===
  @Column({
    type: 'enum',
    enum: ProgressStatus,
    default: ProgressStatus.NOT_STARTED
  })
  status: ProgressStatus;

  // === TIMESTAMPS DE ACTIVIDAD ===
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  // === MÉTRICAS DETALLADAS ===
  @Column({ type: 'int', default: 0, comment: 'Tiempo total empleado en segundos' })
  timeSpent: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0, comment: 'Número de interacciones (clicks, scroll, etc.)' })
  interactionCount: number;

  @Column({ type: 'int', default: 0, comment: 'Número de veces que descargó el recurso' })
  downloadCount: number;

  // === EVALUACIÓN Y FEEDBACK ===
  @Column({ 
    type: 'int', 
    nullable: true,
    comment: 'Auto-evaluación del estudiante (1-5)'
  })
  selfRating: number;

  @Column({ 
    type: 'int', 
    nullable: true,
    comment: 'Evaluación del profesor (1-5)'
  })
  teacherRating: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'text', nullable: true })
  teacherNotes: string;

  // === ANALYTICS AVANZADOS ===
  @Column({ 
    type: 'decimal', 
    precision: 3, 
    scale: 2, 
    nullable: true,
    comment: 'Score de engagement calculado (0-1)' 
  })
  engagementScore: number;

  @Column({ 
    type: 'int', 
    nullable: true,
    comment: 'Dificultad percibida por el estudiante (1-5)'
  })
  difficultyPerceived: number;

  @Column({ type: 'boolean', nullable: true })
  learningOutcomeAchieved: boolean;

  @Column({ 
    type: 'decimal', 
    precision: 5, 
    scale: 2, 
    default: 0,
    comment: 'Porcentaje de completado (0-100)' 
  })
  completionPercentage: number;

  // === DATOS CONTEXTUALES ===
  @Column({ 
    type: 'jsonb', 
    nullable: true,
    comment: 'Datos adicionales de contexto (dispositivo, navegador, etc.)'
  })
  contextData: Record<string, any>;

  @Column({ 
    type: 'jsonb', 
    nullable: true,
    comment: 'Eventos de interacción detallados'
  })
  interactionEvents: Array<{
    timestamp: Date;
    eventType: string;
    eventData: Record<string, any>;
  }>;

  // === METADATOS ===
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // === RELACIONES ===
  @ManyToOne(() => AssignmentCampaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaignId' })
  campaign: AssignmentCampaign;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => EducationalResource, { eager: true })
  @JoinColumn({ name: 'resourceId' })
  resource: EducationalResource;

  // === MÉTODOS VIRTUALES Y HELPERS ===

  /**
   * Verifica si el progreso ha comenzado
   */
  get hasStarted(): boolean {
    return this.status !== ProgressStatus.NOT_STARTED;
  }

  /**
   * Verifica si está completado
   */
  get isCompleted(): boolean {
    return this.status === ProgressStatus.COMPLETED || this.status === ProgressStatus.REVIEWED;
  }

  /**
   * Verifica si ha sido revisado por el profesor
   */
  get isReviewed(): boolean {
    return this.status === ProgressStatus.REVIEWED;
  }

  /**
   * Obtiene el tiempo empleado formateado
   */
  get timeSpentFormatted(): string {
    if (this.timeSpent === 0) return '0 min';
    
    const totalMinutes = Math.floor(this.timeSpent / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = this.timeSpent % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Calcula días desde el último acceso
   */
  get daysSinceLastAccess(): number | null {
    if (!this.lastAccessedAt) return null;
    
    const now = new Date();
    const diffTime = now.getTime() - this.lastAccessedAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica si el usuario está inactivo
   */
  get isInactive(): boolean {
    const daysSince = this.daysSinceLastAccess;
    return daysSince !== null && daysSince > 3 && !this.isCompleted;
  }

  /**
   * Calcula la velocidad de progreso (porcentaje por día)
   */
  get progressRate(): number {
    if (!this.startedAt || this.completionPercentage === 0) return 0;
    
    const now = this.completedAt || new Date();
    const daysElapsed = (now.getTime() - this.startedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysElapsed > 0 ? Number((this.completionPercentage / daysElapsed).toFixed(2)) : 0;
  }

  /**
   * Obtiene el promedio de ratings (auto + profesor)
   */
  get averageRating(): number | null {
    const ratings = [this.selfRating, this.teacherRating].filter(r => r !== null && r !== undefined);
    if (ratings.length === 0) return null;
    
    return Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1));
  }

  /**
   * Calcula score de efectividad basado en múltiples factores
   */
  get effectivenessScore(): number {
    let score = 0;
    let factors = 0;

    // Factor de completado (40%)
    if (this.completionPercentage > 0) {
      score += (this.completionPercentage / 100) * 0.4;
      factors += 0.4;
    }

    // Factor de rating (30%)
    const avgRating = this.averageRating;
    if (avgRating !== null) {
      score += (avgRating / 5) * 0.3;
      factors += 0.3;
    }

    // Factor de engagement (20%)
    if (this.engagementScore !== null) {
      score += this.engagementScore * 0.2;
      factors += 0.2;
    }

    // Factor de learning outcome (10%)
    if (this.learningOutcomeAchieved !== null) {
      score += (this.learningOutcomeAchieved ? 1 : 0) * 0.1;
      factors += 0.1;
    }

    return factors > 0 ? Number((score / factors).toFixed(2)) : 0;
  }

  /**
   * Inicia el progreso (marca como comenzado)
   */
  startProgress(): void {
    if (this.status === ProgressStatus.NOT_STARTED) {
      this.status = ProgressStatus.IN_PROGRESS;
      this.startedAt = new Date();
      this.lastAccessedAt = new Date();
    }
  }

  /**
   * Registra actividad y actualiza métricas
   */
  recordActivity(activityData: {
    timeSpent?: number;
    interactionType?: string;
    eventData?: Record<string, any>;
  }): void {
    this.lastAccessedAt = new Date();
    this.viewCount += 1;

    if (activityData.timeSpent) {
      this.timeSpent += activityData.timeSpent;
    }

    if (activityData.interactionType) {
      this.interactionCount += 1;
      
      // Registrar evento de interacción
      if (!this.interactionEvents) {
        this.interactionEvents = [];
      }
      
      this.interactionEvents.push({
        timestamp: new Date(),
        eventType: activityData.interactionType,
        eventData: activityData.eventData || {}
      });
    }

    // Actualizar engagement score
    this.updateEngagementScore();

    // Si no había comenzado, marcarlo como en progreso
    if (this.status === ProgressStatus.NOT_STARTED) {
      this.startProgress();
    }
  }

  /**
   * Marca como completado
   */
  markAsCompleted(): void {
    this.status = ProgressStatus.COMPLETED;
    this.completedAt = new Date();
    this.lastAccessedAt = new Date();
    this.completionPercentage = 100;
  }

  /**
   * Registra descarga del recurso
   */
  recordDownload(): void {
    this.downloadCount += 1;
    this.recordActivity({ interactionType: 'DOWNLOAD' });
  }

  /**
   * Actualiza el score de engagement basado en actividad
   */
  private updateEngagementScore(): void {
    if (this.viewCount === 0) {
      this.engagementScore = 0;
      return;
    }

    // Factores de engagement
    const viewFactor = Math.min(this.viewCount / 5, 1); // Normalizado a 5 vistas
    const interactionFactor = this.viewCount > 0 ? Math.min(this.interactionCount / this.viewCount, 1) : 0;
    const timeFactor = this.timeSpent > 0 ? Math.min(this.timeSpent / (10 * 60), 1) : 0; // Normalizado a 10 minutos
    const downloadFactor = this.downloadCount > 0 ? 0.2 : 0; // Bonus por descargar

    this.engagementScore = Number((
      (viewFactor * 0.3) +
      (interactionFactor * 0.4) +
      (timeFactor * 0.2) +
      downloadFactor
    ).toFixed(2));
  }

  /**
   * Añade feedback del estudiante
   */
  addStudentFeedback(rating: number, feedback?: string, difficultyPerceived?: number, learningOutcome?: boolean): void {
    this.selfRating = Math.max(1, Math.min(5, rating));
    if (feedback) this.feedback = feedback;
    if (difficultyPerceived) this.difficultyPerceived = Math.max(1, Math.min(5, difficultyPerceived));
    if (learningOutcome !== undefined) this.learningOutcomeAchieved = learningOutcome;
    
    this.lastAccessedAt = new Date();
  }

  /**
   * Añade feedback del profesor
   */
  addTeacherFeedback(rating: number, notes?: string): void {
    this.teacherRating = Math.max(1, Math.min(5, rating));
    if (notes) this.teacherNotes = notes;
    this.reviewedAt = new Date();
    
    if (this.status === ProgressStatus.COMPLETED) {
      this.status = ProgressStatus.REVIEWED;
    }
  }

  /**
   * Actualiza el porcentaje de completado
   */
  updateCompletionPercentage(percentage: number): void {
    this.completionPercentage = Math.max(0, Math.min(100, percentage));
    
    if (this.completionPercentage === 100 && this.status === ProgressStatus.IN_PROGRESS) {
      this.markAsCompleted();
    }
  }
}