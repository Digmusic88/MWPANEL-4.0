import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { Task } from './task.entity';
import { Student } from '../../students/entities/student.entity';
import { TaskSubmissionAttachment } from './task-submission-attachment.entity';

export enum SubmissionStatus {
  NOT_SUBMITTED = 'not_submitted',   // No entregada
  SUBMITTED = 'submitted',           // Entregada
  LATE = 'late',                    // Entregada tarde
  GRADED = 'graded',                // Calificada
  RETURNED = 'returned',            // Devuelta para revisión
  RESUBMITTED = 'resubmitted',      // Reenviada
}

@Entity('task_submissions')
@Unique(['taskId', 'studentId']) // Un estudiante solo puede tener una entrega por tarea
export class TaskSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  content: string; // Respuesta en texto del estudiante

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.NOT_SUBMITTED,
  })
  status: SubmissionStatus;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  firstSubmittedAt: Date; // Primera entrega (para tracking)

  @Column({ type: 'timestamp', nullable: true })
  gradedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  grade: number; // Puntuación obtenida

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalGrade: number; // Nota final (con penalizaciones aplicadas)

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  weight?: number | null; // Peso individual de esta entrega (override; null = usa el peso de la columna)

  @Column({ type: 'text', nullable: true })
  teacherFeedback: string; // Comentarios del profesor

  @Column({ type: 'text', nullable: true })
  privateNotes: string; // Notas privadas del profesor

  @Column({ type: 'boolean', default: false })
  isLate: boolean;

  @Column({ type: 'boolean', default: false })
  isGraded: boolean;

  @Column({ type: 'boolean', default: false })
  needsRevision: boolean; // Si necesita revisión

  @Column({ type: 'int', default: 1 })
  attemptNumber: number; // Número de intento

  @Column({ type: 'int', default: 0 })
  revisionCount: number; // Número de revisiones

  @Column({ type: 'text', nullable: true })
  submissionNotes: string; // Notas del estudiante al entregar

  @Column({ type: 'boolean', default: false })
  isExamNotification: boolean; // Para distinguir notificaciones de examen de entregas normales

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.submissions)
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @OneToMany(() => TaskSubmissionAttachment, (attachment) => attachment.submission)
  attachments: TaskSubmissionAttachment[];

  // Campos virtuales/calculados
  get wasSubmittedLate(): boolean {
    if (!this.firstSubmittedAt || !this.task?.dueDate) return false;
    return this.firstSubmittedAt > this.task.dueDate;
  }

  get daysSinceSubmission(): number {
    if (!this.submittedAt) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.submittedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get hasAttachments(): boolean {
    return this.attachments && this.attachments.length > 0;
  }

  get gradePercentage(): number {
    if (!this.finalGrade || !this.task?.maxPoints) return 0;
    const percentage = (this.finalGrade / this.task.maxPoints) * 100;
    return Math.round(percentage * 10) / 10;
  }
}