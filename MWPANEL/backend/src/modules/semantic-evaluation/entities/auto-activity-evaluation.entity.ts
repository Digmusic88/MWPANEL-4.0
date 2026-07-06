import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DescriptorType {
  SPECIFIC = 'specific',
  KNOWLEDGE = 'knowledge',
  CRITERIA = 'criteria',
  OPERATIVE = 'operative',
}

export enum EducationalStage {
  INFANTIL = 'INFANTIL',
  PRIMARIA = 'PRIMARIA',
  SECUNDARIA = 'SECUNDARIA',
}

@Entity('auto_activity_evaluation')
@Index(['teacherId'])
@Index(['subjectId'])
@Index(['descriptorId', 'descriptorType'])
@Index(['accepted'])
export class AutoActivityEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  teacherId: string;

  @Column({ type: 'varchar', length: 500 })
  activityTitle: string;

  @Column({ type: 'text' })
  activityDescription: string;

  @Column({
    type: 'enum',
    enum: EducationalStage,
  })
  stage: EducationalStage;

  @Column({ type: 'uuid', nullable: true })
  subjectId: string;

  @Column({ type: 'uuid' })
  descriptorId: string;

  @Column({
    type: 'enum',
    enum: DescriptorType,
  })
  descriptorType: DescriptorType;

  @Column({ type: 'float' })
  similarityScore: number;

  @Column({ type: 'integer', default: 30 })
  weight: number;

  @Column({ type: 'boolean', default: false })
  accepted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  // Getters computados
  get similarityPercentage(): number {
    return Math.round(this.similarityScore * 100);
  }

  get isHighConfidence(): boolean {
    return this.similarityScore >= 0.8;
  }

  get isMediumConfidence(): boolean {
    return this.similarityScore >= 0.6 && this.similarityScore < 0.8;
  }

  get isLowConfidence(): boolean {
    return this.similarityScore < 0.6;
  }
}