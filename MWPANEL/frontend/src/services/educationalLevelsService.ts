import api from './apiClient';

export interface EducationalLevel {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

class EducationalLevelsService {
  async getEducationalLevels(): Promise<EducationalLevel[]> {
    const response = await api.get('/educational-levels');
    return response.data;
  }

  async getEducationalLevel(id: string): Promise<EducationalLevel> {
    const response = await api.get(`/educational-levels/${id}`);
    return response.data;
  }

  async createEducationalLevel(data: Partial<EducationalLevel>): Promise<EducationalLevel> {
    const response = await api.post('/educational-levels', data);
    return response.data;
  }

  async updateEducationalLevel(id: string, data: Partial<EducationalLevel>): Promise<EducationalLevel> {
    const response = await api.put(`/educational-levels/${id}`, data);
    return response.data;
  }

  async deleteEducationalLevel(id: string): Promise<void> {
    await api.delete(`/educational-levels/${id}`);
  }
}

export default new EducationalLevelsService();