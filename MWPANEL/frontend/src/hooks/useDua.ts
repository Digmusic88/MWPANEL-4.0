/**
 * @archivo: useDua.ts
 * @módulo: Hooks (DUA - Diseño Universal para el Aprendizaje)
 * @función: Hooks personalizados para gestión del sistema DUA
 * @crítico: SÍ - Abstracción de lógica del sistema de accesibilidad
 * @dependencias: React Query, duaService
 * @relacionado_con: Evaluación formativa, competencias, situaciones de aprendizaje
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  duaService,
  DuaProfile,
  DuaAccommodation,
  CreateDuaProfileData,
  UpdateDuaProfileData,
  CreateAccommodationData,
  DuaFilters,
  AccommodationFilters,
  DuaRecommendation,
  DuaImpactAnalysis,
  EducationalNeedType,
  SupportLevel,
  AccommodationCategory,
  AccommodationType,
  AccommodationStatus
} from '../services/duaService';

// Query Keys
export const duaKeys = {
  all: ['dua'] as const,
  profiles: (filters?: DuaFilters) => [...duaKeys.all, 'profiles', filters] as const,
  profile: (id: string) => [...duaKeys.all, 'profile', id] as const,
  studentProfile: (studentId: string) => [...duaKeys.all, 'student-profile', studentId] as const,
  accommodations: (filters?: AccommodationFilters) => [...duaKeys.all, 'accommodations', filters] as const,
  accommodation: (id: string) => [...duaKeys.all, 'accommodation', id] as const,
  recommendations: (profileId: string) => [...duaKeys.profile(profileId), 'recommendations'] as const,
  studentRecommendations: (studentId: string) => [...duaKeys.studentProfile(studentId), 'recommendations'] as const,
  impact: (studentId: string, filters?: any) => [...duaKeys.studentProfile(studentId), 'impact', filters] as const,
  effectiveness: (filters?: any) => [...duaKeys.all, 'effectiveness', filters] as const,
  dashboards: {
    overview: (filters?: any) => [...duaKeys.all, 'dashboard', 'overview', filters] as const,
    teacher: (filters?: any) => [...duaKeys.all, 'dashboard', 'teacher', filters] as const,
  },
  learningSituationPlan: (situationId: string, studentId?: string) => 
    [...duaKeys.all, 'learning-situation-plan', situationId, studentId] as const,
  search: (query: string, filters?: any) => [...duaKeys.all, 'search', query, filters] as const,
};

// ========== PERFILES DUA ==========

/**
 * Hook para obtener perfiles DUA con filtros
 */
export const useDuaProfiles = (filters: DuaFilters = {}) => {
  return useQuery({
    queryKey: duaKeys.profiles(filters),
    queryFn: () => duaService.getProfiles(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook para obtener un perfil DUA específico
 */
export const useDuaProfile = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: duaKeys.profile(id),
    queryFn: () => duaService.getProfile(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para obtener el perfil DUA de un estudiante
 */
export const useStudentDuaProfile = (studentId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: duaKeys.studentProfile(studentId),
    queryFn: () => duaService.getStudentProfile(studentId),
    enabled: enabled && !!studentId,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para crear perfil DUA
 */
export const useCreateDuaProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duaService.createProfile,
    onSuccess: (newProfile) => {
      // Invalidar lista de perfiles
      queryClient.invalidateQueries({ queryKey: duaKeys.profiles() });
      
      // Actualizar cache del perfil del estudiante
      queryClient.setQueryData(
        duaKeys.studentProfile(newProfile.studentId),
        newProfile
      );

      // Actualizar cache individual del perfil
      queryClient.setQueryData(
        duaKeys.profile(newProfile.id),
        newProfile
      );

      // Invalidar dashboards
      queryClient.invalidateQueries({ queryKey: duaKeys.dashboards.overview() });
      queryClient.invalidateQueries({ queryKey: duaKeys.dashboards.teacher() });

      message.success('Perfil DUA creado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al crear el perfil DUA');
    },
  });
};

/**
 * Hook para actualizar perfil DUA
 */
export const useUpdateDuaProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDuaProfileData }) =>
      duaService.updateProfile(id, data),
    onSuccess: (updatedProfile, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.profile(variables.id),
        updatedProfile
      );

      // Actualizar cache del perfil del estudiante
      queryClient.setQueryData(
        duaKeys.studentProfile(updatedProfile.studentId),
        updatedProfile
      );

      // Invalidar listas relacionadas
      queryClient.invalidateQueries({ queryKey: duaKeys.profiles() });

      message.success('Perfil DUA actualizado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al actualizar el perfil DUA');
    },
  });
};

/**
 * Hook para eliminar perfil DUA
 */
export const useDeleteDuaProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duaService.deleteProfile,
    onSuccess: (_, deletedId) => {
      // Remover del cache individual
      queryClient.removeQueries({ queryKey: duaKeys.profile(deletedId) });

      // Invalidar listas relacionadas
      queryClient.invalidateQueries({ queryKey: duaKeys.profiles() });
      queryClient.invalidateQueries({ queryKey: duaKeys.dashboards.overview() });

      message.success('Perfil DUA eliminado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al eliminar el perfil DUA');
    },
  });
};

/**
 * Hook para activar/desactivar perfil DUA
 */
export const useToggleDuaProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      duaService.toggleProfileStatus(id, isActive),
    onSuccess: (updatedProfile, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.profile(variables.id),
        updatedProfile
      );

      // Actualizar cache del perfil del estudiante
      queryClient.setQueryData(
        duaKeys.studentProfile(updatedProfile.studentId),
        updatedProfile
      );

      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: duaKeys.profiles() });

      message.success(`Perfil DUA ${variables.isActive ? 'activado' : 'desactivado'} exitosamente`);
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al cambiar el estado del perfil DUA');
    },
  });
};

// ========== ACOMODACIONES ==========

/**
 * Hook para obtener acomodaciones con filtros
 */
export const useDuaAccommodations = (filters: AccommodationFilters = {}) => {
  return useQuery({
    queryKey: duaKeys.accommodations(filters),
    queryFn: () => duaService.getAccommodations(filters),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook para obtener una acomodación específica
 */
export const useDuaAccommodation = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: duaKeys.accommodation(id),
    queryFn: () => duaService.getAccommodation(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para crear acomodación
 */
export const useCreateDuaAccommodation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duaService.createAccommodation,
    onSuccess: (newAccommodation) => {
      // Invalidar lista de acomodaciones
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });
      
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(newAccommodation.id),
        newAccommodation
      );

      // Invalidar dashboards
      queryClient.invalidateQueries({ queryKey: duaKeys.dashboards.teacher() });

      message.success('Acomodación DUA creada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al crear la acomodación DUA');
    },
  });
};

/**
 * Hook para actualizar acomodación
 */
export const useUpdateDuaAccommodation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAccommodationData> }) =>
      duaService.updateAccommodation(id, data),
    onSuccess: (updatedAccommodation, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(variables.id),
        updatedAccommodation
      );

      // Invalidar listas relacionadas
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });

      message.success('Acomodación DUA actualizada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al actualizar la acomodación DUA');
    },
  });
};

/**
 * Hook para eliminar acomodación
 */
export const useDeleteDuaAccommodation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duaService.deleteAccommodation,
    onSuccess: (_, deletedId) => {
      // Remover del cache individual
      queryClient.removeQueries({ queryKey: duaKeys.accommodation(deletedId) });

      // Invalidar listas relacionadas
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });
      queryClient.invalidateQueries({ queryKey: duaKeys.dashboards.teacher() });

      message.success('Acomodación DUA eliminada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al eliminar la acomodación DUA');
    },
  });
};

// ========== WORKFLOW DE ACOMODACIONES ==========

/**
 * Hook para aprobar acomodación
 */
export const useApproveAccommodation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      duaService.approveAccommodation(id, notes),
    onSuccess: (updatedAccommodation, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(variables.id),
        updatedAccommodation
      );

      // Invalidar listas y dashboards
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });
      queryClient.invalidateQueries({ queryKey: duaKeys.dashboards.teacher() });

      message.success('Acomodación aprobada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al aprobar la acomodación');
    },
  });
};

/**
 * Hook para implementar acomodación
 */
export const useImplementAccommodation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, implementationNotes }: { id: string; implementationNotes?: string }) =>
      duaService.implementAccommodation(id, implementationNotes),
    onSuccess: (updatedAccommodation, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(variables.id),
        updatedAccommodation
      );

      // Invalidar listas y dashboards
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });
      queryClient.invalidateQueries({ queryKey: duaKeys.dashboards.teacher() });

      message.success('Acomodación implementada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al implementar la acomodación');
    },
  });
};

/**
 * Hook para descontinuar acomodación
 */
export const useDiscontinueAccommodation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      duaService.discontinueAccommodation(id, reason),
    onSuccess: (updatedAccommodation, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(variables.id),
        updatedAccommodation
      );

      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });

      message.success('Acomodación descontinuada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al descontinuar la acomodación');
    },
  });
};

/**
 * Hook para revisar efectividad de acomodación
 */
export const useReviewAccommodationEffectiveness = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { 
      id: string; 
      data: {
        isEffective: boolean;
        effectivenessScore: number;
        reviewNotes: string;
        metrics?: { beforeScore: number; afterScore: number; };
      }
    }) => duaService.reviewEffectiveness(id, data),
    onSuccess: (updatedAccommodation, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(variables.id),
        updatedAccommodation
      );

      // Invalidar análisis relacionados
      queryClient.invalidateQueries({ queryKey: duaKeys.effectiveness() });
      queryClient.invalidateQueries({ queryKey: duaKeys.dashboards.overview() });

      message.success('Efectividad de acomodación revisada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al revisar la efectividad');
    },
  });
};

// ========== RECOMENDACIONES ==========

/**
 * Hook para obtener recomendaciones de un perfil DUA
 */
export const useDuaRecommendations = (profileId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: duaKeys.recommendations(profileId),
    queryFn: () => duaService.generateRecommendations(profileId),
    enabled: enabled && !!profileId,
    staleTime: 15 * 60 * 1000, // 15 minutos
  });
};

/**
 * Hook para obtener recomendaciones de un estudiante
 */
export const useStudentDuaRecommendations = (studentId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: duaKeys.studentRecommendations(studentId),
    queryFn: () => duaService.getStudentRecommendations(studentId),
    enabled: enabled && !!studentId,
    staleTime: 15 * 60 * 1000,
  });
};

/**
 * Hook para aplicar una recomendación como acomodación
 */
export const useApplyDuaRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, recommendation }: { 
      profileId: string; 
      recommendation: DuaRecommendation;
    }) => duaService.applyRecommendation(profileId, recommendation),
    onSuccess: (newAccommodation, variables) => {
      // Invalidar acomodaciones
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });
      
      // Actualizar cache de la nueva acomodación
      queryClient.setQueryData(
        duaKeys.accommodation(newAccommodation.id),
        newAccommodation
      );

      // Invalidar recomendaciones (pueden haber cambiado)
      queryClient.invalidateQueries({ 
        queryKey: duaKeys.recommendations(variables.profileId) 
      });

      message.success('Recomendación aplicada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al aplicar la recomendación');
    },
  });
};

// ========== ANÁLISIS DE IMPACTO ==========

/**
 * Hook para obtener análisis de impacto DUA de un estudiante
 */
export const useStudentDuaImpact = (
  studentId: string, 
  filters?: any,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: duaKeys.impact(studentId, filters),
    queryFn: () => duaService.getStudentImpact(studentId, filters),
    enabled: enabled && !!studentId,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para analizar efectividad de acomodaciones
 */
export const useAccommodationEffectiveness = (filters?: any) => {
  return useQuery({
    queryKey: duaKeys.effectiveness(filters),
    queryFn: () => duaService.analyzeAccommodationEffectiveness(filters),
    staleTime: 15 * 60 * 1000,
  });
};

// ========== DASHBOARDS ==========

/**
 * Hook para dashboard general DUA (administradores)
 */
export const useDuaDashboardOverview = (filters?: any) => {
  return useQuery({
    queryKey: duaKeys.dashboards.overview(filters),
    queryFn: () => duaService.getDashboardOverview(filters),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para dashboard de profesores DUA
 */
export const useDuaTeacherDashboard = (filters?: any) => {
  return useQuery({
    queryKey: duaKeys.dashboards.teacher(filters),
    queryFn: () => duaService.getTeacherDashboard(filters),
    staleTime: 5 * 60 * 1000,
  });
};

// ========== INTEGRACIÓN CON SITUACIONES DE APRENDIZAJE ==========

/**
 * Hook para generar plan DUA para situación de aprendizaje
 */
export const useDuaLearningSituationPlan = (
  learningSituationId: string,
  studentId?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: duaKeys.learningSituationPlan(learningSituationId, studentId),
    queryFn: () => duaService.generateLearningSituationPlan(learningSituationId, studentId),
    enabled: enabled && !!learningSituationId,
    staleTime: 10 * 60 * 1000,
  });
};

// ========== BÚSQUEDA ==========

/**
 * Hook para búsqueda en el sistema DUA
 */
export const useSearchDua = (
  query: string,
  filters?: any,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: duaKeys.search(query, filters),
    queryFn: () => duaService.search(query, filters),
    enabled: enabled && query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
};

// ========== VALIDACIONES ==========

/**
 * Hook para validar perfil DUA
 */
export const useValidateDuaProfile = () => {
  return useMutation({
    mutationFn: duaService.validateProfile,
  });
};

/**
 * Hook para validar acomodación
 */
export const useValidateDuaAccommodation = () => {
  return useMutation({
    mutationFn: duaService.validateAccommodation,
  });
};

// ========== HOOKS ADICIONALES PARA ACCOMMODATIONS ==========

/**
 * Hook para obtener plantillas de acomodaciones
 */
export const useAccommodationTemplates = (type?: AccommodationType) => {
  return useQuery({
    queryKey: [...duaKeys.accommodations({ isTemplate: true }), type],
    queryFn: () => duaService.getAccommodationTemplates(type),
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook para crear registro de efectividad
 */
export const useCreateEffectiveness = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duaService.createEffectivenessRecord,
    onSuccess: (newRecord) => {
      // Invalidar registros de efectividad
      queryClient.invalidateQueries({ queryKey: duaKeys.effectiveness() });
      
      // Invalidar acomodación específica
      queryClient.invalidateQueries({ 
        queryKey: duaKeys.accommodation(newRecord.accommodationId) 
      });

      message.success('Evaluación de efectividad registrada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al registrar la evaluación de efectividad');
    },
  });
};

/**
 * Hook para obtener registros de efectividad
 */
export const useEffectivenessRecords = (filters?: any) => {
  return useQuery({
    queryKey: duaKeys.effectiveness(filters),
    queryFn: () => duaService.getEffectivenessRecords(filters),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para enviar acomodación para aprobación
 */
export const useSubmitForApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duaService.submitForApproval,
    onSuccess: (updatedAccommodation) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(updatedAccommodation.id),
        updatedAccommodation
      );

      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });

      message.success('Acomodación enviada para aprobación');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al enviar para aprobación');
    },
  });
};

/**
 * Hook para rechazar acomodación
 */
export const useRejectAccommodation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string; suggestions?: string[] } }) =>
      duaService.rejectAccommodation(id, data),
    onSuccess: (updatedAccommodation, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(variables.id),
        updatedAccommodation
      );

      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });

      message.warning('Acomodación rechazada');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al rechazar la acomodación');
    },
  });
};

/**
 * Hook para activar acomodación
 */
export const useActivateAccommodation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duaService.activateAccommodation,
    onSuccess: (updatedAccommodation) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(updatedAccommodation.id),
        updatedAccommodation
      );

      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });

      message.success('Acomodación activada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al activar la acomodación');
    },
  });
};

/**
 * Hook para suspender acomodación
 */
export const useSuspendAccommodation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      duaService.suspendAccommodation(id, reason),
    onSuccess: (updatedAccommodation, variables) => {
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(variables.id),
        updatedAccommodation
      );

      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });

      message.warning('Acomodación suspendida');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al suspender la acomodación');
    },
  });
};

/**
 * Hook para crear acomodación desde plantilla
 */
export const useCreateFromTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, duaProfileId, customizations }: {
      templateId: string;
      duaProfileId: string;
      customizations: any;
    }) => duaService.createFromTemplate(templateId, duaProfileId, customizations),
    onSuccess: (newAccommodation) => {
      // Invalidar listas de acomodaciones
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });
      
      // Actualizar cache individual
      queryClient.setQueryData(
        duaKeys.accommodation(newAccommodation.id),
        newAccommodation
      );

      message.success('Acomodación creada desde plantilla exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al crear desde plantilla');
    },
  });
};

/**
 * Hook para analytics de acomodaciones
 */
export const useAccommodationAnalytics = (filters?: any) => {
  return useQuery({
    queryKey: [...duaKeys.all, 'analytics', 'accommodations', filters],
    queryFn: () => duaService.getAccommodationAnalytics(filters),
    staleTime: 10 * 60 * 1000,
  });
};

// ========== EXPORTACIÓN ==========

/**
 * Hook para exportar perfil DUA
 */
export const useExportDuaProfile = () => {
  return useMutation({
    mutationFn: duaService.exportProfile,
    onSuccess: (blob, profileId) => {
      // Crear y descargar archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `perfil_dua_${profileId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Perfil DUA exportado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al exportar el perfil DUA');
    },
  });
};

/**
 * Hook para exportar informe de impacto
 */
export const useExportDuaImpactReport = () => {
  return useMutation({
    mutationFn: ({ studentId, filters }: { studentId: string; filters?: any }) =>
      duaService.exportImpactReport(studentId, filters),
    onSuccess: (blob, variables) => {
      // Crear y descargar archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `informe_impacto_dua_${variables.studentId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Informe de impacto exportado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al exportar el informe de impacto');
    },
  });
};

/**
 * Hook para importar plantilla de acomodaciones
 */
export const useImportDuaAccommodationTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duaService.importAccommodationTemplate,
    onSuccess: (result) => {
      // Invalidar acomodaciones
      queryClient.invalidateQueries({ queryKey: duaKeys.accommodations() });

      if (result.success) {
        message.success(`${result.imported} acomodaciones importadas exitosamente`);
        
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => message.warning(warning));
        }
      } else {
        message.error('La importación falló');
        result.errors.forEach(error => message.error(error));
      }
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al importar la plantilla de acomodaciones');
    },
  });
};

// ========== HOOK COMBINADO PRINCIPAL ==========

/**
 * Hook principal que combina las funcionalidades más comunes del sistema DUA
 */
export const useDuaSystem = (studentId?: string) => {
  const profiles = useDuaProfiles();
  const studentProfile = useStudentDuaProfile(studentId || '', !!studentId);
  const accommodations = useDuaAccommodations(
    studentProfile.data ? { duaProfileId: studentProfile.data.id } : {}
  );
  const teacherDashboard = useDuaTeacherDashboard();
  
  const createProfile = useCreateDuaProfile();
  const updateProfile = useUpdateDuaProfile();
  const createAccommodation = useCreateDuaAccommodation();

  return {
    // Datos
    profiles: profiles.data?.data || [],
    studentProfile: studentProfile.data,
    accommodations: accommodations.data?.data || [],
    dashboard: teacherDashboard.data,
    
    // Estados de carga
    isLoading: profiles.isLoading || studentProfile.isLoading || accommodations.isLoading,
    isError: profiles.isError || studentProfile.isError || accommodations.isError,
    
    // Información del estudiante
    hasProfile: !!studentProfile.data,
    profileId: studentProfile.data?.id,
    
    // Mutaciones
    createProfile: createProfile.mutate,
    updateProfile: updateProfile.mutate,
    createAccommodation: createAccommodation.mutate,
    
    // Estados de mutaciones
    isCreatingProfile: createProfile.isPending,
    isUpdatingProfile: updateProfile.isPending,
    isCreatingAccommodation: createAccommodation.isPending,
    
    // Refetch functions
    refetchProfile: studentProfile.refetch,
    refetchAccommodations: accommodations.refetch,
    refetchDashboard: teacherDashboard.refetch,
  };
};