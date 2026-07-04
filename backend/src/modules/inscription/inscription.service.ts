import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { parseInscriptionPdf } from './inscription-pdf.parser';
import { mapFieldsToInscription, InscriptionPreview } from './inscription-field-map';

export type InscriptionPreviewResult = InscriptionPreview & { duplicateCandidateId: string | null };

const ESCUELA_SERVICE_ID = 'f01c8615-e6f1-4c61-adc7-058f75bff6ed';
const CRYPTO_KEY = process.env.SECRETARIA_CRYPTO_KEY || '';

@Injectable()
export class InscriptionService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async preview(buffer: Buffer): Promise<InscriptionPreviewResult> {
    const { fields, group4 } = await parseInscriptionPdf(buffer);
    const mapped = mapFieldsToInscription(fields, group4);
    let duplicateCandidateId: string | null = null;
    if (mapped.student.firstName && mapped.student.lastName && mapped.student.birthDate) {
      const rows = await this.ds.query(
        `SELECT id FROM secretaria.students WHERE lower(first_name)=lower($1) AND lower(last_name)=lower($2) AND birth_date=$3::date LIMIT 1`,
        [mapped.student.firstName, mapped.student.lastName, mapped.student.birthDate],
      );
      if (rows.length) { duplicateCandidateId = rows[0].id; mapped.warnings.push('Ya existe un alumno con ese nombre y fecha de nacimiento'); }
    }
    return { ...mapped, duplicateCandidateId };
  }

  async commit(
    payload: InscriptionPreview,
    academicYearId: string,
    confirmedDuplicateId?: string | null,
  ): Promise<{ studentId: string; created: boolean }> {
    if (!academicYearId) throw new BadRequestException('Falta el curso académico');
    if (confirmedDuplicateId) return { studentId: confirmedDuplicateId, created: false };
    const s = payload.student;
    if (!s.firstName || !s.lastName) throw new BadRequestException('Faltan nombre/apellidos del alumno');
    if (!payload.family?.displayName) throw new BadRequestException('Falta el nombre de la familia');
    if (payload.student.medicalText && !CRYPTO_KEY) throw new BadRequestException('Falta SECRETARIA_CRYPTO_KEY en el servidor');
    if (payload.bank?.iban && !CRYPTO_KEY) throw new BadRequestException('Falta SECRETARIA_CRYPTO_KEY en el servidor');

    return this.ds.transaction(async (m) => {
      // 1) Familia
      const famRows = await m.query(
        `INSERT INTO secretaria.families(display_name, notes) VALUES ($1,$2) RETURNING id`,
        [payload.family.displayName, payload.family.notes || null],
      );
      const familyId = famRows[0].id;

      // 2) Tutores
      for (const guard of payload.guardians || []) {
        await m.query(
          `INSERT INTO secretaria.guardians(family_id, full_name, relationship, nif, phone, email, is_primary_contact)
           VALUES ($1,$2,$3::secretaria.guardian_relationship,$4,$5,$6,$7)`,
          [familyId, guard.fullName, guard.relationship, guard.nif || null, guard.phone || null, guard.email || null, guard.isPrimary],
        );
      }

      // 3) Alumno (columnas de la entidad por SQL crudo para incluir médico/consentimientos)
      const stuRows = await m.query(
        `INSERT INTO secretaria.students(family_id, first_name, last_name, birth_date, address, city, notes,
           medical_notes_encrypted, photo_consent, exit_consent, is_active)
         VALUES ($1,$2,$3,$4::date,$5,$6,$7,
           CASE WHEN $8 <> '' THEN pgp_sym_encrypt($8,$9) ELSE NULL END,
           COALESCE($10, false), COALESCE($11, false), true)
         RETURNING id`,
        [familyId, s.firstName, s.lastName, s.birthDate, s.address || null, s.city || null, s.notes || null,
         s.medicalText || '', CRYPTO_KEY, s.photoConsent, s.exitConsent],
      );
      const studentId = stuRows[0].id;

      // 4) Matrícula ESCUELA 'preinscrito'
      await m.query(
        `INSERT INTO secretaria.enrollments(student_id, academic_year_id, service_id, status)
         VALUES ($1,$2,$3,'preinscrito')`,
        [studentId, academicYearId, ESCUELA_SERVICE_ID],
      );

      // 5) Banco (solo si viene IBAN)
      if (payload.bank && payload.bank.iban) {
        const iban = payload.bank.iban.replace(/\s+/g, '').toUpperCase();
        const last4 = iban.slice(-4);
        await m.query(
          `INSERT INTO secretaria.bank_accounts(family_id, iban_encrypted, iban_last4, holder_name, is_active)
           VALUES ($1, pgp_sym_encrypt($2,$3), $4, $5, true)`,
          [familyId, iban, CRYPTO_KEY, last4, payload.bank.holder || null],
        );
      }

      return { studentId, created: true };
    });
  }
}
