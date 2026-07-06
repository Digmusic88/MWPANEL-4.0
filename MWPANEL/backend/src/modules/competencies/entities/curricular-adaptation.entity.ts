import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Subject } from '../../students/entities/subject.entity';
import { SpecificCompetency } from './specific-competency.entity';
import { EvaluationCriterion } from './evaluation-criterion.entity';
import { DuaProfile } from './dua-profile.entity';

export enum AdaptationType {
  ACCESS = 'ACCESS', // Adaptaciones de acceso
  NON_SIGNIFICANT = 'NON_SIGNIFICANT', // Adaptaciones no significativas
  SIGNIFICANT = 'SIGNIFICANT', // Adaptaciones significativas (modifican criterios)
}

/**
 * Adaptaciones Curriculares
 * Para alumnado con necesidades educativas especiales o altas capacidades
 * Implementa principios DUA (Diseño Universal para el Aprendizaje)
 */
@Entity('curricular_adaptations')
export class CurricularAdaptation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column('uuid')
  studentId: string;

  @ManyToOne(() => DuaProfile, profile => profile.curricularAdaptations, { nullable: true })
  @JoinColumn({ name: 'dua_profile_id' })
  duaProfile: DuaProfile;

  @Column({ name: 'dua_profile_id', nullable: true })
  duaProfileId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column('uuid')
  subjectId: string;

  @Column({
    type: 'enum',
    enum: AdaptationType,
  })
  type: AdaptationType;

  @Column()
  academicYear: string;

  // Necesidades detectadas
  @Column({ type: 'text' })
  detectedNeeds: string;

  // Principios DUA aplicados
  @Column({ type: 'jsonb' })
  duaPrinciples: {
    // Múltiples formas de representación
    representation: {
      visual: boolean;
      auditory: boolean;
      tactile: boolean;
      digital: boolean;
      adaptations: string[];
    };
    // Múltiples formas de acción y expresión
    actionExpression: {
      oral: boolean;
      written: boolean;
      graphic: boolean;
      digital: boolean;
      manipulative: boolean;
      adaptations: string[];
    };
    // Múltiples formas de implicación
    engagement: {
      interests: string[];
      motivations: string[];
      autonomyLevel: string;
      adaptations: string[];
    };
  };

  // Objetivos adaptados
  @Column({ type: 'text' })
  adaptedObjectives: string;

  // Competencias específicas adaptadas (solo para adaptaciones significativas)
  @ManyToMany(() => SpecificCompetency)
  @JoinTable({
    name: 'adaptation_specific_competencies',
    joinColumn: { name: 'adaptationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'specificCompetencyId', referencedColumnName: 'id' },
  })
  adaptedCompetencies: SpecificCompetency[];

  // Criterios de evaluación adaptados
  @ManyToMany(() => EvaluationCriterion)
  @JoinTable({
    name: 'adaptation_evaluation_criteria',
    joinColumn: { name: 'adaptationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'criterionId', referencedColumnName: 'id' },
  })
  adaptedCriteria: EvaluationCriterion[];

  // Metodología específica
  @Column({ type: 'text' })
  methodology: string;

  // Recursos específicos
  @Column('text', { array: true })
  specificResources: string[];

  // Apoyos necesarios
  @Column({ type: 'jsonb', nullable: true })
  supports: {
    type: string; // PT, AL, ATE, etc.
    hours: number;
    location: string; // Aula ordinaria, aula de apoyo
  }[];

  // Evaluación
  @Column({ type: 'text' })
  assessmentAdaptations: string;

  // Seguimiento
  @Column({ type: 'date' })
  nextReviewDate: Date;

  @Column({ type: 'text', nullable: true })
  progressNotes: string;

  // Coordinación
  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'coordinatorId' })
  coordinator: Teacher; // Coordinador (PT, orientador, etc.)

  @Column('uuid')
  coordinatorId: string;

  @Column('text', { array: true })
  involvedProfessionals: string[]; // IDs de profesionales implicados

  // Aprobación
  @Column({ type: 'boolean', default: false })
  familyApproval: boolean;

  @Column({ type: 'date', nullable: true })
  familyApprovalDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}