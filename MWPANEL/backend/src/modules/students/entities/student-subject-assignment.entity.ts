import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Subject } from './subject.entity';
import { ClassGroup } from './class-group.entity';
import { AcademicYear } from './academic-year.entity';
import { Student } from './student.entity';

@Entity('student_subject_assignments')
@Index(['studentId', 'subjectId', 'academicYearId'], { unique: true })
export class StudentSubjectAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column({ type: 'uuid' })
  classGroupId: string;

  @ManyToOne(() => ClassGroup)
  @JoinColumn({ name: 'classGroupId' })
  classGroup: ClassGroup;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'uuid' })
  academicYearId: string;

  @ManyToOne(() => AcademicYear)
  @JoinColumn({ name: 'academicYearId' })
  academicYear: AcademicYear;

  @Column({ type: 'int', default: 0 })
  weeklyHours: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}