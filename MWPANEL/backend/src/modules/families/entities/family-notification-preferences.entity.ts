/**
 * @archivo: family-notification-preferences.entity.ts
 * @módulo: Families (Preferencias de Notificación)
 * @función: Configuración personalizable de notificaciones email por familia
 * @crítico: SÍ - Control granular de preferencias de comunicación
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Family } from '../../users/entities/family.entity';
import { AlertType } from './family-alert.entity';

@Entity('family_notification_preferences')
export class FamilyNotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @Column({ name: 'family_id' })
  familyId: string;

  // Configuración de tipos de notificación
  @Column({ name: 'immediate_alerts', default: true })
  immediateAlerts: boolean;

  @Column({ name: 'daily_summary', default: true })
  dailySummary: boolean;

  @Column({ name: 'weekly_summary', default: true })
  weeklySummary: boolean;

  // Tipos específicos de alertas que quiere recibir
  @Column({
    type: 'simple-array',
    name: 'enabled_alert_types',
    default: 'pending_tasks,low_subject_grade,low_task_grade,unjustified_absence',
  })
  enabledAlertTypes: AlertType[];

  // Límites de envío
  @Column({ name: 'max_emails_per_day', default: 5 })
  maxEmailsPerDay: number;

  @Column({ name: 'max_immediate_alerts_per_hour', default: 2 })
  maxImmediateAlertsPerHour: number;

  // Horas de silencio
  @Column({ name: 'quiet_hours_start', default: '22:00' })
  quietHoursStart: string;

  @Column({ name: 'quiet_hours_end', default: '08:00' })
  quietHoursEnd: string;

  @Column({ name: 'respect_quiet_hours', default: true })
  respectQuietHours: boolean;

  // Configuración de resúmenes
  @Column({ name: 'daily_summary_time', default: '18:00' })
  dailySummaryTime: string;

  @Column({ name: 'weekly_summary_day', default: 0 }) // 0 = Domingo
  weeklySummaryDay: number;

  @Column({ name: 'weekly_summary_time', default: '10:00' })
  weeklySummaryTime: string;

  // Configuración de idioma y formato
  @Column({ 
    type: 'enum',
    enum: ['es', 'en'],
    default: 'es',
  })
  language: 'es' | 'en';

  @Column({ name: 'email_format', default: 'html' })
  emailFormat: 'html' | 'text';

  // Control de prioridades
  @Column({ name: 'only_critical_immediate', default: false })
  onlyCriticalImmediate: boolean; // Solo enviar inmediatos para alertas críticas

  @Column({ name: 'include_low_priority_in_summary', default: true })
  includeLowPriorityInSummary: boolean;

  // Configuración avanzada
  @Column({ name: 'digest_mode', default: false })
  digestMode: boolean; // Agrupa múltiples alertas en un solo email

  @Column({ name: 'digest_interval_minutes', default: 60 })
  digestIntervalMinutes: number;

  @Column({ name: 'send_resolution_notifications', default: false })
  sendResolutionNotifications: boolean; // Notificar cuando se resuelven alertas

  // Emails adicionales (CC)
  @Column({ 
    type: 'simple-array',
    name: 'additional_emails',
    nullable: true,
  })
  additionalEmails?: string[]; // Emails adicionales para CC (abuelos, tutores, etc.)

  // Control de activación
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'temporarily_disabled_until', nullable: true })
  temporarilyDisabledUntil?: Date; // Desactivar temporalmente (vacaciones, etc.)

  // Metadatos
  @Column({ name: 'custom_settings', type: 'jsonb', nullable: true })
  customSettings?: {
    subjectPrefix?: string;           // Prefijo personalizado para asunto
    includeLogo?: boolean;            // Incluir logo del centro
    customFooter?: string;            // Pie de email personalizado
    emergencyContactEmail?: string;   // Email de emergencia
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}