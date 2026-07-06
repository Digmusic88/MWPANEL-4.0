import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TutoringGroup } from './tutoring-group.entity';
import { Student } from '../../students/entities/student.entity';

@Entity('tutoring_students')
export class TutoringStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TutoringGroup, (tutoringGroup) => tutoringGroup.tutoringStudents)
  tutoringGroup: TutoringGroup;

  @Column({ type: 'uuid' })
  tutoringGroupId: string;

  @ManyToOne(() => Student)
  student: Student;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}