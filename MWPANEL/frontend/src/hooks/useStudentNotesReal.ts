import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import studentNotesApi from '../services/studentNotesApi';
import {
  StudentNote,
  CreateStudentNoteDto,
  UpdateStudentNoteDto,
  UploadNoteFileDto,
  NoteQueryDto,
  PaginatedNotesResult,
  NotesStatistics,
  NotesFilters,
} from '../types/student-notes';

// Keys para React Query
const QUERY_KEYS = {
  notes: ['student-notes'] as const,
  notesList: (filters: NoteQueryDto) => ['student-notes', 'list', filters] as const,
  note: (id: string) => ['student-notes', 'detail', id] as const,
  statistics: ['student-notes', 'statistics'] as const,
};

// Hook principal para gestionar notas
export const useStudentNotes = (filters: NoteQueryDto = {}) => {
  const queryClient = useQueryClient();

  // Query para obtener lista de notas
  const notesQuery = useQuery({
    queryKey: QUERY_KEYS.notesList(filters),
    queryFn: () => studentNotesApi.getMyNotes(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
    keepPreviousData: true,
  });

  // Query para obtener estadísticas
  const statisticsQuery = useQuery({
    queryKey: QUERY_KEYS.statistics,
    queryFn: () => studentNotesApi.getStatistics(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // Mutation para crear nota de texto
  const createNoteMutation = useMutation({
    mutationFn: (noteData: CreateStudentNoteDto) => studentNotesApi.createNote(noteData),
    onSuccess: (newNote) => {
      message.success('Apunte creado correctamente');
      
      // Actualizar lista de notas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes });
      
      // Actualizar estadísticas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statistics });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear el apunte');
    },
  });

  // Mutation para subir nota con archivo
  const uploadFileNoteMutation = useMutation({
    mutationFn: ({ file, data }: { file: File; data: UploadNoteFileDto }) =>
      studentNotesApi.uploadFileNote(file, data),
    onSuccess: (newNote) => {
      message.success('Archivo subido correctamente');
      
      // Actualizar lista de notas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes });
      
      // Actualizar estadísticas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statistics });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al subir el archivo');
    },
  });

  // Mutation para actualizar nota
  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentNoteDto }) =>
      studentNotesApi.updateNote(id, data),
    onSuccess: (updatedNote) => {
      message.success('Apunte actualizado correctamente');
      
      // Actualizar cache de la nota específica
      queryClient.setQueryData(QUERY_KEYS.note(updatedNote.id), updatedNote);
      
      // Actualizar lista de notas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar el apunte');
    },
  });

  // Mutation para eliminar nota
  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => studentNotesApi.deleteNote(id),
    onSuccess: (_, deletedId) => {
      message.success('Apunte eliminado correctamente');
      
      // Actualizar lista de notas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes });
      
      // Actualizar estadísticas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statistics });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al eliminar el apunte');
    },
  });

  // Mutation para marcar/desmarcar favorito
  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: string) => studentNotesApi.toggleFavorite(id),
    onSuccess: (updatedNote) => {
      message.success(updatedNote.isFavorite ? 'Marcado como favorito' : 'Eliminado de favoritos');
      
      // Actualizar cache de la nota específica
      queryClient.setQueryData(QUERY_KEYS.note(updatedNote.id), updatedNote);
      
      // Actualizar lista de notas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes });
      
      // Actualizar estadísticas si estamos filtrando por favoritos
      if (filters.favorites) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statistics });
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar favorito');
    },
  });

  // Función para crear nota (wrapper con opciones adicionales)
  const createNote = useCallback(
    (data: CreateStudentNoteDto, options?: { onSuccess?: (note: StudentNote) => void }) => {
      return createNoteMutation.mutateAsync(data, {
        onSuccess: options?.onSuccess,
      });
    },
    [createNoteMutation]
  );

  // Función para subir archivo
  const uploadFileNote = useCallback(
    (params: { file: File; data: UploadNoteFileDto }, options?: { onSuccess?: (note: StudentNote) => void }) => {
      return uploadFileNoteMutation.mutateAsync(params, {
        onSuccess: options?.onSuccess,
      });
    },
    [uploadFileNoteMutation]
  );

  // Función para actualizar nota
  const updateNote = useCallback(
    (id: string, data: UpdateStudentNoteDto, options?: { onSuccess?: (note: StudentNote) => void }) => {
      return updateNoteMutation.mutateAsync({ id, data }, {
        onSuccess: options?.onSuccess,
      });
    },
    [updateNoteMutation]
  );

  // Función para eliminar nota
  const deleteNote = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      return deleteNoteMutation.mutateAsync(id, {
        onSuccess: options?.onSuccess,
      });
    },
    [deleteNoteMutation]
  );

  // Función para toggle favorito
  const toggleFavorite = useCallback(
    (id: string, options?: { onSuccess?: (note: StudentNote) => void }) => {
      return toggleFavoriteMutation.mutateAsync(id, {
        onSuccess: options?.onSuccess,
      });
    },
    [toggleFavoriteMutation]
  );

  // Refetch functions
  const refetchNotes = useCallback(() => {
    return notesQuery.refetch();
  }, [notesQuery]);

  const refetchStatistics = useCallback(() => {
    return statisticsQuery.refetch();
  }, [statisticsQuery]);

  // Combined refetch function for compatibility
  const refetch = useCallback(() => {
    return Promise.all([
      notesQuery.refetch(),
      statisticsQuery.refetch()
    ]);
  }, [notesQuery, statisticsQuery]);

  return {
    // Datos
    notes: notesQuery.data?.data || [],
    totalNotes: notesQuery.data?.total || 0,
    currentPage: notesQuery.data?.page || 1,
    totalPages: notesQuery.data?.totalPages || 1,
    hasNextPage: notesQuery.data?.hasNext || false,
    hasPrevPage: notesQuery.data?.hasPrev || false,
    statistics: statisticsQuery.data,
    
    // Estados de carga
    isLoading: notesQuery.isLoading,
    isLoadingStatistics: statisticsQuery.isLoading,
    isCreating: createNoteMutation.isLoading,
    isUploading: uploadFileNoteMutation.isLoading,
    isUpdating: updateNoteMutation.isLoading,
    isDeleting: deleteNoteMutation.isLoading,
    
    // Estados de error
    error: notesQuery.error,
    statisticsError: statisticsQuery.error,
    
    // Funciones
    createNote,
    uploadFileNote,
    updateNote,
    deleteNote,
    toggleFavorite,
    refetch,
    refetchNotes,
    refetchStatistics,
  };
};

// Hook para obtener una nota específica
export const useStudentNote = (id: string) => {
  const queryClient = useQueryClient();

  const noteQuery = useQuery({
    queryKey: QUERY_KEYS.note(id),
    queryFn: () => studentNotesApi.getNoteById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    note: noteQuery.data,
    isLoading: noteQuery.isLoading,
    error: noteQuery.error,
    refetch: noteQuery.refetch,
  };
};

// Hook para búsqueda de notas
export const useSearchNotes = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useQuery({
    queryKey: ['student-notes', 'search', debouncedQuery],
    queryFn: () => studentNotesApi.searchNotes(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  return {
    searchQuery,
    setSearchQuery,
    searchResults: searchResults.data?.data || [],
    isSearching: searchResults.isLoading,
    searchError: searchResults.error,
  };
};

// Hook para validación de archivos
export const useFileValidation = () => {
  const validateFile = useCallback((file: File, noteType: string) => {
    return studentNotesApi.validateFile(file, noteType);
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    return studentNotesApi.formatFileSize(bytes);
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    return studentNotesApi.formatDuration(seconds);
  }, []);

  return {
    validateFile,
    formatFileSize,
    formatDuration,
  };
};

// Hook para filtros de notas
export const useNotesFilters = () => {
  const [filters, setFilters] = useState<NotesFilters>({
    search: '',
    type: 'all',
    subject: 'all',
    favorites: false,
    tags: [],
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    page: 1,
    limit: 12,
  });

  const updateFilter = useCallback(
    <K extends keyof NotesFilters>(key: K, value: NotesFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        // Reset página cuando cambian los filtros
        ...(key !== 'page' && { page: 1 }),
      }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      type: 'all',
      subject: 'all',
      favorites: false,
      tags: [],
      sortBy: 'createdAt',
      sortOrder: 'DESC',
      page: 1,
      limit: 12,
    });
  }, []);

  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.type) count++;
    if (filters.subjectId) count++;
    if (filters.favorites) count++;
    if (filters.startDate || filters.endDate) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  const getQueryFilters = useCallback(() => {
    // Convert filters to query format, removing undefined values
    const queryFilters: Record<string, any> = {};
    
    if (filters.search && filters.search.trim()) {
      queryFilters.search = filters.search.trim();
    }
    if (filters.type && filters.type !== 'all') {
      queryFilters.type = filters.type;
    }
    if (filters.subject && filters.subject !== 'all') {
      queryFilters.subjectId = filters.subject;
    }
    if (filters.favorites) {
      queryFilters.favorites = filters.favorites;
    }
    if (filters.sortBy) {
      queryFilters.sortBy = filters.sortBy;
    }
    if (filters.sortOrder) {
      queryFilters.sortOrder = filters.sortOrder;
    }
    if (filters.startDate) {
      queryFilters.startDate = filters.startDate;
    }
    if (filters.endDate) {
      queryFilters.endDate = filters.endDate;
    }
    if (filters.tags && filters.tags.length > 0) {
      queryFilters.tags = filters.tags;
    }
    
    return queryFilters;
  }, [filters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    getQueryFilters,
    activeFiltersCount: getActiveFiltersCount(),
  };
};

// Hook para vista de notas (grid/list, selección)
export const useNotesView = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

  const selectNote = useCallback((noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  }, []);

  const selectAllNotes = useCallback((noteIds: string[]) => {
    setSelectedNotes(noteIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNotes([]);
  }, []);

  const isNoteSelected = useCallback((noteId: string) => {
    return selectedNotes.includes(noteId);
  }, [selectedNotes]);

  return {
    viewMode,
    setViewMode,
    selectedNotes,
    selectNote,
    selectAllNotes,
    clearSelection,
    isNoteSelected,
  };
};

export default useStudentNotes;