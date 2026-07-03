// mwpanel-source.ts
import { DataSource } from 'typeorm';
import { MwGuardianSrc } from './backfill-plan';

export interface MwStudentSrc {
  mwStudentId: string; firstName: string; lastName: string;
  birthDate: string | null; address: string | null; enrollmentNumber: string | null;
  mwFamilyId: string | null;
  guardians: MwGuardianSrc[];
}
export interface SecStudentRow { id: string; firstName: string; lastName: string; birthDate: string | null }

export async function readActiveMwStudents(ds: DataSource): Promise<MwStudentSrc[]> {
  const rows = await ds.query(`
    SELECT s.id AS "mwStudentId",
           COALESCE(p."firstName",'') AS "firstName",
           COALESCE(p."lastName",'')  AS "lastName",
           to_char(s."birthDate", 'YYYY-MM-DD') AS "birthDate",
           NULLIF(p.address,'') AS address,
           NULLIF(s."enrollmentNumber",'') AS "enrollmentNumber",
           (SELECT fs."familyId" FROM public.family_students fs WHERE fs."studentId" = s.id LIMIT 1) AS "mwFamilyId"
    FROM public.students s
    JOIN public.users u ON u.id = s."userId" AND u."isActive" = true
    LEFT JOIN public.user_profiles p ON p."userId" = s."userId"
    WHERE NOT EXISTS (SELECT 1 FROM secretaria.students ss WHERE ss.mwpanel_student_id = s.id)
    ORDER BY s.id
  `);
  // tutores por alumno: primary + secondary contact de la familia
  const guardians: any[] = await ds.query(`
    SELECT fs."studentId" AS "mwStudentId",
           trim(COALESCE(cp."firstName",'') || ' ' || COALESCE(cp."lastName",'')) AS "fullName",
           NULLIF(cp.phone,'') AS phone,
           cu.email AS email,
           (f."primaryContactId" = cu.id) AS "isPrimary"
    FROM public.family_students fs
    JOIN public.families f ON f.id = fs."familyId"
    JOIN LATERAL (VALUES (f."primaryContactId"), (f."secondaryContactId")) AS c(uid) ON c.uid IS NOT NULL
    JOIN public.users cu ON cu.id = c.uid
    LEFT JOIN public.user_profiles cp ON cp."userId" = cu.id
  `);
  const byStudent = new Map<string, MwGuardianSrc[]>();
  for (const g of guardians) {
    const list = byStudent.get(g.mwStudentId) || byStudent.set(g.mwStudentId, []).get(g.mwStudentId)!;
    list.push({ fullName: g.fullName, phone: g.phone, email: g.email, isPrimary: !!g.isPrimary });
  }
  return rows.map((r: any) => ({ ...r, guardians: byStudent.get(r.mwStudentId) || [] }));
}

export async function readUnlinkedSecretariaStudents(ds: DataSource): Promise<SecStudentRow[]> {
  return ds.query(`
    SELECT id, COALESCE(first_name,'') AS "firstName", COALESCE(last_name,'') AS "lastName",
           to_char(birth_date, 'YYYY-MM-DD') AS "birthDate"
    FROM secretaria.students
    WHERE mwpanel_student_id IS NULL
  `);
}
