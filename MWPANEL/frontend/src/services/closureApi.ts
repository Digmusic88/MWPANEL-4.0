import apiClient from './apiClient';

export interface ClosureStatus {
  enabled: boolean;
  allowedSections: string[];
  message: string;
}

export interface ClosureConfig {
  enabled: boolean;
  allowedSectionsByRole: Record<string, string[]>;
  message: string;
  updatedAt: string;
  updatedBy: string;
}

export const getClosureStatus = async (): Promise<ClosureStatus> => {
  const { data } = await apiClient.get('/settings/closure/status');
  return data;
};

export const getClosureConfig = async (): Promise<ClosureConfig> => {
  const { data } = await apiClient.get('/settings/closure/config');
  return data;
};

export const getClosureSections = async (): Promise<{ sections: { key: string; label: string }[] }> => {
  const { data } = await apiClient.get('/settings/closure/sections');
  return data;
};

export const enableClosure = async (payload: { allowedSectionsByRole: Record<string, string[]>; message?: string }) => {
  const { data } = await apiClient.post('/settings/closure/enable', payload);
  return data;
};

export const disableClosure = async () => {
  const { data } = await apiClient.post('/settings/closure/disable');
  return data;
};

export const updateClosure = async (payload: { allowedSectionsByRole?: Record<string, string[]>; message?: string }) => {
  const { data } = await apiClient.put('/settings/closure/config', payload);
  return data;
};
