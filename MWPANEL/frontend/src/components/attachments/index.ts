// Task Attachments Components - New Architecture
export { DriveExplorer } from './DriveExplorer';

// Sub-components for advanced usage
export { DriveToolbar } from './DriveExplorer/DriveToolbar';
export { BreadcrumbNav } from './DriveExplorer/BreadcrumbNav';
export { FileGrid, FileList } from './FileViews';
export { UploadZone } from './FileUpload';
export { FolderTree } from './FolderTree';
export { PreviewPanel } from './FilePreview';
export { SearchBar } from './Search';

// Common utilities and types
export * from './common';

// Legacy Components (for backwards compatibility)
export { default as TaskFileExplorer } from './TaskFileExplorer';
export { default as FileUploadZone } from './FileUploadZone';
export { default as CommentsPanel } from './CommentsPanel';
export { default as TaskAttachmentsSection } from './TaskAttachmentsSection';

// Export service for convenience
export { taskAttachmentsApiService as AttachmentsService } from '../../services/taskAttachmentsApiService';

// Export types for convenience
export type {
  TaskAttachment,
  AttachmentQueryDto,
  CreateAttachmentDto,
  UpdateAttachmentDto,
  AttachmentComment,
  CreateCommentDto,
  UpdateCommentDto,
  FolderStructureDto,
  AttachmentFilters,
  SortConfig,
  UploadProgress,
} from '../../types/attachments';