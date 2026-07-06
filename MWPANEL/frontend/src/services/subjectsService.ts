import api from './apiClient';

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  hoursPerWeek?: number;
  educationalLevelId?: string;
  educationalLevel?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

class SubjectsService {
  async getSubjects(): Promise<Subject[]> {
    const response = await api.get('/subjects');
    return response.data;
  }

  async getSubject(id: string): Promise<Subject> {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  }

  async createSubject(data: Partial<Subject>): Promise<Subject> {
    const response = await api.post('/subjects', data);
    return response.data;
  }

  async updateSubject(id: string, data: Partial<Subject>): Promise<Subject> {
    const response = await api.put(`/subjects/${id}`, data);
    return response.data;
  }

  async deleteSubject(id: string): Promise<void> {
    await api.delete(`/subjects/${id}`);
  }

  async getSubjectsByEducationalLevel(educationalLevelId: string): Promise<Subject[]> {
    const response = await api.get(`/subjects/by-educational-level/${educationalLevelId}`);
    return response.data;
  }
}

export default new SubjectsService();