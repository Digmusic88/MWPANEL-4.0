/**
 * @archivo: email-automation.entity.ts
 * @módulo: Communications - Email Notifications System
 * @función: Entity para configuración de envío automático de emails
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @propósito: Configurar cuándo y cómo enviar emails automáticamente
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { EmailTemplate } from './email-template.entity';
import { User } from '../../users/entities/user.entity';

export enum EmailEventType {
  // Eventos académicos
  GRADE_CREATED = 'grade_created',
  ASSIGNMENT_CREATED = 'assignment_created',
  ASSIGNMENT_DUE_REMINDER = 'assignment_due_reminder',
  TASK_OVERDUE = 'task_overdue',
  EVENT_REMINDER = 'event_reminder',
  
  // Eventos de usuarios
  USER_CREATED = 'user_created',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  USER_BIRTHDAY = 'user_birthday',
  
  // Eventos del sistema
  SYSTEM_MAINTENANCE = 'system_maintenance',
  BACKUP_COMPLETED = 'backup_completed',
  
  // Eventos de asistencia
  ABSENCE_RECORDED = 'absence_recorded',
  ATTENDANCE_SUMMARY = 'attendance_summary',
}

export enum EmailRecipientType {
  STUDENT = 'student',
  TEACHER = 'teacher',
  FAMILY = 'family',
  ADMIN = 'admin',
  ALL_USERS = 'all_users',
  SPECIFIC_ROLE = 'specific_role',
}

@Entity('email_automations')
export class EmailAutomation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: EmailEventType,
  })
  eventType: EmailEventType;

  @Column({ default: true })
  isActive: boolean;

  // Plantilla a usar
  @ManyToOne(() => EmailTemplate, { nullable: false })
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplate;

  @Column()
  templateId: string;

  // Configuración de destinatarios
  @Column({
    type: 'enum',
    enum: EmailRecipientType,
  })
  recipientType: EmailRecipientType;

  // Configuración de timing (para recordatorios)
  @Column({ nullable: true })
  reminderDaysBefore: number; // Para recordatorios

  @Column({ nullable: true })
  reminderTime: string; // Hora del día para enviar (HH:mm)

  // Condiciones adicionales (JSON)
  @Column('text', { nullable: true })
  conditions: string; // JSON con condiciones específicas

  // Configuración de frecuencia
  @Column({ default: false })
  sendOnlyOnce: boolean; // Si solo enviar una vez por evento

  @Column({ nullable: true })
  maxEmailsPerDay: number; // Límite de emails por día

  // Metadatos
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @Column({ default: 0 })
  totalEmailsSent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}