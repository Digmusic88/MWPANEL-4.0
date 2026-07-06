/**
 * @archivo: family-email-log.entity.ts
 * @módulo: Families (Log de Emails)
 * @función: Registro de todos los emails enviados para auditoría y control de límites
 * @crítico: SÍ - Auditoría y prevención de spam
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Family } from '../../users/entities/family.entity';
import { FamilyAlert } from './family-alert.entity';

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  OPENED = 'opened',
  CLICKED = 'clicked',
}

export enum EmailType {
  IMMEDIATE = 'immediate',
  DAILY_SUMMARY = 'daily_summary',
  WEEKLY_SUMMARY = 'weekly_summary',
  DIGEST = 'digest',
  RESOLUTION = 'resolution',
  CUSTOM = 'custom',
}

@Entity('family_email_logs')
@Index(['familyId', 'sentAt']) // Para consultas de límites por fecha
@Index(['recipientEmail', 'sentAt']) // Para tracking por email
@Index(['emailType', 'status']) // Para estadísticas
export class FamilyEmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @Column({ name: 'family_id' })
  familyId: string;

  // Información del email
  @Column({
    type: 'enum',
    enum: EmailType,
    name: 'email_type',
  })
  emailType: EmailType;

  @Column({ name: 'recipient_email' })
  recipientEmail: string;

  @Column({ name: 'subject' })
  subject: string;

  @Column({ name: 'email_size_bytes', nullable: true })
  emailSizeBytes?: number;

  // Alertas relacionadas
  @Column({
    type: 'simple-array',
    name: 'alert_ids',
    nullable: true,
  })
  alertIds?: string[];

  @Column({ name: 'alert_count', default: 0 })
  alertCount: number;

  // Estado y timing
  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.PENDING,
  })
  status: EmailStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date; // Cuando se creó el log

  @Column({ name: 'scheduled_at', nullable: true })
  scheduledAt?: Date; // Cuando está programado para enviarse

  @Column({ name: 'sent_at', nullable: true })
  sentAt?: Date; // Cuando se envió realmente

  @Column({ name: 'delivered_at', nullable: true })
  deliveredAt?: Date; // Cuando fue entregado

  @Column({ name: 'opened_at', nullable: true })
  openedAt?: Date; // Cuando fue abierto por primera vez

  @Column({ name: 'last_clicked_at', nullable: true })
  lastClickedAt?: Date; // Último click en el email

  // Información técnica
  @Column({ name: 'email_provider_id', nullable: true })
  emailProviderId?: string; // ID del proveedor de email (Resend, etc.)

  @Column({ name: 'provider_message_id', nullable: true })
  providerMessageId?: string; // ID del mensaje del proveedor

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string; // User agent del cliente que abrió el email

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string; // IP desde donde se abrió el email

  // Control de errores
  @Column({ name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column({ name: 'next_retry_at', nullable: true })
  nextRetryAt?: Date;

  // Metadatos del contenido
  @Column({ name: 'content_metadata', type: 'jsonb', nullable: true })
  contentMetadata?: {
    template: string;               // Template utilizado
    language: string;               // Idioma del email
    personalizations: any;          // Datos de personalización
    attachmentCount: number;        // Número de adjuntos
    hasImages: boolean;             // Si contiene imágenes
    estimatedReadTime: number;      // Tiempo estimado de lectura (segundos)
  };

  // Estadísticas de engagement
  @Column({ name: 'open_count', default: 0 })
  openCount: number; // Número de veces abierto

  @Column({ name: 'click_count', default: 0 })
  clickCount: number; // Número de clicks

  @Column({ name: 'unique_clicks', default: 0 })
  uniqueClicks: number; // Clicks únicos

  // Configuración utilizada en el momento del envío
  @Column({ name: 'preferences_snapshot', type: 'jsonb', nullable: true })
  preferencesSnapshot?: {
    immediateAlerts: boolean;
    maxEmailsPerDay: number;
    quietHoursStart: string;
    quietHoursEnd: string;
    language: string;
  };

  // Información del contexto académico
  @Column({ name: 'academic_context', type: 'jsonb', nullable: true })
  academicContext?: {
    studentIds: string[];           // IDs de estudiantes mencionados
    subjectIds: string[];           // IDs de asignaturas mencionadas
    academicPeriod: string;         // Período académico
    urgencyLevel: string;           // Nivel de urgencia calculado
  };

  // Métodos de utilidad (getters virtuales)
  get isDelivered(): boolean {
    return this.status === EmailStatus.SENT && !!this.deliveredAt;
  }

  get isOpened(): boolean {
    return !!this.openedAt;
  }

  get hasClicks(): boolean {
    return this.clickCount > 0;
  }

  get deliveryTimeMinutes(): number | null {
    if (!this.sentAt || !this.deliveredAt) return null;
    return Math.round((this.deliveredAt.getTime() - this.sentAt.getTime()) / (1000 * 60));
  }

  get engagementScore(): number {
    // Calcular score de engagement (0-100)
    let score = 0;
    
    if (this.isOpened) score += 40;
    if (this.hasClicks) score += 30;
    if (this.openCount > 1) score += 20;
    if (this.uniqueClicks > 2) score += 10;
    
    return Math.min(score, 100);
  }
}