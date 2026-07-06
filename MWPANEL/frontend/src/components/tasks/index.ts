/**
 * @archivo: index.ts
 * @módulo: Components (Tasks)
 * @función: Exportaciones centralizadas de componentes de tareas
 * @crítico: SÍ - Barrel exports para componentes de tasks
 * @dependencias: TaskAttachmentViewer, PendingTasksWidget
 * @relacionado_con: tasks module, task attachments system
 */

export { default as TaskAttachmentViewer } from './TaskAttachmentViewer';
export { default as PendingTasksWidget } from './PendingTasksWidget';

// Type exports for convenience
export type { default as TaskAttachmentViewerProps } from './TaskAttachmentViewer';