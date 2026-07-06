import api from './apiClient';

export interface User {
  id: string;
  email: string;
  role: string;
  profile?: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    phone?: string;
    address?: string;
    avatarUrl?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Teacher extends User {
  teacherId: string;
  employeeNumber: string;
  specialties: string[];
  subjects?: Array<{
    id: string;
    name: string;
  }>;
  classGroups?: Array<{
    id: string;
    name: string;
  }>;
}

class UsersService {
  async getUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data;
  }

  async getTeachers(): Promise<Teacher[]> {
    const response = await api.get('/teachers');
    return response.data;
  }

  async getUserById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const response = await api.post('/users', data);
    return response.data;
  }

  async uploadMyPhoto(formData: FormData): Promise<{ message: string; avatarUrl: string }> {
    const response = await api.post('/users/profile/me/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async uploadUserPhoto(userId: string, formData: FormData): Promise<{ message: string; avatarUrl: string }> {
    const response = await api.post(`/users/${userId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const usersApi = new UsersService();
export default usersApi;