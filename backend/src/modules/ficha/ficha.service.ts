import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { splitEnrollments, EnrollmentRow } from './ficha-enrollments';

@Injectable()
export class FichaService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async buildFicha(mwStudentId: string): Promise<any | null> {
    const CRYPTO_KEY = process.env.SECRETARIA_CRYPTO_KEY || '';

    const s = (await this.ds.query(
      `SELECT id, family_id AS "familyId", first_name AS "firstName", last_name AS "lastName",
              to_char(birth_date,'YYYY-MM-DD') AS "birthDate", school_origin AS "schoolOrigin",
              grade_label AS "gradeLabel", address, postal_code AS "postalCode", city,
              photo_consent AS "photoConsent", exit_consent AS "exitConsent", notes,
              is_active AS "isActive", import_pending AS "importPending",
              import_pending_fields AS "importPendingFields",
              CASE WHEN medical_notes_encrypted IS NOT NULL AND $2 <> ''
                   THEN pgp_sym_decrypt(medical_notes_encrypted, $2) ELSE NULL END AS medical
       FROM secretaria.students WHERE mwpanel_student_id = $1`,
      [mwStudentId, CRYPTO_KEY]))[0];
    if (!s) return null;

    const family = s.familyId
      ? (await this.ds.query(
          `SELECT display_name AS "displayName", notes FROM secretaria.families WHERE id = $1`,
          [s.familyId]))[0]
      : null;

    const guardians = s.familyId
      ? await this.ds.query(
          `SELECT full_name AS "fullName", relationship::text AS relationship, nif,
                  phone, phone_alt AS "phoneAlt", email, is_primary_contact AS "isPrimaryContact"
           FROM secretaria.guardians WHERE family_id = $1
           ORDER BY is_primary_contact DESC, created_at ASC`,
          [s.familyId])
      : [];

    const rawEnrollments = await this.ds.query(
      `SELECT ay.label AS "academicYear", srv.name AS service, g.name AS "group",
              e.status::text AS status, e.apoyo_level::text AS "apoyoLevel",
              e.custom_fee AS "customFee", to_char(e.enrolled_at,'YYYY-MM-DD') AS "enrolledAt"
       FROM secretaria.enrollments e
       LEFT JOIN secretaria.academic_years ay ON ay.id = e.academic_year_id
       LEFT JOIN secretaria.services       srv ON srv.id = e.service_id
       LEFT JOIN secretaria.groups         g  ON g.id  = e.group_id
       WHERE e.student_id = $1
       ORDER BY e.enrolled_at DESC NULLS LAST, e.created_at DESC`,
      [s.id]);

    const enrollmentRows: EnrollmentRow[] = rawEnrollments.map((r: any) => ({
      academicYear: r.academicYear, service: r.service, group: r.group,
      status: r.status, apoyoLevel: r.apoyoLevel,
      customFee: r.customFee == null ? null : Number(r.customFee),
      enrolledAt: r.enrolledAt,
    }));

    return {
      student: {
        firstName: s.firstName, lastName: s.lastName, birthDate: s.birthDate,
        schoolOrigin: s.schoolOrigin, gradeLabel: s.gradeLabel,
        address: s.address, postalCode: s.postalCode, city: s.city,
        photoConsent: s.photoConsent, exitConsent: s.exitConsent, notes: s.notes,
        isActive: s.isActive, importPending: s.importPending, importPendingFields: s.importPendingFields,
      },
      medical: s.medical ?? null,
      family: family ? { displayName: family.displayName, notes: family.notes } : { displayName: null, notes: null },
      guardians,
      enrollments: splitEnrollments(enrollmentRows),
    };
  }
}
