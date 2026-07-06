import { useState, useEffect } from 'react';
import apiClient from '@services/apiClient';
import { message } from 'antd';

export interface EducationalLevel {
  id: string;
  name: string;
  code: string;
  description?: string;
  order: number;
  isActive: boolean;
  courses?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

const useEducationalLevels = () => {
  const [educationalLevels, setEducationalLevels] = useState<EducationalLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEducationalLevels();
  }, []);

  const fetchEducationalLevels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/educational-levels');
      setEducationalLevels(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar niveles educativos';
      setError(errorMessage);
      // Don't show error message for missing endpoint
      if (!error.response?.status || error.response.status !== 404) {
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const createEducationalLevel = async (data: Partial<EducationalLevel>) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/educational-levels', data);
      message.success('Nivel educativo creado exitosamente');
      await fetchEducationalLevels();
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al crear nivel educativo';
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateEducationalLevel = async (id: string, data: Partial<EducationalLevel>) => {
    try {
      setLoading(true);
      const response = await apiClient.patch(`/educational-levels/${id}`, data);
      message.success('Nivel educativo actualizado exitosamente');
      await fetchEducationalLevels();
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al actualizar nivel educativo';
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteEducationalLevel = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/educational-levels/${id}`);
      message.success('Nivel educativo eliminado exitosamente');
      await fetchEducationalLevels();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al eliminar nivel educativo';
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    educationalLevels,
    loading,
    error,
    fetchEducationalLevels,
    createEducationalLevel,
    updateEducationalLevel,
    deleteEducationalLevel,
  };
};

export default useEducationalLevels;