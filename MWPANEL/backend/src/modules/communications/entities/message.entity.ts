import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { Student } from '../../students/entities/student.entity';
import { MessageAttachment } from './message-attachment.entity';
import { ReadOnlyDateTransformer, DateTransformer } from '../../../common/transformers/date.transformer';

export enum MessageType {
  DIRECT = 'direct',           // Mensaje directo entre dos usuarios
  GROUP = 'group',             // Mensaje a un grupo de clase
  ANNOUNCEMENT = 'announcement', // Comunicado oficial
  NOTIFICATION = 'notification', // Notificación del sistema
  ATTENDANCE_REQUEST = 'attendance_request', // Solicitud de asistencia
}

export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum MessageStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject: string;

  @Column('text')
  content: string;

  @Column({ 
    default: 'text',
    comment: 'Content type: text, html, markdown'
  })
  contentType: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.DIRECT,
  })
  type: MessageType;

  @Column({
    type: 'enum',
    enum: MessagePriority,
    default: MessagePriority.NORMAL,
  })
  priority: MessagePriority;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  // Remitente del mensaje
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  senderId: string;

  // Destinatario (para mensajes directos)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ nullable: true })
  recipientId: string;

  // Grupo destinatario (para mensajes grupales)
  @ManyToOne(() => ClassGroup, { nullable: true })
  @JoinColumn({ name: 'targetGroupId' })
  targetGroup: ClassGroup;

  @Column({ nullable: true })
  targetGroupId: string;

  // Estudiante relacionado (para contexto del mensaje)
  @ManyToOne(() => Student, { nullable: true })
  @JoinColumn({ name: 'relatedStudentId' })
  relatedStudent: Student;

  @Column({ nullable: true })
  relatedStudentId: string;

  // Mensaje padre (para hilos de conversación)
  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'parentMessageId' })
  parentMessage: Message;

  @Column({ nullable: true })
  parentMessageId: string;

  // ID de la solicitud de asistencia asociada (para mensajes de tipo ATTENDANCE_REQUEST)
  @Column({ nullable: true })
  attendanceRequestId: string;

  // Respuestas a este mensaje
  @OneToMany(() => Message, (message) => message.parentMessage)
  replies: Message[];

  // Archivos adjuntos
  @OneToMany(() => MessageAttachment, (attachment) => attachment.message)
  attachments: MessageAttachment[];

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true, transformer: new DateTransformer() })
  readAt: Date;

  @Column({ default: false })
  isArchived: boolean;

  // Borrador - mensaje guardado pero no enviado
  @Column({ default: false })
  isDraft: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ default: false })
  isDeletedBySender: boolean;

  @Column({ default: false })
  isDeletedByRecipient: boolean;

  // Campo para rastrear si el mensaje fue editado
  @Column({ default: false })
  isEdited: boolean;

  @Column({ type: 'timestamp', nullable: true, transformer: new DateTransformer() })
  editedAt: Date;

  // Campo para guardar el contenido original antes de edición (opcional, para auditoría)
  @Column({ type: 'text', nullable: true })
  originalContent: string;

  // ID de conversación para borradores de conversación (null = borrador general, UUID = borrador de esa conversación)
  @Column({ nullable: true })
  conversationId: string;

  @CreateDateColumn({ transformer: new ReadOnlyDateTransformer() })
  createdAt: Date;

  @UpdateDateColumn({ transformer: new ReadOnlyDateTransformer() })
  updatedAt: Date;
}