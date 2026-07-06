/**
 * @archivo: email-notification.entity.ts
 * @módulo: Communications - Email Notifications System
 * @función: Entity para registro y seguimiento de correos enviados
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @dependencias: User entity, EmailTemplate entity
 * @propósito: Mantener historial completo de envíos y monitorización
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
import { EmailTemplate } from './email-template.entity';

export enum EmailStatus {
  PENDING = 'pending',       // En cola para envío
  SENDING = 'sending',       // En proceso de envío
  SENT = 'sent',            // Enviado exitosamente
  DELIVERED = 'delivered',   // Entregado (si el proveedor lo soporta)
  FAILED = 'failed',        // Falló el envío
  BOUNCED = 'bounced',      // Rebotó (email inválido)
  COMPLAINED = 'complained', // Marcado como spam
}

export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('email_notifications')
export class EmailNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Usuario destinatario
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column()
  recipientId: string;

  @Column()
  recipientEmail: string;

  // Plantilla utilizada
  @ManyToOne(() => EmailTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplate;

  @Column({ nullable: true })
  templateId: string;

  // Contenido del correo
  @Column()
  subject: string;

  @Column('text')
  htmlContent: string;

  @Column('text', { nullable: true })
  textContent: string;

  // Datos variables utilizados en la plantilla (JSON)
  @Column('text', { nullable: true })
  templateData: string;

  // Estado del envío
  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.PENDING,
  })
  status: EmailStatus;

  @Column({
    type: 'enum',
    enum: EmailPriority,
    default: EmailPriority.NORMAL,
  })
  priority: EmailPriority;

  // Información del proveedor de correo
  @Column({ nullable: true })
  providerMessageId: string; // ID del proveedor (Resend, SendGrid, etc.)

  @Column({ nullable: true })
  providerResponse: string; // Respuesta del proveedor (JSON)

  // Eventos relacionados que dispararon el correo
  @Column({ nullable: true })
  triggerEvent: string; // Tipo de evento que disparó el correo

  @Column({ nullable: true })
  triggerResourceId: string; // ID del recurso relacionado

  @Column({ nullable: true })
  triggerResourceType: string; // Tipo de recurso relacionado

  // Usuario que disparó el evento (opcional)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'triggeredById' })
  triggeredBy: User;

  @Column({ nullable: true })
  triggeredById: string;

  // Fechas de eventos
  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  failedAt: Date;

  @Column({ nullable: true })
  bouncedAt: Date;

  // Información de error
  @Column({ nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  nextRetryAt: Date;

  // Configuración de envío
  @Column({ default: false })
  isTest: boolean; // Para correos de prueba

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}