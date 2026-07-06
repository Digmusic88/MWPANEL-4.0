import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Rubric } from './rubric.entity';
import { RubricCriterion } from './rubric-criterion.entity';
import { RubricLevel } from './rubric-level.entity';

@Entity('rubric_cells')
@Unique(['rubricId', 'criterionId', 'levelId'])
export class RubricCell {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string; // Texto descriptivo de la celda

  @Column({ default: true })
  isActive: boolean;

  // Relaciones
  @ManyToOne(() => Rubric, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rubricId' })
  rubric: Rubric;

  @Column('uuid')
  rubricId: string;

  @ManyToOne(() => RubricCriterion, criterion => criterion.cells, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'criterionId' })
  criterion: RubricCriterion;

  @Column('uuid')
  criterionId: string;

  @ManyToOne(() => RubricLevel, level => level.cells, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'levelId' })
  level: RubricLevel;

  @Column('uuid')
  levelId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}