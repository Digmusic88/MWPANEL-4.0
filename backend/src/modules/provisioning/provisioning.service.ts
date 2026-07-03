// provisioning.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { buildEnrollmentDto, MapGuardian } from './enrollment-map';
import { signAdminToken, postEnrollment } from './mwpanel-client';

export const LEVELS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Educación Infantil' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Educación Primaria' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Educación Secundaria Obligatoria' },
];

export type ProvisionStatus = 'created' | 'already' | 'blocked' | 'error';
export interface ProvisionResult { status: ProvisionStatus; mwpanelStudentId?: string; mwpanelFamilyId?: string; studentLoginEmail?: string; blockers?: string[]; message?: string }

function randomPassword(): string {
  return 'Mw' + Math.random().toString(36).slice(2, 10) + '9';
}
function genEnrollmentNumber(): string {
  return `MW-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

@Injectable()
export class ProvisioningService {
  private adminId: string | null = null;
  private inFlight = new Set<string>();
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async getAdminId(): Promise<string> {
    if (this.adminId) return this.adminId;
    const rows = await this.ds.query(`SELECT id FROM public.users WHERE role='admin' AND "isActive"=true LIMIT 1`);
    if (!rows.length) throw new BadRequestException('No hay un admin de MW Panel para autenticar la creación de cuentas');
    this.adminId = rows[0].id;
    return this.adminId;
  }

  async provision(studentId: string, educationalLevelId: string): Promise<ProvisionResult> {
    if (this.inFlight.has(studentId)) return { status: 'error', message: 'Aprovisionamiento en curso para este alumno' };
    this.inFlight.add(studentId);
    try {
      const s = (await this.ds.query(
        `SELECT first_name AS "firstName", last_name AS "lastName", to_char(birth_date,'YYYY-MM-DD') AS "birthDate", mwpanel_student_id AS "mwpanelStudentId", family_id AS "familyId"
         FROM secretaria.students WHERE id=$1`, [studentId]))[0];
      if (!s) throw new BadRequestException('Alumno no encontrado');
      if (s.mwpanelStudentId) return { status: 'already', mwpanelStudentId: s.mwpanelStudentId };

      if (!LEVELS.some(l => l.id === educationalLevelId)) return { status: 'blocked', blockers: ['Nivel educativo inválido'] };

      const guardians: MapGuardian[] = s.familyId ? await this.ds.query(
        `SELECT full_name AS "fullName", email, phone, is_primary_contact AS "isPrimary" FROM secretaria.guardians WHERE family_id=$1`, [s.familyId]) : [];

      const enrollmentNumber = genEnrollmentNumber();
      const token = signAdminToken(await this.getAdminId());

      for (let suffix = 0; suffix <= 5; suffix++) {
        const { dto, blockers } = buildEnrollmentDto(
          { firstName: s.firstName, lastName: s.lastName, birthDate: s.birthDate },
          guardians,
          { educationalLevelId, enrollmentNumber, studentPassword: randomPassword(), primaryPassword: randomPassword(), secondaryPassword: randomPassword(), emailSuffix: suffix || undefined },
        );
        if (!dto) return { status: 'blocked', blockers };

        let res;
        try { res = await postEnrollment(dto, token); }
        catch (e: any) { return { status: 'error', message: 'No se pudo contactar con MW Panel: ' + (e?.message || 'error de red') }; }
        if (res.status === 201) {
          const mwStudentId = res.body?.student?.id;
          const mwFamilyId = res.body?.family?.id;
          if (mwStudentId) await this.ds.query(`UPDATE secretaria.students SET mwpanel_student_id=$2 WHERE id=$1`, [studentId, mwStudentId]);
          if (mwFamilyId && s.familyId) await this.ds.query(`UPDATE secretaria.families SET mwpanel_family_id=COALESCE(mwpanel_family_id,$2) WHERE id=$1`, [s.familyId, mwFamilyId]);
          return { status: 'created', mwpanelStudentId: mwStudentId, mwpanelFamilyId: mwFamilyId, studentLoginEmail: dto.student.email };
        }
        // 409 con email de alumno duplicado → reintentar con sufijo
        const msg = (res.body?.message || '').toString().toLowerCase();
        const isStudentEmailDup = res.status === 409 && msg.includes(dto.student.email.toLowerCase());
        if (!isStudentEmailDup) {
          return { status: 'error', message: res.body?.message || `MW Panel respondió ${res.status}` };
        }
        // si es dup del email del alumno, el bucle reintenta con suffix+1
      }
      return { status: 'error', message: 'No se pudo generar un email de acceso único para el alumno' };
    } finally {
      this.inFlight.delete(studentId);
    }
  }
}
