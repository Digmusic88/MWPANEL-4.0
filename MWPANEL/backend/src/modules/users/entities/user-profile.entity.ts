import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  documentNumber: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  dni: string;

  // Teacher-specific fields
  @Column({ nullable: true })
  education: string;

  @Column({ type: 'date', nullable: true })
  hireDate: Date;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  position: string;

  // Student-specific fields
  @Column({ nullable: true })
  guardianName: string;

  @Column({ nullable: true })
  guardianPhone: string;

  @Column({ nullable: true })
  emergencyContact: string;

  @Column({ nullable: true })
  medicalInfo: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual getter for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}