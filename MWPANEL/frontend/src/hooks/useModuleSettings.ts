import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService, ModuleSetting } from '../services/settingsService';
import { useAuthStore } from '@store/authStore';

export const useModuleSettings = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  
  const {
    data: moduleSettings,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['moduleSettings'],
    queryFn: async () => {
      const result = await settingsService.getModuleSettings();
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
  });

  // Hook para verificar si un módulo específico está habilitado
  const isModuleEnabled = (moduleName: string): boolean => {
    if (!moduleSettings) return false;
    
    const setting = moduleSettings.find(s => s.key === `module_${moduleName}_enabled`);
    return setting ? setting.value === 'true' : false;
  };

  // Función para habilitar un módulo
  const enableModule = async (moduleName: string) => {
    try {
      await settingsService.enableModule(moduleName);
      // Invalidar caché para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['moduleSettings'] });
      return true;
    } catch (error) {
      console.error('Error enabling module:', error);
      return false;
    }
  };

  // Función para deshabilitar un módulo
  const disableModule = async (moduleName: string) => {
    try {
      await settingsService.disableModule(moduleName);
      // Invalidar caché para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['moduleSettings'] });
      return true;
    } catch (error) {
      console.error('Error disabling module:', error);
      return false;
    }
  };

  // Función para obtener roles habilitados para un módulo
  const getEnabledRolesForModule = (moduleName: string): string[] => {
    if (!moduleSettings) return [];
    
    const enabledRoles: string[] = [];
    const possibleRoles = ['admin', 'teacher', 'student', 'family'];
    
    possibleRoles.forEach(role => {
      const setting = moduleSettings.find(s => s.key === `module_${moduleName}_${role}_enabled`);
      if (setting && setting.value === 'true') {
        enabledRoles.push(role);
      }
    });
    
    return enabledRoles;
  };

  // Función para habilitar un módulo para un rol específico
  const enableModuleForRole = async (moduleName: string, role: string) => {
    try {
      await settingsService.enableModuleForRole(moduleName, role);
      queryClient.invalidateQueries({ queryKey: ['moduleSettings'] });
      return true;
    } catch (error) {
      console.error('Error enabling module for role:', error);
      return false;
    }
  };

  // Función para deshabilitar un módulo para un rol específico
  const disableModuleForRole = async (moduleName: string, role: string) => {
    try {
      await settingsService.disableModuleForRole(moduleName, role);
      queryClient.invalidateQueries({ queryKey: ['moduleSettings'] });
      return true;
    } catch (error) {
      console.error('Error disabling module for role:', error);
      return false;
    }
  };

  // Función para verificar si un módulo está habilitado para un rol específico
  const isModuleEnabledForRole = (moduleName: string, role: string): boolean => {
    if (!moduleSettings) return false;
    
    // Buscar configuración específica por rol primero
    const roleSetting = moduleSettings.find(s => s.key === `module_${moduleName}_${role}_enabled`);
    if (roleSetting) {
      return roleSetting.value === 'true';
    }
    
    // Si no hay configuración específica por rol, usar la configuración general del módulo
    const generalSetting = moduleSettings.find(s => s.key === `module_${moduleName}_enabled`);
    return generalSetting ? generalSetting.value === 'true' : false;
  };

  const isModuleEnabledForRoleOriginal = (moduleName: string, role: string): boolean => {
    if (!moduleSettings) return false;
    
    // Buscar configuración específica por rol primero
    const roleSetting = moduleSettings.find(s => s.key === `module_${moduleName}_${role}_enabled`);
    if (roleSetting) {
      return roleSetting.value === 'true';
    }
    
    // Si no hay configuración específica por rol, usar la configuración general del módulo
    const generalSetting = moduleSettings.find(s => s.key === `module_${moduleName}_enabled`);
    return generalSetting ? generalSetting.value === 'true' : false;
  };

  // Función para inicializar configuraciones por defecto
  const initializeSettings = async () => {
    try {
      await settingsService.initializeDefaultSettings();
      queryClient.invalidateQueries({ queryKey: ['moduleSettings'] });
      return true;
    } catch (error) {
      console.error('Error initializing settings:', error);
      return false;
    }
  };

  // Función para obtener todos los módulos disponibles con su estado
  const getModulesStatus = () => {
    if (!moduleSettings) return {};
    
    const modulesStatus: Record<string, boolean> = {};
    
    moduleSettings.forEach(setting => {
      if (setting.key.startsWith('module_') && setting.key.endsWith('_enabled')) {
        const moduleName = setting.key.replace('module_', '').replace('_enabled', '');
        modulesStatus[moduleName] = setting.value === 'true';
      }
    });
    
    return modulesStatus;
  };

  // ==================== NUEVAS FUNCIONES PARA ROLES ====================

  // Función para obtener configuración completa de un módulo por roles
  const getModuleRoleSettings = async (moduleName: string) => {
    try {
      const response = await settingsService.getModuleRoleSettings(moduleName);
      return response;
    } catch (error) {
      console.error('Error getting module role settings:', error);
      return null;
    }
  };

  // Función para configurar un módulo para múltiples roles
  const configureModuleForRoles = async (moduleName: string, roles: Record<string, boolean>) => {
    try {
      await settingsService.configureModuleForRoles(moduleName, roles);
      queryClient.invalidateQueries({ queryKey: ['moduleSettings'] });
      return true;
    } catch (error) {
      console.error('Error configuring module for roles:', error);
      return false;
    }
  };

  // Función para obtener todas las configuraciones de módulos por roles
  const getAllModuleRoleSettings = async () => {
    try {
      const response = await settingsService.getAllModuleRoleSettings();
      return response;
    } catch (error) {
      console.error('Error getting all module role settings:', error);
      return null;
    }
  };

  // Función para inicializar configuraciones por roles
  const initializeModuleRoleSettings = async () => {
    try {
      await settingsService.initializeModuleRoleSettings();
      queryClient.invalidateQueries({ queryKey: ['moduleSettings'] });
      return true;
    } catch (error) {
      console.error('Error initializing module role settings:', error);
      return false;
    }
  };

  // Función mejorada para verificar si un módulo está habilitado para un rol específico
  const isModuleEnabledForRoleAdvanced = (moduleName: string, role: string): boolean => {
    if (!moduleSettings) return false;
    
    // Buscar configuración específica por rol primero
    const roleSetting = moduleSettings.find(s => s.key === `module_${moduleName}_${role}_enabled`);
    if (roleSetting) {
      const isEnabledForRole = roleSetting.value === 'true';
      
      // Role-specific check completed
      
      return isEnabledForRole;
    }
    
    // Si no hay configuración específica por rol, usar la configuración general del módulo como fallback
    const generalSetting = moduleSettings.find(s => s.key === `module_${moduleName}_enabled`);
    const fallbackEnabled = generalSetting ? generalSetting.value === 'true' : false;
    
    // Using fallback setting
    
    return fallbackEnabled;
  };

  return {
    moduleSettings,
    isLoading,
    isError,
    error,
    refetch,
    isModuleEnabled,
    enableModule,
    disableModule,
    initializeSettings,
    getModulesStatus,
    getEnabledRolesForModule,
    enableModuleForRole,
    disableModuleForRole,
    isModuleEnabledForRole,
    // Nuevas funciones para roles
    getModuleRoleSettings,
    configureModuleForRoles,
    getAllModuleRoleSettings,
    initializeModuleRoleSettings,
    isModuleEnabledForRoleAdvanced,
  };
};

// Hook específico para verificar un solo módulo (útil para componentes)
export const useModuleEnabled = (moduleName: string) => {
  const { moduleSettings, isLoading } = useModuleSettings();
  
  const isEnabled = moduleSettings?.find(
    s => s.key === `module_${moduleName}_enabled`
  )?.value === 'true' || false;

  return {
    isEnabled,
    isLoading,
  };
};