import api from './apiClient';

export interface ClassGroup {
  id: string;
  name: string;
  code?: string;
  capacity?: number;
  currentEnrollment?: number;
  educationalLevelId?: string;
  educationalLevel?: {
    id: string;
    name: string;
    code: string;
  };
  academicYearId?: string;
  academicYear?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  students?: any[];
  createdAt: string;
  updatedAt: string;
}

class ClassGroupsService {
  async getClassGroups(): Promise<ClassGroup[]> {
    const response = await api.get('/class-groups');
    return response.data;
  }

  async getClassGroup(id: string): Promise<ClassGroup> {
    const response = await api.get(`/class-groups/${id}`);
    return response.data;
  }

  async createClassGroup(data: Partial<ClassGroup>): Promise<ClassGroup> {
    const response = await api.post('/class-groups', data);
    return response.data;
  }

  async updateClassGroup(id: string, data: Partial<ClassGroup>): Promise<ClassGroup> {
    const response = await api.put(`/class-groups/${id}`, data);
    return response.data;
  }

  async deleteClassGroup(id: string): Promise<void> {
    await api.delete(`/class-groups/${id}`);
  }

  async getClassGroupStudents(id: string): Promise<any[]> {
    const response = await api.get(`/class-groups/${id}/students`);
    return response.data;
  }

  async addStudentToClassGroup(classGroupId: string, studentId: string): Promise<void> {
    await api.post(`/class-groups/${classGroupId}/students/${studentId}`);
  }

  async removeStudentFromClassGroup(classGroupId: string, studentId: string): Promise<void> {
    await api.delete(`/class-groups/${classGroupId}/students/${studentId}`);
  }
}

export default new ClassGroupsService();