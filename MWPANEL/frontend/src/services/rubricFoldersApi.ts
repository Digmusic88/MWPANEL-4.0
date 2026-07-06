/**
 * API Service para gestión de carpetas de rúbricas
 * Conecta con los endpoints del backend implementados
 */

import apiClient from './apiClient';

const API_BASE_URL = '/rubric-folders';

// Interfaces TypeScript para el sistema de carpetas
export interface RubricFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentFolderId?: string;
  teacherId: string;
  isShared: boolean;
  sharedWith?: string[];
  orderIndex: number;
  isSystemFolder: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  teacher?: {
    id: string;
    employeeNumber: string;
    specialties: string[];
  };
  subfolders?: RubricFolder[];
  rubrics?: any[]; // Se puede tipificar más específicamente cuando sea necesario
}

export interface CreateFolderDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentFolderId?: string;
  isShared?: boolean;
  sharedWith?: string[];
  orderIndex?: number;
}

export interface UpdateFolderDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentFolderId?: string;
  isShared?: boolean;
  sharedWith?: string[];
  orderIndex?: number;
}

export interface MoveRubricDto {
  rubricId: string;
  folderId?: string;
}

export interface BulkMoveRubricsDto {
  rubricIds: string[];
  folderId?: string;
}

export interface MoveFolderDto {
  folderId: string;
  targetFolderId?: string | null;
}

export interface FolderStatsDto {
  id: string;
  name: string;
  directRubrics: number;
  totalRubrics: number;
  subfolders: number;
  lastModified: string;
}

export interface FolderTreeDto {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isSystemFolder: boolean;
  orderIndex: number;
  rubricsCount: number;
  children: FolderTreeDto[];
}

// Nota: No necesitamos configurar headers de autenticación
// porque apiClient ya los maneja automáticamente

export class RubricFoldersApiService {
  
  // ==================== CRUD CARPETAS ====================
  
  /**
   * Obtener todas las carpetas del usuario
   */
  static async getFolders(includeShared = false): Promise<RubricFolder[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}?includeShared=${includeShared}`
      );
      return response.data;
    } catch (error: any) {
      console.error('❌ FOLDERS API: Error al obtener carpetas', error);
      
      // TEMPORARY FIX: If API fails (401, 404, etc), provide fallback data
      if (error.response?.status === 401) {
        console.warn('⚠️ FOLDERS API: Error 401 - proporcionando datos de fallback');
        return RubricFoldersApiService.getFallbackFolders();
      } else if (error.response?.status === 404) {
        console.warn('⚠️ FOLDERS API: Endpoint no encontrado - proporcionando datos de fallback');
        return RubricFoldersApiService.getFallbackFolders();
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Datos de fallback para cuando el API no esté disponible
   */
  static getFallbackFolders(): RubricFolder[] {
    console.log('📁 FOLDERS API: Usando datos de fallback');
    return [
      {
        id: 'fallback-folder-1',
        name: 'Mis Rúbricas',
        description: 'Carpeta principal para tus rúbricas',
        color: '#1890ff',
        icon: 'folder',
        teacherId: 'temp-teacher-id',
        isShared: false,
        orderIndex: 0,
        isSystemFolder: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubrics: []
      },
      {
        id: 'fallback-folder-2', 
        name: 'Plantillas',
        description: 'Rúbricas plantilla para reutilizar',
        color: '#52c41a',
        icon: 'star',
        teacherId: 'temp-teacher-id',
        isShared: false,
        orderIndex: 1,
        isSystemFolder: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubrics: []
      }
    ];
  }

  /**
   * Obtener árbol jerárquico de carpetas
   */
  static async getFolderTree(): Promise<FolderTreeDto[]> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/tree`);
      return response.data;
    } catch (error) {
      console.error('Error getting folder tree:', error);
      throw error;
    }
  }

  /**
   * Obtener carpeta específica por ID
   */
  static async getFolder(id: string): Promise<RubricFolder> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting folder:', error);
      throw error;
    }
  }

  /**
   * Crear nueva carpeta
   */
  static async createFolder(folderData: CreateFolderDto): Promise<RubricFolder> {
    try {
      const response = await apiClient.post(API_BASE_URL, folderData);
      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  /**
   * Actualizar carpeta existente
   */
  static async updateFolder(id: string, folderData: UpdateFolderDto): Promise<RubricFolder> {
    try {
      const response = await apiClient.patch(`${API_BASE_URL}/${id}`, folderData);
      return response.data;
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }

  /**
   * Eliminar carpeta
   */
  static async deleteFolder(id: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  // ==================== OPERACIONES CON RÚBRICAS ====================

  /**
   * Mover rúbrica a otra carpeta
   */
  static async moveRubric(moveData: MoveRubricDto): Promise<any> {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/move-rubric`, moveData);
      return response.data;
    } catch (error) {
      console.error('Error moving rubric:', error);
      throw error;
    }
  }

  /**
   * Mover múltiples rúbricas a otra carpeta
   */
  static async bulkMoveRubrics(moveData: BulkMoveRubricsDto): Promise<any[]> {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/bulk-move-rubrics`, moveData);
      return response.data;
    } catch (error) {
      console.error('Error bulk moving rubrics:', error);
      throw error;
    }
  }

  /**
   * Mover carpeta a otra carpeta
   */
  static async moveFolder(moveData: MoveFolderDto): Promise<any> {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/move-folder`, moveData);
      return response.data;
    } catch (error) {
      console.error('Error moving folder:', error);
      throw error;
    }
  }

  // ==================== ESTADÍSTICAS Y UTILIDADES ====================

  /**
   * Obtener estadísticas de una carpeta
   */
  static async getFolderStats(id: string): Promise<FolderStatsDto> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/${id}/stats`);
      return response.data;
    } catch (error: any) {
      console.error('❌ FOLDER STATS API: Error al obtener estadísticas', error);
      
      // TEMPORARY FIX: Return empty stats for fallback folders
      if (error.response?.status === 401 || error.response?.status === 404) {
        console.warn('⚠️ FOLDER STATS API: Proporcionando estadísticas de fallback');
        return {
          id,
          name: 'Carpeta',
          directRubrics: 0,
          totalRubrics: 0,
          subfolders: 0,
          lastModified: new Date().toISOString()
        };
      }
      
      throw error;
    }
  }

  // ==================== HELPERS Y UTILIDADES ====================

  /**
   * Colores predeterminados para carpetas
   */
  static readonly DEFAULT_COLORS = [
    '#4CAF50', // Verde
    '#2196F3', // Azul
    '#FF9800', // Naranja
    '#9C27B0', // Púrpura
    '#F44336', // Rojo
    '#795548', // Marrón
    '#607D8B', // Azul Gris
    '#E91E63', // Rosa
  ];

  /**
   * Iconos predeterminados para carpetas
   */
  static readonly DEFAULT_ICONS = [
    'folder',
    'folder-open',
    'file-text',
    'book',
    'tags',
    'star',
    'heart',
    'flag',
    'bookmark',
    'trophy',
    'calculator',
    'experiment',
    'build',
    'read',
    'edit'
  ];

  /**
   * Obtener color aleatorio para nueva carpeta
   */
  static getRandomColor(): string {
    const randomIndex = Math.floor(Math.random() * this.DEFAULT_COLORS.length);
    return this.DEFAULT_COLORS[randomIndex];
  }

  /**
   * Obtener icono aleatorio para nueva carpeta
   */
  static getRandomIcon(): string {
    const randomIndex = Math.floor(Math.random() * this.DEFAULT_ICONS.length);
    return this.DEFAULT_ICONS[randomIndex];
  }
}

export default RubricFoldersApiService;