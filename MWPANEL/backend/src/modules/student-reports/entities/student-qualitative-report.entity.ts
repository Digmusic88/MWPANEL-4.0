/**
 * @archivo: student-qualitative-report.entity.ts
 * @módulo: Student Reports - Informe Cualitativo
 * @función: Almacena los informes escritos por profesores sobre estudiantes
 * @nota: El contextTag es MANUAL - el profesor lo escribe porque no hay datos fiables de asignaturas
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Student } from '../../students/entities/student.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';

@Entity('student_qualitative_reports')
@Index(['studentId', 'academicYearId']) // Para la vista del Tutor
@Index(['authorTeacherId', 'academicYearId']) // Para la vista del Profesor
export class StudentQualitativeReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // El estudiante evaluado
  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  // El profesor autor del informe
  @Column({ name: 'author_teacher_id' })
  authorTeacherId: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_teacher_id' })
  authorTeacher: Teacher;

  // Año académico
  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @ManyToOne(() => AcademicYear, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'academic_year_id' })
  academicYear: AcademicYear;

  // ETIQUETA MANUAL - El profesor escribe de qué asignatura/contexto habla
  // Ejemplos: "Matemáticas", "Inglés", "Educación Física", "Comportamiento General"
  @Column({ name: 'context_tag', length: 100 })
  contextTag: string;

  // Contenido del informe (texto enriquecido)
  @Column({ type: 'text' })
  content: string;

  // Prioridad del informe (1=info, 2=normal, 3=importante, 4=urgente)
  @Column({ type: 'int', default: 2 })
  priority: number;

  // Si el informe es visible para la familia
  @Column({ name: 'visible_to_family', default: false })
  visibleToFamily: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
