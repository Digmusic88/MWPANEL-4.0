/**
 * @entity: DuaAccommodation
 * @module: DUA (Diseño Universal para el Aprendizaje)
 * @description: Entidad para gestionar acomodaciones específicas DUA
 * @critical: SÍ - Sistema de accesibilidad educativa
 * @related: DuaProfile, Student, Teacher, ApprovalWorkflow
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { DuaProfile } from './dua-profile.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Student } from '../../students/entities/student.entity';
import { Subject } from '../../students/entities/subject.entity';
import { AccommodationEffectiveness } from './accommodation-effectiveness.entity';

export enum AccommodationType {
  PRESENTATION = 'PRESENTATION',
  RESPONSE = 'RESPONSE',
  SETTING = 'SETTING',
  TIMING = 'TIMING',
  SCHEDULING = 'SCHEDULING',
  ORGANIZATION = 'ORGANIZATION',
  ASSISTIVE_TECHNOLOGY = 'ASSISTIVE_TECHNOLOGY',
}

export enum AccommodationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IMPLEMENTED = 'IMPLEMENTED',
  DISCONTINUED = 'DISCONTINUED',
}

export enum ApprovalLevel {
  TEACHER = 'TEACHER',
  COORDINATOR = 'COORDINATOR',
  SPECIALIST = 'SPECIALIST',
  FAMILY = 'FAMILY',
}

export interface AccommodationDetails {
  // Presentación
  presentation?: {
    largeFont?: boolean;
    fontSize?: number;
    highContrast?: boolean;
    colorOverlay?: string;
    audioSupport?: boolean;
    visualSupports?: boolean;
    simplifiedText?: boolean;
    pictograms?: boolean;
  };
  
  // Respuesta
  response?: {
    alternativeFormat?: 'oral' | 'written' | 'digital' | 'manipulative';
    extraTime?: boolean;
    timeFactor?: number;
    reducedOptions?: boolean;
    calculator?: boolean;
    spellChecker?: boolean;
    voiceRecording?: boolean;
  };
  
  // Entorno
  setting?: {
    preferentialSeating?: boolean;
    reducedDistractors?: boolean;
    separateRoom?: boolean;
    smallGroup?: boolean;
    oneOnOne?: boolean;
    quietEnvironment?: boolean;
  };
  
  // Tiempo y programación
  timing?: {
    extendedTime?: boolean;
    timeMultiplier?: number;
    frequentBreaks?: boolean;
    breakDuration?: number;
    flexibleSchedule?: boolean;
  };
}

export interface ApprovalWorkflow {
  level: ApprovalLevel;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
  status: 'pending' | 'approved' | 'rejected';
}

@Entity('dua_accommodations')
export class DuaAccommodation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title', length: 200 })
  name: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: AccommodationType,
  })
  type: AccommodationType;

  @Column({
    type: 'enum',
    enum: AccommodationStatus,
    default: AccommodationStatus.PENDING,
  })
  status: AccommodationStatus;

  // Campos que existen en la base de datos
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'implementation_date', type: 'date', nullable: true })
  implementationDate?: Date;

  @Column({ name: 'application_guidelines', type: 'text', nullable: true })
  applicationGuidelines?: string;

  // Campos que no existen en BD - comentados para evitar errores
  // @Column('json')
  // details: AccommodationDetails;
  
  // @Column('simple-array', { nullable: true })
  // applicableSubjects?: string[];
  
  // @Column('simple-array', { nullable: true })
  // applicableActivities?: string[];
  
  // @Column('text', { nullable: true })
  // justification?: string;
  
  // @Column('text', { nullable: true })
  // expectedOutcomes?: string;

  // Relación con estudiante directamente (no con perfil DUA)
  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'requested_by' })
  requestedBy: Teacher;

  @Column({ name: 'requested_by' })
  requestedById: string;

  // Campos que no existen en BD - eliminados
  // lastModifiedBy y lastModifiedById no existen en la base de datos

  // Campos adicionales para flujo de aprobación  
  @Column({ name: 'approved_by', nullable: true })
  approvedById?: string;

  // Campos que no existen en BD - comentados
  // @Column({ type: 'text', nullable: true })
  // statusComments?: string;
  
  // @Column({ name: 'approved_date', type: 'timestamp', nullable: true })
  // approvedDate?: Date;

  @OneToMany(() => AccommodationEffectiveness, (effectiveness) => effectiveness.accommodation)
  effectivenessRecords: AccommodationEffectiveness[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Estado activo - campo real en la base de datos
  @Column({ 
    name: 'is_active',
    type: 'boolean', 
    default: true,
    comment: 'Indica si la acomodación está activa'
  })
  isActive: boolean;

  // Virtual properties
  get isActiveAndValid(): boolean {
    return this.isActive && 
           this.status === AccommodationStatus.IMPLEMENTED && 
           (!this.endDate || this.endDate > new Date());
  }

  get needsRenewal(): boolean {
    if (!this.endDate || this.status !== AccommodationStatus.IMPLEMENTED) {
      return false;
    }
    const daysUntilExpiry = Math.floor((this.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
  }

  // Comentado porque approvalWorkflow no existe en BD
  // get approvalProgress(): number {
  //   if (!this.approvalWorkflow || this.approvalWorkflow.length === 0) {
  //     return 0;
  //   }
  //   const approved = this.approvalWorkflow.filter(w => w.status === 'approved').length;
  //   return (approved / this.approvalWorkflow.length) * 100;
  // }
}