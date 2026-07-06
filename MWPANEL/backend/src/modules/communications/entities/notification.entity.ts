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
import { Student } from '../../students/entities/student.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';

export enum NotificationType {
  EVALUATION = 'evaluation',       // Nueva evaluación disponible
  MESSAGE = 'message',             // Nuevo mensaje recibido
  ANNOUNCEMENT = 'announcement',   // Comunicado oficial
  ACADEMIC = 'academic',           // Eventos académicos
  ATTENDANCE = 'attendance',       // Faltas/asistencia
  REMINDER = 'reminder',           // Recordatorios
  SYSTEM = 'system',               // Notificaciones del sistema
  SHARED_NOTE = 'shared_note',     // Apunte compartido contigo
  MODERATION = 'moderation',       // Notificaciones de moderación
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  DISMISSED = 'dismissed',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  // Usuario destinatario de la notificación
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // Usuario que generó la notificación (opcional)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'triggeredById' })
  triggeredBy: User;

  @Column({ nullable: true })
  triggeredById: string;

  // Estudiante relacionado (opcional)
  @ManyToOne(() => Student, { nullable: true })
  @JoinColumn({ name: 'relatedStudentId' })
  relatedStudent: Student;

  @Column({ nullable: true })
  relatedStudentId: string;

  // Grupo relacionado (opcional)
  @ManyToOne(() => ClassGroup, { nullable: true })
  @JoinColumn({ name: 'relatedGroupId' })
  relatedGroup: ClassGroup;

  @Column({ nullable: true })
  relatedGroupId: string;

  // ID del recurso relacionado (evaluación, mensaje, etc.)
  @Column({ nullable: true })
  relatedResourceId: string;

  // Tipo del recurso relacionado
  @Column({ nullable: true })
  relatedResourceType: string;

  // URL de acción (donde dirigir al usuario al hacer clic)
  @Column({ nullable: true })
  actionUrl: string;

  @Column({ nullable: true })
  readAt: Date;

  @Column({ nullable: true })
  dismissedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}