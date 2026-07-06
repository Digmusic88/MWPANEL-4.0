/**
 * @archivo: centralized-grade.entity.ts
 * @módulo: Grades (Centralización de Valoraciones) 
 * @función: Entidad central que agrega todas las valoraciones de un estudiante
 * @crítico: SÍ - Punto único de verdad para todas las calificaciones
 * @actualizado: Julio 2025 - Sistema centralizado de valoraciones
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Subject } from '../../students/entities/subject.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { GradeConfiguration, GradeComponent } from './grade-configuration.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';

export enum GradeStatus {
  DRAFT = 'draft',                    // Borrador, no visible para familias
  PROVISIONAL = 'provisional',        // Provisional, visible pero puede cambiar
  FINAL = 'final',                   // Final del período
  ARCHIVED = 'archived',             // Archivada (período anterior)
}

export enum GradePeriod {
  FIRST_TRIMESTER = 'first_trimester',
  SECOND_TRIMESTER = 'second_trimester', 
  THIRD_TRIMESTER = 'third_trimester',
  ANNUAL = 'annual',
  CONTINUOUS = 'continuous',
}

export interface GradeBreakdown {
  component: GradeComponent;
  rawScore: number;                   // Puntuación original
  normalizedScore: number;            // Puntuación normalizada (0-10)
  weight: number;                     // Peso del componente
  weightedScore: number;              // Puntuación ponderada
  itemCount: number;                  // Número de ítems evaluados
  lastUpdate: Date;                   // Última actualización
  sourceIds: string[];               // IDs de las fuentes originales
  confidence: number;                 // Confianza en la puntuación (0-1)
}

export interface GradeMetrics {
  totalItems: number;                 // Total de ítems evaluados
  completedItems: number;             // Ítems completados
  pendingItems: number;               // Ítems pendientes
  averageScore: number;               // Puntuación promedio
  standardDeviation: number;          // Desviación estándar
  trend: 'improving' | 'declining' | 'stable'; // Tendencia
  lastUpdateDate: Date;               // Última actualización
  dataQuality: number;                // Calidad de los datos (0-1)
}

export interface AIInsights {
  overallAssessment: string;          // Evaluación general de la IA
  strengthAreas: string[];            // Áreas de fortaleza detectadas
  improvementAreas: string[];         // Áreas de mejora sugeridas
  competencyAlignment: {              // Alineación con competencias
    [competencyCode: string]: {
      score: number;
      confidence: number;
      evidence: string[];
    };
  };
  learningProgress: {                 // Progreso de aprendizaje
    trajectory: 'accelerating' | 'steady' | 'concerning';
    predictedOutcome: number;
    confidence: number;
  };
  recommendations: string[];          // Recomendaciones pedagógicas
  generatedAt: Date;                  // Cuándo se generó
  modelVersion: string;               // Versión del modelo de IA
}

@Entity('centralized_grades')
@Unique(['student', 'subjectAssignment', 'period'])
@Index(['student', 'period'])
@Index(['subjectAssignment', 'period'])
@Index(['status', 'period'])
@Index(['finalGrade'])
@Index(['updatedAt'])
export class CentralizedGrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { eager: false })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Teacher, { eager: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ManyToOne(() => Subject, { eager: false })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => SubjectAssignment, { eager: false })
  @JoinColumn({ name: 'subject_assignment_id' })
  subjectAssignment: SubjectAssignment;

  @Column({ name: 'subject_assignment_id' })
  subjectAssignmentId: string;

  @ManyToOne(() => GradeConfiguration, { eager: false })
  @JoinColumn({ name: 'grade_configuration_id' })
  gradeConfiguration: GradeConfiguration;

  @Column({ name: 'grade_configuration_id' })
  gradeConfigurationId: string;

  // Período académico
  @Column({
    type: 'enum',
    enum: GradePeriod,
    default: GradePeriod.CONTINUOUS,
  })
  period: GradePeriod;

  @Column({ type: 'date', nullable: true, name: 'period_start_date' })
  periodStartDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'period_end_date' })
  periodEndDate?: Date;

  // Estado de la calificación
  @Column({
    type: 'enum',
    enum: GradeStatus,
    default: GradeStatus.DRAFT,
  })
  status: GradeStatus;

  // Calificación final calculada
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'final_grade' })
  finalGrade: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'previous_grade' })
  previousGrade?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'predicted_grade' })
  predictedGrade?: number;

  // Desglose detallado por componente
  @Column('jsonb')
  breakdown: GradeBreakdown[];

  // Métricas y estadísticas
  @Column('jsonb')
  metrics: GradeMetrics;

  // Insights de IA (si está habilitado)
  @Column('jsonb', { nullable: true, name: 'ai_insights' })
  aiInsights?: AIInsights;

  // Observaciones del profesor
  @Column('text', { nullable: true, name: 'teacher_comments' })
  teacherComments?: string;

  @Column('text', { nullable: true, name: 'internal_notes' })
  internalNotes?: string;

  // Metadatos de auditoría
  @Column('jsonb', { name: 'audit_trail' })
  auditTrail: {
    action: 'created' | 'updated' | 'calculated' | 'published' | 'archived';
    userId: string;
    timestamp: Date;
    changes?: any;
    reason?: string;
  }[];

  // Configuración de acceso
  @Column({ default: true, name: 'visible_to_student' })
  visibleToStudent: boolean;

  @Column({ default: true, name: 'visible_to_family' })
  visibleToFamily: boolean;

  @Column({ default: false, name: 'include_in_transcript' })
  includeInTranscript: boolean;

  // Datos de sincronización
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'last_calculated' })
  lastCalculated: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_published' })
  lastPublished?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_modified' })
  lastModified?: Date;

  @Column({ default: false, name: 'needs_recalculation' })
  needsRecalculation: boolean;

  @Column('text', { array: true, default: [], name: 'data_source_ids' })
  dataSourceIds: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0, name: 'data_integrity' })
  dataIntegrity: number;

  @Column('uuid', { nullable: true })
  academicYearId: string | null;

  @ManyToOne(() => AcademicYear, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academicYearId' })
  academicYear?: AcademicYear;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed properties y métodos

  /**
   * Calcula si el estudiante está aprobado según la configuración
   */
  isPassing(): boolean {
    return this.finalGrade >= this.gradeConfiguration.passingGrade;
  }

  /**
   * Obtiene el nivel de logro según la calificación
   */
  getAchievementLevel(): string {
    const grade = this.finalGrade;
    const config = this.gradeConfiguration;

    if (grade >= config.maximumGrade * 0.9) return 'Excelente';
    if (grade >= config.maximumGrade * 0.7) return 'Notable';
    if (grade >= config.passingGrade) return 'Aprobado';
    return 'Insuficiente';
  }

  /**
   * Obtiene el color para representar la calificación
   */
  getGradeColor(): string {
    const grade = this.finalGrade;
    const max = this.gradeConfiguration.maximumGrade;
    const passing = this.gradeConfiguration.passingGrade;

    if (grade >= max * 0.9) return '#52c41a';     // Verde excelente
    if (grade >= max * 0.7) return '#1890ff';     // Azul notable  
    if (grade >= passing) return '#faad14';       // Amarillo aprobado
    return '#ff4d4f';                             // Rojo suspenso
  }

  /**
   * Calcula la variación respecto al período anterior
   */
  getGradeVariation(): number | null {
    if (!this.previousGrade) return null;
    return this.finalGrade - this.previousGrade;
  }

  /**
   * Obtiene la tendencia de calificación
   */
  getTrend(): 'improving' | 'declining' | 'stable' {
    return this.metrics.trend;
  }

  /**
   * Verifica si necesita atención del profesor
   */
  needsAttention(): boolean {
    return (
      !this.isPassing() ||
      this.metrics.trend === 'declining' ||
      this.dataIntegrity < 0.8 ||
      this.metrics.pendingItems > 5
    );
  }

  /**
   * Obtiene un resumen para familias
   */
  getFamilySummary(): any {
    return {
      subject: this.subject.name,
      finalGrade: this.finalGrade,
      achievementLevel: this.getAchievementLevel(),
      isPassing: this.isPassing(),
      trend: this.getTrend(),
      lastUpdate: this.updatedAt,
      teacherComments: this.teacherComments,
      completedItems: this.metrics.completedItems,
      totalItems: this.metrics.totalItems,
    };
  }

  /**
   * Obtiene un resumen detallado para profesores
   */
  getTeacherSummary(): any {
    return {
      ...this.getFamilySummary(),
      breakdown: this.breakdown,
      metrics: this.metrics,
      aiInsights: this.aiInsights,
      internalNotes: this.internalNotes,
      dataIntegrity: this.dataIntegrity,
      needsAttention: this.needsAttention(),
      auditTrail: this.auditTrail.slice(-5), // Últimas 5 acciones
    };
  }

  /**
   * Valida la integridad de los datos
   */
  validateDataIntegrity(): string[] {
    const errors: string[] = [];

    // Validar que el breakdown suma correctamente
    const totalWeight = this.breakdown.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      errors.push(`Los pesos no suman 100%: ${totalWeight}%`);
    }

    // Validar que la calificación final está en rango (solo si gradeConfiguration está cargada)
    if (this.gradeConfiguration) {
      const { minimumGrade, maximumGrade } = this.gradeConfiguration;
      if (this.finalGrade < minimumGrade || this.finalGrade > maximumGrade) {
        errors.push(`Calificación fuera de rango: ${this.finalGrade} (${minimumGrade}-${maximumGrade})`);
      }
    }

    // Validar que hay datos suficientes
    if (this.metrics.completedItems === 0) {
      errors.push('No hay elementos evaluados');
    }

    // Validar coherencia temporal
    if (this.lastCalculated > this.updatedAt) {
      errors.push('Inconsistencia temporal en los datos');
    }

    return errors;
  }

  /**
   * Marca para recálculo
   */
  markForRecalculation(reason: string, userId: string): void {
    this.needsRecalculation = true;
    this.auditTrail.push({
      action: 'updated',
      userId,
      timestamp: new Date(),
      reason: `Marcado para recálculo: ${reason}`,
    });
  }

  /**
   * Publica la calificación (hace visible para familias)
   */
  publish(userId: string): void {
    this.status = GradeStatus.FINAL;
    this.lastPublished = new Date();
    this.visibleToFamily = true;
    this.auditTrail.push({
      action: 'published',
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * Archiva la calificación
   */
  archive(userId: string): void {
    this.status = GradeStatus.ARCHIVED;
    this.includeInTranscript = true;
    this.auditTrail.push({
      action: 'archived',
      userId,
      timestamp: new Date(),
    });
  }
}