import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Student } from '../../students/entities/student.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { EducationalLevel } from '../../students/entities/educational-level.entity';
import { TutoringStudent } from './tutoring-student.entity';

@Entity('tutoring_groups')
export class TutoringGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Teacher)
  tutor: Teacher;

  @Column({ type: 'uuid' })
  tutorId: string;

  @ManyToOne(() => AcademicYear)
  academicYear: AcademicYear;

  @Column({ type: 'uuid' })
  academicYearId: string;

  @ManyToOne(() => EducationalLevel, { nullable: true })
  educationalLevel: EducationalLevel;

  @Column({ type: 'uuid', nullable: true })
  educationalLevelId: string;

  @OneToMany(() => TutoringStudent, (tutoringStudent) => tutoringStudent.tutoringGroup)
  tutoringStudents: TutoringStudent[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}