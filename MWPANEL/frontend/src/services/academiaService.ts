import apiClient from '@services/apiClient';

export interface AcademiaGroup { id: string; name: string; programName?: string; serviceName?: string; room?: string; studentCount?: number; }
export interface GridStudent { enrollmentId: string; studentName: string; }
export interface GridData { students: GridStudent[]; dates: string[]; records: Record<string, Record<string, string>>; }
export interface AttRecord { enrollmentId: string; status: string; notes?: string; }
export interface TarRecord { enrollmentId: string; level: string; notes?: string; }
export interface AcademiaSlot {
  id: string; groupId: string; weekday: number; startTime: string; endTime: string;
  room?: string; groupName?: string; teacherName?: string; color?: string;
  programName?: string; serviceName?: string; serviceColor?: string;
}

export const academiaService = {
  async myGroups(): Promise<{ hasAcademia: boolean; groups: AcademiaGroup[] }> {
    const { data } = await apiClient.get('/teacher/academia/my-groups');
    return data;
  },
  async attendanceGrid(groupId: string, date: string): Promise<GridData> {
    const { data } = await apiClient.get('/teacher/academia/attendance/grid', { params: { groupId, date } });
    return data;
  },
  async attendanceSave(date: string, records: AttRecord[]): Promise<{ ok: boolean; saved: number }> {
    const { data } = await apiClient.post('/teacher/academia/attendance/save', { date, records });
    return data;
  },
  async tareasGrid(groupId: string, date: string): Promise<GridData> {
    const { data } = await apiClient.get('/teacher/academia/tareas/grid', { params: { groupId, date } });
    return data;
  },
  async tareasSave(date: string, records: TarRecord[]): Promise<{ ok: boolean; saved: number }> {
    const { data } = await apiClient.post('/teacher/academia/tareas/save', { date, records });
    return data;
  },
  async schedule(academicYearId?: string, groupId?: string): Promise<AcademiaSlot[]> {
    const { data } = await apiClient.get('/teacher/academia/schedule', { params: { academicYearId, groupId } });
    return Array.isArray(data) ? data : [];
  },
};
