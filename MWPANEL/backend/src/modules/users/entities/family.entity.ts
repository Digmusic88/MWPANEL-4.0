import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Student } from '../../students/entities/student.entity';

export enum FamilyRelationship {
  PARENT = 'parent', // Padre/Madre
  GUARDIAN = 'guardian',
  OTHER = 'other',
}

@Entity('families')
export class Family {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  primaryContactId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'primaryContactId' })
  primaryContact: User;

  @Column({ type: 'uuid', nullable: true })
  secondaryContactId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'secondaryContactId' })
  secondaryContact: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('family_students')
export class FamilyStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  familyId: string;

  @ManyToOne(() => Family)
  @JoinColumn({ name: 'familyId' })
  family: Family;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({
    type: 'enum',
    enum: FamilyRelationship,
  })
  relationship: FamilyRelationship;
}