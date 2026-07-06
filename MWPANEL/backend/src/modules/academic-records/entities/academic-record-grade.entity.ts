import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AcademicRecordEntry } from './academic-record-entry.entity';
import { GradeType } from './academic-record.types';

@Entity('academic_record_grades')
export class AcademicRecordGrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: GradeType,
    default: GradeType.ASSIGNMENT,
  })
  gradeType: GradeType;

  @Column({ type: 'varchar', length: 255 })
  name: string; // Nombre de la evaluación

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  earnedPoints: number; // Puntos obtenidos

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  totalPoints: number; // Puntos totales posibles

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  weight: number; // Peso en la calificación final (0.0 - 1.0)

  @Column({ type: 'date' })
  gradeDate: Date; // Fecha de la evaluación

  @Column({ type: 'date', nullable: true })
  dueDate: Date; // Fecha límite (si aplica)

  @Column({ type: 'boolean', default: false })
  isLate: boolean; // Si fue entregado tarde

  @Column({ type: 'boolean', default: false })
  isExcused: boolean; // Si está justificado

  @Column({ type: 'boolean', default: false })
  isDropped: boolean; // Si se descarta de cálculos

  @Column({ type: 'text', nullable: true })
  teacherComments: string; // Comentarios del profesor

  @Column({ type: 'text', nullable: true })
  rubricData: string; // Datos de rúbrica (JSON)

  @Column({ type: 'varchar', length: 100, nullable: true })
  gradedBy: string; // Profesor que calificó

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @Column({ type: 'uuid' })
  entryId: string;

  @ManyToOne(() => AcademicRecordEntry, (entry) => entry.grades)
  @JoinColumn({ name: 'entryId' })
  entry: AcademicRecordEntry;

  // Getters virtuales
  get percentage(): number {
    if (this.totalPoints === 0) return 0;
    return Math.round((this.earnedPoints / this.totalPoints) * 100);
  }

  get letterGrade(): string {
    const percent = this.percentage;
    if (percent >= 90) return 'A';
    if (percent >= 80) return 'B';
    if (percent >= 70) return 'C';
    if (percent >= 60) return 'D';
    return 'F';
  }

  get isPassing(): boolean {
    return this.percentage >= 60; // Ajustable según política del centro
  }

  get weightedPoints(): number {
    if (!this.weight) return this.earnedPoints;
    return this.earnedPoints * this.weight;
  }

  get maxWeightedPoints(): number {
    if (!this.weight) return this.totalPoints;
    return this.totalPoints * this.weight;
  }
}