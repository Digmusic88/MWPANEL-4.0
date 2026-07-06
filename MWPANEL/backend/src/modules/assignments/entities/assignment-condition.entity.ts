/**
 * @archivo: assignment-condition.entity.ts
 * @módulo: Assignments (Sistema Avanzado de Asignaciones)
 * @función: Entidad para condiciones y reglas de asignación
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Entidad que define condiciones y reglas para asignaciones automáticas y condicionales.
 * Permite crear reglas complejas basadas en rendimiento, fechas, prerrequisitos, etc.
 * Soporta configuración flexible mediante JSONB para diferentes tipos de condiciones.
 * 
 * RELACIONES:
 * - N:1 con AssignmentCampaign (campaña que usa la condición)
 * 
 * ESTADO ACTUAL: NUEVA IMPLEMENTACIÓN - STEP 1.2
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { AssignmentCampaign } from './assignment-campaign.entity';

/**
 * ENUM: Condition Types
 * Define los diferentes tipos de condiciones soportadas
 */
export enum ConditionType {
  PREREQUISITE = 'PREREQUISITE',     // Requiere completar otros recursos primero
  PERFORMANCE = 'PERFORMANCE',       // Basada en rendimiento académico
  DATE = 'DATE',                     // Condiciones temporales
  COMPLETION = 'COMPLETION',         // Basada en completado de otras asignaciones
  CUSTOM = 'CUSTOM'                  // Condición personalizada con lógica específica
}

/**
 * ENUM: Apply To
 * Define a qué targets se aplica la condición
 */
export enum ApplyTo {
  ALL = 'ALL',           // Se aplica a todos los targets
  INDIVIDUAL = 'INDIVIDUAL', // Se aplica solo a targets individuales
  GROUP = 'GROUP'        // Se aplica solo a targets de grupo
}

/**
 * Interface para configuración de condiciones de prerrequisito
 */
export interface PrerequisiteConfig {
  requiredCampaigns?: string[];        // IDs de campañas que deben estar completadas
  requiredResources?: string[];        // IDs de recursos que deben estar completados
  minimumCompletionRate?: number;      // Porcentaje mínimo de completado requerido
  requireAllPrerequisites?: boolean;   // Si requiere TODOS los prerrequisitos o solo algunos
}

/**
 * Interface para configuración de condiciones de rendimiento
 */
export interface PerformanceConfig {
  minimumGrade?: number;               // Calificación mínima requerida
  subjectIds?: string[];               // Materias específicas para evaluar rendimiento
  timeFrame?: {                        // Marco temporal para evaluar
    value: number;
    unit: 'DAYS' | 'WEEKS' | 'MONTHS';
  };
  performanceMetrics?: {               // Métricas específicas
    averageScore?: number;
    completionRate?: number;
    engagementScore?: number;
  };
}

/**
 * Interface para configuración de condiciones de fecha
 */
export interface DateConfig {
  availableFrom?: Date;                // Fecha desde que está disponible
  availableUntil?: Date;               // Fecha hasta que está disponible
  daysAfterEnrollment?: number;        // Días después de inscripción
  specificDates?: Date[];              // Fechas específicas
  dayOfWeek?: number[];                // Días de la semana (0=domingo, 6=sábado)
  excludeHolidays?: boolean;           // Excluir días festivos
}

/**
 * Interface para configuración de condiciones de completado
 */
export interface CompletionConfig {
  campaignCompletionRequired?: {       // Campañas que deben estar completadas
    campaignIds: string[];
    minimumScore?: number;
  };
  resourceCompletionRequired?: {       // Recursos específicos
    resourceIds: string[];
    allRequired?: boolean;
  };
  classCompletionThreshold?: number;   // % de la clase que debe haber completado
}

/**
 * Interface para configuración de condiciones personalizadas
 */
export interface CustomConfig {
  evaluationFunction?: string;         // Nombre de la función de evaluación
  parameters?: Record<string, any>;    // Parámetros para la función
  description?: string;                // Descripción legible de la condición
}

@Entity('assignment_conditions')
@Index('IDX_assignment_conditions_campaign_type', ['campaignId', 'conditionType'])
@Index('IDX_assignment_conditions_active', ['isActive'])
export class AssignmentCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === RELACIÓN CON CAMPAÑA ===
  @Column()
  @Index('IDX_assignment_conditions_campaignId')
  campaignId: string;

  // === TIPO DE CONDICIÓN ===
  @Column({
    type: 'enum',
    enum: ConditionType
  })
  conditionType: ConditionType;

  // === CONFIGURACIÓN DE LA CONDICIÓN ===
  @Column({
    type: 'jsonb',
    comment: 'Configuración específica del tipo de condición'
  })
  conditionConfig: PrerequisiteConfig | PerformanceConfig | DateConfig | CompletionConfig | CustomConfig;

  // === LÓGICA DE APLICACIÓN ===
  @Column({
    type: 'enum',
    enum: ApplyTo,
    default: ApplyTo.ALL
  })
  applyTo: ApplyTo;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Filtros para determinar a qué targets específicos aplicar la condición'
  })
  targetFilter: {
    targetTypes?: string[];              // Tipos de target específicos
    targetIds?: string[];                // IDs de targets específicos
    metadata?: Record<string, any>;      // Filtros basados en metadata
  };

  // === CONFIGURACIÓN ADICIONAL ===
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  failureMessage: string; // Mensaje mostrar cuando la condición no se cumple

  @Column({ type: 'int', default: 0 })
  priority: number; // Prioridad de evaluación (mayor número = mayor prioridad)

  // === ESTADO ===
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  activatesAt: Date; // Fecha desde que la condición está activa

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // Fecha hasta que la condición está activa

  // === METADATOS ===
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // === ESTADÍSTICAS DE USO ===
  @Column({ type: 'int', default: 0 })
  evaluationCount: number; // Veces que se ha evaluado la condición

  @Column({ type: 'int', default: 0 })
  successCount: number; // Veces que la condición se cumplió

  @Column({ type: 'int', default: 0 })
  failureCount: number; // Veces que la condición falló

  // === RELACIONES ===
  @ManyToOne(() => AssignmentCampaign, campaign => campaign.assignmentConditions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: AssignmentCampaign;

  // === MÉTODOS VIRTUALES Y HELPERS ===

  /**
   * Verifica si la condición está actualmente activa
   */
  get isCurrentlyActive(): boolean {
    if (!this.isActive) return false;
    
    const now = new Date();
    
    if (this.activatesAt && this.activatesAt > now) return false;
    if (this.expiresAt && this.expiresAt < now) return false;
    
    return true;
  }

  /**
   * Obtiene la tasa de éxito de la condición
   */
  get successRate(): number {
    if (this.evaluationCount === 0) return 0;
    return Number((this.successCount / this.evaluationCount * 100).toFixed(2));
  }

  /**
   * Obtiene el nombre legible del tipo de condición
   */
  get typeDisplayName(): string {
    const typeNames = {
      [ConditionType.PREREQUISITE]: 'Prerrequisito',
      [ConditionType.PERFORMANCE]: 'Rendimiento',
      [ConditionType.DATE]: 'Fecha',
      [ConditionType.COMPLETION]: 'Completado',
      [ConditionType.CUSTOM]: 'Personalizada'
    };
    return typeNames[this.conditionType] || this.conditionType;
  }

  /**
   * Obtiene descripción detallada de la condición
   */
  get detailedDescription(): string {
    if (this.description) return this.description;
    
    switch (this.conditionType) {
      case ConditionType.PREREQUISITE:
        const prereqConfig = this.conditionConfig as PrerequisiteConfig;
        const campaigns = prereqConfig.requiredCampaigns?.length || 0;
        const resources = prereqConfig.requiredResources?.length || 0;
        return `Requiere completar ${campaigns} campañas y ${resources} recursos`;
        
      case ConditionType.PERFORMANCE:
        const perfConfig = this.conditionConfig as PerformanceConfig;
        return `Requiere rendimiento mínimo: ${perfConfig.minimumGrade || 'no especificado'}`;
        
      case ConditionType.DATE:
        const dateConfig = this.conditionConfig as DateConfig;
        const from = dateConfig.availableFrom?.toLocaleDateString() || 'siempre';
        const until = dateConfig.availableUntil?.toLocaleDateString() || 'siempre';
        return `Disponible desde ${from} hasta ${until}`;
        
      case ConditionType.COMPLETION:
        const compConfig = this.conditionConfig as CompletionConfig;
        return `Requiere completado previo de recursos/campañas específicos`;
        
      case ConditionType.CUSTOM:
        const customConfig = this.conditionConfig as CustomConfig;
        return customConfig.description || 'Condición personalizada';
        
      default:
        return 'Condición no definida';
    }
  }

  /**
   * Verifica si la condición se aplica a un target específico
   */
  appliesToTarget(targetType: string, targetId: string, targetMetadata?: Record<string, any>): boolean {
    // Verificar aplicabilidad general
    switch (this.applyTo) {
      case ApplyTo.INDIVIDUAL:
        if (targetType !== 'INDIVIDUAL') return false;
        break;
      case ApplyTo.GROUP:
        if (targetType === 'INDIVIDUAL') return false;
        break;
      // ApplyTo.ALL no requiere verificación adicional
    }

    // Verificar filtros específicos si existen
    if (!this.targetFilter) return true;

    if (this.targetFilter.targetTypes && !this.targetFilter.targetTypes.includes(targetType)) {
      return false;
    }

    if (this.targetFilter.targetIds && !this.targetFilter.targetIds.includes(targetId)) {
      return false;
    }

    // Verificar filtros de metadata si existen
    if (this.targetFilter.metadata && targetMetadata) {
      for (const [key, expectedValue] of Object.entries(this.targetFilter.metadata)) {
        if (targetMetadata[key] !== expectedValue) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Registra una evaluación de la condición
   */
  recordEvaluation(success: boolean): void {
    this.evaluationCount += 1;
    if (success) {
      this.successCount += 1;
    } else {
      this.failureCount += 1;
    }
  }

  /**
   * Obtiene configuración tipada para prerrequisitos
   */
  getPrerequisiteConfig(): PrerequisiteConfig | null {
    return this.conditionType === ConditionType.PREREQUISITE 
      ? this.conditionConfig as PrerequisiteConfig 
      : null;
  }

  /**
   * Obtiene configuración tipada para rendimiento
   */
  getPerformanceConfig(): PerformanceConfig | null {
    return this.conditionType === ConditionType.PERFORMANCE 
      ? this.conditionConfig as PerformanceConfig 
      : null;
  }

  /**
   * Obtiene configuración tipada para fechas
   */
  getDateConfig(): DateConfig | null {
    return this.conditionType === ConditionType.DATE 
      ? this.conditionConfig as DateConfig 
      : null;
  }

  /**
   * Obtiene configuración tipada para completado
   */
  getCompletionConfig(): CompletionConfig | null {
    return this.conditionType === ConditionType.COMPLETION 
      ? this.conditionConfig as CompletionConfig 
      : null;
  }

  /**
   * Obtiene configuración tipada para condiciones personalizadas
   */
  getCustomConfig(): CustomConfig | null {
    return this.conditionType === ConditionType.CUSTOM 
      ? this.conditionConfig as CustomConfig 
      : null;
  }

  /**
   * Activa la condición
   */
  activate(): void {
    this.isActive = true;
    this.activatesAt = new Date();
  }

  /**
   * Desactiva la condición
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Programa la expiración de la condición
   */
  scheduleExpiration(expiresAt: Date): void {
    this.expiresAt = expiresAt;
  }
}