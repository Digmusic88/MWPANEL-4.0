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
import { Student } from '../../students/entities/student.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { User } from '../../users/entities/user.entity';

export type AccessType = 'read' | 'write' | 'full';
export type AccessReason =
  | 'tutor'
  | 'support'
  | 'coordinator'
  | 'counselor'
  | 'substitute'
  | 'special_needs'
  | 'admin_override'
  | 'other';

@Entity('teacher_student_access')
@Index(['teacher', 'student', 'academicYear'], { unique: true })
export class TeacherStudentAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Teacher, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column()
  teacherId: string;

  @ManyToOne(() => Student, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column()
  studentId: string;

  @ManyToOne(() => AcademicYear, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'academicYearId' })
  academicYear: AcademicYear;

  @Column()
  academicYearId: string;

  @Column({ type: 'varchar', default: 'read' })
  accessType: AccessType;

  @Column({ type: 'varchar', default: 'admin_override' })
  reason: AccessReason;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'grantedById' })
  grantedBy: User | null;

  @Column({ nullable: true })
  grantedById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
