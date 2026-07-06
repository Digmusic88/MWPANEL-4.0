import axios, { AxiosResponse } from 'axios';
import { 
  AttachmentItem, 
  CreateAttachmentRequest, 
  AttachmentResponse,
  AttachmentFilters,
  PaginationParams,
  AttachmentComment,
  FolderItem,
  AttachmentStats,
} from '../components/attachments/common/types';

// API Base URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://plataforma.mundoworld.school/api' 
  : 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login or refresh token
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export class AttachmentsApiService {
  /**
   * Get attachments for a task with filtering and pagination
   */
  static async getAttachments(
    taskId: string,
    filters?: AttachmentFilters,
    pagination?: PaginationParams
  ): Promise<AttachmentResponse> {
    try {
      const params = new URLSearchParams();
      
      // Add taskId
      params.append('taskId', taskId);
      
      // Add pagination
      if (pagination) {
        if (pagination.page) params.append('page', pagination.page.toString());
        if (pagination.limit) params.append('limit', pagination.limit.toString());
        if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
      }
      
      // Add filters
      if (filters) {
        if (filters.search) params.append('search', filters.search);
        if (filters.mimeType) params.append('mimeType', filters.mimeType);
        if (filters.isStudentSubmission !== undefined) {
          params.append('isStudentSubmission', filters.isStudentSubmission.toString());
        }
        if (filters.isTeacherMaterial !== undefined) {
          params.append('isTeacherMaterial', filters.isTeacherMaterial.toString());
        }
        if (filters.uploadedById) params.append('uploadedById', filters.uploadedById);
        if (filters.tags && filters.tags.length > 0) {
          filters.tags.forEach(tag => params.append('tags', tag));
        }
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
        if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());
      }

      const response: AxiosResponse<AttachmentResponse> = await apiClient.get(
        `/attachments?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching attachments:', error);
      throw new Error('Error al cargar los archivos adjuntos');
    }
  }

  /**
   * Get single attachment by ID
   */
  static async getAttachmentById(attachmentId: string): Promise<AttachmentItem> {
    try {
      const response: AxiosResponse<AttachmentItem> = await apiClient.get(
        `/attachments/${attachmentId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching attachment:', error);
      throw new Error('Error al cargar el archivo');
    }
  }

  /**
   * Upload file attachment
   */
  static async uploadFile(
    file: File,
    request: CreateAttachmentRequest,
    onProgress?: (progress: number) => void
  ): Promise<AttachmentItem> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata
      Object.keys(request).forEach(key => {
        const value = request[key as keyof CreateAttachmentRequest];
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response: AxiosResponse<AttachmentItem> = await apiClient.post(
        '/attachments/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error.response?.data?.message || 'Error al subir el archivo';
      throw new Error(errorMessage);
    }
  }

  /**
   * Update attachment metadata
   */
  static async updateAttachment(
    attachmentId: string,
    updates: Partial<AttachmentItem>
  ): Promise<AttachmentItem> {
    try {
      const response: AxiosResponse<AttachmentItem> = await apiClient.patch(
        `/attachments/${attachmentId}`,
        updates
      );
      return response.data;
    } catch (error) {
      console.error('Error updating attachment:', error);
      throw new Error('Error al actualizar el archivo');
    }
  }

  /**
   * Delete attachments (soft delete by default)
   */
  static async deleteAttachments(
    attachmentIds: string[],
    permanent: boolean = false
  ): Promise<void> {
    try {
      await apiClient.delete('/attachments', {
        data: { attachmentIds, permanent }
      });
    } catch (error) {
      console.error('Error deleting attachments:', error);
      throw new Error('Error al eliminar los archivos');
    }
  }

  /**
   * Restore deleted attachment
   */
  static async restoreAttachment(attachmentId: string): Promise<AttachmentItem> {
    try {
      const response: AxiosResponse<AttachmentItem> = await apiClient.post(
        `/attachments/${attachmentId}/restore`
      );
      return response.data;
    } catch (error) {
      console.error('Error restoring attachment:', error);
      throw new Error('Error al restaurar el archivo');
    }
  }

  /**
   * Download attachment
   */
  static async downloadAttachment(attachmentId: string): Promise<Blob> {
    try {
      const response: AxiosResponse<Blob> = await apiClient.get(
        `/attachments/${attachmentId}/download`,
        {
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw new Error('Error al descargar el archivo');
    }
  }

  /**
   * Get folder structure for task
   */
  static async getFolderStructure(
    taskId: string,
    path?: string
  ): Promise<{ folders: FolderItem[]; permissions: any }> {
    try {
      const params = new URLSearchParams();
      params.append('taskId', taskId);
      if (path) params.append('path', path);

      const response = await apiClient.get(
        `/attachments/folders?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching folder structure:', error);
      throw new Error('Error al cargar la estructura de carpetas');
    }
  }

  /**
   * Add comment to attachment
   */
  static async addComment(
    attachmentId: string,
    content: string,
    parentId?: string
  ): Promise<AttachmentComment> {
    try {
      const response: AxiosResponse<AttachmentComment> = await apiClient.post(
        `/attachments/${attachmentId}/comments`,
        { content, parentId }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error('Error al añadir el comentario');
    }
  }

  /**
   * Get comments for attachment
   */
  static async getComments(attachmentId: string): Promise<AttachmentComment[]> {
    try {
      const response: AxiosResponse<AttachmentComment[]> = await apiClient.get(
        `/attachments/${attachmentId}/comments`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Error al cargar los comentarios');
    }
  }

  /**
   * Update comment
   */
  static async updateComment(
    commentId: string,
    content: string
  ): Promise<AttachmentComment> {
    try {
      const response: AxiosResponse<AttachmentComment> = await apiClient.patch(
        `/attachments/comments/${commentId}`,
        { content }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw new Error('Error al actualizar el comentario');
    }
  }

  /**
   * Delete comment
   */
  static async deleteComment(commentId: string): Promise<void> {
    try {
      await apiClient.delete(`/attachments/comments/${commentId}`);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new Error('Error al eliminar el comentario');
    }
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(taskId: string): Promise<AttachmentStats> {
    try {
      const response: AxiosResponse<AttachmentStats> = await apiClient.get(
        `/attachments/tasks/${taskId}/stats`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching task stats:', error);
      throw new Error('Error al cargar las estadísticas');
    }
  }

  /**
   * Search attachments across tasks
   */
  static async searchAttachments(
    query: string,
    type?: string
  ): Promise<{ attachments: AttachmentItem[]; total: number }> {
    try {
      const params = new URLSearchParams();
      params.append('query', query);
      if (type) params.append('type', type);

      const response = await apiClient.get(
        `/attachments/search?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error searching attachments:', error);
      throw new Error('Error al buscar archivos');
    }
  }

  /**
   * Helper method to create download URL for direct download
   */
  static getDownloadUrl(attachmentId: string): string {
    const token = localStorage.getItem('access_token');
    return `${API_BASE_URL}/attachments/${attachmentId}/download?token=${token}`;
  }

  /**
   * Helper method to create share link
   */
  static getShareUrl(attachmentId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared/attachment/${attachmentId}`;
  }

  /**
   * Helper method to validate file before upload
   */
  static validateFile(file: File, maxSize: number = 100): { valid: boolean; error?: string } {
    // Check file size (in MB)
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      return {
        valid: false,
        error: `El archivo "${file.name}" excede el tamaño máximo de ${maxSize}MB`
      };
    }

    // Check file type (basic validation)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `El tipo de archivo "${file.type}" no está permitido`
      };
    }

    return { valid: true };
  }
}

export default AttachmentsApiService;