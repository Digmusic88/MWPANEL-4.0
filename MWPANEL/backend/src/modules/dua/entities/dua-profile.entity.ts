/**
 * @entity: DuaProfile
 * @module: DUA
 * @description: Entidad para perfiles DUA (Diseño Universal para el Aprendizaje)
 * @features: Estilos de aprendizaje, inteligencias múltiples, barreras, fortalezas
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
  OneToMany,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';
import { DuaAccommodation } from './dua-accommodation.entity';

/**
 * Entidad DuaProfile
 * Almacena información completa del perfil DUA de un estudiante
 */
@Entity('dua_profiles')
@Index(['studentId'], { unique: true }) // Un perfil por estudiante
@Index(['evaluatedBy'])
@Index(['isActive'])
export class DuaProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con estudiante (uno a uno)
  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  // Relación con evaluador
  @Column({ name: 'evaluated_by' })
  evaluatedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'evaluated_by' })
  evaluator: User;

  // Estilos de aprendizaje
  @Column({
    name: 'learning_styles',
    type: 'jsonb',
    nullable: true,
    comment: 'Estilos de aprendizaje del estudiante (visual, auditivo, kinestésico, lectura/escritura)',
  })
  learningStyles: {
    visual?: 'low' | 'medium' | 'high';
    auditory?: 'low' | 'medium' | 'high';
    kinesthetic?: 'low' | 'medium' | 'high';
    readingWriting?: 'low' | 'medium' | 'high';
  };

  // Inteligencias múltiples
  @Column({
    name: 'multiple_intelligences',
    type: 'jsonb',
    nullable: true,
    comment: 'Inteligencias múltiples del estudiante según teoría de Gardner',
  })
  multipleIntelligences: {
    linguistic?: 'low' | 'medium' | 'high';
    logicalMathematical?: 'low' | 'medium' | 'high';
    spatial?: 'low' | 'medium' | 'high';
    bodilyKinesthetic?: 'low' | 'medium' | 'high';
    musical?: 'low' | 'medium' | 'high';
    interpersonal?: 'low' | 'medium' | 'high';
    intrapersonal?: 'low' | 'medium' | 'high';
    naturalistic?: 'low' | 'medium' | 'high';
  };

  // Barreras identificadas
  @Column({
    name: 'barriers_identified',
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Barreras identificadas en el aprendizaje del estudiante',
  })
  barriersIdentified: string[];

  // Fortalezas del estudiante
  @Column({
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Fortalezas y habilidades destacadas del estudiante',
  })
  strengths: string[];

  // Desafíos del estudiante
  @Column({
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Desafíos y áreas de mejora identificadas',
  })
  challenges: string[];

  // Objetivos de aprendizaje
  @Column({
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Objetivos de aprendizaje específicos para el estudiante',
  })
  goals: string[];

  // Acomodaciones recomendadas
  @Column({
    name: 'recommended_accommodations',
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Acomodaciones recomendadas basadas en el perfil',
  })
  recommendedAccommodations: string[];

  // Fecha de evaluación
  @Column({
    name: 'assessment_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Fecha en que se realizó la evaluación DUA',
  })
  assessmentDate: Date;

  // Notas adicionales
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Notas adicionales sobre el perfil DUA',
  })
  notes: string;

  // Estado activo
  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    comment: 'Indica si el perfil DUA está activo',
  })
  isActive: boolean;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relación con acomodaciones
  @OneToMany(() => DuaAccommodation, accommodation => accommodation.student)
  accommodations: DuaAccommodation[];

  // Métodos helper
  
  /**
   * Obtener el estilo de aprendizaje dominante
   */
  getDominantLearningStyle(): string | null {
    if (!this.learningStyles) return null;

    let dominant = null;
    let maxLevel = '';

    Object.entries(this.learningStyles).forEach(([style, level]) => {
      if (level === 'high') {
        if (!dominant || maxLevel !== 'high') {
          dominant = style;
          maxLevel = level;
        }
      } else if (level === 'medium' && maxLevel !== 'high') {
        dominant = style;
        maxLevel = level;
      }
    });

    return dominant;
  }

  /**
   * Obtener inteligencias múltiples predominantes
   */
  getDominantIntelligences(): string[] {
    if (!this.multipleIntelligences) return [];

    const dominant: string[] = [];

    Object.entries(this.multipleIntelligences).forEach(([intelligence, level]) => {
      if (level === 'high') {
        dominant.push(intelligence);
      }
    });

    return dominant;
  }

  /**
   * Verificar si el perfil está completo
   */
  isProfileComplete(): boolean {
    return !!(
      this.learningStyles && 
      this.multipleIntelligences && 
      this.strengths?.length > 0 && 
      this.challenges?.length > 0
    );
  }

  /**
   * Obtener puntuación de completitud del perfil (0-100)
   */
  getCompletenessScore(): number {
    let score = 0;
    const totalFields = 7; // Número de campos principales

    if (this.learningStyles && Object.keys(this.learningStyles).length > 0) score++;
    if (this.multipleIntelligences && Object.keys(this.multipleIntelligences).length > 0) score++;
    if (this.barriersIdentified?.length > 0) score++;
    if (this.strengths?.length > 0) score++;
    if (this.challenges?.length > 0) score++;
    if (this.goals?.length > 0) score++;
    if (this.recommendedAccommodations?.length > 0) score++;

    return Math.round((score / totalFields) * 100);
  }

  /**
   * Generar resumen del perfil
   */
  generateSummary(): string {
    const summaryParts: string[] = [];

    // Estilo dominante
    const dominantStyle = this.getDominantLearningStyle();
    if (dominantStyle) {
      summaryParts.push(`Estilo predominante: ${dominantStyle}`);
    }

    // Inteligencias múltiples
    const dominantIntelligences = this.getDominantIntelligences();
    if (dominantIntelligences.length > 0) {
      summaryParts.push(`Inteligencias destacadas: ${dominantIntelligences.join(', ')}`);
    }

    // Fortalezas
    if (this.strengths?.length > 0) {
      summaryParts.push(`Fortalezas principales: ${this.strengths.slice(0, 2).join(', ')}`);
    }

    // Desafíos
    if (this.challenges?.length > 0) {
      summaryParts.push(`Áreas de mejora: ${this.challenges.slice(0, 2).join(', ')}`);
    }

    return summaryParts.join('. ') || 'Perfil en proceso de completar.';
  }
}