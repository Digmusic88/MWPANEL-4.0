import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Rubric } from './rubric.entity';
import { RubricCell } from './rubric-cell.entity';

@Entity('rubric_levels')
export class RubricLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  order: number; // Orden de izquierda a derecha (0, 1, 2...)

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  scoreValue: number; // Valor numérico del nivel

  @Column({ length: 7, default: '#FF4C4C' })
  color: string; // Color hex para el nivel

  @Column({ default: true })
  isActive: boolean;

  // Relaciones
  @ManyToOne(() => Rubric, rubric => rubric.levels, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rubricId' })
  rubric: Rubric;

  @Column('uuid')
  rubricId: string;

  @OneToMany(() => RubricCell, cell => cell.level, { cascade: true })
  cells: RubricCell[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}