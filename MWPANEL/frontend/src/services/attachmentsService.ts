import apiClient from './apiClient';
import {
  TaskAttachment,
  AttachmentsResponse,
  CreateAttachmentDto,
  UpdateAttachmentDto,
  AttachmentQueryDto,
  CreateCommentDto,
  UpdateCommentDto,
  CreateVersionDto,
  FolderStructureDto,
  AttachmentComment,
  AttachmentsApiResponse,
} from '../types/attachments';

const BASE_URL = '/tasks';

export class AttachmentsService {
  /**
   * Upload a new file attachment
   */
  static async uploadAttachment(
    file: File,
    createAttachmentDto: CreateAttachmentDto,
    onProgress?: (progress: number) => void
  ): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Append all DTO fields
    Object.entries(createAttachmentDto).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.post(`${BASE_URL}/${createAttachmentDto.taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * Get attachments with filtering and pagination
   */
  static async getAttachments(query: AttachmentQueryDto = {}): Promise<AttachmentsResponse> {
    if (!query.taskId) {
      throw new Error('taskId is required for getAttachments');
    }
    
    const response = await apiClient.get(`${BASE_URL}/${query.taskId}/attachments`);
    return response.data;
  }

  /**
   * Get single attachment by ID
   */
  static async getAttachmentById(id: string): Promise<TaskAttachment> {
    const response = await apiClient.get(`${BASE_URL}/attachments/${id}`);
    return response.data;
  }

  /**
   * Update attachment metadata
   */
  static async updateAttachment(
    id: string,
    updateAttachmentDto: UpdateAttachmentDto
  ): Promise<TaskAttachment> {
    const response = await apiClient.patch(`${BASE_URL}/attachments/${id}`, updateAttachmentDto);
    return response.data;
  }

  /**
   * Delete attachment (soft delete by default)
   */
  static async deleteAttachment(id: string, permanent = false): Promise<{ message: string }> {
    const params = permanent ? '?permanent=true' : '';
    const response = await apiClient.delete(`${BASE_URL}/attachments/${id}${params}`);
    return response.data;
  }

  /**
   * Restore deleted attachment
   */
  static async restoreAttachment(id: string): Promise<TaskAttachment> {
    const response = await apiClient.post(`${BASE_URL}/attachments/${id}/restore`);
    return response.data;
  }

  /**
   * Download attachment file
   */
  static async downloadAttachment(id: string): Promise<Blob> {
    const response = await apiClient.get(`${BASE_URL}/attachments/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Get download URL for attachment
   */
  static getDownloadUrl(id: string): string {
    return `${apiClient.defaults.baseURL}${BASE_URL}/attachments/${id}/download`;
  }

  /**
   * Get folder structure for task
   */
  static async getFolderStructure(taskId: string, path?: string): Promise<FolderStructureDto> {
    const params = path ? `?path=${encodeURIComponent(path)}` : '';
    const response = await apiClient.get(`${BASE_URL}/${taskId}/folders${params}`);
    return response.data;
  }

  /**
   * Upload new version of existing attachment
   */
  static async uploadNewVersion(
    id: string,
    file: File,
    createVersionDto: CreateVersionDto,
    onProgress?: (progress: number) => void
  ): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (createVersionDto.changeDescription) {
      formData.append('changeDescription', createVersionDto.changeDescription);
    }

    const response = await apiClient.post(`${BASE_URL}/attachments/${id}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * Get comments for attachment
   */
  static async getComments(id: string): Promise<AttachmentComment[]> {
    const response = await apiClient.get(`${BASE_URL}/attachments/${id}/comments`);
    return response.data;
  }

  /**
   * Add comment to attachment
   */
  static async addComment(id: string, createCommentDto: CreateCommentDto): Promise<AttachmentComment> {
    const response = await apiClient.post(`${BASE_URL}/attachments/${id}/comments`, createCommentDto);
    return response.data;
  }

  /**
   * Update comment
   */
  static async updateComment(
    commentId: string,
    updateCommentDto: UpdateCommentDto
  ): Promise<AttachmentComment> {
    const response = await apiClient.patch(`${BASE_URL}/attachments/comments/${commentId}`, updateCommentDto);
    return response.data;
  }

  /**
   * Delete comment
   */
  static async deleteComment(commentId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${BASE_URL}/attachments/comments/${commentId}`);
    return response.data;
  }

  /**
   * Get attachment statistics for task
   */
  static async getTaskStats(taskId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    recentActivity: any[];
  }> {
    const response = await apiClient.get(`${BASE_URL}/${taskId}/stats`);
    return response.data;
  }

  /**
   * Search attachments across tasks
   */
  static async searchAttachments(
    query: string,
    type?: string
  ): Promise<{
    attachments: TaskAttachment[];
    total: number;
  }> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (type) {
      params.set('type', type);
    }

    const response = await apiClient.get(`${BASE_URL}/attachments/search?${params.toString()}`);
    return response.data;
  }

  /**
   * Utility: Get file icon based on MIME type
   */
  static getFileIcon(mimeType: string): string {
    const iconMap: Record<string, string> = {
      'application/pdf': '📄',
      'application/msword': '📝',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'application/vnd.ms-excel': '📊',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
      'application/vnd.ms-powerpoint': '📽️',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📽️',
      'image/jpeg': '🖼️',
      'image/png': '🖼️',
      'image/gif': '🖼️',
      'image/webp': '🖼️',
      'image/svg+xml': '🖼️',
      'video/mp4': '🎥',
      'video/quicktime': '🎥',
      'video/x-msvideo': '🎥',
      'audio/mpeg': '🎵',
      'audio/wav': '🎵',
      'audio/ogg': '🎵',
      'application/zip': '🗜️',
      'application/x-rar-compressed': '🗜️',
      'application/x-7z-compressed': '🗜️',
      'text/plain': '📄',
      'text/html': '🌐',
      'text/css': '🎨',
      'text/javascript': '⚙️',
      'application/json': '⚙️',
    };

    return iconMap[mimeType] || '📎';
  }

  /**
   * Utility: Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Utility: Check if file type is supported for preview
   */
  static isPreviewSupported(mimeType: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
    ];
    
    return supportedTypes.includes(mimeType);
  }

  /**
   * Utility: Get human-readable file type
   */
  static getFileType(mimeType: string): string {
    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/vnd.ms-excel': 'Excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'application/vnd.ms-powerpoint': 'PowerPoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
      'image/jpeg': 'Imagen JPEG',
      'image/png': 'Imagen PNG',
      'image/gif': 'Imagen GIF',
      'image/webp': 'Imagen WebP',
      'image/svg+xml': 'Imagen SVG',
      'video/mp4': 'Video MP4',
      'video/quicktime': 'Video QuickTime',
      'video/x-msvideo': 'Video AVI',
      'audio/mpeg': 'Audio MP3',
      'audio/wav': 'Audio WAV',
      'audio/ogg': 'Audio OGG',
      'application/zip': 'Archivo ZIP',
      'application/x-rar-compressed': 'Archivo RAR',
      'application/x-7z-compressed': 'Archivo 7Z',
      'text/plain': 'Texto',
      'text/html': 'HTML',
      'text/css': 'CSS',
      'text/javascript': 'JavaScript',
      'application/json': 'JSON',
    };

    return typeMap[mimeType] || 'Archivo';
  }

  /**
   * Utility: Validate file before upload
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    // Size limit: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'El archivo es demasiado grande. Máximo permitido: 10MB'
      };
    }

    // Allowed file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/html', 'text/css', 'text/javascript',
      'application/json',
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no permitido: ${file.type}`
      };
    }

    return { valid: true };
  }
}

export default AttachmentsService;