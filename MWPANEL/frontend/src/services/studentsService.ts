import api from './apiClient';

export interface Student {
  id: string;
  enrollmentNumber: string;
  userId: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      phone?: string;
      address?: string;
    };
  };
  educationalLevelId?: string;
  educationalLevel?: {
    id: string;
    name: string;
    code: string;
  };
  courseId?: string;
  course?: {
    id: string;
    name: string;
  };
  classGroupId?: string;
  classGroup?: {
    id: string;
    name: string;
  };
  academicYearId?: string;
  academicYear?: {
    id: string;
    name: string;
  };
  enrollmentDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class StudentsService {
  async getStudents(): Promise<Student[]> {
    const response = await api.get('/students');
    return response.data;
  }

  // RGPD: solo los alumnos del profesor (grupos de tutoría + asignatura)
  async getMyStudents(): Promise<Student[]> {
    const response = await api.get('/students/my-students');
    return response.data;
  }

  async getStudent(id: string): Promise<Student> {
    const response = await api.get(`/students/${id}`);
    return response.data;
  }

  async createStudent(data: Partial<Student>): Promise<Student> {
    const response = await api.post('/students', data);
    return response.data;
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student> {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  }

  async deleteStudent(id: string): Promise<void> {
    await api.delete(`/students/${id}`);
  }

  async getStudentsByClassGroup(classGroupId: string): Promise<Student[]> {
    const response = await api.get(`/students/by-class-group/${classGroupId}`);
    return response.data;
  }

  async getStudentsByEducationalLevel(educationalLevelId: string): Promise<Student[]> {
    const response = await api.get(`/students/by-educational-level/${educationalLevelId}`);
    return response.data;
  }

  async enrollStudent(studentId: string, classGroupId: string): Promise<void> {
    await api.post(`/students/${studentId}/enroll`, { classGroupId });
  }

  async unenrollStudent(studentId: string): Promise<void> {
    await api.post(`/students/${studentId}/unenroll`);
  }

  async getStudentGrades(studentId: string): Promise<any[]> {
    const response = await api.get(`/students/${studentId}/grades`);
    return response.data;
  }

  async getStudentAttendance(studentId: string): Promise<any[]> {
    const response = await api.get(`/students/${studentId}/attendance`);
    return response.data;
  }
}

export default new StudentsService();