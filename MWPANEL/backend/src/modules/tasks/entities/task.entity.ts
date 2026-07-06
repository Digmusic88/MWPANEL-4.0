/**
 * @archivo: task.entity.ts
 * @módulo: Tasks (Sistema de Tareas Estudiantiles)
 * @función: Gestión de tareas/deberes asignados a estudiantes
 * @crítico: SÍ - Núcleo del módulo de tareas estudiantiles
 * @dependencias: TaskSubmission, TaskAttachment, Teacher, SubjectAssignment
 * @no_modificar: TaskType enum sin analizar impacto en evaluaciones
 * @relacionado_con: task-submission.entity.ts, activities.entity.ts
 */

/**
 * TABLA: tasks
 * USO ACTUAL: Gestión de tareas/deberes ESTUDIANTILES
 * NO USAR PARA: Tareas administrativas o del profesorado
 * RELACIONES: 
 *   - task_submissions (1:N) - Entregas de estudiantes
 *   - task_attachments (1:N) - Archivos adjuntos de la tarea
 *   - subject_assignments (N:1) - Asignatura donde se crea
 *   - teachers (N:1) - Profesor que crea la tarea
 * CRÍTICO: Esta tabla es central para el módulo de tareas estudiantiles
 * 
 * DIFERENCIAS CON ACTIVITIES:
 * - TASKS: Tareas con entregas, fechas límite, evaluables
 * - ACTIVITIES: Actividades diarias, inmediatas, para calificación rápida
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { TaskSubmission } from './task-submission.entity';
import { TaskAttachment } from './task-attachment.entity';
import { Rubric } from '../../activities/entities/rubric.entity';
import { CustomTab } from './custom-tab.entity';
import { TaskSubjectAssignment } from './task-subject-assignment.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';

// CRÍTICO: TaskType enum - Define tipos de tareas estudiantiles
// USADO POR: TaskService, TaskController, frontend TaskCard components
// NOTA: Si se modifica, actualizar también frontend/TaskFilters
/**
 * TIPOS DE TAREAS ESTUDIANTILES - NOMENCLATURA FIJA
 * 
 * ASSIGNMENT: Tarea/Ejercicio regular con entrega
 * PROJECT: Proyecto largo plazo con múltiples entregas
 * EXAM: Examen/Test formal evaluable
 * HOMEWORK: Deberes para casa
 * RESEARCH: Trabajo de investigación
 * PRESENTATION: Presentación oral/escrita
 * QUIZ: Cuestionario corto
 * 
 * NO CONFUNDIR CON:
 * - ActivityType (actividades diarias inmediatas)
 * - EvaluationType (tipos de evaluación competencial)
 */
export enum TaskType {
  ASSIGNMENT = 'assignment',     // Tarea/Ejercicio regular
  PROJECT = 'project',          // Proyecto largo plazo
  EXAM = 'exam',               // Examen/Test formal
  HOMEWORK = 'homework',       // Deberes para casa
  RESEARCH = 'research',       // Trabajo de investigación
  PRESENTATION = 'presentation', // Presentación
  QUIZ = 'quiz',               // Cuestionario corto
}

export enum TaskStatus {
  DRAFT = 'draft',           // Borrador
  PUBLISHED = 'published',   // Publicada
  CLOSED = 'closed',        // Cerrada
  ARCHIVED = 'archived',    // Archivada
}

export enum TaskPriority {
  LOW = 'low',              // Baja
  MEDIUM = 'medium',        // Media
  HIGH = 'high',           // Alta
  URGENT = 'urgent',       // Urgente
}

/**
 * MÉTODOS DE EVALUACIÓN DE TAREAS - NOMENCLATURA FIJA
 * 
 * EMOJI: Evaluación rápida con emojis (😊😐😞) - Para Test Yourself
 * SCORE: Puntuación numérica (1-10, 1-5, etc.) - Sistema tradicional
 * RUBRIC: Evaluación competencial detallada con rúbrica - Evaluación avanzada
 * 
 * FLUJO DE USO:
 * 1. Profesor crea Test Yourself
 * 2. Selecciona tipo de evaluación (emoji/score/rubric)
 * 3. Evalúa estudiantes según el tipo elegido
 * 4. Sistema adapta interfaz de calificación al tipo seleccionado
 */
export enum TaskValuationType {
  EMOJI = 'emoji',   // Evaluación con emojis (😊😐😞)
  SCORE = 'score',   // Puntuación numérica tradicional
  RUBRIC = 'rubric', // Evaluación con rúbrica competencial
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  teachernotes: string; // Notas privadas del profesor, no visibles para padres

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({
    type: 'enum',
    enum: TaskType,
    default: TaskType.HOMEWORK,
  })
  taskType: TaskType;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.DRAFT,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'timestamp' })
  assignedDate: Date;

  @Column({ type: 'timestamp' })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxPoints: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  weight?: number | null;

  @Column({ type: 'boolean', default: true })
  allowLateSubmission: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  latePenalty: number; // Porcentaje de penalización por entrega tardía

  @Column({ type: 'boolean', default: true })
  notifyFamilies: boolean;

  @Column({ type: 'boolean', default: false })
  requiresFile: boolean; // Si requiere archivo adjunto

  @Column({ type: 'text', nullable: true })
  allowedFileTypes: string; // JSON array de tipos permitidos

  @Column({ type: 'int', nullable: true })
  maxFileSize: number; // Tamaño máximo en bytes

  @Column({ type: 'text', nullable: true })
  rubric: string; // Criterios de evaluación (JSON) - DEPRECATED: usar rubricId
  
  @Column({ type: 'uuid', nullable: true })
  rubricId: string;

  @Column({
    name: 'value_type',
    type: 'enum',
    enum: TaskValuationType,
    comment: 'Tipo de evaluación: emoji, score, rubric'
  })
  valuationType: TaskValuationType;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'isreviewedbyteacher' })
  isReviewedByTeacher: boolean;

  /**
   * CAMPOS PARA SEPARACIÓN DE TEST YOURSELF
   *
   * is_test_yourself: Identifica si es un Test Yourself (prueba presencial)
   * - true: Es Test Yourself, NO debe aparecer en lista de tareas de familias
   * - false: Es tarea regular con entrega
   *
   * visible_to_families: Control de visibilidad individual para Test Yourself
   * - true: Familias pueden ver este Test Yourself (si profesor decide compartir)
   * - false: Familias NO ven este Test Yourself (por defecto)
   *
   * NOTA: visible_to_families solo aplica cuando is_test_yourself = true
   */
  @Column({ type: 'boolean', default: false, name: 'is_test_yourself' })
  isTestYourself: boolean;

  @Column({ type: 'boolean', default: false, name: 'visible_to_families' })
  visibleToFamilies: boolean;

  @Column('uuid', { nullable: true })
  academicYearId: string | null;

  @ManyToOne(() => AcademicYear, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academicYearId' })
  academicYear?: AcademicYear;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @Column({ type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column({ type: 'uuid' })
  subjectAssignmentId: string;

  @ManyToOne(() => SubjectAssignment)
  @JoinColumn({ name: 'subjectAssignmentId' })
  subjectAssignment: SubjectAssignment;

  // Relación con pestaña personalizada (opcional)
  @Column({ type: 'uuid', nullable: true })
  customTabId: string;

  @ManyToOne(() => CustomTab, customTab => customTab.tasks, { nullable: true })
  @JoinColumn({ name: 'customTabId' })
  customTab: CustomTab;

  @OneToMany(() => TaskSubmission, (submission) => submission.task)
  submissions: TaskSubmission[];

  @OneToMany(() => TaskAttachment, (attachment) => attachment.task)
  attachments: TaskAttachment[];

  @ManyToOne(() => Rubric, { nullable: true })
  @JoinColumn({ name: 'rubricId' })
  rubricEntity?: Rubric;

  @ManyToMany(() => EvaluationCriterion)
  @JoinTable({
    name: 'task_evaluation_criteria',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'evaluation_criterion_id', referencedColumnName: 'id' },
  })
  evaluationCriteria: EvaluationCriterion[];

  // Relación many-to-many con asignaturas adicionales (para Test Yourself multi-grupo)
  @OneToMany(() => TaskSubjectAssignment, (tsa) => tsa.task)
  additionalSubjectAssignments: TaskSubjectAssignment[];

  // Campos virtuales/calculados
  get isOverdue(): boolean {
    return new Date() > this.dueDate && this.status === TaskStatus.PUBLISHED;
  }

  get submissionCount(): number {
    return this.submissions?.length || 0;
  }

  get gradedSubmissionCount(): number {
    return this.submissions?.filter(s => s.isGraded)?.length || 0;
  }
}