import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Student } from '../../students/entities/student.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { DailyHomeworkNotification } from './daily-homework-notification.entity';

export enum DailyHomeworkStatus {
  COMPLETED = 'completed',
  PARTIAL = 'partial',
  NOT_DONE = 'not_done',
}

@Entity('daily_homework_records')
@Index(['studentId', 'classGroupId', 'date', 'subjectAssignmentId'], { unique: true })
export class DailyHomeworkRecord {
  @ApiProperty({ description: 'ID único del registro' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'class_group_id' })
  classGroupId: string;

  @Column({ name: 'subject_assignment_id', nullable: true })
  subjectAssignmentId: string | null;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: DailyHomeworkStatus,
    default: DailyHomeworkStatus.COMPLETED,
  })
  status: DailyHomeworkStatus;

  @Column({ name: 'recorded_by_teacher_id' })
  recordedByTeacherId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'notification_sent_at' })
  notificationSentAt: Date | null;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => ClassGroup)
  @JoinColumn({ name: 'class_group_id' })
  classGroup: ClassGroup;

  @ManyToOne(() => SubjectAssignment, { nullable: true })
  @JoinColumn({ name: 'subject_assignment_id' })
  subjectAssignment: SubjectAssignment | null;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'recorded_by_teacher_id' })
  recordedByTeacher: Teacher;

  @OneToMany(() => DailyHomeworkNotification, (n) => n.record)
  notifications: DailyHomeworkNotification[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
