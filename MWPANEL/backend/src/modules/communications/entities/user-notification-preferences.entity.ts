/**
 * @archivo: user-notification-preferences.entity.ts
 * @módulo: Communications - Email Notifications System
 * @función: Entity para preferencias individuales de notificaciones por usuario
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @dependencias: User entity
 * @propósito: Permitir configuración granular de tipos de notificación por usuario
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_notification_preferences')
export class UserNotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación uno a uno con usuario
  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // Configuración global
  @Column({ default: true })
  emailNotificationsEnabled: boolean;

  @Column({ default: 'es' })
  preferredLanguage: string;

  // Configuración por tipos de notificación según rol

  // === NOTIFICACIONES PARA ESTUDIANTES ===
  @Column({ default: true })
  enableGradeNotifications: boolean; // Nuevas calificaciones

  @Column({ default: true })
  enableAssignmentReminders: boolean; // Recordatorios de tareas

  @Column({ default: true })
  enableEventReminders: boolean; // Eventos y calendario

  @Column({ default: true })
  enableTeacherMessages: boolean; // Mensajes de profesores

  // === NOTIFICACIONES PARA FAMILIAS ===
  @Column({ default: true })
  enableChildGradeUpdates: boolean; // Calificaciones de hijos

  @Column({ default: true })
  enableChildAbsenceAlerts: boolean; // Faltas de asistencia

  @Column({ default: true })
  enableSchoolEvents: boolean; // Eventos escolares

  @Column({ default: true })
  enableTeacherCommunications: boolean; // Comunicaciones del tutor

  // === NOTIFICACIONES PARA PROFESORES ===
  @Column({ default: true })
  enableNewAssignments: boolean; // Nuevas asignaciones

  @Column({ default: true })
  enableAdminMessages: boolean; // Mensajes de dirección

  @Column({ default: true })
  enableSystemIncidents: boolean; // Incidencias del sistema

  @Column({ default: true })
  enableClassUpdates: boolean; // Actualizaciones de clase

  // === NOTIFICACIONES PARA ADMINISTRADORES ===
  @Column({ default: true })
  enableSystemErrors: boolean; // Errores del sistema

  @Column({ default: true })
  enableBackupReports: boolean; // Reportes de backup

  @Column({ default: true })
  enableUserActivity: boolean; // Actividad de usuarios

  @Column({ default: true })
  enableSecurityAlerts: boolean; // Alertas de seguridad

  // === NOTIFICACIONES GENERALES ===
  @Column({ default: true })
  enableWelcomeEmails: boolean; // Correos de bienvenida

  @Column({ default: true })
  enablePasswordResetEmails: boolean; // Recuperación de contraseña

  @Column({ default: true })
  enableMaintenanceAlerts: boolean; // Alertas de mantenimiento

  // Configuración de frecuencia
  @Column({ default: 'immediate' })
  notificationFrequency: string; // immediate, daily, weekly

  @Column({ default: '09:00' })
  preferredNotificationTime: string; // Hora preferida para resúmenes

  // Configuración de formato
  @Column({ default: true })
  enableRichHtmlEmails: boolean; // HTML vs texto plano

  @Column({ default: true })
  enableEmailImages: boolean; // Imágenes en correos

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}