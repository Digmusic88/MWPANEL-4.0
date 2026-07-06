import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskSubmission } from './task-submission.entity';
import { StudentNote } from '../../student-notes/entities/student-note.entity';

export enum SubmissionAttachmentStatus {
  UPLOADED = 'uploaded',         // Subido
  PROCESSING = 'processing',     // En procesamiento
  VALIDATED = 'validated',       // Validado
  REJECTED = 'rejected',         // Rechazado
  CORRUPTED = 'corrupted',       // Corrupto
}

export enum SubmissionAttachmentType {
  FILE = 'file',                 // Archivo tradicional subido
  STUDENT_NOTE = 'student_note', // Apunte del estudiante adjuntado
}

@Entity('task_submission_attachments')
export class TaskSubmissionAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Tipo de adjunto: archivo subido o apunte del estudiante
  @Column({
    type: 'enum',
    enum: SubmissionAttachmentType,
    default: SubmissionAttachmentType.FILE,
  })
  type: SubmissionAttachmentType;

  // Campos para archivos tradicionales (nullable para apuntes)
  @Column({ type: 'varchar', length: 255, nullable: true })
  filename: string; // Nombre del archivo en el servidor

  @Column({ type: 'varchar', length: 255, nullable: true })
  originalName: string; // Nombre original del archivo

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'bigint', nullable: true })
  size: number; // Tamaño en bytes

  @Column({ type: 'varchar', length: 500, nullable: true })
  path: string; // Ruta del archivo en el servidor

  // Campo para referencia a apunte del estudiante
  @Column({ type: 'uuid', nullable: true })
  studentNoteId: string;

  @Column({
    type: 'enum',
    enum: SubmissionAttachmentStatus,
    default: SubmissionAttachmentStatus.UPLOADED,
  })
  status: SubmissionAttachmentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string; // Descripción del estudiante

  @Column({ type: 'varchar', length: 500, nullable: true })
  rejectionReason: string; // Motivo de rechazo si aplica

  @Column({ type: 'boolean', default: false })
  isMainSubmission: boolean; // Si es el archivo principal de la entrega

  @Column({ type: 'int', default: 1 })
  version: number; // Versión del archivo (si se reemplaza)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  uploadedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date;

  // Relaciones
  @Column({ type: 'uuid' })
  submissionId: string;

  @ManyToOne(() => TaskSubmission, (submission) => submission.attachments)
  @JoinColumn({ name: 'submissionId' })
  submission: TaskSubmission;

  @ManyToOne(() => StudentNote, { nullable: true, eager: true })
  @JoinColumn({ name: 'studentNoteId' })
  studentNote: StudentNote;

  // Métodos utiles
  get fileExtension(): string {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) {
      return 'note';
    }
    return this.originalName?.split('.').pop()?.toLowerCase() || '';
  }

  get sizeInMB(): number {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) {
      return 0; // Los apuntes no tienen tamaño de archivo físico
    }
    return Math.round((this.size / (1024 * 1024)) * 100) / 100;
  }

  get displayName(): string {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE && this.studentNote) {
      return this.studentNote.title;
    }
    return this.originalName || this.filename || 'Sin nombre';
  }

  get isStudentNote(): boolean {
    return this.type === SubmissionAttachmentType.STUDENT_NOTE;
  }

  get displaySize(): string {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) {
      return 'Apunte';
    }
    return this.sizeInMB > 0 ? `${this.sizeInMB} MB` : 'N/A';
  }

  get isImage(): boolean {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) {
      return this.studentNote?.type === 'drawing';
    }
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageTypes.includes(this.fileExtension);
  }

  get isDocument(): boolean {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) {
      return this.studentNote?.type === 'text';
    }
    const docTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    return docTypes.includes(this.fileExtension);
  }

  get isSpreadsheet(): boolean {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) return false;
    const spreadsheetTypes = ['xls', 'xlsx', 'csv'];
    return spreadsheetTypes.includes(this.fileExtension);
  }

  get isPresentation(): boolean {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) {
      return this.studentNote?.type === 'presentation';
    }
    const presentationTypes = ['ppt', 'pptx'];
    return presentationTypes.includes(this.fileExtension);
  }

  get isVideo(): boolean {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) return false;
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    return videoTypes.includes(this.fileExtension);
  }

  get isAudio(): boolean {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) {
      return this.studentNote?.type === 'voice';
    }
    const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
    return audioTypes.includes(this.fileExtension);
  }

  get isArchive(): boolean {
    if (this.type === SubmissionAttachmentType.STUDENT_NOTE) return false;
    const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz'];
    return archiveTypes.includes(this.fileExtension);
  }

  get statusColor(): string {
    switch (this.status) {
      case SubmissionAttachmentStatus.UPLOADED:
        return '#1890ff';
      case SubmissionAttachmentStatus.PROCESSING:
        return '#faad14';
      case SubmissionAttachmentStatus.VALIDATED:
        return '#52c41a';
      case SubmissionAttachmentStatus.REJECTED:
        return '#ff4d4f';
      case SubmissionAttachmentStatus.CORRUPTED:
        return '#f5222d';
      default:
        return '#d9d9d9';
    }
  }
}