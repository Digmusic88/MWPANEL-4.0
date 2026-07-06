import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import lessonsApi from '../services/lessonsApi';
import type {
  LessonWorkspace,
  LessonFolder,
  LessonResource,
  LessonResourceShare,
  CreateLessonWorkspaceRequest,
  CreateLessonFolderRequest,
  UpdateLessonFolderRequest,
  CreateLessonResourceRequest,
  UpdateLessonResourceRequest,
  ShareLessonResourceRequest,
  LessonResourceQuery,
  LessonWorkspaceQuery,
  LessonFolderQuery,
  PaginatedLessonResourcesResponse,
  TsxValidationResult,
  TsxSandboxResult,
  SandboxConfig,
  UseLessonsWorkspaceReturn,
  UseLessonsFolderReturn,
  UseLessonsResourceReturn,
  UseTsxValidationReturn
} from '../types/lessons';

// ========================================
// WORKSPACE HOOKS
// ========================================

export const useLessonsWorkspace = (query?: LessonWorkspaceQuery): UseLessonsWorkspaceReturn => {
  const queryClient = useQueryClient();

  const {
    data: workspaces = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['lessons-workspaces', query],
    queryFn: () => {
      console.log('🚀 API Call - lessonsApi.workspace.getAll with query:', query);
      return lessonsApi.workspace.getAll(query);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: lessonsApi.workspace.create,
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['lessons-workspaces'] });
      message.success('Workspace creado exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al crear workspace: ${error.response?.data?.message || error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: lessonsApi.workspace.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-workspaces'] });
      message.success('Workspace eliminado exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al eliminar workspace: ${error.response?.data?.message || error.message}`);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: lessonsApi.workspace.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-workspaces'] });
      message.success('Workspace archivado exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al archivar workspace: ${error.response?.data?.message || error.message}`);
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: lessonsApi.workspace.unarchive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-workspaces'] });
      message.success('Workspace restaurado exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al restaurar workspace: ${error.response?.data?.message || error.message}`);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, newAcademicYearId }: { id: string; newAcademicYearId: string }) =>
      lessonsApi.workspace.clone(id, newAcademicYearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-workspaces'] });
      message.success('Workspace clonado exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al clonar workspace: ${error.response?.data?.message || error.message}`);
    },
  });

  const createWorkspace = useCallback(
    async (data: CreateLessonWorkspaceRequest): Promise<LessonWorkspace> => {
      return createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  const deleteWorkspace = useCallback(
    async (id: string): Promise<void> => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const archiveWorkspace = useCallback(
    async (id: string): Promise<LessonWorkspace> => {
      return archiveMutation.mutateAsync(id);
    },
    [archiveMutation]
  );

  const unarchiveWorkspace = useCallback(
    async (id: string): Promise<LessonWorkspace> => {
      return unarchiveMutation.mutateAsync(id);
    },
    [unarchiveMutation]
  );

  const cloneWorkspace = useCallback(
    async (id: string, newAcademicYearId: string): Promise<LessonWorkspace> => {
      return cloneMutation.mutateAsync({ id, newAcademicYearId });
    },
    [cloneMutation]
  );

  return {
    workspaces,
    loading,
    error: error?.message || null,
    createWorkspace,
    deleteWorkspace,
    archiveWorkspace,
    unarchiveWorkspace,
    cloneWorkspace,
    refetch
  };
};

// ========================================
// FOLDER HOOKS
// ========================================

export const useLessonsFolder = (query?: LessonFolderQuery): UseLessonsFolderReturn => {
  const queryClient = useQueryClient();

  const {
    data: folders = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['lessons-folders', query],
    queryFn: () => lessonsApi.folder.getAll(query),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateLessonFolderRequest }) =>
      lessonsApi.folder.create(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-folders'] });
      queryClient.invalidateQueries({ queryKey: ['lessons-workspaces'] });
      message.success('Carpeta creada exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al crear carpeta: ${error.response?.data?.message || error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonFolderRequest }) =>
      lessonsApi.folder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-folders'] });
      message.success('Carpeta actualizada exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al actualizar carpeta: ${error.response?.data?.message || error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: lessonsApi.folder.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-folders'] });
      queryClient.invalidateQueries({ queryKey: ['lessons-workspaces'] });
      message.success('Carpeta eliminada exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al eliminar carpeta: ${error.response?.data?.message || error.message}`);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ workspaceId, folderIds }: { workspaceId: string; folderIds: string[] }) =>
      lessonsApi.folder.reorder(workspaceId, folderIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-folders'] });
      message.success('Carpetas reordenadas exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al reordenar carpetas: ${error.response?.data?.message || error.message}`);
    },
  });

  const createFolder = useCallback(
    async (workspaceId: string, data: CreateLessonFolderRequest): Promise<LessonFolder> => {
      return createMutation.mutateAsync({ workspaceId, data });
    },
    [createMutation]
  );

  const updateFolder = useCallback(
    async (id: string, data: UpdateLessonFolderRequest): Promise<LessonFolder> => {
      return updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  const deleteFolder = useCallback(
    async (id: string): Promise<void> => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const reorderFolders = useCallback(
    async (workspaceId: string, folderIds: string[]): Promise<void> => {
      return reorderMutation.mutateAsync({ workspaceId, folderIds });
    },
    [reorderMutation]
  );

  return {
    folders,
    loading,
    error: error?.message || null,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
    refetch
  };
};

// ========================================
// RESOURCE HOOKS
// ========================================

export const useLessonsResource = (query?: LessonResourceQuery): UseLessonsResourceReturn => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['lessons-resources', query],
    queryFn: () => lessonsApi.resource.getAll(query),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const createMutation = useMutation({
    mutationFn: ({ folderId, data }: { folderId: string; data: CreateLessonResourceRequest }) =>
      lessonsApi.resource.create(folderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-resources'] });
      queryClient.invalidateQueries({ queryKey: ['lessons-folders'] });
      message.success('Recurso creado exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al crear recurso: ${error.response?.data?.message || error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonResourceRequest }) =>
      lessonsApi.resource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-resources'] });
      message.success('Recurso actualizado exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al actualizar recurso: ${error.response?.data?.message || error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: lessonsApi.resource.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-resources'] });
      queryClient.invalidateQueries({ queryKey: ['lessons-folders'] });
      message.success('Recurso eliminado exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al eliminar recurso: ${error.response?.data?.message || error.message}`);
    },
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShareLessonResourceRequest }) =>
      lessonsApi.resource.share(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-resources'] });
      message.success('Recurso compartido exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al compartir recurso: ${error.response?.data?.message || error.message}`);
    },
  });

  const unshareMutation = useMutation({
    mutationFn: ({ id, sharedWithId }: { id: string; sharedWithId: string }) =>
      lessonsApi.resource.unshare(id, sharedWithId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-resources'] });
      message.success('Compartir eliminado exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al eliminar compartir: ${error.response?.data?.message || error.message}`);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ folderId, resourceIds }: { folderId: string; resourceIds: string[] }) =>
      lessonsApi.resource.reorder(folderId, resourceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-resources'] });
      message.success('Recursos reordenados exitosamente');
    },
    onError: (error: any) => {
      message.error(`Error al reordenar recursos: ${error.response?.data?.message || error.message}`);
    },
  });

  const createResource = useCallback(
    async (folderId: string, data: CreateLessonResourceRequest): Promise<LessonResource> => {
      return createMutation.mutateAsync({ folderId, data });
    },
    [createMutation]
  );

  const updateResource = useCallback(
    async (id: string, data: UpdateLessonResourceRequest): Promise<LessonResource> => {
      return updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  const deleteResource = useCallback(
    async (id: string): Promise<void> => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const shareResource = useCallback(
    async (id: string, data: ShareLessonResourceRequest): Promise<LessonResourceShare> => {
      return shareMutation.mutateAsync({ id, data });
    },
    [shareMutation]
  );

  const unshareResource = useCallback(
    async (id: string, sharedWithId: string): Promise<void> => {
      return unshareMutation.mutateAsync({ id, sharedWithId });
    },
    [unshareMutation]
  );

  const reorderResources = useCallback(
    async (folderId: string, resourceIds: string[]): Promise<void> => {
      return reorderMutation.mutateAsync({ folderId, resourceIds });
    },
    [reorderMutation]
  );

  return {
    resources: data?.data || [],
    pagination: data?.pagination || null,
    loading,
    error: error?.message || null,
    createResource,
    updateResource,
    deleteResource,
    shareResource,
    unshareResource,
    reorderResources,
    refetch
  };
};

// ========================================
// TSX VALIDATION HOOKS
// ========================================

export const useTsxValidation = (): UseTsxValidationReturn => {
  const [validation, setValidation] = useState<TsxValidationResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TsxSandboxResult | null>(null);

  const validateCode = useCallback(
    async (sourceCode: string, dependencies?: string[]): Promise<TsxValidationResult> => {
      try {
        const result = await lessonsApi.tsx.validateCode(sourceCode, dependencies);
        setValidation(result);
        return result;
      } catch (error: any) {
        const errorResult: TsxValidationResult = {
          isValid: false,
          errors: [error.response?.data?.message || error.message],
          warnings: [],
          securityIssues: [],
          dependencies: []
        };
        setValidation(errorResult);
        throw errorResult;
      }
    },
    []
  );

  const testInSandbox = useCallback(
    async (
      sourceCode: string,
      props?: Record<string, any>,
      config?: SandboxConfig
    ): Promise<TsxSandboxResult> => {
      setTesting(true);
      try {
        const result = await lessonsApi.tsx.testInSandbox(sourceCode, props, config);
        setTestResult(result);
        return result;
      } catch (error: any) {
        const errorResult: TsxSandboxResult = {
          success: false,
          error: error.response?.data?.message || error.message,
          executionTime: 0
        };
        setTestResult(errorResult);
        throw errorResult;
      } finally {
        setTesting(false);
      }
    },
    []
  );

  const generateSandboxConfig = useCallback(
    async (sourceCode: string): Promise<SandboxConfig> => {
      try {
        return await lessonsApi.tsx.generateSandboxConfig(sourceCode);
      } catch (error: any) {
        message.error(`Error al generar configuración: ${error.response?.data?.message || error.message}`);
        throw error;
      }
    },
    []
  );

  return {
    validation,
    testing,
    testResult,
    validateCode,
    testInSandbox,
    generateSandboxConfig
  };
};

// ========================================
// SINGLE RESOURCE HOOK
// ========================================

export const useLessonResource = (id: string) => {
  const queryClient = useQueryClient();

  const {
    data: resource,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['lesson-resource', id],
    queryFn: () => lessonsApi.resource.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    resource,
    loading,
    error: error?.message || null,
    refetch
  };
};

// ========================================
// SINGLE FOLDER HOOK
// ========================================

export const useLessonFolder = (id: string) => {
  const queryClient = useQueryClient();

  const {
    data: folder,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['lesson-folder', id],
    queryFn: () => lessonsApi.folder.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    folder,
    loading,
    error: error?.message || null,
    refetch
  };
};

// ========================================
// SINGLE WORKSPACE HOOK
// ========================================

export const useLessonWorkspace = (id: string) => {
  const queryClient = useQueryClient();

  const {
    data: workspace,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['lesson-workspace', id],
    queryFn: () => lessonsApi.workspace.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    workspace,
    loading,
    error: error?.message || null,
    refetch
  };
};