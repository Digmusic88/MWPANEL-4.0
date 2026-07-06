import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Activity } from './activity.entity';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';
import { RubricAssessment } from './rubric-assessment.entity';

export enum EmojiValue {
  HAPPY = 'happy',
  NEUTRAL = 'neutral',
  SAD = 'sad',
}

@Entity('activity_assessments')
@Index(['activityId', 'studentId'], { unique: true })
export class ActivityAssessment {
  @ApiProperty({ description: 'ID único de la valoración' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Valor de la valoración (emoji o puntuación)' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  value?: string;

  @ApiProperty({ description: 'Comentario opcional del profesor' })
  @Column({ type: 'text', nullable: true })
  comment?: string;

  @ApiProperty({ required: false, description: 'Peso individual de esta nota (override; null = usa el peso de la actividad/columna)' })
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  weight?: number | null;

  @ApiProperty({ description: 'Fecha en que se realizó la valoración' })
  @Column({ type: 'timestamp', nullable: true })
  assessedAt?: Date;

  @ApiProperty({ description: 'Fecha en que se notificó a la familia' })
  @Column({ type: 'timestamp', nullable: true })
  notifiedAt?: Date;

  @ApiProperty({ description: 'Si ha sido valorada por el profesor' })
  @Column({ type: 'boolean', default: false })
  isAssessed: boolean;

  @ApiProperty({ description: 'ID de la actividad' })
  @Column({ name: 'activity_id' })
  activityId: string;

  @ApiProperty({ description: 'ID del estudiante' })
  @Column({ name: 'student_id' })
  studentId: string;

  @ApiProperty({ description: 'ID del profesor que valoró' })
  @Column({ name: 'assessed_by_id', nullable: true })
  assessedById?: string;

  // Relaciones
  @ManyToOne(() => Activity, (activity) => activity.assessments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @ManyToOne(() => Student, (student) => student.id)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'assessed_by_id' })
  assessedBy: User;

  // Relación inversa con las evaluaciones de rúbrica (permite el join en consultas de familia)
  @OneToMany(() => RubricAssessment, (ra) => ra.activityAssessment)
  rubricAssessments: RubricAssessment[];

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;
}