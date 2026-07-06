/**
 * @archivo: useModuleSubcategories.ts
 * @función: Hook personalizado para gestionar subcategorías de módulos
 * @descripción: API client para configuración granular de subcategorías
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { apiClient } from '../services/apiClient';

interface SubcategorySettings {
  [subcategoryKey: string]: boolean;
}

interface ModuleSubcategoryResponse {
  module: string;
  role: string;
  subcategories: SubcategorySettings;
}

interface ConfigureSubcategoriesResponse {
  message: string;
  updated: string[];
}

export const useModuleSubcategories = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getModuleSubcategorySettings = useCallback(async (
    moduleName: string,
    role: string
  ): Promise<SubcategorySettings | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<ModuleSubcategoryResponse>(
        `/settings/modules/${moduleName}/subcategories/${role}`
      );
      return response.data.subcategories;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al obtener subcategorías';
      setError(errorMessage);
      console.error('Error getting module subcategory settings:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const configureModuleSubcategories = useCallback(async (
    moduleName: string,
    role: string,
    subcategories: SubcategorySettings
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<ConfigureSubcategoriesResponse>(
        `/settings/modules/${moduleName}/subcategories/${role}/configure`,
        { subcategories }
      );

      message.success(response.data.message);
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al configurar subcategorías';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Error configuring module subcategories:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initializeModuleSubcategorySettings = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ message: string; initialized: number }>(
        '/settings/modules/subcategories/initialize'
      );

      message.success(`${response.data.message} - ${response.data.initialized} configuraciones creadas`);
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al inicializar subcategorías';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Error initializing module subcategory settings:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getModuleSubcategorySettings,
    configureModuleSubcategories,
    initializeModuleSubcategorySettings,
    isLoading,
    error
  };
};