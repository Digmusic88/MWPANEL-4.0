import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { EducationalLevel } from './educational-level.entity';
import { Course } from './course.entity';

@Entity('cycles')
export class Cycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  order: number;

  @ManyToOne(() => EducationalLevel, (level) => level.cycles)
  @JoinColumn({ name: 'educationalLevelId' })
  educationalLevel: EducationalLevel;

  @OneToMany(() => Course, (course) => course.cycle)
  courses: Course[];
}