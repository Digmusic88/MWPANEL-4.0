/**
 * @archivo: taskAttachmentsService.ts
 * @módulo: Services (Task Attachments)
 * @función: Servicio para gestión de archivos adjuntos de tareas con Google Drive
 * @crítico: SÍ - Sistema de visualización y descarga de archivos adjuntos
 * @dependencias: apiClient, task attachments endpoints
 * @relacionado_con: TaskAttachmentViewer.tsx, ResourceViewer.tsx (patrón similar)
 */

import api from './apiClient';

// Tipos de datos para task attachments
export interface TaskAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: string;
  path: string | null;
  type: 'instruction' | 'resource' | 'submission' | 'example';
  description: string;
  downloadCount: number;
  isActive: boolean;
  
  // Campos de Google Drive
  driveFileId: string | null;
  driveFolderId: string | null;
  driveWebViewLink: string | null;
  driveDownloadLink: string | null;
  driveFolderPath: string | null;
  
  uploadedAt: string;
  taskId: string;
}

export interface TaskAttachmentInfo {
  id: string;
  originalName: string;
  isGoogleDrive: boolean;
  driveWebViewLink: string | null;
  driveFileId: string | null;
  hasLocalFile: boolean;
  canDownload: boolean;
}

export interface TaskAttachmentsResponse {
  attachments: TaskAttachment[];
  total: number;
}

class TaskAttachmentsService {
  /**
   * Obtener archivos adjuntos de una tarea
   */
  async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    console.log('📎 getTaskAttachments: Fetching attachments for task:', taskId);
    
    try {
      const response = await api.get(`/tasks/${taskId}/attachments`);
      console.log('✅ Successfully fetched task attachments:', response.data?.length || 0);
      
      // El backend devuelve array directamente
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('❌ Error fetching task attachments:', error);
      throw new Error('Error al cargar archivos adjuntos de la tarea');
    }
  }

  /**
   * Obtener información de visualización de un attachment
   */
  async getAttachmentInfo(attachmentId: string): Promise<TaskAttachmentInfo> {
    console.log('📋 getAttachmentInfo: Getting info for attachment:', attachmentId);
    
    try {
      const response = await api.get(`/tasks/attachments/${attachmentId}/download?action=info`);
      console.log('✅ Successfully fetched attachment info:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching attachment info:', error);
      throw new Error('Error al obtener información del archivo adjunto');
    }
  }

  /**
   * Descargar archivo adjunto (solo archivos locales)
   */
  async downloadAttachment(attachmentId: string): Promise<Blob> {
    console.log('⬇️ downloadAttachment: Starting download for:', attachmentId);
    
    try {
      const response = await api.get(`/tasks/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });
      console.log('✅ Successfully downloaded attachment');
      
      return response.data;
    } catch (error) {
      console.error('❌ Error downloading attachment:', error);
      throw new Error('Error al descargar el archivo adjunto');
    }
  }

  /**
   * Manejar descarga/visualización inteligente
   * Detecta si es Google Drive o local y actúa en consecuencia
   */
  async handleAttachmentView(attachmentId: string, originalName: string): Promise<void> {
    console.log('👁️ handleAttachmentView: Processing attachment:', attachmentId);
    
    try {
      // Primero obtener info del attachment
      const info = await this.getAttachmentInfo(attachmentId);
      
      if (info.isGoogleDrive && info.driveWebViewLink) {
        // Abrir Google Drive en nueva pestaña
        console.log('🌤️ Opening Google Drive file in new tab:', info.driveWebViewLink);
        window.open(info.driveWebViewLink, '_blank');
      } else if (info.hasLocalFile) {
        // Descargar archivo local
        console.log('💾 Downloading local file');
        const blob = await this.downloadAttachment(attachmentId);
        
        // Crear enlace de descarga
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = originalName || `attachment-${attachmentId}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Local file download initiated');
      } else {
        throw new Error('Archivo no disponible para visualización o descarga');
      }
    } catch (error) {
      console.error('❌ Error handling attachment view:', error);
      throw error;
    }
  }

  /**
   * Obtener URL de visualización directa (para previews)
   */
  getPreviewUrl(attachment: TaskAttachment): string | null {
    // Si es de Google Drive, usar el enlace de visualización
    if (attachment.driveWebViewLink) {
      return attachment.driveWebViewLink;
    }
    
    // Si es archivo local, usar endpoint de descarga
    if (attachment.path) {
      return `/api/tasks/attachments/${attachment.id}/download`;
    }
    
    return null;
  }

  /**
   * Determinar si un archivo puede ser previsualized
   */
  canPreview(attachment: TaskAttachment): boolean {
    // Google Drive files pueden ser previsualizado
    if (attachment.driveWebViewLink) {
      return true;
    }
    
    // Archivos locales de imagen pueden ser previsualizado
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (attachment.path && imageTypes.includes(attachment.mimeType)) {
      return true;
    }
    
    return false;
  }

  /**
   * Obtener icono apropiado según tipo de archivo
   */
  getFileIcon(attachment: TaskAttachment): string {
    const mimeType = attachment.mimeType.toLowerCase();
    
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    if (mimeType.includes('text')) return '📃';
    
    return '📎'; // Icono genérico
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(sizeBytes: string | number): string {
    const size = typeof sizeBytes === 'string' ? parseInt(sizeBytes) : sizeBytes;
    
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * Obtener tipo legible del attachment
   */
  getAttachmentTypeLabel(type: TaskAttachment['type']): string {
    const labels = {
      instruction: 'Instrucciones',
      resource: 'Recurso',
      submission: 'Entrega',
      example: 'Ejemplo'
    };
    
    return labels[type] || 'Archivo';
  }

  /**
   * Obtener color del badge según tipo
   */
  getAttachmentTypeColor(type: TaskAttachment['type']): string {
    const colors = {
      instruction: 'blue',
      resource: 'green', 
      submission: 'orange',
      example: 'purple'
    };
    
    return colors[type] || 'default';
  }
}

// Exportar instancia singleton
const taskAttachmentsService = new TaskAttachmentsService();
export default taskAttachmentsService;