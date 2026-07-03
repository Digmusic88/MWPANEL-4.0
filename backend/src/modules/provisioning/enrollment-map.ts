export interface MapStudent { firstName: string; lastName: string; birthDate: string | null }
export interface MapGuardian { fullName: string; email: string | null; phone: string | null; isPrimary: boolean }
export interface MapOpts { educationalLevelId: string; enrollmentNumber: string; studentPassword: string; primaryPassword: string; secondaryPassword: string; emailSuffix?: number }
export interface EnrollmentContact { firstName: string; lastName?: string; email: string; password: string; phone: string }
export interface EnrollmentDto {
  student: { firstName: string; lastName: string; email: string; password: string; birthDate?: string; enrollmentNumber: string; educationalLevelId: string };
  family: { primaryContact: EnrollmentContact; secondaryContact?: EnrollmentContact };
}

export function slug(s: string): string {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
export function studentEmail(firstName: string, lastName: string, suffix?: number): string {
  return `${slug(firstName)}.${slug(lastName)}${suffix ? suffix : ''}@mw.com`;
}
function splitName(fullName: string): { firstName: string; lastName?: string } {
  const parts = (fullName || '').trim().split(/\s+/);
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');
  return { firstName, lastName: lastName || undefined };
}
const empty = (v: string | null | undefined) => v === null || v === undefined || String(v).trim() === '';

export function buildEnrollmentDto(student: MapStudent, guardians: MapGuardian[], opts: MapOpts): { dto: EnrollmentDto | null; blockers: string[] } {
  const blockers: string[] = [];
  if (empty(student.birthDate)) blockers.push('Falta la fecha de nacimiento del alumno');
  const withEmail = (guardians || []).filter(g => !empty(g.email));
  if (withEmail.length === 0) blockers.push('Ningún tutor tiene email; añádelo antes de crear la cuenta');
  if (empty(opts.educationalLevelId)) blockers.push('Elige el nivel educativo');
  if (blockers.length) return { dto: null, blockers };

  const primary = withEmail.find(g => g.isPrimary) || withEmail[0];
  const secondary = withEmail.find(g => g !== primary);
  const toContact = (g: MapGuardian, password: string): EnrollmentContact => {
    const n = splitName(g.fullName);
    return { firstName: n.firstName, lastName: n.lastName, email: g.email as string, password, phone: empty(g.phone) ? '000000000' : (g.phone as string) };
  };

  const dto: EnrollmentDto = {
    student: {
      firstName: student.firstName, lastName: student.lastName,
      email: studentEmail(student.firstName, student.lastName, opts.emailSuffix),
      password: opts.studentPassword,
      birthDate: student.birthDate as string,
      enrollmentNumber: opts.enrollmentNumber,
      educationalLevelId: opts.educationalLevelId,
    },
    family: { primaryContact: toContact(primary, opts.primaryPassword) },
  };
  if (secondary) dto.family.secondaryContact = toContact(secondary, opts.secondaryPassword);
  return { dto, blockers: [] };
}
