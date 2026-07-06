import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EducationalLevel } from './educational-level.entity';
import { Course } from './course.entity';
import { ClassGroup } from './class-group.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  enrollmentNumber: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @Column({ nullable: true })
  photoUrl: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @ManyToOne(() => EducationalLevel)
  educationalLevel: EducationalLevel;

  @ManyToOne(() => Course)
  course: Course;

  @ManyToMany(() => ClassGroup, (classGroup) => classGroup.students)
  @JoinTable({
    name: 'class_students',
    joinColumn: { name: 'studentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'classId', referencedColumnName: 'id' },
  })
  classGroups: ClassGroup[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.student)
  evaluations: Evaluation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}