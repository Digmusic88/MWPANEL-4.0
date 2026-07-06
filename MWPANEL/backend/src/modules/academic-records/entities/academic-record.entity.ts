import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { AcademicRecordEntry } from './academic-record-entry.entity';
import { RecordStatus } from './academic-record.types';
import { AcademicYear as AcademicYearEntity } from '../../students/entities/academic-year.entity';

@Entity('academic_records')
export class AcademicRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  academicYear: string; // nombre del año, p. ej. "2025-2026"

  @Column('uuid', { nullable: true })
  academicYearId: string | null;

  @ManyToOne(() => AcademicYearEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academicYearId' })
  academicYearRef?: AcademicYearEntity;

  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.ACTIVE,
  })
  status: RecordStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalGPA: number; // Promedio general del año (0-100)

  @Column({ type: 'int', nullable: true })
  totalCredits: number; // Créditos totales

  @Column({ type: 'int', nullable: true })
  completedCredits: number; // Créditos completados

  @Column({ type: 'int', default: 0 })
  absences: number; // Faltas totales

  @Column({ type: 'int', default: 0 })
  tardiness: number; // Retrasos

  @Column({ type: 'text', nullable: true })
  observations: string; // Observaciones generales

  @Column({ type: 'text', nullable: true })
  achievements: string; // Logros destacados (JSON)

  @Column({ type: 'text', nullable: true })
  disciplinaryRecords: string; // Registros disciplinarios (JSON)

  @Column({ type: 'date', nullable: true })
  startDate: Date; // Fecha inicio del año académico

  @Column({ type: 'date', nullable: true })
  endDate: Date; // Fecha fin del año académico

  @Column({ type: 'boolean', default: false })
  isPromoted: boolean; // Si fue promovido al siguiente nivel

  @Column({ type: 'text', nullable: true })
  promotionNotes: string; // Notas sobre la promoción

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  competencies: {
    byKey: { code: string; name: string; score: number }[];
    bySpecific: { id: string; code: string; name: string; score: number }[];
    scale: '0-100';
    generatedAt: string;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @OneToMany(() => AcademicRecordEntry, (entry) => entry.academicRecord)
  entries: AcademicRecordEntry[];

  // Getters virtuales
  get completionPercentage(): number {
    if (!this.totalCredits || this.totalCredits === 0) return 0;
    return Math.round((this.completedCredits / this.totalCredits) * 100);
  }

  get attendancePercentage(): number {
    // Calcular basado en días lectivos típicos (180 días)
    const typicalSchoolDays = 180;
    const attendedDays = typicalSchoolDays - this.absences;
    return Math.max(0, Math.round((attendedDays / typicalSchoolDays) * 100));
  }

  get isYearComplete(): boolean {
    return this.status === RecordStatus.COMPLETED || this.completionPercentage >= 100;
  }
}