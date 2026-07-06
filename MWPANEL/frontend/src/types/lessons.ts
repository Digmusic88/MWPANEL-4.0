// ========================================
// LESSON SYSTEM TYPES
// ========================================

export enum LessonResourceType {
  FILE = 'FILE',
  YOUTUBE_LINK = 'YOUTUBE_LINK',
  WEB_LINK = 'WEB_LINK',
  INTERNAL_DOC = 'INTERNAL_DOC',
  PRESENTATION = 'PRESENTATION',
  TSX_ARTIFACT = 'TSX_ARTIFACT'
}

export enum LessonResourceVisibility {
  PRIVATE = 'PRIVATE',
  CLASS = 'CLASS',
  SCHOOL = 'SCHOOL',
  PUBLIC = 'PUBLIC'
}

// ========================================
// CORE ENTITIES
// ========================================

export interface LessonWorkspace {
  id: string;
  subjectAssignmentId: string;
  driveFolderId?: string;
  isActive: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Computed properties
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  classGroup?: {
    id: string;
    name: string;
    academicYear: string;
  };
  stats?: {
    totalFolders: number;
    totalResources: number;
    resourcesByType: Record<string, number>;
  };
  folders?: LessonFolder[];
}

export interface LessonFolder {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  orderIndex: number;
  driveFolderId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  resources?: LessonResource[];
  stats?: {
    totalResources: number;
    resourcesByType: Record<string, number>;
    totalViews: number;
    lastAccessedAt?: string;
  };
}

export interface LessonResource {
  id: string;
  folderId: string;
  name: string;
  description?: string;
  type: LessonResourceType;
  visibility: LessonResourceVisibility;
  orderIndex: number;
  isActive: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };

  // Type-specific fields
  driveFileId?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  
  youtubeUrl?: string;
  youtubeVideoId?: string;
  youtubeTitle?: string;
  youtubeDuration?: number;
  
  webUrl?: string;
  webTitle?: string;
  webDescription?: string;
  
  htmlContent?: string;
  plainTextContent?: string;
  
  presentationType?: string;
  slideCount?: number;
  
  sourceCode?: string;
  componentProps?: Record<string, any>;
  dependencies?: string[];
  customStyles?: string;
  sandboxConfig?: Record<string, any>;

  // Creator info
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };

  // Usage stats
  stats?: {
    viewCount: number;
    downloadCount: number;
    shareCount: number;
    lastAccessedAt?: string;
    avgRating?: number;
    totalRatings?: number;
  };

  // Share info
  shareInfo?: {
    sharedById: string;
    sharedByName: string;
    permissionLevel: string;
    sharedAt: string;
    expiresAt?: string;
  };
}

export interface LessonResourceShare {
  id: string;
  resourceId: string;
  sharedWithId: string;
  sharedById: string;
  permissionLevel: 'view' | 'edit' | 'admin';
  expiresAt?: string;
  createdAt: string;
}

export interface LessonResourceAccessLog {
  id: string;
  resourceId: string;
  userId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  accessedAt: string;
}

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface CreateLessonWorkspaceRequest {
  subjectAssignmentId: string;
  driveFolderId?: string;
  isActive?: boolean;
}

export interface CreateLessonFolderRequest {
  name: string;
  description?: string;
  orderIndex?: number;
  driveFolderId?: string;
  isActive?: boolean;
}

export interface UpdateLessonFolderRequest {
  name?: string;
  description?: string;
  orderIndex?: number;
  isActive?: boolean;
}

export interface CreateLessonResourceRequest {
  name: string;
  description?: string;
  type: LessonResourceType;
  visibility: LessonResourceVisibility;
  orderIndex?: number;
  isActive?: boolean;
  tags?: string[];
}

export interface CreateFileResourceRequest extends CreateLessonResourceRequest {
  driveFileId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

export interface CreateYouTubeResourceRequest extends CreateLessonResourceRequest {
  youtubeUrl: string;
  youtubeVideoId: string;
  youtubeTitle?: string;
  youtubeDuration?: number;
}

export interface CreateWebLinkResourceRequest extends CreateLessonResourceRequest {
  webUrl: string;
  webTitle?: string;
  webDescription?: string;
}

export interface CreateInternalDocResourceRequest extends CreateLessonResourceRequest {
  htmlContent: string;
  plainTextContent?: string;
}

export interface CreatePresentationResourceRequest extends CreateLessonResourceRequest {
  driveFileId: string;
  presentationType: 'google_slides' | 'powerpoint' | 'pdf';
  slideCount?: number;
}

export interface CreateTsxArtifactResourceRequest extends CreateLessonResourceRequest {
  sourceCode: string;
  componentProps?: Record<string, any>;
  dependencies?: string[];
  customStyles?: string;
  sandboxConfig?: {
    allowNetworkRequests?: boolean;
    allowLocalStorage?: boolean;
    maxExecutionTime?: number;
    allowedDomains?: string[];
  };
}

export interface UpdateLessonResourceRequest {
  name?: string;
  description?: string;
  visibility?: LessonResourceVisibility;
  orderIndex?: number;
  isActive?: boolean;
  tags?: string[];
  sourceCode?: string; // Add missing sourceCode field for TSX resources
}

export interface ShareLessonResourceRequest {
  sharedWithId: string;
  permissionLevel: 'view' | 'edit' | 'admin';
  expiresAt?: string;
}

export interface LessonResourceQuery {
  folderId?: string;
  type?: LessonResourceType;
  visibility?: LessonResourceVisibility;
  isActive?: boolean;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'orderIndex' | 'type';
  sortOrder?: 'ASC' | 'DESC';
  includeShared?: boolean;
  ownOnly?: boolean;
}

export interface LessonWorkspaceQuery {
  userId?: string;
  isActive?: boolean;
  isArchived?: boolean;
  includeStats?: boolean;
  includeFolders?: boolean;
}

export interface LessonFolderQuery {
  workspaceId?: string;
  isActive?: boolean;
  includeResources?: boolean;
  includeStats?: boolean;
  sortBy?: 'name' | 'createdAt' | 'orderIndex';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedLessonResourcesResponse {
  data: LessonResource[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: Record<string, any>;
}

// ========================================
// TSX SECURITY TYPES
// ========================================

export interface TsxValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
  dependencies: string[];
  exportedComponent?: string;
}

export interface TsxSandboxResult {
  success: boolean;
  error?: string;
  output?: any;
  executionTime: number;
}

export interface SandboxConfig {
  allowNetworkRequests?: boolean;
  allowLocalStorage?: boolean;
  maxExecutionTime?: number;
  allowedDomains?: string[];
  memoryLimit?: number;
  allowedModules?: string[];
}

// ========================================
// UI STATE TYPES
// ========================================

export interface LessonResourceFilters {
  search: string;
  type: LessonResourceType | 'all';
  visibility: LessonResourceVisibility | 'all';
  tags: string[];
  isActive: boolean;
  includeShared: boolean;
  ownOnly: boolean;
}

export interface LessonsViewMode {
  view: 'grid' | 'list' | 'explorer';
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'orderIndex' | 'type';
  sortOrder: 'asc' | 'desc';
}

export interface ResourcePreviewState {
  visible: boolean;
  resource: LessonResource | null;
  loading: boolean;
  error: string | null;
}

export interface TsxEditorState {
  sourceCode: string;
  validation: TsxValidationResult | null;
  testing: boolean;
  testResult: TsxSandboxResult | null;
  dependencies: string[];
  sandboxConfig: SandboxConfig;
}

// ========================================
// FORM TYPES
// ========================================

export interface ResourceFormData {
  name: string;
  description: string;
  type: LessonResourceType;
  visibility: LessonResourceVisibility;
  tags: string[];
  
  // Type-specific fields
  file?: File;
  youtubeUrl?: string;
  webUrl?: string;
  htmlContent?: string;
  sourceCode?: string;
  componentProps?: string; // JSON string
  dependencies?: string[];
  customStyles?: string;
  presentationType?: string;
  sandboxConfig?: SandboxConfig;
}

export interface FolderFormData {
  name: string;
  description: string;
  orderIndex?: number;
}

export interface WorkspaceFormData {
  subjectAssignmentId: string;
}

// ========================================
// HOOK RETURN TYPES
// ========================================

export interface UseLessonsWorkspaceReturn {
  workspaces: LessonWorkspace[];
  loading: boolean;
  error: string | null;
  createWorkspace: (data: CreateLessonWorkspaceRequest) => Promise<LessonWorkspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  archiveWorkspace: (id: string) => Promise<LessonWorkspace>;
  unarchiveWorkspace: (id: string) => Promise<LessonWorkspace>;
  cloneWorkspace: (id: string, newAcademicYearId: string) => Promise<LessonWorkspace>;
  refetch: () => void;
}

export interface UseLessonsFolderReturn {
  folders: LessonFolder[];
  loading: boolean;
  error: string | null;
  createFolder: (workspaceId: string, data: CreateLessonFolderRequest) => Promise<LessonFolder>;
  updateFolder: (id: string, data: UpdateLessonFolderRequest) => Promise<LessonFolder>;
  deleteFolder: (id: string) => Promise<void>;
  reorderFolders: (workspaceId: string, folderIds: string[]) => Promise<void>;
  refetch: () => void;
}

export interface UseLessonsResourceReturn {
  resources: LessonResource[];
  pagination: PaginatedLessonResourcesResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  createResource: (folderId: string, data: CreateLessonResourceRequest) => Promise<LessonResource>;
  updateResource: (id: string, data: UpdateLessonResourceRequest) => Promise<LessonResource>;
  deleteResource: (id: string) => Promise<void>;
  shareResource: (id: string, data: ShareLessonResourceRequest) => Promise<LessonResourceShare>;
  unshareResource: (id: string, sharedWithId: string) => Promise<void>;
  reorderResources: (folderId: string, resourceIds: string[]) => Promise<void>;
  refetch: () => void;
}

export interface UseTsxValidationReturn {
  validation: TsxValidationResult | null;
  testing: boolean;
  testResult: TsxSandboxResult | null;
  validateCode: (sourceCode: string, dependencies?: string[]) => Promise<TsxValidationResult>;
  testInSandbox: (sourceCode: string, props?: Record<string, any>, config?: SandboxConfig) => Promise<TsxSandboxResult>;
  generateSandboxConfig: (sourceCode: string) => Promise<SandboxConfig>;
}

// ========================================
// COMPONENT PROPS TYPES
// ========================================

export interface LessonsWorkspaceCardProps {
  workspace: LessonWorkspace;
  onSelect?: (workspace: LessonWorkspace) => void;
  onEdit?: (workspace: LessonWorkspace) => void;
  onDelete?: (workspace: LessonWorkspace) => void;
  selected?: boolean;
}

export interface LessonsFolderCardProps {
  folder: LessonFolder;
  onSelect?: (folder: LessonFolder) => void;
  onEdit?: (folder: LessonFolder) => void;
  onDelete?: (folder: LessonFolder) => void;
  selected?: boolean;
}

export interface LessonsResourceCardProps {
  resource: LessonResource;
  onPreview?: (resource: LessonResource) => void;
  onEdit?: (resource: LessonResource) => void;
  onDelete?: (resource: LessonResource) => void;
  onShare?: (resource: LessonResource) => void;
  selected?: boolean;
  viewMode?: 'grid' | 'list';
}

export interface LessonsResourcePreviewProps {
  resource: LessonResource;
  visible: boolean;
  onClose: () => void;
  onEdit?: (resource: LessonResource) => void;
  onShare?: (resource: LessonResource) => void;
}

export interface LessonsWorkspaceCardProps {
  workspace: LessonWorkspace;
  onSelect?: (workspace: LessonWorkspace) => void;
  onEdit?: (workspace: LessonWorkspace) => void;
  onDelete?: (workspace: LessonWorkspace) => void;
  onArchive?: (workspace: LessonWorkspace) => void;
  onUnarchive?: (workspace: LessonWorkspace) => void;
  onClone?: (workspace: LessonWorkspace) => void;
  selected?: boolean;
}

export interface TsxArtifactViewerProps {
  resource: LessonResource;
  editing?: boolean;
  onSave?: (sourceCode: string) => void;
  onCancel?: () => void;
}

export interface ResourceUploadModalProps {
  visible: boolean;
  folderId: string;
  onClose: () => void;
  onSuccess?: (resource: LessonResource) => void;
}

export interface ResourceSharingModalProps {
  visible: boolean;
  resource: LessonResource;
  onClose: () => void;
  onSuccess?: () => void;
}