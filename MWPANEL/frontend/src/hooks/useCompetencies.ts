/**
 * @archivo: useCompetencies.ts
 * @módulo: Hooks (Sistema de Competencias)
 * @función: Hooks personalizados para gestión del sistema competencial
 * @crítico: SÍ - Abstracción de lógica del sistema de competencias
 * @dependencias: React Query, competenciesService
 * @relacionado_con: Evaluación formativa, DUA, situaciones de aprendizaje
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  competenciesService,
  ExitProfile,
  SpecificCompetency,
  EvaluationCriterion,
  BasicKnowledge,
  CompetencyFilters,
  CompetencyStats
} from '../services/competenciesService';

// Query Keys
export const competencyKeys = {
  all: ['competencies'] as const,
  exitProfiles: (stage?: string) => [...competencyKeys.all, 'exit-profiles', stage] as const,
  exitProfile: (id: string) => [...competencyKeys.all, 'exit-profile', id] as const,
  operativeDescriptors: (exitProfileId: string, cycle?: string) => 
    [...competencyKeys.exitProfile(exitProfileId), 'descriptors', cycle] as const,
  specificCompetencies: (filters?: CompetencyFilters) => 
    [...competencyKeys.all, 'specific-competencies', filters] as const,
  specificCompetency: (id: string) => [...competencyKeys.all, 'specific-competency', id] as const,
  evaluationCriteria: (competencyId: string) => 
    [...competencyKeys.specificCompetency(competencyId), 'criteria'] as const,
  basicKnowledge: (competencyId: string) => 
    [...competencyKeys.specificCompetency(competencyId), 'knowledge'] as const,
  stats: (filters?: any) => [...competencyKeys.all, 'stats', filters] as const,
  templates: (stage: string) => [...competencyKeys.all, 'templates', stage] as const,
};

// ========== COMPETENCIAS CLAVE ==========

/**
 * Hook para obtener las 8 competencias clave
 */
export const useKeyCompetencies = () => {
  return useQuery({
    queryKey: competencyKeys.all,
    queryFn: () => competenciesService.getKeyCompetencies(),
    staleTime: 30 * 60 * 1000, // 30 minutos (son datos estáticos)
    gcTime: 60 * 60 * 1000, // 60 minutos
  });
};

// ========== PERFIL DE SALIDA ==========

/**
 * Hook para obtener perfiles de salida
 */
export const useExitProfiles = (stage?: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA') => {
  return useQuery({
    queryKey: competencyKeys.exitProfiles(stage),
    queryFn: () => competenciesService.getExitProfiles(stage),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
};

/**
 * Hook para obtener un perfil de salida específico
 */
export const useExitProfile = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: competencyKeys.exitProfile(id),
    queryFn: () => competenciesService.getExitProfile(id),
    enabled: enabled && !!id,
    staleTime: 15 * 60 * 1000, // 15 minutos
  });
};

/**
 * Hook para obtener descriptores operativos
 */
export const useOperativeDescriptors = (
  exitProfileId: string, 
  cycle?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: competencyKeys.operativeDescriptors(exitProfileId, cycle),
    queryFn: () => competenciesService.getOperativeDescriptors(exitProfileId, cycle),
    enabled: enabled && !!exitProfileId,
    staleTime: 15 * 60 * 1000,
  });
};

/**
 * Hook para obtener descriptores operativos por competencia y etapa
 */
export const useOperativeDescriptorsByCompetencyAndStage = (
  competencyId: string,
  stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA',
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['competencies', 'descriptors', competencyId, stage],
    queryFn: () => competenciesService.getOperativeDescriptorsByCompetencyAndStage(competencyId, stage),
    enabled: enabled && !!competencyId && !!stage,
    staleTime: 15 * 60 * 1000,
  });
};

// ========== COMPETENCIAS ESPECÍFICAS ==========

/**
 * Hook para obtener competencias específicas con filtros
 */
export const useSpecificCompetencies = (filters: CompetencyFilters = {}) => {
  return useQuery({
    queryKey: competencyKeys.specificCompetencies(filters),
    queryFn: () => competenciesService.getSpecificCompetencies(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook para obtener una competencia específica
 */
export const useSpecificCompetency = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: competencyKeys.specificCompetency(id),
    queryFn: () => competenciesService.getSpecificCompetency(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para crear competencia específica
 */
export const useCreateSpecificCompetency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: competenciesService.createSpecificCompetency,
    onSuccess: (newCompetency) => {
      // Invalidar cache de competencias específicas
      queryClient.invalidateQueries({ queryKey: competencyKeys.specificCompetencies() });
      queryClient.invalidateQueries({ queryKey: competencyKeys.stats() });
      
      // Actualizar cache individual
      queryClient.setQueryData(
        competencyKeys.specificCompetency(newCompetency.id),
        newCompetency
      );

      message.success('Competencia específica creada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al crear la competencia específica');
    },
  });
};

/**
 * Hook para actualizar competencia específica
 */
export const useUpdateSpecificCompetency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      competenciesService.updateSpecificCompetency(id, data),
    onSuccess: (updatedCompetency, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        competencyKeys.specificCompetency(variables.id),
        updatedCompetency
      );

      // Invalidar listas relacionadas
      queryClient.invalidateQueries({ queryKey: competencyKeys.specificCompetencies() });

      message.success('Competencia específica actualizada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al actualizar la competencia específica');
    },
  });
};

/**
 * Hook para eliminar competencia específica
 */
export const useDeleteSpecificCompetency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: competenciesService.deleteSpecificCompetency,
    onSuccess: (_, deletedId) => {
      // Remover del cache individual
      queryClient.removeQueries({ queryKey: competencyKeys.specificCompetency(deletedId) });

      // Invalidar listas relacionadas
      queryClient.invalidateQueries({ queryKey: competencyKeys.specificCompetencies() });
      queryClient.invalidateQueries({ queryKey: competencyKeys.stats() });

      message.success('Competencia específica eliminada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al eliminar la competencia específica');
    },
  });
};

// ========== CRITERIOS DE EVALUACIÓN ==========

/**
 * Hook para obtener criterios de evaluación
 */
export const useEvaluationCriteria = (specificCompetencyId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: competencyKeys.evaluationCriteria(specificCompetencyId),
    queryFn: () => competenciesService.getEvaluationCriteria(specificCompetencyId),
    enabled: enabled && !!specificCompetencyId,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para crear criterio de evaluación
 */
export const useCreateEvaluationCriterion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ specificCompetencyId, data }: { 
      specificCompetencyId: string; 
      data: { description: string; code: string; weight: number; }
    }) => competenciesService.createEvaluationCriterion(specificCompetencyId, data),
    onSuccess: (_, variables) => {
      // Invalidar criterios de la competencia específica
      queryClient.invalidateQueries({ 
        queryKey: competencyKeys.evaluationCriteria(variables.specificCompetencyId) 
      });
      
      // Invalidar la competencia específica (puede incluir los criterios)
      queryClient.invalidateQueries({ 
        queryKey: competencyKeys.specificCompetency(variables.specificCompetencyId) 
      });

      message.success('Criterio de evaluación creado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al crear el criterio de evaluación');
    },
  });
};

/**
 * Hook para actualizar criterio de evaluación
 */
export const useUpdateEvaluationCriterion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      competenciesService.updateEvaluationCriterion(id, data),
    onSuccess: () => {
      // Invalidar todas las listas de criterios (no sabemos a qué competencia pertenece)
      queryClient.invalidateQueries({ 
        queryKey: [...competencyKeys.all, 'specific-competency'], 
        predicate: (query) => query.queryKey.includes('criteria')
      });

      message.success('Criterio de evaluación actualizado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al actualizar el criterio de evaluación');
    },
  });
};

/**
 * Hook para eliminar criterio de evaluación
 */
export const useDeleteEvaluationCriterion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: competenciesService.deleteEvaluationCriterion,
    onSuccess: () => {
      // Invalidar todas las listas de criterios
      queryClient.invalidateQueries({ 
        queryKey: [...competencyKeys.all, 'specific-competency'], 
        predicate: (query) => query.queryKey.includes('criteria')
      });

      message.success('Criterio de evaluación eliminado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al eliminar el criterio de evaluación');
    },
  });
};

// ========== SABERES BÁSICOS ==========

/**
 * Hook para obtener saberes básicos
 */
export const useBasicKnowledge = (specificCompetencyId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: competencyKeys.basicKnowledge(specificCompetencyId),
    queryFn: () => competenciesService.getBasicKnowledge(specificCompetencyId),
    enabled: enabled && !!specificCompetencyId,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para crear saber básico
 */
export const useCreateBasicKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ specificCompetencyId, data }: { 
      specificCompetencyId: string; 
      data: { description: string; code: string; category: string; }
    }) => competenciesService.createBasicKnowledge(specificCompetencyId, data),
    onSuccess: (_, variables) => {
      // Invalidar saberes de la competencia específica
      queryClient.invalidateQueries({ 
        queryKey: competencyKeys.basicKnowledge(variables.specificCompetencyId) 
      });
      
      // Invalidar la competencia específica
      queryClient.invalidateQueries({ 
        queryKey: competencyKeys.specificCompetency(variables.specificCompetencyId) 
      });

      message.success('Saber básico creado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al crear el saber básico');
    },
  });
};

/**
 * Hook para actualizar saber básico
 */
export const useUpdateBasicKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      competenciesService.updateBasicKnowledge(id, data),
    onSuccess: () => {
      // Invalidar todas las listas de saberes básicos
      queryClient.invalidateQueries({ 
        queryKey: [...competencyKeys.all, 'specific-competency'], 
        predicate: (query) => query.queryKey.includes('knowledge')
      });

      message.success('Saber básico actualizado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al actualizar el saber básico');
    },
  });
};

/**
 * Hook para eliminar saber básico
 */
export const useDeleteBasicKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: competenciesService.deleteBasicKnowledge,
    onSuccess: () => {
      // Invalidar todas las listas de saberes básicos
      queryClient.invalidateQueries({ 
        queryKey: [...competencyKeys.all, 'specific-competency'], 
        predicate: (query) => query.queryKey.includes('knowledge')
      });

      message.success('Saber básico eliminado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al eliminar el saber básico');
    },
  });
};

// ========== ESTADÍSTICAS Y ANALYTICS ==========

/**
 * Hook para obtener estadísticas del sistema de competencias
 */
export const useCompetencyStats = (filters?: any) => {
  return useQuery({
    queryKey: competencyKeys.stats(filters),
    queryFn: () => competenciesService.getCompetencyStats(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para obtener plantillas de competencias
 */
export const useCompetencyTemplates = (stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA') => {
  return useQuery({
    queryKey: competencyKeys.templates(stage),
    queryFn: () => competenciesService.getCompetencyTemplates(stage),
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
};

// ========== VALIDACIONES ==========

/**
 * Hook para validar código de competencia
 */
export const useValidateCompetencyCode = () => {
  return useMutation({
    mutationFn: ({ code, excludeId }: { code: string; excludeId?: string }) =>
      competenciesService.validateCompetencyCode(code, excludeId),
  });
};

// ========== IMPORTACIÓN Y EXPORTACIÓN ==========

/**
 * Hook para exportar competencias
 */
export const useExportCompetencies = () => {
  return useMutation({
    mutationFn: (filters: CompetencyFilters) => competenciesService.exportCompetencies(filters),
    onSuccess: (blob) => {
      // Crear y descargar archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `competencias_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Competencias exportadas exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al exportar las competencias');
    },
  });
};

/**
 * Hook para importar competencias
 */
export const useImportCompetencies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: competenciesService.importCompetencies,
    onSuccess: (result) => {
      // Invalidar todas las queries de competencias
      queryClient.invalidateQueries({ queryKey: competencyKeys.all });

      if (result.success) {
        message.success(`${result.imported} competencias importadas exitosamente`);
        
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => message.warning(warning));
        }
      } else {
        message.error('La importación falló');
        result.errors.forEach(error => message.error(error));
      }
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al importar las competencias');
    },
  });
};

// ========== HOOK COMBINADO PRINCIPAL ==========

/**
 * Hook principal que combina las funcionalidades más comunes del sistema de competencias
 */
export const useCompetenciesSystem = (filters: CompetencyFilters = {}) => {
  const exitProfiles = useExitProfiles();
  const specificCompetencies = useSpecificCompetencies(filters);
  const stats = useCompetencyStats();
  
  const createCompetency = useCreateSpecificCompetency();
  const updateCompetency = useUpdateSpecificCompetency();
  const deleteCompetency = useDeleteSpecificCompetency();

  return {
    // Datos
    exitProfiles: exitProfiles.data || [],
    specificCompetencies: specificCompetencies.data?.data || [],
    competenciesTotal: specificCompetencies.data?.total || 0,
    stats: stats.data,
    
    // Estados de carga
    isLoading: exitProfiles.isLoading || specificCompetencies.isLoading || stats.isLoading,
    isError: exitProfiles.isError || specificCompetencies.isError || stats.isError,
    
    // Mutaciones
    createCompetency: createCompetency.mutate,
    updateCompetency: updateCompetency.mutate,
    deleteCompetency: deleteCompetency.mutate,
    
    // Estados de mutaciones
    isCreating: createCompetency.isPending,
    isUpdating: updateCompetency.isPending,
    isDeleting: deleteCompetency.isPending,
    
    // Refetch functions
    refetchCompetencies: specificCompetencies.refetch,
    refetchStats: stats.refetch,
  };
};