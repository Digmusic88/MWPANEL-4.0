// Types for Task Attachments Module
// Based on backend DTOs and entities

export interface TaskAttachment {
  id: string;
  taskId: string;
  activityId?: string;
  uploadedById: string;
  driveFileId: string;
  driveFolderId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  thumbnailUrl?: string;
  webViewLink?: string;
  downloadLink?: string;
  metadata: TaskAttachmentMetadata;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  currentVersion: number;
  isStudentSubmission: boolean;
  isTeacherMaterial: boolean;
  commentsCount: number;
  versionsCount: number;
  uploadedBy?: string; // Display name for UI
  uploadedAt?: string; // Upload timestamp
  
  // Student info for submissions (used for naming)
  studentInfo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  
  // Relations (when included) - commented out to avoid circular dependencies
  // uploadedByUser?: User;
  // task?: Task;
  // activity?: Activity;
  // versions?: AttachmentVersion[];
  // comments?: AttachmentComment[];
  // auditLogs?: AttachmentAuditLog[];
}

export interface TaskAttachmentMetadata {
  version: number;
  isStudentSubmission: boolean;
  isTeacherMaterial: boolean;
  submittedAt?: Date;
  gradeLevel?: string;
  subject?: string;
  academicYear?: string;
  tags?: string[];
  description?: string;
  [key: string]: any;
}

export interface AttachmentVersion {
  id: string;
  attachmentId: string;
  versionNumber: number;
  driveFileId: string;
  fileName: string;
  fileSize: number;
  changeDescription?: string;
  uploadedById: string;
  createdAt: Date;
  
  // Relations
  attachment?: TaskAttachment;
  uploadedBy?: User;
  
  // Virtual fields
  humanSize: string;
}

export interface AttachmentComment {
  id: string;
  attachmentId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  attachment?: TaskAttachment;
  user?: User;
  parentComment?: AttachmentComment;
  replies?: AttachmentComment[];
  
  // Virtual fields
  formattedCreatedAt: string;
  repliesCount: number;
}

export interface AttachmentAuditLog {
  id: string;
  attachmentId: string;
  userId: string;
  action: AuditAction;
  details?: AuditLogDetails;
  createdAt: Date;
  
  // Relations
  attachment?: TaskAttachment;
  user?: User;
}

export type AuditAction = 'view' | 'download' | 'upload' | 'delete' | 'restore' | 'share' | 'comment' | 'move' | 'rename';

export interface AuditLogDetails {
  [key: string]: any;
}

// DTOs for API calls
export interface CreateAttachmentDto {
  taskId: string;
  activityId?: string;
  description?: string;
  isStudentSubmission?: boolean;
  isTeacherMaterial?: boolean;
  tags?: string[];
  gradeLevel?: string;
  subject?: string;
  academicYear?: string;
}

export interface UpdateAttachmentDto {
  description?: string;
  tags?: string[];
  gradeLevel?: string;
  subject?: string;
  academicYear?: string;
}

export interface AttachmentQueryDto {
  taskId?: string;
  activityId?: string;
  uploadedById?: string;
  search?: string;
  mimeType?: string;
  isActive?: boolean;
  isStudentSubmission?: boolean;
  isTeacherMaterial?: boolean;
  tags?: string[];
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateCommentDto {
  content: string;
  parentCommentId?: string;
}

export interface UpdateCommentDto {
  content: string;
}

export interface CreateVersionDto {
  changeDescription?: string;
}

// UI-specific types
export interface FolderStructureDto {
  currentFolder: FolderItem;
  folders: (FolderItem | FileItem)[];
  breadcrumb: BreadcrumbItem[];
  permissions: FolderPermissions;
}

export interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  itemCount?: number;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file';
  mimeType: string;
  size: number;
  humanSize: string;
  thumbnailUrl?: string;
  createdAt: Date;
  modifiedAt: Date;
  isStudentSubmission: boolean;
  isTeacherMaterial: boolean;
  commentsCount: number;
  versionsCount: number;
  uploadedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  path?: string;
}

export interface FolderPermissions {
  canUpload: boolean;
  canDelete: boolean;
  canMove: boolean;
  canCreateFolder: boolean;
  canComment: boolean;
  canShare: boolean;
}

// Upload-related types
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface FileWithMetadata extends File {
  metadata?: Partial<CreateAttachmentDto>;
}

// API Response types
export interface AttachmentsResponse {
  attachments: TaskAttachment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AttachmentsApiResponse<T = any> {
  data?: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Filter and sorting types
export interface AttachmentFilters {
  search?: string;
  mimeType?: string;
  isStudentSubmission?: boolean;
  isTeacherMaterial?: boolean;
  tags?: string[];
  uploadedById?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface SortConfig {
  field: keyof TaskAttachment;
  direction: 'asc' | 'desc';
}

// User and task types (imported from other modules)
export interface User {
  id: string;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  academicYear?: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
}