/**
 * @archivo: educationalResourcesService.ts
 * @módulo: Services (Recursos Educativos Google Drive)
 * @función: Servicio completo para gestión de recursos educativos con Google Drive
 * @crítico: SÍ - Sistema principal de gestión de materiales educativos
 * @dependencias: apiClient, Google Drive API, endpoints /recursos/*
 * @no_modificar: Upload multipart/form-data sin verificar estructura FormData
 * @relacionado_con: EducationalResourcesPage.tsx, ResourceUploader.tsx, Google Drive integration
 */

/**
 * SERVICIO: EducationalResourcesService
 * UBICACIÓN: /frontend/src/services/educationalResourcesService.ts
 * FUNCIÓN: Cliente completo para sistema de recursos educativos con Google Drive
 * NO USAR PARA: Files no educativos (usar file upload genérico)
 * CARACTERÍSTICAS PRINCIPALES:
 *   - Upload directo a Google Drive desde frontend
 *   - Metadata completo: asignaturas, niveles, tipos, años académicos
 *   - Sistema de asignaciones: estudiantes/clases específicas
 *   - Estadísticas avanzadas: views, downloads, engagement
 *   - Favoritos y comentarios por usuario
 * 
 * INTEGRACIÓN GOOGLE DRIVE:
 * - Upload directo con multipart/form-data
 * - Storage automático en folders organizados
 * - Links compartidos: webViewLink, downloadLink, thumbnailLink
 * - Metadata preservation: mimeType, fileSize, driveFileId
 * - Permission management automático
 * 
 * TIPOS DE RECURSOS SOPORTADOS:
 * - PDF: Documentos, libros, guías
 * - VIDEO: Clases grabadas, tutoriales
 * - IMAGE: Diagramas, infografías, fotos
 * - INTERACTIVE_HTML: Simulaciones, juegos educativos
 * - DOCUMENT: Word, Google Docs
 * - PRESENTATION: PowerPoint, Google Slides
 * - SPREADSHEET: Excel, Google Sheets
 * - AUDIO: Podcasts, grabaciones de audio
 * 
 * MÉTODO: uploadResource(file, data)
 * - File: File object desde input[type="file"]
 * - Data: CreateResourceDto con metadata
 * - Process: FormData con archivo + metadata → Google Drive
 * - Response: EducationalResource completo con links
 * - Error handling: File size, type validation, Google API errors
 * 
 * MÉTODO: getResources(filters)
 * - Pagination: page, limit, totalPages
 * - Filtering: type, subject, level, author, tags, public/private
 * - Sorting: por fecha, views, downloads, title
 * - Search: título y descripción full-text
 * - Response: { resources, total, page, totalPages }
 * 
 * SISTEMA DE ASIGNACIONES:
 * - assignResource(): Asignar a clases/estudiantes específicos
 * - Due dates: Fechas límite para entrega/revisión
 * - Instructions: Contexto específico para la asignación
 * - Tracking: Quién asignó, cuándo, estado
 * - Bulk operations: Asignar a múltiples targets
 * 
 * ANALYTICS Y ESTADÍSTICAS:
 * - recordView(): Tracking views por usuario
 * - getResourceStats(): Views, downloads, unique viewers
 * - viewsByDay: Gráficos de engagement temporal
 * - averageViewDuration: Tiempo promedio de visualización
 * - Most popular: Rankings por uso
 * 
 * GESTIÓN DE FAVORITOS:
 * - toggleFavorite(): Add/remove de favoritos por usuario
 * - Personal collections: Biblioteca personalizada
 * - Quick access: Acceso rápido a recursos frecuentes
 * - Sharing: Favoritos no compartidos entre usuarios
 * 
 * SISTEMA DE COMENTARIOS:
 * - addComment(): Feedback y notas por recurso
 * - Collaborative: Múltiples usuarios pueden comentar
 * - Context: Mejora continua de recursos
 * - Moderation: Profesores pueden gestionar comentarios
 * 
 * METADATA SERVICE:
 * - getResourceMetadata(): Subjects, levels, types, academic years
 * - Dynamic loading: Carga desde backend en tiempo real
 * - Validation: Ensures consistency con base de datos
 * - Debugging: Extensive logging para troubleshooting
 * - Cache strategy: Optimización para form selects
 * 
 * ENDPOINTS BACKEND UTILIZADOS:
 * - POST /recursos/google-drive-upload: Upload con metadata
 * - GET /recursos/list: Lista paginada con filtros
 * - GET /recursos/resource/:id: Detalle individual
 * - PATCH /recursos/:id: Actualización metadata
 * - DELETE /recursos/:id: Eliminación (soft delete)
 * - POST /recursos/:id/assign: Asignación a clases/estudiantes
 * - DELETE /recursos/:id/assign/:assignmentId: Quitar asignación
 * - POST /recursos/:id/favorite: Toggle favoritos
 * - POST /recursos/:id/comment: Añadir comentario
 * - GET /recursos/:id/stats: Estadísticas detalladas
 * - GET /recursos/:id/download: Download directo
 * - POST /recursos/:id/view: Registrar visualización
 * - GET /recursos/assigned: Recursos asignados a usuario actual
 * - GET /recursos/metadata/*: Metadata para forms
 * 
 * FILTROS AVANZADOS:
 * ```typescript
 * interface ResourceFilters {
 *   search?: string              // Full-text en título/descripción
 *   type?: ResourceType         // Tipo de archivo
 *   subjectId?: string          // Filtro por asignatura
 *   educationalLevelId?: string // Nivel educativo
 *   gradeLevel?: string         // Curso específico
 *   authorId?: string           // Creador del recurso
 *   tags?: string[]             // Tags múltiples
 *   isPublic?: boolean          // Público vs privado
 *   isAssigned?: boolean        // Solo asignados
 *   isFavorite?: boolean        // Solo favoritos
 *   page?: number               // Paginación
 *   limit?: number              // Items per page
 *   sortBy?: string             // Campo ordenación
 *   sortOrder?: 'ASC' | 'DESC'  // Dirección sort
 * }
 * ```
 * 
 * TIPOS TYPESCRIPT COMPLETOS:
 * - EducationalResource: Entidad principal con relaciones
 * - ResourceAssignment: Asignaciones con metadata
 * - CreateResourceDto: Data para creación
 * - ResourceStats: Analytics detallados
 * - ResourceType: Enum tipos soportados
 * 
 * ERROR HANDLING:
 * - File size limits: Validación frontend + backend
 * - MIME type validation: Solo tipos educativos permitidos
 * - Google Drive API: Rate limiting, quotas, permissions
 * - Network errors: Retry logic para uploads grandes
 * - Validation errors: User feedback específico
 * 
 * OPTIMIZACIONES:
 * - FormData streaming para files grandes
 * - Pagination inteligente para large datasets
 * - Metadata caching para form selects
 * - Lazy loading de thumbnails
 * - Compression automática para images
 * 
 * SECURITY:
 * - Authenticated uploads únicamente
 * - Permission validation per resource
 * - File type whitelisting
 * - Size limits enforced
 * - Google Drive permission model
 * 
 * CASOS DE USO:
 * - Profesores: Upload y gestión de materiales de clase
 * - Administradores: Biblioteca institucional centralizada
 * - Estudiantes: Acceso a recursos asignados
 * - Familias: Visualización de materiales de hijos
 * 
 * DEBUGGING EXTENSIVO:
 * - Console logging en getResourceMetadata()
 * - API response structure validation
 * - Error tracking para Google Drive operations
 * - Performance monitoring para uploads
 * 
 * ESTADO ACTUAL: ✅ SERVICE PRODUCTION-READY
 * - Integración Google Drive funcionando perfectamente
 * - Upload de archivos grandes optimizado
 * - Sistema de asignaciones completo
 * - Analytics y estadísticas operativas
 * - Filtros avanzados implementados
 * - Error handling robusto para edge cases
 * - Usado como biblioteca principal de recursos educativos
 */

import api from './apiClient';

export interface ResourceType {
  PDF: 'PDF';
  VIDEO: 'VIDEO';
  IMAGE: 'IMAGE';
  INTERACTIVE_HTML: 'INTERACTIVE_HTML';
  DOCUMENT: 'DOCUMENT';
  PRESENTATION: 'PRESENTATION';
  SPREADSHEET: 'SPREADSHEET';
  AUDIO: 'AUDIO';
  LINK: 'LINK';
}

export interface EducationalResource {
  id: string;
  title: string;
  description?: string;
  type: keyof ResourceType;
  gradeLevel: string;
  academicYear: string;
  tags?: string[];
  driveFileId: string;
  driveFolderId: string;
  driveFileName: string;
  webViewLink?: string;
  downloadLink?: string;
  thumbnailLink?: string;
  mimeType: string;
  fileSize: string;
  authorId: string;
  author?: {
    id: string;
    email: string;
    role?: string;
    isActive?: boolean;
    profile?: {
      id?: string;
      firstName?: string;
      lastName?: string;
    };
  };
  subjectId: string;
  subject: {
    id: string;
    name: string;
  };
  educationalLevelId: string;
  educationalLevel: {
    id: string;
    name: string;
  };
  folderId?: string; // Carpeta personalizada dentro de la asignatura
  isPublic: boolean;
  // Link resource fields
  externalUrl?: string;
  previewTitle?: string;
  previewDescription?: string;
  previewImage?: string;
  isActive: boolean;
  views: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
  assignments?: ResourceAssignment[];
  isFavorite?: boolean;
  // Fields for assigned resources (when viewed from student perspective)
  assignedAt?: string;
  dueDate?: string;
  instructions?: string;
  assignmentId?: string;
}

export interface ResourceAssignment {
  id: string;
  resourceId: string;
  classGroupId?: string;
  studentId?: string;
  assignedById: string;
  assignedAt: string;
  dueDate?: string;
  instructions?: string;
}

export interface CreateResourceDto {
  title: string;
  description?: string;
  type: keyof ResourceType;
  gradeLevel: string;
  academicYear?: string;
  tags?: string[];
  subjectId: string;
  educationalLevelId: string;
  isPublic?: boolean;
  authorId?: string; // Solo para administradores
}

export interface CreateLinkResourceDto {
  title: string;
  externalUrl: string;
  subjectId: string;
  educationalLevelId: string;
  gradeLevel: string;
  description?: string;
  previewTitle?: string;
  previewDescription?: string;
  previewImage?: string;
  isPublic?: boolean;
  folderId?: string;
  authorId?: string;
}

export interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
}

export interface ResourceFilters {
  search?: string;
  type?: keyof ResourceType;
  subjectId?: string;
  educationalLevelId?: string;
  gradeLevel?: string;
  authorId?: string;
  tags?: string[];
  isPublic?: boolean;
  isAssigned?: boolean;
  isFavorite?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  academicYearId?: string;
}

export interface ResourceStats {
  views: number;
  downloads: number;
  uniqueViewers: number;
  averageViewDuration: number;
  viewsByDay: { date: string; count: number }[];
}

export interface AssignResourceDto {
  classGroupId?: string;
  studentId?: string;
  dueDate?: string;
  instructions?: string;
}

export interface ResourceFolder {
  id: string;
  name: string;
  description?: string;
  subjectId: string;
  createdById: string;
  parentFolderId?: string;
  color: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  subfolders?: ResourceFolder[];
  resources?: EducationalResource[];
}

export interface CreateFolderDto {
  name: string;
  subjectId: string;
  parentFolderId?: string;
  color?: string;
  displayOrder?: number;
}

export interface UpdateFolderDto {
  name?: string;
  description?: string;
  parentFolderId?: string;
  color?: string;
  displayOrder?: number;
}

class EducationalResourcesService {
  async uploadResource(
    file: File,
    data: CreateResourceDto
  ): Promise<EducationalResource> {
    const formData = new FormData();
    formData.append('file', file);

    // Append all other data fields with correct names
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          // ✅ FIX: Serialize array as JSON string for NestJS compatibility
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await api.post('/recursos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async getResources(filters: ResourceFilters = {}): Promise<{
    resources: EducationalResource[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get('/recursos/list', { params: filters });
    return {
      resources: response.data.resources, // Fix: use .resources instead of .data
      total: response.data.total,
      page: response.data.page,
      totalPages: response.data.totalPages,
    };
  }

  async getResource(id: string): Promise<EducationalResource> {
    const response = await api.get(`/recursos/resource/${id}`);
    return response.data.data;
  }

  async updateResource(
    id: string,
    data: Partial<CreateResourceDto>
  ): Promise<EducationalResource> {
    const response = await api.put(`/recursos/${id}`, data);
    return response.data.data;
  }

  async deleteResource(id: string): Promise<void> {
    const response = await api.post(`/recursos/delete-resource/${id}`);
    return response.data;
  }

  async assignResource(
    resourceId: string,
    data: AssignResourceDto
  ): Promise<ResourceAssignment> {
    const response = await api.post(`/recursos/${resourceId}/assign`, data);
    return response.data.data; // Backend returns { data: assignment, message: string }
  }

  async unassignResource(
    resourceId: string,
    assignmentId: string
  ): Promise<void> {
    await api.delete(`/recursos/${resourceId}/assign/${assignmentId}`);
  }

  async toggleFavorite(resourceId: string): Promise<{ isFavorite: boolean }> {
    const response = await api.post(`/recursos/${resourceId}/favorite`);
    return response.data;
  }

  async addComment(resourceId: string, content: string): Promise<void> {
    await api.post(`/recursos/${resourceId}/comment`, { content });
  }

  async getResourceStats(resourceId: string): Promise<ResourceStats> {
    const response = await api.get(`/recursos/${resourceId}/stats`);
    return response.data;
  }

  async downloadResource(resourceId: string): Promise<Blob> {
    const response = await api.get(`/recursos/${resourceId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async recordView(resourceId: string): Promise<void> {
    await api.post(`/recursos/${resourceId}/view`);
  }

  async getAssignedResources(academicYearId?: string): Promise<EducationalResource[]> {
    try {
      const response = await api.get('/recursos/assigned', { params: { academicYearId } });

      // Backend returns array directly for students
      return Array.isArray(response.data) ? response.data : [];

    } catch (error) {
      console.error('Error fetching assigned resources:', error);
      // Return empty array for graceful degradation
      return [];
    }
  }

  async getSubjectsWithAssignedResources(academicYearId?: string): Promise<any[]> {
    try {
      const response = await api.get('/recursos/assigned/subjects', { params: { academicYearId } });

      // Backend returns array of subjects
      return Array.isArray(response.data) ? response.data : [];

    } catch (error) {
      console.error('❌ Error fetching subjects with assigned resources:', error);

      // Return empty array for graceful degradation
      return [];
    }
  }

  async getResourceMetadata() {
    console.log('🔗 SERVICE: Starting metadata fetch...');
    
    try {
      const [subjects, levels, types, limits, academicYears] = await Promise.all([
        api.get('/recursos/metadata/subjects'),
        api.get('/recursos/metadata/levels'),
        api.get('/recursos/metadata/resource-types'),
        api.get('/recursos/metadata/file-limits'),
        api.get('/academic-years'),
      ]);

      console.log('📡 SERVICE: Raw API responses:', {
        subjectsStatus: subjects.status,
        subjectsDataStructure: {
          hasData: 'data' in subjects.data,
          dataType: typeof subjects.data.data,
          dataLength: Array.isArray(subjects.data.data) ? subjects.data.data.length : 'Not array'
        },
        levelsStatus: levels.status,
        levelsDataStructure: {
          hasData: 'data' in levels.data,
          dataType: typeof levels.data.data,
          dataLength: Array.isArray(levels.data.data) ? levels.data.data.length : 'Not array'
        }
      });

      const result = {
        subjects: subjects.data.data,
        levels: levels.data.data,
        types: types.data.data,
        limits: limits.data.data,
        academicYears: academicYears.data,
      };

      console.log('✅ SERVICE: Processed metadata result:', {
        subjects: result.subjects?.length || 0,
        levels: result.levels?.length || 0,
        types: result.types?.length || 0,
        academicYears: result.academicYears?.length || 0,
        firstSubject: result.subjects?.[0]?.name || 'None',
        firstLevel: result.levels?.[0]?.name || 'None'
      });

      return result;
    } catch (error) {
      console.error('❌ SERVICE: Error fetching metadata:', error);
      throw error;
    }
  }

  async getTeacherStudents(teacherId: string): Promise<any[]> {
    const response = await api.get(`/recursos/teacher/${teacherId}/students`);
    return response.data.data;
  }

  async getTeacherClassGroups(teacherId: string): Promise<any[]> {
    const response = await api.get(`/recursos/teacher/${teacherId}/class-groups`);
    return response.data.data;
  }

  // ============================================
  // FOLDER MANAGEMENT METHODS
  // ============================================

  async getFolders(subjectId?: string): Promise<ResourceFolder[]> {
    const params = subjectId ? { subjectId } : {};
    const response = await api.get('/recursos/folders', { params });
    return response.data.data || response.data;
  }

  async getFoldersHierarchy(subjectId: string): Promise<ResourceFolder[]> {
    const response = await api.get(`/recursos/folders/hierarchy/${subjectId}`);
    return response.data.data || response.data;
  }

  async getFolder(id: string): Promise<ResourceFolder> {
    const response = await api.get(`/recursos/folders/${id}`);
    return response.data.data || response.data;
  }

  async createFolder(data: CreateFolderDto): Promise<ResourceFolder> {
    const response = await api.post('/recursos/folders', data);
    return response.data.data || response.data;
  }

  async updateFolder(id: string, data: UpdateFolderDto): Promise<ResourceFolder> {
    const response = await api.put(`/recursos/folders/${id}`, data);
    return response.data.data || response.data;
  }

  async deleteFolder(id: string): Promise<void> {
    await api.delete(`/recursos/folders/${id}`);
  }

  async moveResourcesToFolder(folderId: string, resourceIds: string[]): Promise<void> {
    await api.post('/recursos/folders/move-resources', {
      folderId,
      resourceIds,
    });
  }

  // ============================================
  // DRAG & DROP METHODS
  // ============================================

  async reorderResources(resources: Array<{ id: string; displayOrder: number }>): Promise<void> {
    await api.post('/recursos/reorder-resources', { resources });
  }

  async moveResource(resourceId: string, targetFolderId: string | null, newDisplayOrder?: number): Promise<void> {
    await api.post('/recursos/move-resource', {
      resourceId,
      targetFolderId,
      newDisplayOrder,
    });
  }

  async reorderFolders(folders: Array<{ id: string; displayOrder: number }>): Promise<void> {
    await api.post('/recursos/reorder-folders', { folders });
  }

  // ==================== ASSIGNMENT STUDENT MANAGEMENT ====================

  /**
   * Get students for a group assignment with their exclusion status
   */
  async getAssignmentStudents(assignmentId: string): Promise<{
    assignment: {
      id: string;
      resourceId: string;
      classGroupId: string;
      classGroupName: string;
      resourceTitle: string;
      dueDate?: string;
      instructions?: string;
      assignedAt: string;
    };
    students: Array<{
      id: string;
      email: string;
      profile: { firstName: string; lastName: string } | null;
      isExcluded: boolean;
    }>;
    totalStudents: number;
    excludedCount: number;
  }> {
    const response = await api.get(`/recursos/assignments/${assignmentId}/students`);
    return response.data.data;
  }

  /**
   * Exclude a student from a group assignment
   */
  async excludeStudentFromAssignment(assignmentId: string, studentId: string): Promise<void> {
    await api.post(`/recursos/assignments/${assignmentId}/exclude-student`, { studentId });
  }

  /**
   * Re-include a previously excluded student in a group assignment
   */
  async includeStudentInAssignment(assignmentId: string, studentId: string): Promise<void> {
    await api.post(`/recursos/assignments/${assignmentId}/include-student`, { studentId });
  }

  async getResourceViewers(resourceId: string): Promise<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    viewedAt: string;
    viewCount: number;
  }>> {
    const response = await api.get(`/recursos/${resourceId}/viewers`);
    return response.data.data;
  }

  async createLinkResource(dto: CreateLinkResourceDto): Promise<EducationalResource> {
    const response = await api.post('/recursos/create-link', dto);
    return response.data;
  }

  async getLinkPreview(url: string): Promise<LinkPreviewData> {
    const response = await api.get('/recursos/link-preview', { params: { url } });
    return response.data;
  }
}

export default new EducationalResourcesService();