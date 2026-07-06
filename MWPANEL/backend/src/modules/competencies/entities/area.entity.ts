import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EducationalLevel } from '../../students/entities/educational-level.entity';
import { Competency } from './competency.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => EducationalLevel)
  educationalLevel: EducationalLevel;

  @ManyToMany(() => Competency, (competency) => competency.areas)
  @JoinTable({
    name: 'area_competencies',
    joinColumn: { name: 'areaId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'competencyId', referencedColumnName: 'id' },
  })
  competencies: Competency[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}