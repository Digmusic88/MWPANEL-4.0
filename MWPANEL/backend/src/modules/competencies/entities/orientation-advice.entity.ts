import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Course } from '../../students/entities/course.entity';

export enum OrientationAdviceType {
  SECOND_YEAR = 'SECOND_YEAR', // Al finalizar 2º ESO
  THIRD_YEAR = 'THIRD_YEAR', // Al finalizar 3º ESO (si se propone CFGB)
  FINAL = 'FINAL', // Al finalizar la etapa
}

/**
 * Consejo Orientador para ESO
 * Informe sobre el logro de objetivos y competencias con propuestas
 * de continuación formativa individualizada
 */
@Entity('orientation_advices')
export class OrientationAdvice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column('uuid')
  studentId: string;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column('uuid')
  courseId: string;

  @Column({
    type: 'enum',
    enum: OrientationAdviceType,
  })
  type: OrientationAdviceType;

  @Column()
  academicYear: string; // ej: "2024-2025"

  // Logro de objetivos y competencias
  @Column({ type: 'text' })
  objectivesAchievement: string;

  @Column({ type: 'text' })
  competenciesAchievement: string;

  // Propuesta de itinerario formativo
  @Column({ type: 'text' })
  recommendedPath: string;

  // Opciones específicas recomendadas
  @Column('text', { array: true })
  recommendedOptions: string[]; // ej: ["Bachillerato Ciencias", "FP Informática"]

  // Para 2º y 3º ESO - propuesta de CFGB
  @Column({ type: 'boolean', default: false })
  cfgbProposed: boolean;

  @Column({ type: 'text', nullable: true })
  cfgbJustification: string;

  // Medidas de apoyo recomendadas
  @Column('text', { array: true, nullable: true })
  supportMeasures: string[];

  // Observaciones adicionales
  @Column({ type: 'text', nullable: true })
  observations: string;

  // Aprobación colegiada
  @Column({ type: 'boolean', default: false })
  approvedByTeam: boolean;

  @Column({ type: 'date', nullable: true })
  approvalDate: Date;

  @Column('text', { array: true, nullable: true })
  approvingTeachers: string[]; // IDs de profesores que aprobaron

  // Entrega a familia
  @Column({ type: 'boolean', default: false })
  deliveredToFamily: boolean;

  @Column({ type: 'date', nullable: true })
  deliveryDate: Date;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'tutorId' })
  tutor: Teacher; // Tutor responsable

  @Column('uuid')
  tutorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}