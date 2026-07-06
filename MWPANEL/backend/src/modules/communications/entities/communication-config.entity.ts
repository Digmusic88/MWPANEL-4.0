import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { Student } from '../../students/entities/student.entity';
import { Family } from '../../users/entities/family.entity';

@Entity('communication_configs')
@Index(['teacherId', 'classGroupId'], { unique: true })
@Index(['teacherId', 'studentId'], { unique: true })
@Index(['teacherId', 'familyId'], { unique: true })
export class CommunicationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Profesor que puede comunicarse
  @Column('uuid', { nullable: false })
  teacherId: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  // Configuración por grupo de clase (para todos los estudiantes del grupo)
  @Column('uuid', { nullable: true })
  classGroupId: string;

  @ManyToOne(() => ClassGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classGroupId' })
  classGroup: ClassGroup;

  // Configuración por estudiante individual
  @Column('uuid', { nullable: true })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  // Configuración por familia individual
  @Column('uuid', { nullable: true })
  familyId: string;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'familyId' })
  family: Family;

  // Si está habilitada la comunicación
  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  // Tipo de configuración: 'class_group', 'student', 'family'
  @Column({
    type: 'enum',
    enum: ['class_group', 'student', 'family'],
    default: 'class_group'
  })
  configType: 'class_group' | 'student' | 'family';

  // Notas del administrador sobre por qué se configuró así
  @Column('text', { nullable: true })
  adminNotes: string;

  // Usuario admin que hizo la configuración
  @Column('uuid', { nullable: true })
  configuredByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}