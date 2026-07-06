import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Subject } from '../../students/entities/subject.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';

export enum CurricularAdaptationType {
  ACCESS = 'ACCESS',
  NON_SIGNIFICANT = 'NON_SIGNIFICANT',
  SIGNIFICANT = 'SIGNIFICANT',
}

// NOTA: la tabla se llama `dua_curricular_adaptations` (no `curricular_adaptations`)
// porque ya existe una tabla DORMIDA `curricular_adaptations` (modelo rico DUA de
// competencies/, creada por migración 1753000000000, sin cablear, 0 filas) con un
// esquema incompatible. Este es el "concepto propio nuevo" ligero (marca por
// asignatura×año), independiente de aquel modelo.
@Entity('dua_curricular_adaptations')
@Unique('UQ_dua_curricular_adaptation_student_subject_year', ['studentId', 'subjectId', 'academicYearId'])
@Index('IDX_dua_curricular_adaptation_student_year', ['studentId', 'academicYearId'])
export class CurricularAdaptation {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column('uuid') studentId: string;
  @ManyToOne(() => Student, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'studentId' }) student: Student;

  @Column('uuid') subjectId: string;
  @ManyToOne(() => Subject) @JoinColumn({ name: 'subjectId' }) subject: Subject;

  @Column('uuid') academicYearId: string;
  @ManyToOne(() => AcademicYear) @JoinColumn({ name: 'academicYearId' }) academicYear: AcademicYear;

  @Column({ type: 'varchar', length: 20 }) type: CurricularAdaptationType;

  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'date', nullable: true }) startDate: Date | null;
  @Column({ type: 'date', nullable: true }) endDate: Date | null;
  @Column({ type: 'uuid', nullable: true }) createdBy: string | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
