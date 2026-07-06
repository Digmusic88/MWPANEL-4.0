import { apiClient } from './apiClient';
import { SubjectCurriculumView } from '@/types/studentCurriculum';

class StudentCurriculumService {
  async get(studentId: string, subjectId: string, academicYearId: string): Promise<SubjectCurriculumView> {
    const r = await apiClient.get(`/student-curriculum/${studentId}/${subjectId}`, { params: { academicYearId } });
    return r.data;
  }
  async changeBlock(studentId: string, subjectId: string, body: { academicYearId: string; newCourseId: string; reason: string }): Promise<SubjectCurriculumView> {
    const r = await apiClient.post(`/student-curriculum/${studentId}/${subjectId}/change-block`, body);
    return r.data;
  }
  async addCourse(studentId: string, subjectId: string, body: { academicYearId: string; courseId: string; reason: string }): Promise<SubjectCurriculumView> {
    const r = await apiClient.post(`/student-curriculum/${studentId}/${subjectId}/courses`, body);
    return r.data;
  }
  async removeCourse(studentId: string, subjectId: string, courseId: string, body: { academicYearId: string; reason: string }): Promise<SubjectCurriculumView> {
    const r = await apiClient.delete(`/student-curriculum/${studentId}/${subjectId}/courses/${courseId}`, { data: body });
    return r.data;
  }
}
export const studentCurriculumService = new StudentCurriculumService();
