import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ActivityAssessment } from './activity-assessment.entity';
import { Rubric } from './rubric.entity';
import { Student } from '../../students/entities/student.entity';
import { RubricAssessmentCriterion } from './rubric-assessment-criterion.entity';

@Entity('rubric_assessments')
@Unique(['activityAssessmentId', 'rubricId', 'studentId'])
export class RubricAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  totalScore: number; // Puntuación total calculada

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  maxPossibleScore: number; // Puntuación máxima posible

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number; // Porcentaje obtenido

  @Column({ type: 'text', nullable: true })
  comments: string; // Comentarios generales del profesor

  @Column({ default: false })
  isComplete: boolean; // Si se han evaluado todos los criterios

  @Column({ default: true })
  isActive: boolean;

  // Relaciones
  @ManyToOne(() => ActivityAssessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activityAssessmentId' })
  activityAssessment: ActivityAssessment;

  @Column('uuid')
  activityAssessmentId: string;

  @ManyToOne(() => Rubric, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rubricId' })
  rubric: Rubric;

  @Column('uuid')
  rubricId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column('uuid')
  studentId: string;

  @OneToMany(() => RubricAssessmentCriterion, criterion => criterion.rubricAssessment, { cascade: true })
  criterionAssessments: RubricAssessmentCriterion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}