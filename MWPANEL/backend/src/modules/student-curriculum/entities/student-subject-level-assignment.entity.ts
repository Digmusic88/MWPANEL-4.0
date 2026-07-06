import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Subject } from '../../students/entities/subject.entity';
import { Course } from '../../students/entities/course.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { User } from '../../users/entities/user.entity';

@Entity('student_subject_level_assignments')
export class StudentSubjectLevelAssignment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) studentId: string;
  @ManyToOne(() => Student) @JoinColumn({ name: 'studentId' }) student: Student;

  @Column({ type: 'uuid' }) subjectId: string;
  @ManyToOne(() => Subject) @JoinColumn({ name: 'subjectId' }) subject: Subject;

  @Column({ type: 'uuid' }) academicYearId: string;
  @ManyToOne(() => AcademicYear) @JoinColumn({ name: 'academicYearId' }) academicYear: AcademicYear;

  @Column({ type: 'uuid' }) courseId: string;
  @ManyToOne(() => Course) @JoinColumn({ name: 'courseId' }) course: Course;

  @Column({ type: 'uuid', nullable: true }) subjectAssignmentId?: string | null;

  @Column({ type: 'date' }) validFrom: string;
  @Column({ type: 'date', nullable: true }) validTo?: string | null;

  @Column({ type: 'uuid', nullable: true }) createdById?: string | null;
  @ManyToOne(() => User) @JoinColumn({ name: 'createdById' }) createdBy?: User;

  @Column({ type: 'text', default: '' }) reason: string;

  @CreateDateColumn() createdAt: Date;
}
