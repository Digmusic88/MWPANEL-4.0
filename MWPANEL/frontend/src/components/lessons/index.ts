// Export all lesson components
export { default as LessonsWorkspaceCard } from './LessonsWorkspaceCard';
export { default as LessonsFolderCard } from './LessonsFolderCard';
export { default as LessonsResourceCard } from './LessonsResourceCard';
export { default as TsxArtifactViewer } from './TsxArtifactViewer';

// Re-export types for convenience
export type {
  LessonsWorkspaceCardProps,
  LessonsFolderCardProps,
  LessonsResourceCardProps,
  TsxArtifactViewerProps
} from '../../types/lessons';