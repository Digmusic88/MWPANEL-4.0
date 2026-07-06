export interface AttachmentItem {
  id: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  thumbnailUrl?: string;
  webViewLink?: string;
  downloadLink?: string;
  taskId: string;
  activityId?: string;
  uploadedById: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
  folderId?: string;
  isActive: boolean;
  currentVersion: number;
  metadata: {
    version: number;
    isStudentSubmission: boolean;
    isTeacherMaterial: boolean;
    isEvaluated?: boolean;
    submittedAt?: Date;
    gradeLevel?: string;
    subject?: string;
    academicYear?: string;
    tags?: string[];
    description?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  versions?: AttachmentVersion[];
  comments?: AttachmentComment[];
}

export interface AttachmentVersion {
  id: string;
  attachmentId: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  driveFileId: string;
  changeDescription?: string;
  uploadedById: string;
  uploadedBy?: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

export interface AttachmentComment {
  id: string;
  attachmentId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  isEdited: boolean;
  parentId?: string;
  replies?: AttachmentComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  parentId?: string;
  childCount?: number;
  path?: string;
  permissions?: FolderPermissions;
}

export interface FolderPermissions {
  canUpload: boolean;
  canDelete: boolean;
  canMove: boolean;
  canCreateFolder: boolean;
}

export type ViewMode = 'grid' | 'list';

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface FileDropResult {
  acceptedFiles: File[];
  rejectedFiles: File[];
}

export interface AttachmentStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  action: string;
  user: string;
  createdAt: Date;
  details?: any;
}

export interface CreateAttachmentRequest {
  taskId: string;
  activityId?: string;
  folderId?: string;
  description?: string;
  isStudentSubmission?: boolean;
  isTeacherMaterial?: boolean;
  tags?: string[];
  gradeLevel?: string;
  subject?: string;
  academicYear?: string;
}

export interface AttachmentFilters {
  search?: string;
  mimeType?: string;
  isStudentSubmission?: boolean;
  isTeacherMaterial?: boolean;
  tags?: string[];
  uploadedById?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AttachmentResponse {
  attachments: AttachmentItem[];
  total: number;
  page: number;
  totalPages: number;
}

// File type helpers
export const getFileTypeIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'file-image';
  if (mimeType.startsWith('video/')) return 'file-video';
  if (mimeType.startsWith('audio/')) return 'file-audio';
  if (mimeType === 'application/pdf') return 'file-pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-ppt';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'file-zip';
  if (mimeType === 'text/plain') return 'file-text';
  return 'file';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const isAudioFile = (mimeType: string): boolean => {
  return mimeType.startsWith('audio/');
};

export const isPDFFile = (mimeType: string): boolean => {
  return mimeType === 'application/pdf';
};

export const canPreview = (mimeType: string): boolean => {
  return isImageFile(mimeType) || isVideoFile(mimeType) || isAudioFile(mimeType) || isPDFFile(mimeType);
};