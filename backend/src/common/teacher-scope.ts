import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Utilidades RGPD: acotan a un profesor (secretaria_teacher SIN rol de gestión)
 * a los datos de SUS grupos. Si el usuario también es admin/staff/direccion,
 * no se aplica restricción (acceso de gestión).
 */

export function isOnlyTeacher(user: any): boolean {
  const roles: string[] = user?.secretariaRoles || [];
  return roles.includes('secretaria_teacher')
    && !roles.some(r => ['secretaria_admin', 'secretaria_staff', 'direccion'].includes(r));
}

/** teacher.id de secretaría a partir del usuario autenticado (o null). */
export async function teacherIdOf(ds: DataSource, userId: string): Promise<string | null> {
  const r = await ds.query(
    `SELECT id FROM secretaria.teachers WHERE user_id=$1 AND is_active=true LIMIT 1`,
    [userId],
  );
  return r[0]?.id || null;
}

/** 403 si el profesor (solo-teacher) no es titular del grupo. */
export async function assertTeacherOwnsGroup(ds: DataSource, user: any, groupId: string): Promise<void> {
  if (!isOnlyTeacher(user)) return;
  const r = await ds.query(
    `SELECT 1 FROM secretaria.groups g
     JOIN secretaria.teachers t ON t.id=g.teacher_id
     WHERE g.id=$1 AND t.user_id=$2 LIMIT 1`,
    [groupId, user.id],
  );
  if (!r[0]) throw new ForbiddenException('No tienes acceso a este grupo');
}

/** 403 si el profesor (solo-teacher) no es titular del grupo de alguna de las matrículas. */
export async function assertTeacherOwnsEnrollments(ds: DataSource, user: any, enrollmentIds: string[]): Promise<void> {
  if (!isOnlyTeacher(user) || !enrollmentIds?.length) return;
  const unique = Array.from(new Set(enrollmentIds));
  const owned = await ds.query(
    `SELECT e.id FROM secretaria.enrollments e
     JOIN secretaria.groups g ON g.id=e.group_id
     JOIN secretaria.teachers t ON t.id=g.teacher_id
     WHERE t.user_id=$1 AND e.id = ANY($2::uuid[])`,
    [user.id, unique],
  );
  if (owned.length !== unique.length) {
    throw new ForbiddenException('Alguna matrícula está fuera de tus grupos');
  }
}
