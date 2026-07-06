import { useState, useCallback } from 'react';
import { message } from 'antd';
import { studentCurriculumService } from '@services/studentCurriculumService';
import { SubjectCurriculumView } from '@/types/studentCurriculum';

export function useStudentSubjectCurriculum() {
  const [view, setView] = useState<SubjectCurriculumView | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (studentId: string, subjectId: string, academicYearId: string) => {
    setLoading(true);
    try { setView(await studentCurriculumService.get(studentId, subjectId, academicYearId)); }
    catch (e: any) { message.error(e.response?.data?.message || 'No se pudo cargar el currículo'); }
    finally { setLoading(false); }
  }, []);

  const changeBlock = useCallback(async (studentId: string, subjectId: string, body: { academicYearId: string; newCourseId: string; reason: string }) => {
    setSaving(true);
    try { setView(await studentCurriculumService.changeBlock(studentId, subjectId, body)); message.success('Nivel de la asignatura actualizado'); }
    catch (e: any) { message.error(e.response?.data?.message || 'No se pudo cambiar el nivel'); }
    finally { setSaving(false); }
  }, []);

  const addCourse = useCallback(async (studentId: string, subjectId: string, body: { academicYearId: string; courseId: string; reason: string }) => {
    setSaving(true);
    try { setView(await studentCurriculumService.addCourse(studentId, subjectId, body)); message.success('Curso añadido'); }
    catch (e: any) { message.error(e.response?.data?.message || 'No se pudo añadir el curso'); }
    finally { setSaving(false); }
  }, []);

  const removeCourse = useCallback(async (studentId: string, subjectId: string, courseId: string, body: { academicYearId: string; reason: string }) => {
    setSaving(true);
    try { setView(await studentCurriculumService.removeCourse(studentId, subjectId, courseId, body)); message.success('Curso retirado'); }
    catch (e: any) { message.error(e.response?.data?.message || 'No se pudo retirar el curso'); }
    finally { setSaving(false); }
  }, []);

  return { view, loading, saving, load, changeBlock, addCourse, removeCourse };
}
