import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StudentNote } from './student-note.entity';
import { SharedNoteComment } from './shared-note-comment.entity';

/**
 * ENTIDAD: SharedNote
 * PROPÓSITO: Gestionar el intercambio de apuntes entre estudiantes y profesores
 * 
 * CASOS DE USO:
 * 1. Estudiante comparte apunte con compañeros de clase
 * 2. Estudiante comparte apunte con profesores que le dan clase
 * 3. Sistema de notificaciones de apuntes compartidos
 * 4. Historial de compartición de apuntes
 * 
 * RELACIONES:
 * - StudentNote (N:1) - El apunte que se comparte
 * - User sharedBy (N:1) - Quien comparte el apunte
 * - User sharedWith (N:1) - Quien recibe el apunte
 */

export enum SharedNoteType {
  STUDENT = 'student',    // Compartido con estudiante
  TEACHER = 'teacher',    // Compartido con profesor
}

export enum SharedNoteStatus {
  ACTIVE = 'active',      // Compartido y activo
  REVOKED = 'revoked',    // Acceso revocado
  EXPIRED = 'expired',    // Compartición expirada
}

@Entity('shared_notes')
@Index('IDX_shared_notes_note_shared_with', ['noteId', 'sharedWithId'])
@Index('IDX_shared_notes_shared_by', ['sharedById'])
@Index('IDX_shared_notes_shared_at', ['sharedAt'])
export class SharedNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('IDX_shared_notes_noteId')
  noteId: string;

  @Column({ type: 'uuid' })
  @Index('IDX_shared_notes_sharedById')
  sharedById: string;

  @Column({ type: 'uuid' })
  @Index('IDX_shared_notes_sharedWithId')
  sharedWithId: string;

  @Column({
    type: 'enum',
    enum: SharedNoteType,
    default: SharedNoteType.STUDENT,
    comment: 'Tipo de destinatario: student o teacher'
  })
  sharedWithType: SharedNoteType;

  @Column({
    type: 'enum',
    enum: SharedNoteStatus,
    default: SharedNoteStatus.ACTIVE,
    comment: 'Estado de la compartición'
  })
  status: SharedNoteStatus;

  @Column({ type: 'text', nullable: true })
  message: string; // Mensaje opcional al compartir

  @Column({ type: 'text', nullable: true })
  permissions: string; // JSON con permisos específicos (view, comment, etc.)

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // Fecha de expiración opcional

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date; // Última vez que se accedió al apunte

  @Column({ type: 'int', default: 0 })
  accessCount: number; // Número de veces que se ha accedido

  @Column({ type: 'boolean', default: false })
  isNotified: boolean; // Si se envió notificación

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  sharedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => StudentNote, { eager: false })
  @JoinColumn({ name: 'noteId' })
  note: StudentNote;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'sharedById' })
  sharedBy: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'sharedWithId' })
  sharedWith: User;

  @OneToMany(() => SharedNoteComment, (comment) => comment.sharedNote)
  comments: SharedNoteComment[];

  // Métodos virtuales
  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isViewable(): boolean {
    return this.status === SharedNoteStatus.ACTIVE && !this.isExpired;
  }

  get permissionsObject(): any {
    try {
      return this.permissions ? JSON.parse(this.permissions) : { view: true };
    } catch {
      return { view: true };
    }
  }

  set permissionsObject(permissions: any) {
    this.permissions = JSON.stringify(permissions);
  }
}