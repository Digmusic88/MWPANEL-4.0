/**
 * @archivo: activity.entity.ts
 * @módulo: Activities (Actividades Diarias de Evaluación)
 * @función: Gestión de actividades diarias inmediatas para calificación
 * @crítico: SÍ - Sistema central de evaluación diaria
 * @dependencias: ActivityAssessment, Rubric, ClassGroup, Teacher
 * @no_modificar: ActivityValuationType sin revisar evaluación competencial
 * @relacionado_con: task.entity.ts, rubric.entity.ts, evaluation.entity.ts
 */

/**
 * TABLA: activities
 * USO ACTUAL: Actividades diarias INMEDIATAS de evaluación
 * NO USAR PARA: Tareas con entregas o proyectos largos
 * RELACIONES: 
 *   - activity_assessments (1:N) - Evaluaciones por estudiante
 *   - rubrics (N:1) - Rúbrica de evaluación opcional
 *   - class_groups (N:1) - Grupo/clase donde se realiza
 *   - teachers (N:1) - Profesor que crea la actividad
 * CRÍTICO: Diferente propósito que 'tasks'
 * 
 * DIFERENCIAS CON TASKS:
 * - ACTIVITIES: Evaluación inmediata en clase, emoji/score/rubric
 * - TASKS: Tareas con entregas, fechas límite, archivos adjuntos
 * 
 * TIPOS DE VALORACIÓN:
 * - EMOJI: Evaluación rápida con emojis
 * - SCORE: Puntuación numérica
 * - RUBRIC: Evaluación competencial con rúbrica
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { ActivityAssessment } from './activity-assessment.entity';
import { Rubric } from './rubric.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';

// CRÍTICO: ActivityValuationType - Define métodos de evaluación diaria
// USADO POR: ActivityService, ActivityController, frontend EvaluationForms
// NOTA: Si se modifica, verificar compatibilidad con sistema de competencias
/**
 * MÉTODOS DE EVALUACIÓN DE ACTIVIDADES - NOMENCLATURA FIJA
 * 
 * EMOJI: Evaluación rápida con emojis (😊😐😞)
 * SCORE: Puntuación numérica (1-10, 1-5, etc.)
 * RUBRIC: Evaluación competencial detallada con rúbrica
 * 
 * FLUJO DE USO:
 * 1. Profesor crea actividad
 * 2. Selecciona tipo de valoración
 * 3. Evalúa estudiantes según el tipo elegido
 * 
 * NO CONFUNDIR CON:
 * - TaskType (tipos de tareas estudiantiles)
 * - EvaluationType (evaluación competencial formal)
 */
export enum ActivityValuationType {
  EMOJI = 'emoji',   // Evaluación con emojis
  SCORE = 'score',   // Puntuación numérica
  RUBRIC = 'rubric', // Evaluación con rúbrica
}

@Entity('activities')
export class Activity {
  @ApiProperty({ description: 'ID único de la actividad' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Nombre de la actividad', example: 'Ejercicios de matemáticas' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ description: 'Descripción opcional de la actividad' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Fecha de asignación de la actividad' })
  @Column({ type: 'date' })
  assignedDate: Date;

  @ApiProperty({ description: 'Fecha opcional de revisión' })
  @Column({ type: 'date', nullable: true })
  reviewDate?: Date;

  @ApiProperty({ description: 'Tipo de valoración', enum: ActivityValuationType })
  @Column({
    type: 'enum',
    enum: ActivityValuationType,
    default: ActivityValuationType.EMOJI,
  })
  valuationType: ActivityValuationType;

  @ApiProperty({ description: 'Puntuación máxima (solo para tipo score)' })
  @Column({ type: 'int', nullable: true })
  maxScore?: number;

  @ApiProperty({ description: 'Peso de la columna dentro de su categoría (null = reparto equitativo)', required: false })
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  weight?: number | null;

  @ApiProperty({ description: 'Si se notifica a las familias' })
  @Column({ type: 'boolean', default: true })
  notifyFamilies: boolean;

  @ApiProperty({ description: 'Si la nota es visible para las familias (publicada). Oculta por defecto: el profesor publica cuando quiere.' })
  @Column({ type: 'boolean', default: false, name: 'visible_to_families' })
  visibleToFamilies: boolean;

  @ApiProperty({ description: 'Notificar cuando el emoji sea happy (cara sonriente)' })
  @Column({ type: 'boolean', default: false, name: 'notify_on_happy' })
  notifyOnHappy: boolean;

  @ApiProperty({ description: 'Notificar cuando el emoji sea neutral (cara neutral)' })
  @Column({ type: 'boolean', default: true, name: 'notify_on_neutral' })
  notifyOnNeutral: boolean;

  @ApiProperty({ description: 'Notificar cuando el emoji sea sad (cara triste)' })
  @Column({ type: 'boolean', default: true, name: 'notify_on_sad' })
  notifyOnSad: boolean;

  @ApiProperty({ description: 'Si la actividad está activa' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Si la actividad está archivada' })
  @Column({ type: 'boolean', default: false, name: 'is_archived' })
  isArchived: boolean;

  @ApiProperty({ description: 'Si la actividad es una plantilla reutilizable' })
  @Column({ type: 'boolean', default: false, name: 'is_template' })
  isTemplate: boolean;

  @ApiProperty({ description: 'ID del grupo de clase' })
  @Column({ name: 'class_group_id' })
  classGroupId: string;

  @ApiProperty({ description: 'ID del profesor que creó la actividad' })
  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ApiProperty({ description: 'ID de la asignación de asignatura (obligatorio)' })
  @Column({ name: 'subject_assignment_id' })
  subjectAssignmentId: string;

  @ApiProperty({ description: 'ID de la rúbrica (solo para tipo rubric)', required: false })
  @Column({ name: 'rubric_id', nullable: true })
  rubricId?: string;

  // Relaciones
  @ManyToOne(() => ClassGroup, (classGroup) => classGroup.id)
  @JoinColumn({ name: 'class_group_id' })
  classGroup: ClassGroup;

  @ManyToOne(() => Teacher, (teacher) => teacher.id)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @ManyToOne(() => SubjectAssignment, (subjectAssignment) => subjectAssignment.id)
  @JoinColumn({ name: 'subject_assignment_id' })
  subjectAssignment: SubjectAssignment;

  @OneToMany(() => ActivityAssessment, (assessment) => assessment.activity)
  assessments: ActivityAssessment[];

  @ManyToOne(() => Rubric, { nullable: true })
  @JoinColumn({ name: 'rubric_id' })
  rubric?: Rubric;

  @ManyToMany(() => EvaluationCriterion)
  @JoinTable({
    name: 'activity_evaluation_criteria',
    joinColumn: { name: 'activity_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'evaluation_criterion_id', referencedColumnName: 'id' },
  })
  evaluationCriteria: EvaluationCriterion[];

  @Column('uuid', { nullable: true })
  academicYearId: string | null;

  @ManyToOne(() => AcademicYear, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academicYearId' })
  academicYear?: AcademicYear;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;
}