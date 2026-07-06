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
import { AcademicRecord } from './academic-record.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { AcademicRecordGrade } from './academic-record-grade.entity';
import { AcademicPeriod, EntryType } from './academic-record.types';

@Entity('academic_record_entries')
export class AcademicRecordEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EntryType,
    default: EntryType.ACADEMIC,
  })
  type: EntryType;

  @Column({
    type: 'enum',
    enum: AcademicPeriod,
  })
  period: AcademicPeriod;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  entryDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  numericValue: number; // Calificación 0-100 (2 decimales). Escala del expediente = display.

  @Column({ type: 'varchar', length: 10, nullable: true })
  letterGrade: string; // A, B, C, D, F, etc.

  @Column({ type: 'text', nullable: true })
  comments: string; // Comentarios del profesor

  @Column({ type: 'int', nullable: true })
  credits: number; // Créditos de la materia

  @Column({ type: 'boolean', default: false })
  isPassing: boolean; // Si la calificación es aprobatoria

  @Column({ type: 'boolean', default: false })
  isExempt: boolean; // Si está exento de esta evaluación

  @Column({ type: 'text', nullable: true })
  attachments: string; // URLs de archivos adjuntos (JSON)

  @Column({ type: 'varchar', length: 100, nullable: true })
  enteredBy: string; // Quién registró esta entrada

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @Column({ type: 'uuid' })
  academicRecordId: string;

  @ManyToOne(() => AcademicRecord, (record) => record.entries)
  @JoinColumn({ name: 'academicRecordId' })
  academicRecord: AcademicRecord;

  @Column({ type: 'uuid', nullable: true })
  subjectAssignmentId: string;

  @ManyToOne(() => SubjectAssignment, { nullable: true })
  @JoinColumn({ name: 'subjectAssignmentId' })
  subjectAssignment: SubjectAssignment;

  @OneToMany(() => AcademicRecordGrade, (grade) => grade.entry)
  grades: AcademicRecordGrade[];

  // Getters virtuales
  get gradePoint(): number {
    // Conversión estándar de letras a puntos
    const gradePoints: { [key: string]: number } = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0,
    };

    if (this.letterGrade && gradePoints[this.letterGrade] !== undefined) {
      return gradePoints[this.letterGrade];
    }

    // Si no hay letra, convertir del valor numérico
    if (this.numericValue !== null && this.numericValue !== undefined) {
      if (this.numericValue >= 90) return 4.0;
      if (this.numericValue >= 80) return 3.0;
      if (this.numericValue >= 70) return 2.0;
      if (this.numericValue >= 60) return 1.0;
      return 0.0;
    }

    return 0.0;
  }

  get displayGrade(): string {
    if (this.isExempt) return 'EX';
    if (this.letterGrade) return this.letterGrade;
    if (this.numericValue !== null && this.numericValue !== undefined) {
      return this.numericValue.toString();
    }
    return 'N/A';
  }
}