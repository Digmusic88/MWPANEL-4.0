import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, Index } from 'typeorm';
import { HomeworkActivity } from './homework-activity.entity';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

export enum HwRecordStatus { COMPLETED = 'completed', PARTIAL = 'partial', NOT_DONE = 'not_done' }

@Entity('homework_activity_records')
@Index(['activityId', 'studentId'], { unique: true })
export class HomeworkActivityRecord {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'activity_id' }) activityId: string;
  @ManyToOne(() => HomeworkActivity, (a) => a.records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' }) activity: HomeworkActivity;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => Student) @JoinColumn({ name: 'student_id' }) student: Student;
  @Column({ type: 'enum', enum: HwRecordStatus }) status: HwRecordStatus;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ name: 'recorded_by_teacher_id' }) recordedByTeacherId: string;
  @ManyToOne(() => Teacher) @JoinColumn({ name: 'recorded_by_teacher_id' }) recordedByTeacher: Teacher;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
