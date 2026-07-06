import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './task.entity';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

@Entity('exam_grade_history')
export class ExamGradeHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  task_id: string;

  @Column('uuid')
  student_id: string;

  @Column('uuid')
  graded_by_teacher_id: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  numeric_grade: number;

  @Column({ length: 5, nullable: true })
  letter_grade: string;

  @Column({ length: 10, nullable: true })
  grade_scale: string;

  @Column('text', { nullable: true })
  comments: string;

  @Column({ length: 20, default: 'present' })
  attendance_status: string;

  @Column('json', { nullable: true })
  metadata: any;

  @Column({ length: 20, nullable: true })
  emoji_grade: string;

  @Column('json', { nullable: true })
  rubric_scores: any;

  @Column({ length: 20, default: 'created' })
  action_type: 'created' | 'updated' | 'deleted';

  @Column('timestamp with time zone')
  graded_at: Date;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'graded_by_teacher_id' })
  graded_by_teacher: Teacher;
}