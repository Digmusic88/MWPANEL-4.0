import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Subject } from '../../students/entities/subject.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { CustomTab } from '../../tasks/entities/custom-tab.entity';

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  employeeNumber: string;

  @Column({ type: 'simple-array', nullable: true })
  specialties: string[];

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @ManyToMany(() => Subject)
  @JoinTable({
    name: 'teacher_subjects',
    joinColumn: { name: 'teacherId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'subjectId', referencedColumnName: 'id' },
  })
  subjects: Subject[];

  @OneToMany(() => ClassGroup, (classGroup) => classGroup.tutor)
  tutoredClasses: ClassGroup[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.teacher)
  evaluations: Evaluation[];

  @OneToMany(() => SubjectAssignment, (assignment) => assignment.teacher)
  subjectAssignments: SubjectAssignment[];

  @OneToMany(() => CustomTab, (customTab) => customTab.teacher)
  customTabs: CustomTab[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}