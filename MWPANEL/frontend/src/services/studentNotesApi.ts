import apiClient from './apiClient';
import {
  StudentNote,
  CreateStudentNoteDto,
  UpdateStudentNoteDto,
  UploadNoteFileDto,
  NoteQueryDto,
  PaginatedNotesResult,
  NotesStatistics,
  // Tipos para compartir
  Classmate,
  StudentTeacher,
  ShareNoteDto,
  SharedNote,
  SharedNotesQueryDto,
  PaginatedSharedNotesResult,
  UpdateSharedNoteDto,
} from '../types/student-notes';

const STUDENT_NOTES_API_BASE = '/student-notes';

export const studentNotesApi = {
  // Crear una nueva nota de texto
  async createNote(noteData: CreateStudentNoteDto): Promise<StudentNote> {
    const response = await apiClient.post(STUDENT_NOTES_API_BASE, noteData);
    return response.data;
  },

  // Subir una nota con archivo adjunto
  async uploadFileNote(file: File, noteData: UploadNoteFileDto): Promise<StudentNote> {
    console.error('🔥🔥🔥 UPLOAD START - File:', file);
    console.error('🔥🔥🔥 UPLOAD START - Note Data:', noteData);
    
    const formData = new FormData();
    formData.append('file', file);
    
    Object.entries(noteData).forEach(([key, value]) => {
      console.error(`🔥 Processing field ${key}:`, value, 'Type:', typeof value);
      
      if (value !== undefined && value !== null) {
        if (key === 'tags' && Array.isArray(value)) {
          // Solo agregar tags si el array no está vacío
          if (value.length > 0) {
            const tagsString = value.join(',');
            formData.append(key, tagsString);
            console.error(`🔥 Added tags as string: "${tagsString}"`);
          } else {
            console.error(`🔥 Skipped tags (empty array)`);
          }
        } else if (key === 'metadata' && typeof value === 'object') {
          if (Object.keys(value).length > 0) {
            const metadataString = JSON.stringify(value);
            formData.append(key, metadataString);
            console.error(`🔥 Added metadata as JSON: "${metadataString}"`);
          }
        } else {
          const stringValue = String(value);
          formData.append(key, stringValue);
          console.error(`🔥 Added ${key} as string: "${stringValue}"`);
        }
      } else {
        console.error(`🔥 Skipped ${key} (undefined or null)`);
      }
    });

    // Log FormData contents
    console.error('🔥🔥🔥 FINAL FORMDATA CONTENTS:');
    for (const [key, value] of formData.entries()) {
      console.error(`🔥 FormData[${key}]:`, value);
    }

    try {
      const response = await apiClient.post(`${STUDENT_NOTES_API_BASE}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.error('🔥🔥🔥 UPLOAD SUCCESS:', response.data);
      return response.data;
    } catch (error) {
      console.error('🚨🚨🚨 UPLOAD ERROR:', error);
      console.error('🚨 Error response:', error.response?.data);
      console.error('🚨 Error status:', error.response?.status);
      throw error;
    }
  },

  // Obtener todas las notas del estudiante
  async getMyNotes(filters: NoteQueryDto = {}): Promise<PaginatedNotesResult> {
    const response = await apiClient.get(STUDENT_NOTES_API_BASE, { params: filters });
    return response.data;
  },

  // Obtener estadísticas de apuntes
  async getStatistics(): Promise<NotesStatistics> {
    const response = await apiClient.get(`${STUDENT_NOTES_API_BASE}/statistics`);
    return response.data;
  },

  // Obtener una nota específica
  async getNoteById(id: string): Promise<StudentNote> {
    const response = await apiClient.get(`${STUDENT_NOTES_API_BASE}/${id}`);
    return response.data;
  },

  // Actualizar una nota
  async updateNote(id: string, updateData: UpdateStudentNoteDto): Promise<StudentNote> {
    const response = await apiClient.put(`${STUDENT_NOTES_API_BASE}/${id}`, updateData);
    return response.data;
  },

  // Eliminar una nota
  async deleteNote(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('ID de nota inválido.');
    }
    
    await apiClient.delete(`${STUDENT_NOTES_API_BASE}/${id}`);
  },

  // Marcar/desmarcar como favorito
  async toggleFavorite(id: string): Promise<StudentNote> {
    const response = await apiClient.put(`${STUDENT_NOTES_API_BASE}/${id}/favorite`);
    return response.data;
  },

  // Obtener URL de descarga de archivo adjunto
  async getDownloadUrl(id: string): Promise<string> {
    const response = await apiClient.get(`${STUDENT_NOTES_API_BASE}/attachments/${id}/download-url`);
    return response.data.url;
  },

  // Descargar archivo adjunto
  async downloadFile(id: string, filename?: string): Promise<void> {
    try {
      const downloadUrl = await studentNotesApi.getDownloadUrl(id);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      if (filename) {
        link.download = filename;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  },

  // Buscar notas
  async searchNotes(query: string, filters?: Omit<NoteQueryDto, 'search'>): Promise<PaginatedNotesResult> {
    return studentNotesApi.getMyNotes({ ...filters, search: query });
  },

  // Obtener notas por asignatura
  async getNotesBySubject(subjectId: string, filters?: Omit<NoteQueryDto, 'subjectId'>): Promise<PaginatedNotesResult> {
    return studentNotesApi.getMyNotes({ ...filters, subjectId });
  },

  // Obtener notas favoritas
  async getFavoriteNotes(filters?: Omit<NoteQueryDto, 'favorites'>): Promise<PaginatedNotesResult> {
    return studentNotesApi.getMyNotes({ ...filters, favorites: true });
  },

  // Obtener notas por tipo
  async getNotesByType(type: string, filters?: Omit<NoteQueryDto, 'type'>): Promise<PaginatedNotesResult> {
    return studentNotesApi.getMyNotes({ ...filters, type: type as any });
  },

  // Validar archivo antes de subir
  validateFile(file: File, noteType: string): { isValid: boolean; error?: string } {
    const maxSize = 20 * 1024 * 1024; // 20MB
    
    if (file.size > maxSize) {
      return { 
        isValid: false, 
        error: 'El archivo es demasiado grande (máximo 20MB)' 
      };
    }

    const allowedTypes: Record<string, string[]> = {
      voice: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/m4a'],
      drawing: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      mixed: ['*'], // Permite cualquier tipo
    };

    if (noteType === 'text') {
      return { 
        isValid: false, 
        error: 'Las notas de texto no pueden tener archivos adjuntos' 
      };
    }

    const allowed = allowedTypes[noteType] || [];
    if (allowed[0] !== '*' && !allowed.includes(file.type)) {
      return { 
        isValid: false, 
        error: `Tipo de archivo no válido para notas de tipo ${noteType}` 
      };
    }

    return { isValid: true };
  },

  // Formatear tamaño de archivo para mostrar
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Formatear duración de audio
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  },

  // === FUNCIONES PARA COMPARTIR APUNTES ===

  // Obtener compañeros de clase
  async getClassmates(): Promise<Classmate[]> {
    const response = await apiClient.get(`${STUDENT_NOTES_API_BASE}/sharing/classmates`);
    return response.data.data;
  },

  // Obtener profesores del estudiante
  async getStudentTeachers(): Promise<StudentTeacher[]> {
    const response = await apiClient.get(`${STUDENT_NOTES_API_BASE}/sharing/teachers`);
    return response.data.data;
  },

  // Compartir un apunte
  async shareNote(noteId: string, shareData: ShareNoteDto): Promise<any> {
    const response = await apiClient.post(`${STUDENT_NOTES_API_BASE}/${noteId}/share`, shareData);
    return response.data;
  },

  // Obtener apuntes compartidos conmigo
  async getSharedWithMe(filters: SharedNotesQueryDto = {}): Promise<PaginatedSharedNotesResult> {
    const response = await apiClient.get(`${STUDENT_NOTES_API_BASE}/sharing/shared-with-me`, { params: filters });
    return response.data.data;
  },

  // Obtener apuntes que he compartido
  async getSharedByMe(filters: SharedNotesQueryDto = {}): Promise<PaginatedSharedNotesResult> {
    const response = await apiClient.get(`${STUDENT_NOTES_API_BASE}/sharing/shared-by-me`, { params: filters });
    return response.data.data;
  },

  // Actualizar apunte compartido
  async updateSharedNote(sharedNoteId: string, updateData: UpdateSharedNoteDto): Promise<SharedNote> {
    const response = await apiClient.patch(`${STUDENT_NOTES_API_BASE}/shared/${sharedNoteId}`, updateData);
    return response.data.data;
  },

  // Revocar acceso a apunte compartido
  async revokeSharedNote(sharedNoteId: string): Promise<void> {
    await apiClient.delete(`${STUDENT_NOTES_API_BASE}/sharing/${sharedNoteId}`);
  },

  // Registrar acceso a apunte compartido
  async recordAccess(sharedNoteId: string): Promise<void> {
    await apiClient.post(`${STUDENT_NOTES_API_BASE}/shared/${sharedNoteId}/access`);
  },

  // Formatear nombre completo
  formatFullName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.trim();
  },

  // Formatear fecha relativa para apuntes compartidos
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Hace menos de 1 hora';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else if (diffInHours < 48) {
      return 'Hace 1 día';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Hace ${diffInDays} días`;
    }
  },

  // Validar si un apunte puede ser compartido
  canShareNote(note: StudentNote): { canShare: boolean; reason?: string } {
    if (note.isPrivate) {
      return { 
        canShare: false, 
        reason: 'No puedes compartir apuntes privados' 
      };
    }
    
    return { canShare: true };
  },

  // Eliminar apunte expirado
  async removeExpiredSharedNote(sharedNoteId: string): Promise<void> {
    const response = await apiClient.delete(`/student-notes/sharing/${sharedNoteId}/remove`);
    return response.data;
  },

  // === FUNCIONES PARA COMENTARIOS ===

  // Agregar comentario a una nota compartida
  async addComment(sharedNoteId: string, content: string): Promise<any> {
    const response = await apiClient.post(`${STUDENT_NOTES_API_BASE}/shared/${sharedNoteId}/comments`, {
      content: content.trim()
    });
    return response.data.data;
  },

  // Obtener comentarios de una nota compartida
  async getComments(sharedNoteId: string): Promise<any[]> {
    const response = await apiClient.get(`${STUDENT_NOTES_API_BASE}/shared/${sharedNoteId}/comments`);
    return response.data.data;
  },

  // Eliminar comentario
  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`${STUDENT_NOTES_API_BASE}/shared/comments/${commentId}`);
  }
};

export default studentNotesApi;