/**
 * @entity: AccommodationEffectiveness
 * @module: DUA
 * @description: Entidad para medir la efectividad de las acomodaciones DUA
 * @features: Evaluaciones de efectividad, métricas de impacto, seguimiento temporal
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DuaAccommodation } from './dua-accommodation.entity';
import { User } from '../../users/entities/user.entity';

export enum EffectivenessRating {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5
}

export type EffectivenessRatingValue = 1 | 2 | 3 | 4 | 5;

/**
 * Entidad AccommodationEffectiveness
 * Almacena evaluaciones de efectividad de las acomodaciones DUA
 */
@Entity('accommodation_effectiveness')
@Index(['accommodationId'])
@Index(['evaluatedBy'])
@Index(['evaluationDate'])
@Index(['effectivenessRating'])
export class AccommodationEffectiveness {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con acomodación
  @Column({ name: 'accommodation_id' })
  accommodationId: string;

  @ManyToOne(() => DuaAccommodation, accommodation => accommodation.effectivenessRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accommodation_id' })
  accommodation: DuaAccommodation;

  // Evaluador
  @Column({ name: 'evaluated_by' })
  evaluatedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'evaluated_by' })
  evaluatedByUser: User;

  // Fecha de evaluación
  @Column({
    name: 'evaluation_date',
    type: 'date',
    comment: 'Fecha de la evaluación de efectividad',
  })
  evaluationDate: Date;

  // Calificación general (1-5)
  @Column({
    name: 'effectiveness_rating',
    type: 'int',
    comment: 'Calificación general de efectividad (1-5)',
  })
  effectivenessRating: EffectivenessRatingValue;

  // Feedback del profesor
  @Column({
    name: 'teacher_feedback',
    type: 'text',
    nullable: true,
    comment: 'Feedback del profesor sobre la efectividad',
  })
  teacherFeedback: string;

  // Feedback del estudiante
  @Column({
    name: 'student_feedback',
    type: 'text',
    nullable: true,
    comment: 'Feedback del estudiante sobre la efectividad',
  })
  studentFeedback: string;

  // Evidencias
  @Column({
    name: 'evidence',
    type: 'text',
    nullable: true,
    comment: 'Evidencias de efectividad',
  })
  evidence: string;

  // Ajustes necesarios
  @Column({
    name: 'adjustments_needed',
    type: 'text',
    nullable: true,
    comment: 'Ajustes necesarios identificados',
  })
  adjustmentsNeeded: string;

  // Campos eliminados - no existen en BD:
  // implementation_ease, student_acceptance, continuity_recommendation, notes

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos helper

  /**
   * Verificar si la evaluación es positiva
   */
  isPositiveEvaluation(): boolean {
    return this.effectivenessRating >= 3;
  }

  /**
   * Calcular puntuación global de efectividad (simplificado)
   */
  calculateGlobalEffectivenessScore(): number {
    return this.effectivenessRating;
  }

  /**
   * Generar resumen de la evaluación (simplificado)
   */
  generateSummary(): string {
    return `Rating: ${this.effectivenessRating}/5`;
  }
}