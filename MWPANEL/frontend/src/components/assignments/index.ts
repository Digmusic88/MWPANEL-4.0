/**
 * @archivo: index.ts
 * @módulo: Assignments - Frontend Components
 * @función: Exportaciones centralizadas de componentes de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Archivo barril que exporta todos los componentes del módulo
 * de asignaciones para facilitar las importaciones.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.1
 */

// Componentes principales - Campaign Management
export { CampaignCard } from './CampaignCard';
export { CampaignGrid } from './CampaignGrid';
export { CampaignModal } from './CampaignModal';
export { CampaignDashboard } from './CampaignDashboard';

// Componentes de Progress Tracking
export { ProgressDashboard } from './ProgressDashboard';
export { StudentProgressCard } from './StudentProgressCard';
export { ProgressChart } from './ProgressChart';
export { ActivityFeed } from './ActivityFeed';
export { AlertsPanel } from './AlertsPanel';

// Re-export tipos para conveniencia
export type {
  AssignmentCampaign,
  CampaignStatus,
  CampaignType,
  TargetType,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignFilters,
  PaginationQuery
} from '../../types/assignments';

// Re-export servicios para conveniencia
export { assignmentsService } from '../../services/assignmentsService';