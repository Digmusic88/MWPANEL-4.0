/**
 * @archivo: teacher-report-permission.entity.ts
 * @módulo: Student Reports - Sistema de Permisos Manual
 * @función: Define qué profesores pueden escribir sobre qué estudiantes
 * @nota: Esta es la ÚNICA fuente de verdad para permisos de escritura de informes
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';

@Entity('teacher_report_permissions')
@Unique(['teacher', 'student', 'academicYear']) // Un profesor solo puede tener un permiso por estudiante por año
@Index(['teacherId', 'academicYearId']) // Índice para consultas del profesor
@Index(['studentId', 'academicYearId']) // Índice para consultas del tutor
export class TeacherReportPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // El profesor que recibe el permiso
  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  // El estudiante sobre el que puede escribir
  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  // Año académico (para poder filtrar por año)
  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @ManyToOne(() => AcademicYear, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'academic_year_id' })
  academicYear: AcademicYear;

  // Admin que otorgó el permiso
  @Column({ name: 'granted_by' })
  grantedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'granted_by' })
  grantedBy: User;

  // Nota opcional del admin (ej: "Para evaluación trimestral")
  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string;

  // Estado activo/inactivo
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
