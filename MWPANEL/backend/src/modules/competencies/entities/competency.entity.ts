import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EducationalLevel } from '../../students/entities/educational-level.entity';
import { Area } from './area.entity';

@Entity('competencies')
export class Competency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string; // e.g., "CCL", "STEM", etc.

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => EducationalLevel)
  educationalLevel: EducationalLevel;

  @ManyToMany(() => Area, (area) => area.competencies)
  areas: Area[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}