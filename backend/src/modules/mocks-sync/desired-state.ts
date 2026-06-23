export type GroupStudentRow = {
  groupExternalId: string;
  groupName: string;
  examType: string;
  studentExternalId: string | null;
  firstName: string | null;
  lastName: string | null;
  mockUserId?: number | null;
};

export type DesiredStudent = { externalId: string; fullName: string; mockUserId: number | null; firstName: string; lastName: string };
export type DesiredGroup = {
  externalId: string;
  name: string;
  examType: string;
  students: DesiredStudent[];
};

/** Agrupa filas planas (grupo × alumno) en el payload del reconcile. */
export function buildDesiredState(rows: GroupStudentRow[]): DesiredGroup[] {
  const groups = new Map<string, DesiredGroup>();
  const seen = new Map<string, Set<string>>(); // groupExtId -> studentExtIds
  for (const r of rows) {
    let g = groups.get(r.groupExternalId);
    if (!g) {
      g = { externalId: r.groupExternalId, name: r.groupName, examType: r.examType, students: [] };
      groups.set(r.groupExternalId, g);
      seen.set(r.groupExternalId, new Set());
    }
    if (r.studentExternalId) {
      const s = seen.get(r.groupExternalId)!;
      if (!s.has(r.studentExternalId)) {
        s.add(r.studentExternalId);
        const fullName = `${r.firstName ?? ''} ${r.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
        g.students.push({
          externalId: r.studentExternalId, fullName, mockUserId: r.mockUserId ?? null,
          firstName: (r.firstName ?? '').trim(), lastName: (r.lastName ?? '').trim(),
        });
      }
    }
  }
  return [...groups.values()];
}
