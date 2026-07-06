/**
 * @archivo: index.ts
 * @módulo: Assignments - Entities Index
 * @función: Exporta todas las entidades del módulo de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * ENTIDADES EXPORTADAS:
 * - AssignmentCampaign: Entidad principal de campañas
 * - CampaignResource: Recursos incluidos en campañas
 * - CampaignTarget: Targets multi-tipo de campañas
 * - AssignmentProgress: Progreso individual detallado
 * - AssignmentCondition: Condiciones y reglas
 * 
 * ESTADO: COMPLETADO - STEP 1.2
 */

// Entidades principales
export { AssignmentCampaign, CampaignType, CampaignStatus } from './assignment-campaign.entity';
export { CampaignResource } from './campaign-resource.entity';
export { CampaignTarget, TargetType, TargetStatus } from './campaign-target.entity';
export { AssignmentProgress, ProgressStatus } from './assignment-progress.entity';
export { 
  AssignmentCondition, 
  ConditionType, 
  ApplyTo,
  PrerequisiteConfig,
  PerformanceConfig,
  DateConfig,
  CompletionConfig,
  CustomConfig
} from './assignment-condition.entity';

// Importaciones explícitas para el array
import { AssignmentCampaign } from './assignment-campaign.entity';
import { CampaignResource } from './campaign-resource.entity';
import { CampaignTarget } from './campaign-target.entity';
import { AssignmentProgress } from './assignment-progress.entity';
import { AssignmentCondition } from './assignment-condition.entity';

// Array de todas las entidades para fácil importación en módulos
export const AssignmentEntities = [
  AssignmentCampaign,
  CampaignResource,
  CampaignTarget,
  AssignmentProgress,
  AssignmentCondition,
];