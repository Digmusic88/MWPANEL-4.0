import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Subject } from './subject.entity';
import { ClassGroup } from './class-group.entity';
import { AcademicYear } from './academic-year.entity';

@Entity('subject_assignments')
export class SubjectAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  // Campo legacy - mantener para compatibilidad backward
  @Column({ type: 'uuid', nullable: true })
  classGroupId: string;

  // Relacion legacy Many-to-One (deprecated, usar classGroups)
  @ManyToOne(() => ClassGroup)
  @JoinColumn({ name: 'classGroupId' })
  classGroup: ClassGroup;

  // Nueva relacion Many-to-Many para multiples grupos
  @ManyToMany(() => ClassGroup, { eager: false })
  @JoinTable({
    name: 'subject_assignment_class_groups',
    joinColumn: {
      name: 'subjectAssignmentId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'classGroupId',
      referencedColumnName: 'id',
    },
  })
  classGroups: ClassGroup[];

  @Column({ type: 'uuid' })
  academicYearId: string;

  @ManyToOne(() => AcademicYear)
  @JoinColumn({ name: 'academicYearId' })
  academicYear: AcademicYear;

  @Column({ type: 'int', default: 0 })
  weeklyHours: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}