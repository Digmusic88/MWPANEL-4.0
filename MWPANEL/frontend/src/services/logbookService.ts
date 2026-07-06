/**
 * Servicio API para el Sistema de Bitácora Docente
 * Comunicación con endpoints del backend NestJS
 */

import api from './apiClient';
import {
  LogbookTag,
  CreateLogbookTagDto,
  UpdateLogbookTagDto,
  LogbookEntry,
  CreateLogbookEntryDto,
  UpdateLogbookEntryDto,
  LogbookEntryQueryDto,
  LogbookEntriesPageDto,
  EntryStatsDto,
  TagUsageStatsDto,
  PopularColorDto,
} from '../types/logbook.types';

const LOGBOOK_BASE_URL = '/logbook';

/**
 * Servicio para gestión de etiquetas de bitácora
 */
export const logbookTagsService = {
  /**
   * Obtener todas las etiquetas del usuario actual
   */
  async getTags(): Promise<LogbookTag[]> {
    const response = await api.get(`${LOGBOOK_BASE_URL}/tags`);
    return response.data;
  },

  /**
   * Obtener etiqueta específica por ID
   */
  async getTag(id: string): Promise<LogbookTag> {
    const response = await api.get(`${LOGBOOK_BASE_URL}/tags/${id}`);
    return response.data;
  },

  /**
   * Crear nueva etiqueta
   */
  async createTag(data: CreateLogbookTagDto): Promise<LogbookTag> {
    const response = await api.post(`${LOGBOOK_BASE_URL}/tags`, data);
    return response.data;
  },

  /**
   * Actualizar etiqueta existente
   */
  async updateTag(id: string, data: UpdateLogbookTagDto): Promise<LogbookTag> {
    const response = await api.put(`${LOGBOOK_BASE_URL}/tags/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar etiqueta
   */
  async deleteTag(id: string): Promise<void> {
    await api.delete(`${LOGBOOK_BASE_URL}/tags/${id}`);
  },

  /**
   * Obtener estadísticas de uso de etiquetas
   */
  async getTagUsageStats(): Promise<TagUsageStatsDto[]> {
    const response = await api.get(`${LOGBOOK_BASE_URL}/tags/stats/usage`);
    return response.data;
  },

  /**
   * Obtener colores populares para etiquetas
   */
  async getPopularColors(): Promise<PopularColorDto[]> {
    const response = await api.get(`${LOGBOOK_BASE_URL}/tags/popular/colors`);
    return response.data;
  },
};

/**
 * Servicio para gestión de entradas de bitácora
 */
export const logbookEntriesService = {
  /**
   * Obtener entradas con filtros y paginación
   */
  async getEntries(filters: LogbookEntryQueryDto = {}): Promise<LogbookEntriesPageDto> {
    const params = new URLSearchParams();

    // Agregar parámetros de filtro si existen
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`${LOGBOOK_BASE_URL}/entries?${params.toString()}`);
    return response.data;
  },

  /**
   * Obtener entrada específica por ID
   */
  async getEntry(id: string): Promise<LogbookEntry> {
    const response = await api.get(`${LOGBOOK_BASE_URL}/entries/${id}`);
    return response.data;
  },

  /**
   * Crear nueva entrada
   */
  async createEntry(data: CreateLogbookEntryDto): Promise<LogbookEntry> {
    const response = await api.post(`${LOGBOOK_BASE_URL}/entries`, data);
    return response.data;
  },

  /**
   * Actualizar entrada existente
   */
  async updateEntry(id: string, data: UpdateLogbookEntryDto): Promise<LogbookEntry> {
    const response = await api.put(`${LOGBOOK_BASE_URL}/entries/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar entrada
   */
  async deleteEntry(id: string): Promise<void> {
    await api.delete(`${LOGBOOK_BASE_URL}/entries/${id}`);
  },

  /**
   * Alternar estado de fijado de una entrada
   */
  async togglePin(id: string): Promise<LogbookEntry> {
    const response = await api.patch(`${LOGBOOK_BASE_URL}/entries/${id}/pin`);
    return response.data;
  },

  /**
   * Buscar entradas por término de búsqueda
   */
  async searchEntries(searchTerm: string, limit = 10): Promise<LogbookEntry[]> {
    const params = new URLSearchParams({
      q: searchTerm,
      limit: String(limit),
    });

    const response = await api.get(`${LOGBOOK_BASE_URL}/entries/search?${params.toString()}`);
    return response.data;
  },

  /**
   * Obtener entradas de una semana específica
   */
  async getWeekEntries(weekStart: string): Promise<LogbookEntry[]> {
    const response = await api.get(`${LOGBOOK_BASE_URL}/entries/week/${weekStart}`);
    return response.data;
  },

  /**
   * Obtener entradas de un mes específico
   */
  async getMonthEntries(year: number, month: number): Promise<LogbookEntry[]> {
    const response = await api.get(`${LOGBOOK_BASE_URL}/entries/month/${year}/${month}`);
    return response.data;
  },

  /**
   * Obtener estadísticas de entradas del usuario
   */
  async getEntryStats(): Promise<EntryStatsDto> {
    const response = await api.get(`${LOGBOOK_BASE_URL}/entries/stats`);
    return response.data;
  },
};

/**
 * Servicio completo de bitácora (combinando tags y entries)
 */
export const logbookService = {
  tags: logbookTagsService,
  entries: logbookEntriesService,
};

export default logbookService;