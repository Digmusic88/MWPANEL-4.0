/**
 * @archivo: email-template.entity.ts
 * @módulo: Communications - Email Notifications System
 * @función: Entity para gestión de plantillas de correo HTML
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @dependencias: User entity para autoría de plantillas
 * @propósito: Permitir gestión dinámica de plantillas de correo con variables
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
import { User } from '../../users/entities/user.entity';

export enum EmailTemplateType {
  // Notificaciones para Estudiantes
  GRADE_NOTIFICATION = 'grade_notification',
  ASSIGNMENT_REMINDER = 'assignment_reminder',
  EVENT_REMINDER = 'event_reminder',
  MESSAGE_FROM_TEACHER = 'message_from_teacher',
  
  // Notificaciones para Familias
  CHILD_GRADE_UPDATE = 'child_grade_update',
  CHILD_ABSENCE = 'child_absence',
  CHILD_TASK_OVERDUE = 'child_task_overdue',
  SCHOOL_EVENT = 'school_event',
  TEACHER_MESSAGE = 'teacher_message',
  ATTENDANCE_REQUEST_REVIEWED = 'attendance_request_reviewed',
  
  // Notificaciones para Profesores
  NEW_ASSIGNMENT = 'new_assignment',
  ADMIN_MESSAGE = 'admin_message',
  SYSTEM_INCIDENT = 'system_incident',
  ATTENDANCE_REQUEST_TEACHER = 'attendance_request_teacher',
  
  // Notificaciones para Administradores
  SYSTEM_ERROR = 'system_error',
  BACKUP_REPORT = 'backup_report',
  USER_ACTIVITY = 'user_activity',
  
  // Plantillas generales
  WELCOME = 'welcome',
  WELCOME_FAMILY = 'welcome_family',
  PASSWORD_RESET = 'password_reset',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  BIRTHDAY_GREETING = 'birthday_greeting',
  NEW_MESSAGE_NOTIFICATION = 'new_message_notification',
  CUSTOM = 'custom',
}

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: EmailTemplateType,
  })
  type: EmailTemplateType;

  @Column()
  subject: string;

  // Contenido HTML de la plantilla con variables Handlebars
  @Column('text')
  htmlContent: string;

  // Contenido en texto plano como alternativa
  @Column('text')
  textContent: string;

  // Variables disponibles en la plantilla (JSON)
  @Column('text', { nullable: true })
  availableVariables: string;

  // Configuración de envío por defecto
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSystem: boolean; // Plantillas del sistema (no editables)

  // Usuario que creó/editó la plantilla
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lastEditedById' })
  lastEditedBy: User;

  @Column({ nullable: true })
  lastEditedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}