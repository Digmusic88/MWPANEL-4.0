import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { EducationalLevel } from './educational-level.entity';

export enum ClassroomType {
  REGULAR = 'regular',
  LABORATORY = 'laboratory',
  COMPUTER = 'computer',
  GYM = 'gym',
  MUSIC = 'music',
  ART = 'art',
  LIBRARY = 'library',
  AUDITORIUM = 'auditorium'
}

@Entity('classrooms')
export class Classroom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column()
  capacity: number;

  @Column({
    type: 'enum',
    enum: ClassroomType,
    default: ClassroomType.REGULAR,
  })
  type: ClassroomType;

  @Column('simple-array', { nullable: true })
  equipment: string[];

  @Column({ nullable: true })
  building: string;

  @Column({ nullable: true })
  floor: number;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => EducationalLevel, { nullable: true })
  preferredEducationalLevel: EducationalLevel;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}