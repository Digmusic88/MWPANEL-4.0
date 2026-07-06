import { apiClient } from './apiClient';

export interface ModuleSetting {
  key: string;
  value: string;
  type: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
  category: string;
  isEditable: boolean;
  requiresRestart: boolean;
}

export interface ModuleStatus {
  enabled: boolean;
  moduleName: string;
}

class SettingsService {
  async getModuleSettings(): Promise<ModuleSetting[]> {
    const response = await apiClient.get('/settings/modules');
    return response.data;
  }

  async isModuleEnabled(moduleName: string): Promise<boolean> {
    const response = await apiClient.get(`/settings/modules/${moduleName}/status`);
    return response.data.enabled;
  }

  async enableModule(moduleName: string): Promise<void> {
    await apiClient.post(`/settings/modules/${moduleName}/enable`);
  }

  async disableModule(moduleName: string): Promise<void> {
    await apiClient.post(`/settings/modules/${moduleName}/disable`);
  }

  async enableModuleForRole(moduleName: string, role: string): Promise<void> {
    await apiClient.post(`/settings/modules/${moduleName}/role/${role}/enable`);
  }

  async disableModuleForRole(moduleName: string, role: string): Promise<void> {
    await apiClient.post(`/settings/modules/${moduleName}/role/${role}/disable`);
  }

  async initializeDefaultSettings(): Promise<void> {
    await apiClient.post('/settings/initialize');
  }

  async getAllSettings(): Promise<ModuleSetting[]> {
    const response = await apiClient.get('/settings');
    return response.data;
  }

  async updateSetting(key: string, value: any): Promise<void> {
    await apiClient.patch(`/settings/${key}`, { value });
  }

  // ==================== NUEVAS FUNCIONES PARA ROLES ====================

  async getModuleRoleSettings(moduleName: string): Promise<{
    module: string;
    globalEnabled: boolean;
    roleSettings: Record<string, boolean>;
  }> {
    const response = await apiClient.get(`/settings/modules/${moduleName}/roles`);
    return response.data;
  }

  async configureModuleForRoles(moduleName: string, roles: Record<string, boolean>): Promise<void> {
    await apiClient.post(`/settings/modules/${moduleName}/roles/configure`, { roles })
  }

  async getAllModuleRoleSettings(): Promise<{
    modules: Record<string, {
      globalEnabled: boolean;
      roleSettings: Record<string, boolean>;
    }>;
  }> {
    const response = await apiClient.get('/settings/modules/roles/all');
    return response.data;
  }

  async initializeModuleRoleSettings(): Promise<{ message: string; initialized: number }> {
    const response = await apiClient.post('/settings/modules/roles/initialize');
    return response.data;
  }

  async enableModuleForSpecificRole(moduleName: string, role: string): Promise<void> {
    await apiClient.post(`/settings/modules/${moduleName}/roles/${role}/enable`);
  }

  async disableModuleForSpecificRole(moduleName: string, role: string): Promise<void> {
    await apiClient.post(`/settings/modules/${moduleName}/roles/${role}/disable`);
  }
}

export const settingsService = new SettingsService();