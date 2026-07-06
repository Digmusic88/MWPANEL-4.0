import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';

/**
 * ExamGrade Entity
 * 
 * Gestiona las calificaciones de tareas tipo EXAM (Test Yourself).
 * 
 * DIFERENCIA CON TaskSubmission:
 * - TaskSubmission: Para tareas con entrega digital (archivos, texto)
 * - ExamGrade: Para exámenes/pruebas sin entrega digital (solo calificación)
 * 
 * CARACTERÍSTICAS:
 * - Una calificación por estudiante por Test Yourself
 * - Escalas de calificación configurables (1-10, A-F, etc.)
 * - Comentarios opcionales del profesor
 * - Timestamps de creación y modificación
 * - Relación directa con Task tipo EXAM
 */

@Entity('exam_grades')
export class ExamGrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con la tarea tipo EXAM
  @ManyToOne(() => Task, { eager: false })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'task_id' })
  taskId: string;

  // Relación con el estudiante
  @ManyToOne(() => Student, { eager: true })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  // Relación con el profesor que califica
  @ManyToOne(() => Teacher, { eager: true })
  @JoinColumn({ name: 'graded_by_teacher_id' })
  gradedByTeacher: Teacher;

  @Column({ name: 'graded_by_teacher_id' })
  gradedByTeacherId: string;

  // Calificación numérica (escala configurable)
  @Column('decimal', { 
    name: 'numeric_grade',
    precision: 4, 
    scale: 2,
    comment: 'Calificación numérica (ej: 8.5 para escala 1-10)' 
  })
  numericGrade: number;

  // Calificación en formato texto (opcional)
  @Column({ 
    name: 'letter_grade',
    type: 'varchar', 
    length: 10, 
    nullable: true,
    comment: 'Calificación en formato texto (ej: A+, Excelente, etc.)' 
  })
  letterGrade?: string;

  // Calificación por emoji (para valuationType = 'emoji')
  @Column({ 
    name: 'emoji_grade',
    type: 'varchar', 
    length: 10, 
    nullable: true,
    comment: 'Calificación con emoji: 😊 (Muy Bien), 😐 (Bien), 😞 (Regular)' 
  })
  emojiGrade?: string;

  // Puntuaciones por criterios de rúbrica (para valuationType = 'rubric')
  @Column({ 
    name: 'rubric_scores',
    type: 'json', 
    nullable: true,
    comment: 'Puntuaciones detalladas por criterio de rúbrica en formato JSON' 
  })
  rubricScores?: {
    criterionId: string;
    criterionTitle: string;
    selectedLevelId: string;
    selectedLevelTitle: string;
    points: number;
    weight: number;
  }[];

  // Peso individual de esta nota (override; null = usa el peso de la columna)
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  weight?: number | null;

  // Escala de calificación usada
  @Column({ 
    name: 'grade_scale',
    type: 'varchar', 
    length: 20, 
    default: '1-10',
    comment: 'Escala de calificación (1-10, 1-4, A-F, etc.)' 
  })
  gradeScale: string;

  // Comentarios del profesor
  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'Comentarios opcionales del profesor sobre el examen' 
  })
  comments?: string;

  // Estado de la calificación
  @Column({ 
    name: 'attendance_status',
    type: 'varchar',
    length: 20,
    default: 'present',
    comment: 'Estado del estudiante durante el examen' 
  })
  attendanceStatus: 'present' | 'absent' | 'justified_absence';

  // Metadatos adicionales
  @Column({ 
    type: 'json', 
    nullable: true,
    comment: 'Metadatos adicionales (duración, criterios específicos, etc.)' 
  })
  metadata?: {
    examDuration?: number; // Duración en minutos
    specificCriteria?: string[]; // Criterios específicos evaluados
    observationNotes?: string; // Notas de observación durante el examen
    [key: string]: any;
  };

  @Column('uuid', { nullable: true })
  academicYearId: string | null;

  @ManyToOne(() => AcademicYear, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academicYearId' })
  academicYear?: AcademicYear;

  // Timestamps
  @CreateDateColumn({
    name: 'created_at',
    comment: 'Fecha de creación de la calificación'
  })
  createdAt: Date;

  @UpdateDateColumn({ 
    name: 'updated_at',
    comment: 'Fecha de última modificación' 
  })
  updatedAt: Date;

  // Fecha específica de calificación (puede ser diferente a updatedAt)
  @Column({ 
    type: 'timestamp',
    name: 'graded_at',
    comment: 'Fecha específica cuando se realizó la calificación' 
  })
  gradedAt: Date;

  // Métodos de utilidad
  getFormattedGrade(): string {
    // Para evaluación por emoji
    if (this.emojiGrade) {
      const emojiLabels = {
        '😊': 'Muy Bien',
        '😐': 'Bien', 
        '😞': 'Regular'
      };
      return `${this.emojiGrade} ${emojiLabels[this.emojiGrade] || ''}`;
    }

    // Para evaluación por rúbrica
    if (this.rubricScores && this.rubricScores.length > 0) {
      const totalPoints = this.rubricScores.reduce((sum, score) => sum + score.points, 0);
      return `${totalPoints} pts (Rúbrica)`;
    }

    // Para evaluación numérica tradicional
    if (this.letterGrade) {
      return `${this.numericGrade} (${this.letterGrade})`;
    }
    return this.numericGrade.toString();
  }

  isPassingGrade(passingThreshold: number = 5): boolean {
    // Para evaluación por emoji
    if (this.emojiGrade) {
      return this.emojiGrade === '😊' || this.emojiGrade === '😐';
    }

    // Para evaluación por rúbrica
    if (this.rubricScores && this.rubricScores.length > 0) {
      const totalPoints = this.rubricScores.reduce((sum, score) => sum + score.points, 0);
      const maxPoints = this.rubricScores.reduce((sum, score) => sum + (score.weight * 10), 0); // Asume máximo 10 pts por criterio
      const percentage = (totalPoints / maxPoints) * 10; // Convertir a escala 1-10
      return percentage >= passingThreshold;
    }

    // Para evaluación numérica tradicional
    return this.numericGrade >= passingThreshold;
  }

  getGradePercentage(): number {
    // Para evaluación por emoji
    if (this.emojiGrade) {
      const emojiValues = { '😊': 100, '😐': 75, '😞': 25 };
      return emojiValues[this.emojiGrade] || 0;
    }

    // Para evaluación por rúbrica
    if (this.rubricScores && this.rubricScores.length > 0) {
      const totalPoints = this.rubricScores.reduce((sum, score) => sum + score.points, 0);
      const maxPoints = this.rubricScores.reduce((sum, score) => sum + (score.weight * 10), 0);
      return (totalPoints / maxPoints) * 100;
    }

    // Para evaluación numérica tradicional
    switch (this.gradeScale) {
      case '1-10':
        return (this.numericGrade / 10) * 100;
      case '1-4':
        return (this.numericGrade / 4) * 100;
      case '0-100':
        return this.numericGrade;
      default:
        return (this.numericGrade / 10) * 100;
    }
  }

  getEvaluationType(): 'emoji' | 'score' | 'rubric' {
    if (this.emojiGrade) return 'emoji';
    if (this.rubricScores && this.rubricScores.length > 0) return 'rubric';
    return 'score';
  }
}