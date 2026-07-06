import apiClient from './apiClient';
import type {
  LessonWorkspace,
  LessonFolder,
  LessonResource,
  LessonResourceShare,
  CreateLessonWorkspaceRequest,
  CreateLessonFolderRequest,
  UpdateLessonFolderRequest,
  CreateLessonResourceRequest,
  UpdateLessonResourceRequest,
  ShareLessonResourceRequest,
  LessonResourceQuery,
  LessonWorkspaceQuery,
  LessonFolderQuery,
  PaginatedLessonResourcesResponse,
  TsxValidationResult,
  TsxSandboxResult,
  SandboxConfig
} from '../types/lessons';

// Use the centralized apiClient which already has the correct configuration
const api = apiClient;

// ========================================
// WORKSPACE API
// ========================================

export const lessonsWorkspaceApi = {
  async getAll(query?: LessonWorkspaceQuery): Promise<LessonWorkspace[]> {
    console.log('🎯 API Request - GET /lessons/workspaces with params:', query);
    const { data } = await api.get('/lessons/workspaces', { params: query });
    console.log('🎯 API Response - workspaces received:', data);
    return data;
  },

  async getById(id: string): Promise<LessonWorkspace> {
    const { data } = await api.get(`/lessons/workspaces/${id}`);
    return data;
  },

  async create(workspace: CreateLessonWorkspaceRequest): Promise<LessonWorkspace> {
    const { data } = await api.post('/lessons/workspaces', workspace);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/lessons/workspaces/${id}`);
  },

  async archive(id: string): Promise<LessonWorkspace> {
    const { data } = await api.put(`/lessons/workspaces/${id}/archive`);
    return data;
  },

  async unarchive(id: string): Promise<LessonWorkspace> {
    const { data } = await api.put(`/lessons/workspaces/${id}/unarchive`);
    return data;
  },

  async clone(id: string, newAcademicYearId: string): Promise<LessonWorkspace> {
    const { data } = await api.post(`/lessons/workspaces/${id}/clone`, {
      newAcademicYearId
    });
    return data;
  }
};

// ========================================
// FOLDER API
// ========================================

export const lessonsFolderApi = {
  async getAll(query?: LessonFolderQuery): Promise<LessonFolder[]> {
    const { data } = await api.get('/lessons/folders', { params: query });
    return data;
  },

  async getById(id: string): Promise<LessonFolder> {
    const { data } = await api.get(`/lessons/folders/${id}`);
    return data;
  },

  async create(workspaceId: string, folder: CreateLessonFolderRequest): Promise<LessonFolder> {
    const { data } = await api.post(`/lessons/workspaces/${workspaceId}/folders`, folder);
    return data;
  },

  async update(id: string, folder: UpdateLessonFolderRequest): Promise<LessonFolder> {
    const { data } = await api.put(`/lessons/folders/${id}`, folder);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/lessons/folders/${id}`);
  },

  async reorder(workspaceId: string, folderIds: string[]): Promise<void> {
    await api.put(`/lessons/workspaces/${workspaceId}/folders/reorder`, { folderIds });
  }
};

// ========================================
// RESOURCE API
// ========================================

export const lessonsResourceApi = {
  async getAll(query?: LessonResourceQuery): Promise<PaginatedLessonResourcesResponse> {
    const { data } = await api.get('/lessons/resources', { params: query });
    return data;
  },

  async getById(id: string): Promise<LessonResource> {
    const { data } = await api.get(`/lessons/resources/${id}`);
    return data;
  },

  async create(folderId: string, resource: CreateLessonResourceRequest): Promise<LessonResource> {
    const { data } = await api.post(`/lessons/folders/${folderId}/resources`, resource);
    return data;
  },

  async createFile(folderId: string, formData: FormData): Promise<LessonResource> {
    const { data } = await api.post(`/lessons/folders/${folderId}/resources/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async createYouTube(folderId: string, resource: any): Promise<LessonResource> {
    const { data } = await api.post(`/lessons/folders/${folderId}/resources/youtube`, resource);
    return data;
  },

  async createWebLink(folderId: string, resource: any): Promise<LessonResource> {
    const { data } = await api.post(`/lessons/folders/${folderId}/resources/weblink`, resource);
    return data;
  },

  async createDocument(folderId: string, resource: any): Promise<LessonResource> {
    const { data } = await api.post(`/lessons/folders/${folderId}/resources/document`, resource);
    return data;
  },

  async createPresentation(folderId: string, resource: any): Promise<LessonResource> {
    const { data } = await api.post(`/lessons/folders/${folderId}/resources/presentation`, resource);
    return data;
  },

  async createTsxArtifact(folderId: string, resource: any): Promise<LessonResource> {
    const { data } = await api.post(`/lessons/folders/${folderId}/resources/tsx-artifact`, resource);
    return data;
  },

  async update(id: string, resource: UpdateLessonResourceRequest): Promise<LessonResource> {
    console.log('🔧🔧🔧 [lessonsApi.update] API CALL DEBUG SESSION START 🔧🔧🔧');
    console.log('🔧 [lessonsApi.update] Resource ID:', id);
    console.log('🔧 [lessonsApi.update] Update data:', resource);
    console.log('🔧 [lessonsApi.update] Update data keys:', Object.keys(resource));
    console.log('🔧 [lessonsApi.update] sourceCode field:', resource.sourceCode);
    console.log('🔧 [lessonsApi.update] sourceCode length:', resource.sourceCode?.length);
    console.log('🔧 [lessonsApi.update] Full request payload:', JSON.stringify(resource, null, 2));
    
    const { data } = await api.put(`/lessons/resources/${id}`, resource);
    
    console.log('🔧 [lessonsApi.update] Response received:', data);
    console.log('🔧 [lessonsApi.update] Response sourceCode:', data.sourceCode);
    console.log('🔧🔧🔧 [lessonsApi.update] API CALL DEBUG SESSION END 🔧🔧🔧');
    
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/lessons/resources/${id}`);
  },

  async reorder(folderId: string, resourceIds: string[]): Promise<void> {
    await api.put(`/lessons/folders/${folderId}/resources/reorder`, { resourceIds });
  },

  async share(id: string, shareData: ShareLessonResourceRequest): Promise<LessonResourceShare> {
    const { data } = await api.post(`/lessons/resources/${id}/share`, shareData);
    return data;
  },

  async unshare(id: string, sharedWithId: string): Promise<void> {
    await api.delete(`/lessons/resources/${id}/share/${sharedWithId}`);
  }
};

// ========================================
// TSX SECURITY API
// ========================================

export const tsxSecurityApi = {
  async validateCode(sourceCode: string, dependencies?: string[]): Promise<TsxValidationResult> {
    const { data } = await api.post('/lessons/tsx/validate', { sourceCode, dependencies });
    return data;
  },

  async testInSandbox(
    sourceCode: string, 
    props?: Record<string, any>, 
    config?: SandboxConfig
  ): Promise<TsxSandboxResult> {
    // ====== DEBUGGING: CAPTURAR CÓDIGO TSX ANTES DE PROCESAMIENTO ======
    console.log('🔧🔧🔧 [Frontend] TSX EXECUTION DEBUG SESSION START 🔧🔧🔧');
    console.log('🔧 [Frontend] Original TSX code length:', sourceCode.length);
    console.log('🔧 [Frontend] Original TSX code FULL CONTENT:');
    console.log('🔧 ==================== START ORIGINAL CODE ====================');
    console.log(sourceCode);
    console.log('🔧 ==================== END ORIGINAL CODE ====================');
    
    // Buscar patrones problemáticos específicos en el código original
    const problematicPatterns = [
      { pattern: /\bobject\b/gi, name: 'object keyword' },
      { pattern: /\bObject\b/g, name: 'Object keyword' },
      { pattern: /declare\s+global/gi, name: 'declare global' },
      { pattern: /interface\s+(Object|Array|Function|String|Number|Boolean)/gi, name: 'global type interface' },
      { pattern: /export\s+default/gi, name: 'export default' },
      { pattern: /const\s+Object/gi, name: 'const Object' },
      { pattern: /let\s+Object/gi, name: 'let Object' },
      { pattern: /var\s+Object/gi, name: 'var Object' },
      { pattern: /return\s+\(/gi, name: 'return statement' }
    ];

    console.log('🔍 [Frontend] Analyzing original code for problematic patterns:');
    for (const { pattern, name } of problematicPatterns) {
      const matches = sourceCode.match(pattern);
      if (matches) {
        console.log(`🚨 [Frontend] Found ${name}: ${matches.length} occurrence(s) - ${JSON.stringify(matches)}`);
      } else {
        console.log(`✅ [Frontend] No ${name} found`);
      }
    }
    
    // Apply auto-fixer before executing in sandbox to prevent "exports is not defined" errors
    let processedCode = sourceCode;
    
    try {
      // Dynamically import the auto-fixer
      const { autoFixTsxCode } = await import('../utils/tsxAutoFixer');
      
      console.log('🔧 [Frontend] Applying auto-fixer to TSX code before sandbox execution...');
      const autoFixResult = autoFixTsxCode(sourceCode);
      
      if (autoFixResult.wasFixed && autoFixResult.fixedCode) {
        processedCode = autoFixResult.fixedCode;
        console.log('✅ [Frontend] Auto-fixer applied:', autoFixResult.fixesApplied);
        console.log('🔧 [Frontend] Auto-fixed code length:', processedCode.length);
        console.log('🔧 [Frontend] Auto-fixed TSX code FULL CONTENT:');
        console.log('🔧 ==================== START AUTO-FIXED CODE ====================');
        console.log(processedCode);
        console.log('🔧 ==================== END AUTO-FIXED CODE ====================');
      } else {
        console.log('ℹ️ [Frontend] No auto-fixes needed');
      }
    } catch (error) {
      console.warn('⚠️ [Frontend] Auto-fixer failed, using original code:', error);
    }
    
    console.log('🚀 [Frontend] Sending processed code to backend...');
    const { data } = await api.post('/lessons/tsx/test', { 
      sourceCode: processedCode, 
      props, 
      config 
    });
    console.log('📥 [Frontend] Backend response received:', data);
    return data;
  },

  async generateSandboxConfig(sourceCode: string): Promise<SandboxConfig> {
    const { data } = await api.post('/lessons/tsx/sandbox-config', { sourceCode });
    return data;
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

export const lessonsUtils = {
  // Extract YouTube video ID from URL
  extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  },

  // Get YouTube thumbnail URL
  getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
  },

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get file type icon
  getFileTypeIcon(mimeType: string): string {
    const iconMap: Record<string, string> = {
      // Documents
      'application/pdf': 'file-pdf',
      'application/msword': 'file-word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-word',
      'application/vnd.ms-excel': 'file-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file-excel',
      'application/vnd.ms-powerpoint': 'file-ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'file-ppt',
      'text/plain': 'file-text',
      
      // Images
      'image/jpeg': 'file-image',
      'image/jpg': 'file-image',
      'image/png': 'file-image',
      'image/gif': 'file-image',
      'image/bmp': 'file-image',
      'image/webp': 'file-image',
      'image/svg+xml': 'file-image',
      
      // Audio
      'audio/mp3': 'file-audio',
      'audio/wav': 'file-audio',
      'audio/ogg': 'file-audio',
      'audio/m4a': 'file-audio',
      
      // Video
      'video/mp4': 'file-video',
      'video/avi': 'file-video',
      'video/mov': 'file-video',
      'video/wmv': 'file-video',
      
      // Archives
      'application/zip': 'file-zip',
      'application/x-rar-compressed': 'file-zip',
      'application/x-7z-compressed': 'file-zip',
      
      // Code
      'text/html': 'file-code',
      'text/css': 'file-code',
      'text/javascript': 'file-code',
      'application/json': 'file-code',
    };
    
    return iconMap[mimeType] || 'file';
  },

  // Get resource type display name
  getResourceTypeDisplayName(type: string): string {
    const displayNames: Record<string, string> = {
      'FILE': 'Archivo',
      'YOUTUBE_LINK': 'Video de YouTube',
      'WEB_LINK': 'Enlace Web',
      'INTERNAL_DOC': 'Documento',
      'PRESENTATION': 'Presentación',
      'TSX_ARTIFACT': 'Componente Interactivo'
    };
    
    return displayNames[type] || type;
  },

  // Get visibility display name
  getVisibilityDisplayName(visibility: string): string {
    const displayNames: Record<string, string> = {
      'PRIVATE': 'Privado',
      'CLASS': 'Clase',
      'SCHOOL': 'Escuela',
      'PUBLIC': 'Público'
    };
    
    return displayNames[visibility] || visibility;
  },

  // Get visibility color
  getVisibilityColor(visibility: string): string {
    const colors: Record<string, string> = {
      'PRIVATE': 'red',
      'CLASS': 'blue',
      'SCHOOL': 'green',
      'PUBLIC': 'gold'
    };
    
    return colors[visibility] || 'default';
  },

  // Validate YouTube URL
  isValidYouTubeUrl(url: string): boolean {
    return this.extractYouTubeId(url) !== null;
  },

  // Validate web URL
  isValidWebUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  },

  // Parse tags from string
  parseTags(tagsString: string): string[] {
    if (!tagsString) return [];
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(tagsString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Fallback to comma-separated
      return tagsString.split(',').map(tag => tag.trim()).filter(Boolean);
    }
  },

  // Format tags for display
  formatTags(tags: string[]): string {
    return tags.length > 0 ? tags.join(', ') : 'Sin etiquetas';
  },

  // Get duration display
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
};

// Export all APIs as default
export default {
  workspace: lessonsWorkspaceApi,
  folder: lessonsFolderApi,
  resource: lessonsResourceApi,
  tsx: tsxSecurityApi,
  utils: lessonsUtils
};