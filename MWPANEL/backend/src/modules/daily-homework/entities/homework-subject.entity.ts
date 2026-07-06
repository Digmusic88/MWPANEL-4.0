import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, JoinTable, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Student } from '../../students/entities/student.entity';
import { HomeworkActivity } from './homework-activity.entity';

@Entity('homework_subjects')
export class HomeworkSubject {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 120 }) name: string;
  @Column({ length: 30, default: '#1890ff' }) color: string;
  @Column({ name: 'teacher_id' }) teacherId: string;
  @ManyToOne(() => Teacher) @JoinColumn({ name: 'teacher_id' }) teacher: Teacher;
  @ManyToMany(() => Student, { eager: false })
  @JoinTable({ name: 'homework_subject_students', joinColumn: { name: 'subject_id' }, inverseJoinColumn: { name: 'student_id' } })
  students: Student[];
  @OneToMany(() => HomeworkActivity, (a) => a.subject) activities: HomeworkActivity[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
