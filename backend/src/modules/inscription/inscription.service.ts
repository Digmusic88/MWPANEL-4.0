import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { parseInscriptionPdf } from './inscription-pdf.parser';
import { mapFieldsToInscription, InscriptionPreview } from './inscription-field-map';

export interface PlaceholderCandidate { id: string; firstName: string; birthDate: string | null; services: string | null; }
export type InscriptionPreviewResult = InscriptionPreview & {
  duplicateCandidateId: string | null;
  placeholderCandidates: PlaceholderCandidate[];
};

const ESCUELA_SERVICE_ID = 'f01c8615-e6f1-4c61-adc7-058f75bff6ed';
const CRYPTO_KEY = process.env.SECRETARIA_CRYPTO_KEY || '';

/** Normaliza para casar nombres: minúsculas, sin acentos, espacios colapsados. */
const normName = (s: string): string =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

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

    // Candidatos "placeholder": alumnos YA registrados con ficha incompleta (sin apellidos)
    // cuyo nombre de pila casa con la inscripción → ofrecer completar en vez de crear duplicado.
    const placeholderCandidates: PlaceholderCandidate[] = [];
    if (mapped.student.firstName) {
      const insTokens = normName(`${mapped.student.firstName} ${mapped.student.lastName || ''}`).split(' ').filter(Boolean);
      const rows = await this.ds.query(
        `SELECT s.id, s.first_name AS "firstName", to_char(s.birth_date,'YYYY-MM-DD') AS "birthDate",
                (SELECT string_agg(DISTINCT sv.name, ', ')
                   FROM secretaria.enrollments e JOIN secretaria.services sv ON sv.id=e.service_id
                  WHERE e.student_id=s.id) AS services
         FROM secretaria.students s
         WHERE (s.last_name IS NULL OR btrim(s.last_name)='')
           AND s.first_name IS NOT NULL AND btrim(s.first_name)<>'' AND s.is_active=true`);
      for (const r of rows) {
        if (r.id === duplicateCandidateId) continue;
        const ph = normName(r.firstName).split(' ').filter(Boolean);
        // el nombre de pila (primer token) debe coincidir y todos los tokens del placeholder
        // deben estar contenidos en el nombre completo de la inscripción
        if (!ph.length || ph[0] !== insTokens[0]) continue;
        if (ph.every((t) => insTokens.includes(t))) {
          placeholderCandidates.push({ id: r.id, firstName: r.firstName, birthDate: r.birthDate, services: r.services });
        }
      }
      if (placeholderCandidates.length) {
        mapped.warnings.push(`Hay ${placeholderCandidates.length} alumno(s) ya registrado(s) con ficha incompleta que podrían ser este mismo — considera completar uno en vez de crear uno nuevo`);
      }
    }

    return { ...mapped, duplicateCandidateId, placeholderCandidates };
  }

  async commit(
    payload: InscriptionPreview,
    academicYearId: string,
    confirmedDuplicateId?: string | null,
    mergeIntoStudentId?: string | null,
  ): Promise<{ studentId: string; created: boolean; merged?: boolean }> {
    if (!academicYearId) throw new BadRequestException('Falta el curso académico');
    if (confirmedDuplicateId) return { studentId: confirmedDuplicateId, created: false };
    if (mergeIntoStudentId) return this.mergeInto(payload, academicYearId, mergeIntoStudentId);
    const s = payload.student;
    if (!s.firstName || !s.lastName) throw new BadRequestException('Faltan nombre/apellidos del alumno');
    if (!payload.family?.displayName) throw new BadRequestException('Falta el nombre de la familia');
    if (payload.student.medicalText && !CRYPTO_KEY) throw new BadRequestException('Falta SECRETARIA_CRYPTO_KEY en el servidor');
    if (payload.bank?.iban && !CRYPTO_KEY) throw new BadRequestException('Falta SECRETARIA_CRYPTO_KEY en el servidor');

    return this.ds.transaction(async (m) => {
      // 1) Familia
      const famRows = await m.query(
        `INSERT INTO secretaria.families(display_name, siblings, notes) VALUES ($1,$2,$3) RETURNING id`,
        [payload.family.displayName, payload.family.siblings || null, payload.family.notes || null],
      );
      const familyId = famRows[0].id;

      // 2) Tutores
      for (const guard of payload.guardians || []) {
        await m.query(
          `INSERT INTO secretaria.guardians(family_id, full_name, relationship, nif, phone, email, profession, is_primary_contact)
           VALUES ($1,$2,$3::secretaria.guardian_relationship,$4,$5,$6,$7,$8)`,
          [familyId, guard.fullName, guard.relationship, guard.nif || null, guard.phone || null, guard.email || null, guard.profession || null, guard.isPrimary],
        );
      }

      // 3) Alumno (columnas de la entidad por SQL crudo para incluir médico/consentimientos)
      const stuRows = await m.query(
        `INSERT INTO secretaria.students(family_id, first_name, last_name, birth_date, birth_place, email, phone, address, city, interests, notes,
           medical_notes_encrypted, photo_consent, exit_consent, is_active)
         VALUES ($1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10,$11,
           CASE WHEN $12 <> '' THEN pgp_sym_encrypt($12,$13) ELSE NULL END,
           COALESCE($14, false), COALESCE($15, false), true)
         RETURNING id`,
        [familyId, s.firstName, s.lastName, s.birthDate, s.birthPlace || null, s.email || null, s.phone || null,
         s.address || null, s.city || null, s.interests || null, s.notes || null,
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

  /** Completa un alumno YA registrado (ficha incompleta) con los datos de la inscripción,
   *  rellenando SOLO campos vacíos (nunca sobrescribe), añadiendo tutores faltantes y la
   *  matrícula ESCUELA 'preinscrito'. No crea un alumno nuevo. */
  private async mergeInto(
    payload: InscriptionPreview,
    academicYearId: string,
    targetId: string,
  ): Promise<{ studentId: string; created: boolean; merged: boolean }> {
    const s = payload.student;
    if (payload.student.medicalText && !CRYPTO_KEY) throw new BadRequestException('Falta SECRETARIA_CRYPTO_KEY en el servidor');
    if (payload.bank?.iban && !CRYPTO_KEY) throw new BadRequestException('Falta SECRETARIA_CRYPTO_KEY en el servidor');

    return this.ds.transaction(async (m) => {
      const [target] = await m.query(`SELECT id, family_id FROM secretaria.students WHERE id=$1 FOR UPDATE`, [targetId]);
      if (!target) throw new BadRequestException('El alumno a completar no existe');

      // Alumno: rellenar SOLO campos vacíos
      await m.query(
        `UPDATE secretaria.students SET
           first_name  = COALESCE(NULLIF(first_name,''),  $2),
           last_name   = COALESCE(NULLIF(last_name,''),   $3),
           birth_date  = COALESCE(birth_date,             $4::date),
           birth_place = COALESCE(NULLIF(birth_place,''), $5),
           email       = COALESCE(NULLIF(email,''),       $6),
           phone       = COALESCE(NULLIF(phone,''),       $7),
           address     = COALESCE(NULLIF(address,''),     $8),
           city        = COALESCE(NULLIF(city,''),        $9),
           interests   = COALESCE(NULLIF(interests,''),   $10),
           notes       = COALESCE(NULLIF(notes,''),       $11),
           medical_notes_encrypted = CASE WHEN medical_notes_encrypted IS NULL AND $12 <> ''
                                          THEN pgp_sym_encrypt($12,$13) ELSE medical_notes_encrypted END,
           photo_consent = COALESCE(photo_consent, $14),
           exit_consent  = COALESCE(exit_consent,  $15)
         WHERE id=$1`,
        [targetId, s.firstName || null, s.lastName || null, s.birthDate || null, s.birthPlace || null,
         s.email || null, s.phone || null, s.address || null, s.city || null, s.interests || null, s.notes || null,
         s.medicalText || '', CRYPTO_KEY, s.photoConsent, s.exitConsent],
      );

      // Familia del target (crear una si el placeholder no tuviera); completar hermanos si vacío
      let familyId = target.family_id;
      if (!familyId) {
        const fam = await m.query(
          `INSERT INTO secretaria.families(display_name, siblings) VALUES ($1,$2) RETURNING id`,
          [payload.family?.displayName || s.lastName || s.firstName || 'Familia', payload.family?.siblings || null]);
        familyId = fam[0].id;
        await m.query(`UPDATE secretaria.students SET family_id=$1 WHERE id=$2`, [familyId, targetId]);
      } else if (payload.family?.siblings) {
        await m.query(`UPDATE secretaria.families SET siblings = COALESCE(NULLIF(siblings,''), $2) WHERE id=$1`, [familyId, payload.family.siblings]);
      }

      // Tutores: añadir SOLO los que no existan ya en la familia (por nombre normalizado)
      const existing = await m.query(`SELECT full_name FROM secretaria.guardians WHERE family_id=$1`, [familyId]);
      const existingNorm = new Set<string>(existing.map((g: any) => normName(g.full_name)));
      let primaryAssigned = (await m.query(`SELECT 1 FROM secretaria.guardians WHERE family_id=$1 AND is_primary_contact=true LIMIT 1`, [familyId])).length > 0;
      for (const guard of payload.guardians || []) {
        if (!guard.fullName || existingNorm.has(normName(guard.fullName))) continue;
        const isPrimary = !!guard.isPrimary && !primaryAssigned;
        if (isPrimary) primaryAssigned = true;
        await m.query(
          `INSERT INTO secretaria.guardians(family_id, full_name, relationship, nif, phone, email, profession, is_primary_contact)
           VALUES ($1,$2,$3::secretaria.guardian_relationship,$4,$5,$6,$7,$8)`,
          [familyId, guard.fullName, guard.relationship, guard.nif || null, guard.phone || null, guard.email || null, guard.profession || null, isPrimary]);
        existingNorm.add(normName(guard.fullName));
      }

      // Matrícula ESCUELA 'preinscrito' para el año (si no la tuviera ya)
      const already = await m.query(
        `SELECT 1 FROM secretaria.enrollments WHERE student_id=$1 AND academic_year_id=$2 AND service_id=$3 LIMIT 1`,
        [targetId, academicYearId, ESCUELA_SERVICE_ID]);
      if (!already.length) {
        await m.query(
          `INSERT INTO secretaria.enrollments(student_id, academic_year_id, service_id, status) VALUES ($1,$2,$3,'preinscrito')`,
          [targetId, academicYearId, ESCUELA_SERVICE_ID]);
      }

      // Banco: solo si viene IBAN y la familia no tiene ya cuenta activa
      if (payload.bank && payload.bank.iban) {
        const hasBank = (await m.query(`SELECT 1 FROM secretaria.bank_accounts WHERE family_id=$1 AND is_active=true LIMIT 1`, [familyId])).length > 0;
        if (!hasBank) {
          const iban = payload.bank.iban.replace(/\s+/g, '').toUpperCase();
          const last4 = iban.slice(-4);
          await m.query(
            `INSERT INTO secretaria.bank_accounts(family_id, iban_encrypted, iban_last4, holder_name, is_active)
             VALUES ($1, pgp_sym_encrypt($2,$3), $4, $5, true)`,
            [familyId, iban, CRYPTO_KEY, last4, payload.bank.holder || null]);
        }
      }

      return { studentId: targetId, created: false, merged: true };
    });
  }
}
