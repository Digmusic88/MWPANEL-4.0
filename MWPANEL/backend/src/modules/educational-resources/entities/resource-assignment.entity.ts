import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { EducationalResource } from './educational-resource.entity';
import { User } from '../../users/entities/user.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';

@Entity('resource_assignments')
export class ResourceAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resourceId: string;

  @Column({ nullable: true })
  classGroupId: string;

  @Column({ nullable: true })
  studentId: string;

  @Column()
  assignedById: string;

  @CreateDateColumn()
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  // Array of student IDs excluded from this group assignment
  @Column({ type: 'simple-array', nullable: true })
  excludedStudentIds: string[];

  // Relations
  @ManyToOne(() => EducationalResource, resource => resource.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resourceId' })
  resource: EducationalResource;

  @ManyToOne(() => ClassGroup, { nullable: true })
  @JoinColumn({ name: 'classGroupId' })
  classGroup: ClassGroup;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedById' })
  assignedBy: User;
}