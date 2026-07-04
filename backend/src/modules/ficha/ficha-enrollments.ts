export interface EnrollmentRow {
  academicYear: string | null;
  service: string | null;
  group: string | null;
  status: string;
  apoyoLevel: string | null;
  customFee: number | null;
  enrolledAt: string | null;
}

const ACTIVE_STATUSES = new Set(['matriculado', 'preinscrito']);

export function splitEnrollments(rows: EnrollmentRow[]): { active: EnrollmentRow[]; history: EnrollmentRow[] } {
  const active: EnrollmentRow[] = [];
  const history: EnrollmentRow[] = [];
  for (const r of rows) (ACTIVE_STATUSES.has(r.status) ? active : history).push(r);
  return { active, history };
}
