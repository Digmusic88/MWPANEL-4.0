/**
 * Hook personalizado para gestión del estado de la Bitácora Docente
 * Utiliza React Query para cache y sincronización
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import logbookService from '../services/logbookService';
import {
  UseLogbook,
  UseLogbookState,
  LogbookTag,
  CreateLogbookTagDto,
  UpdateLogbookTagDto,
  LogbookEntry,
  CreateLogbookEntryDto,
  UpdateLogbookEntryDto,
  LogbookEntryQueryDto,
  EntryStatsDto,
  TagUsageStatsDto,
  PopularColorDto,
  CreateEntryWithSeriesResponse,
} from '../types/logbook.types';

// Query keys para React Query
const QUERY_KEYS = {
  tags: ['logbook', 'tags'] as const,
  entries: (filters: LogbookEntryQueryDto) => ['logbook', 'entries', filters] as const,
  entry: (id: string) => ['logbook', 'entry', id] as const,
  stats: ['logbook', 'stats'] as const,
  tagUsageStats: ['logbook', 'tagUsageStats'] as const,
  popularColors: ['logbook', 'popularColors'] as const,
  searchEntries: (query: string, limit: number) => ['logbook', 'search', query, limit] as const,
  weekEntries: (weekStart: string) => ['logbook', 'week', weekStart] as const,
  monthEntries: (year: number, month: number) => ['logbook', 'month', year, month] as const,
};

/**
 * Hook principal para gestión de bitácora docente
 */
export const useLogbook = (): UseLogbook => {
  const queryClient = useQueryClient();

  // Estado local para UI - SIEMPRE más reciente primero
  const [currentFilters, setCurrentFilters] = useState<LogbookEntryQueryDto>({
    page: 1,
    limit: 20,
    sortBy: 'dateLocal',
    sortOrder: 'DESC', // CRÍTICO: Más reciente primero
  });
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [isEditingEntry, setIsEditingEntry] = useState(false);

  // Queries para tags
  const {
    data: tags = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useQuery({
    queryKey: QUERY_KEYS.tags,
    queryFn: logbookService.tags.getTags,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Queries para entries
  const {
    data: entriesData,
    isLoading: entriesLoading,
    error: entriesError,
  } = useQuery({
    queryKey: QUERY_KEYS.entries(currentFilters),
    queryFn: () => {
      // CRÍTICO: SIEMPRE forzar DESC para mostrar más reciente primero
      const filtersWithCorrectOrder = {
        ...currentFilters,
        sortBy: currentFilters.sortBy || 'dateLocal',
        sortOrder: 'DESC' as 'DESC', // FORZADO: Más reciente primero SIEMPRE
      };
      console.log('🟢 Frontend enviando filtros (MÁS RECIENTE PRIMERO):', filtersWithCorrectOrder);
      return logbookService.entries.getEntries(filtersWithCorrectOrder);
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 1, // Reduce retries
  });

  // Queries para estadísticas
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: logbookService.entries.getEntryStats,
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: 1, // Reduce retries
  });

  // Mutations para tags
  const createTagMutation = useMutation({
    mutationFn: (data: CreateLogbookTagDto) => logbookService.tags.createTag(data),
    onSuccess: (newTag) => {
      queryClient.setQueryData(QUERY_KEYS.tags, (oldTags: LogbookTag[] = []) => [
        ...oldTags,
        newTag,
      ]);
      message.success('Etiqueta creada exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al crear etiqueta: ${error.response?.data?.message || error.message}`);
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLogbookTagDto }) =>
      logbookService.tags.updateTag(id, data),
    onSuccess: (updatedTag) => {
      queryClient.setQueryData(QUERY_KEYS.tags, (oldTags: LogbookTag[] = []) =>
        oldTags.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag))
      );
      message.success('Etiqueta actualizada exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al actualizar etiqueta: ${error.response?.data?.message || error.message}`);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => logbookService.tags.deleteTag(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(QUERY_KEYS.tags, (oldTags: LogbookTag[] = []) =>
        oldTags.filter((tag) => tag.id !== deletedId)
      );
      message.success('Etiqueta eliminada exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al eliminar etiqueta: ${error.response?.data?.message || error.message}`);
    },
  });

  // Mutations para entries
  const createEntryMutation = useMutation({
    mutationFn: (data: CreateLogbookEntryDto) => logbookService.entries.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['logbook', 'entries'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['logbook', 'stats'],
        exact: false
      });
      message.success('Entrada creada exitosamente');
      setIsCreatingEntry(false);
    },
    onError: (error: any) => {
      message.error(`Error al crear entrada: ${error.response?.data?.message || error.message}`);
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLogbookEntryDto }) =>
      logbookService.entries.updateEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['logbook', 'entries'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['logbook', 'stats'],
        exact: false
      });
      message.success('Entrada actualizada exitosamente');
      setIsEditingEntry(false);
    },
    onError: (error: any) => {
      message.error(`Error al actualizar entrada: ${error.response?.data?.message || error.message}`);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => logbookService.entries.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['logbook', 'entries'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['logbook', 'stats'],
        exact: false
      });
      message.success('Entrada eliminada exitosamente');
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      message.error(`Error al eliminar entrada: ${error.response?.data?.message || error.message}`);
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (id: string) => logbookService.entries.togglePin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['logbook', 'entries'],
        exact: false
      });
      message.success('Estado de fijado actualizado');
    },
    onError: (error: any) => {
      message.error(`Error al fijar/desfijar entrada: ${error.response?.data?.message || error.message}`);
    },
  });

  // Funciones auxiliares
  const loadTags = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
  }, [queryClient]);

  const loadEntries = useCallback(
    async (filters: LogbookEntryQueryDto = {}) => {
      if (Object.keys(filters).length > 0) {
        // FORZAR DESC siempre al cargar entradas
        const newFilters = {
          ...currentFilters,
          ...filters,
          sortBy: 'dateLocal',
          sortOrder: 'DESC' as 'DESC' // CRÍTICO: Forzar DESC
        };
        setCurrentFilters(newFilters);
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.entries(newFilters) });
      } else {
        // También forzar DESC cuando no hay filtros específicos
        const forcedFilters = {
          ...currentFilters,
          sortBy: 'dateLocal',
          sortOrder: 'DESC' as 'DESC' // CRÍTICO: Forzar DESC
        };
        setCurrentFilters(forcedFilters);
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.entries(forcedFilters) });
      }
    },
    [queryClient] // Removed currentFilters from dependencies to prevent infinite loop
  );

  const loadStats = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
  }, [queryClient]);

  const searchEntries = useCallback(
    async (query: string, limit = 10): Promise<LogbookEntry[]> => {
      const result = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.searchEntries(query, limit),
        queryFn: () => logbookService.entries.searchEntries(query, limit),
        staleTime: 30 * 1000, // 30 segundos para búsqueda
      });
      return result;
    },
    [queryClient]
  );

  const getWeekEntries = useCallback(
    async (weekStart: string): Promise<LogbookEntry[]> => {
      const result = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.weekEntries(weekStart),
        queryFn: () => logbookService.entries.getWeekEntries(weekStart),
        staleTime: 5 * 60 * 1000, // 5 minutos
      });
      return result;
    },
    [queryClient]
  );

  const getMonthEntries = useCallback(
    async (year: number, month: number): Promise<LogbookEntry[]> => {
      const result = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.monthEntries(year, month),
        queryFn: () => logbookService.entries.getMonthEntries(year, month),
        staleTime: 5 * 60 * 1000, // 5 minutos
      });
      return result;
    },
    [queryClient]
  );

  const getTagUsageStats = useCallback(async (): Promise<TagUsageStatsDto[]> => {
    const result = await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.tagUsageStats,
      queryFn: logbookService.tags.getTagUsageStats,
      staleTime: 10 * 60 * 1000, // 10 minutos
    });
    return result;
  }, [queryClient]);

  const getPopularColors = useCallback(async (): Promise<PopularColorDto[]> => {
    const result = await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.popularColors,
      queryFn: logbookService.tags.getPopularColors,
      staleTime: 30 * 60 * 1000, // 30 minutos
    });
    return result;
  }, [queryClient]);

  // Estado combinado
  const state: UseLogbookState = {
    // Tags
    tags,
    tagsLoading,
    tagsError: tagsError?.message || null,

    // Entries
    entries: entriesData?.entries || [],
    entriesTotal: entriesData?.total || 0,
    entriesPage: entriesData?.page || 1,
    entriesLimit: entriesData?.limit || 20,
    entriesTotalPages: entriesData?.totalPages || 0,
    entriesLoading,
    entriesError: entriesError?.message || null,

    // Statistics
    stats: stats || null,
    statsLoading,
    statsError: statsError?.message || null,

    // Current filters
    currentFilters,

    // UI State
    selectedEntry,
    isCreatingEntry,
    isEditingEntry,
  };

  // Acciones combinadas
  const actions = {
    // Tags actions
    loadTags,
    createTag: (data: CreateLogbookTagDto) => createTagMutation.mutateAsync(data),
    updateTag: (id: string, data: UpdateLogbookTagDto) =>
      updateTagMutation.mutateAsync({ id, data }),
    deleteTag: (id: string) => deleteTagMutation.mutateAsync(id),

    // Entries actions
    loadEntries,
    createEntry: (data: CreateLogbookEntryDto) => createEntryMutation.mutateAsync(data),
    updateEntry: (id: string, data: UpdateLogbookEntryDto) =>
      updateEntryMutation.mutateAsync({ id, data }),
    deleteEntry: (id: string) => deleteEntryMutation.mutateAsync(id),
    togglePin: (id: string) => togglePinMutation.mutateAsync(id),

    // Search and filters
    searchEntries,
    getWeekEntries,
    getMonthEntries,

    // Statistics
    loadStats,
    getTagUsageStats,
    getPopularColors,

    // UI actions
    setCurrentFilters: (filters: LogbookEntryQueryDto) => {
      // INTERCEPTAR setCurrentFilters para forzar DESC siempre
      const forcedFilters = {
        ...filters,
        sortBy: filters.sortBy || 'dateLocal',
        sortOrder: 'DESC' as 'DESC' // CRÍTICO: Siempre DESC
      };
      console.log('🔴 FORZANDO DESC en setCurrentFilters:', forcedFilters);
      setCurrentFilters(forcedFilters);
    },
    setSelectedEntry,
    setIsCreatingEntry,
    setIsEditingEntry,
  };

  return { ...state, ...actions };
};

export default useLogbook;