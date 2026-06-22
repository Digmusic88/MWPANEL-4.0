import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Student, Enrollment } from './entities';
import { Family } from '../families/entities';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { VersionConflictException } from '../../common/optimistic-lock';

class QuickEnrollDto {
  @IsString() studentName: string;
  @IsString() phone: string;
  @IsOptional() @IsUUID() serviceId?: string;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) serviceIds?: string[];
  @IsOptional() @IsUUID() academicYearId?: string;
}
class AddEnrollmentDto {
  @IsUUID() serviceId: string;
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsBoolean() matriculate?: boolean; // si true, lo matricula directamente (en vez de preinscribir)
}
class EnrollFeeDto {
  @IsNumber() customFee: number;
  @IsOptional() @IsString() customFeeReason?: string;
}

// ---- IBAN helpers (mirrors sepa.controller validators — kept local to avoid touching working SEPA code) ----
const SECRETARIA_CRYPTO_KEY = process.env.SECRETARIA_CRYPTO_KEY || '';
function normalizeIban(raw: string): string { return (raw || '').replace(/\s+/g, '').toUpperCase(); }
function isValidIban(raw: string): boolean {
  const s = normalizeIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearr = s.slice(4) + s.slice(0, 4);
  const expanded = rearr.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString());
  let rem = 0;
  for (const ch of expanded) rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97;
  return rem === 1;
}
class StudentBankDto {
  @IsString() iban: string;
  @IsOptional() @IsString() holderName?: string;
  @IsString() scope: 'familia' | 'alumno';
}

@Controller('secretaria/students')
@UseGuards(SecretariaAuthGuard)
export class StudentsController {
  constructor(
    @InjectRepository(Student) private students: Repository<Student>,
    @InjectRepository(Enrollment) private enrollments: Repository<Enrollment>,
    @InjectRepository(Family) private families: Repository<Family>,
    private ds: DataSource,
  ) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  // Categoría global del alumno: el estado de mayor prioridad entre sus inscripciones (ignorando 'baja')
  private studentCategory(enrollments: any[]): string {
    const PRIO: Record<string, number> = { matriculado: 4, pendiente: 3, lista_espera: 2, preinscrito: 1 };
    const BY_PRIO = ['sin_inscripcion', 'preinscrito', 'lista_espera', 'pendiente', 'matriculado'];
    let best = 0;
    for (const e of enrollments || []) {
      if (!e || e.status === 'baja') continue;
      best = Math.max(best, PRIO[e.status] || 0);
    }
    return BY_PRIO[best];
  }

  // Lista de alumnos con los servicios en los que está matriculado este curso (puede ser más de uno)
  @Get() @Roles('secretaria_admin','secretaria_staff','direccion') async list(@Query('q') q?: string, @Query('pending') onlyPending?: string, @Query('category') category?: string) {
    const rows = await this.ds.query(`
      SELECT s.id, s.first_name AS "firstName", s.last_name AS "lastName",
             s.is_active AS "isActive",
             s.mwpanel_student_id AS "mwpanelStudentId", s.family_id AS "familyId",
             COALESCE(json_agg(
               json_build_object('enrollmentId', e.id, 'serviceId', sv.id,
                                 'serviceName', sv.name, 'status', e.status,
                                 'groupId', e.group_id, 'groupName', g.name)
               ORDER BY sv.name) FILTER (WHERE ay.id IS NOT NULL), '[]') AS "enrollments",
             -- Pendientes calculados dinámicamente
             ARRAY_REMOVE(
               ARRAY[
                 CASE WHEN s.last_name IS NULL OR s.last_name = '' THEN 'Apellidos' END,
                 CASE WHEN s.birth_date IS NULL THEN 'Fecha nacimiento' END
               ]
               || ARRAY(
                 SELECT 'Grupo sin asignar — ' || sv2.name
                 FROM secretaria.enrollments e2
                 JOIN secretaria.services sv2 ON sv2.id = e2.service_id
                 JOIN secretaria.academic_years ay2 ON ay2.id = e2.academic_year_id AND ay2.is_active
                 WHERE e2.student_id = s.id AND e2.status = 'matriculado' AND e2.group_id IS NULL
               )
               || ARRAY(
                 SELECT 'Matrícula pendiente — ' || sv3.name
                 FROM secretaria.charges ch
                 JOIN secretaria.enrollments e3 ON e3.id = ch.enrollment_id
                 JOIN secretaria.services sv3 ON sv3.id = e3.service_id
                 JOIN secretaria.academic_years ay3 ON ay3.id = e3.academic_year_id AND ay3.is_active
                 WHERE e3.student_id = s.id AND ch.concept = 'matricula' AND ch.status = 'pendiente'
                   AND e3.status = 'matriculado'  -- preinscrito/lista de espera no generan deuda obligatoria
               )
             , NULL) AS "pendingItems"
      FROM secretaria.students s
      LEFT JOIN secretaria.enrollments e ON e.student_id = s.id
      LEFT JOIN secretaria.academic_years ay ON ay.id = e.academic_year_id AND ay.is_active
      LEFT JOIN secretaria.services sv ON sv.id = e.service_id
      LEFT JOIN secretaria.groups g ON g.id = e.group_id
      WHERE s.is_active = true
        AND ($1::text IS NULL OR
             (COALESCE(s.first_name,'')||' '||COALESCE(s.last_name,'')) ILIKE '%'||$1||'%')
        -- Excluir alumnos cuyas matrículas están TODAS en baja (aparecen en la sección Bajas)
        AND (
          NOT EXISTS (SELECT 1 FROM secretaria.enrollments b WHERE b.student_id=s.id AND b.status='baja')
          OR EXISTS (SELECT 1 FROM secretaria.enrollments a WHERE a.student_id=s.id AND a.status<>'baja')
        )
      GROUP BY s.id
      HAVING ($2::boolean IS NOT TRUE OR
              array_length(
                ARRAY_REMOVE(
                  ARRAY[
                    CASE WHEN s.last_name IS NULL OR s.last_name = '' THEN 'x' END,
                    CASE WHEN s.birth_date IS NULL THEN 'x' END
                  ], NULL), 1) > 0
                 OR EXISTS (
                   SELECT 1 FROM secretaria.enrollments e4
                   WHERE e4.student_id = s.id AND e4.status = 'matriculado' AND e4.group_id IS NULL
                 )
                 OR EXISTS (
                   SELECT 1 FROM secretaria.charges ch2
                   JOIN secretaria.enrollments e5 ON e5.id = ch2.enrollment_id
                   WHERE e5.student_id = s.id AND ch2.concept = 'matricula' AND ch2.status = 'pendiente'
                     AND e5.status = 'matriculado'
                 )
              )
      ORDER BY s.last_name NULLS LAST, s.first_name`,
      [q || null, onlyPending === 'true' ? true : null]);
    for (const r of rows) r.category = this.studentCategory(r.enrollments);
    return category ? rows.filter((r: any) => r.category === category) : rows;
  }

  @Get(':id') @Roles('secretaria_admin','secretaria_staff','direccion') async one(@Param('id') id: string) {
    const s = await this.students.findOne({ where: { id } });
    const enr = await this.enrollments.find({ where: { studentId: id } });
    return { ...s, enrollments: enr };
  }

  // Ficha completa del alumno (datos, familia, matrículas, pruebas de nivel, documentos, economía, enlace mock)
  @Get(':id/ficha') @Roles('secretaria_admin','secretaria_staff','direccion')
  async ficha(@Param('id') id: string) {
    const student = (await this.ds.query(`
      SELECT st.id, st.first_name AS "firstName", st.last_name AS "lastName", st.birth_date AS "birthDate",
             st.school_origin AS "school", st.grade_label AS "grade", st.address, st.postal_code AS "postalCode", st.city,
             st.photo_consent AS "photoConsent", st.exit_consent AS "exitConsent", st.notes,
             st.mwpanel_student_id AS "mwpanelStudentId", st.mock_user_id AS "mockUserId",
             f.id AS "familyId", f.display_name AS "familyName",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "fullName"
      FROM secretaria.students st
      LEFT JOIN secretaria.families f ON f.id=st.family_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE st.id=$1`, [id]))[0];
    if (!student) return { error: 'Alumno no encontrado' };

    const guardians = await this.ds.query(`
      SELECT full_name AS "fullName", phone, phone_alt AS "phoneAlt", email, relationship::text AS relationship, is_primary_contact AS "isPrimary"
      FROM secretaria.guardians WHERE family_id=$1 ORDER BY is_primary_contact DESC`, [student.familyId]);

    const enrollments = await this.ds.query(`
      SELECT e.id, e.status, sv.name AS "serviceName", g.name AS "groupName",
             secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee",
             (SELECT count(*)::int FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.status='pagado') AS "paid",
             (SELECT count(*)::int FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.status='pendiente') AS "pending",
             (SELECT COALESCE(sum(c.amount_due),0) FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.status='pendiente') AS "pendingAmount"
      FROM secretaria.enrollments e
      JOIN secretaria.services sv ON sv.id=e.service_id
      LEFT JOIN secretaria.groups g ON g.id=e.group_id
      WHERE e.student_id=$1 ORDER BY sv.name`, [id]);

    const levelTests = await this.ds.query(`
      SELECT lt.test_date AS "testDate", lt.test_time AS "testTime", lt.result_level AS "resultLevel",
             COALESCE(t.full_name, lt.evaluator) AS "evaluator", pr.name AS "recommendedProgram", lt.notes
      FROM secretaria.level_tests lt
      LEFT JOIN secretaria.teachers t ON t.id=lt.evaluator_teacher_id
      LEFT JOIN secretaria.programs pr ON pr.id=lt.recommended_program_id
      WHERE lt.student_id=$1 ORDER BY lt.test_date DESC NULLS LAST`, [id]);

    const documents = await this.ds.query(`
      SELECT dt.name AS "document", sd.status
      FROM secretaria.student_documents sd JOIN secretaria.document_types dt ON dt.id=sd.document_type_id
      WHERE sd.student_id=$1 ORDER BY dt.name`, [id]);

    // Estadísticas individuales del alumno (todas sus matrículas): asistencia y tareas.
    const attendance = (await this.ds.query(`
      SELECT count(*) FILTER (WHERE a.status='presente')::int AS presente,
             count(*) FILTER (WHERE a.status='ausente')::int AS ausente,
             count(*) FILTER (WHERE a.status='justificada')::int AS justificada,
             count(*) FILTER (WHERE a.status='retraso')::int AS retraso,
             count(*)::int AS total
      FROM secretaria.attendance a JOIN secretaria.enrollments e ON e.id=a.enrollment_id
      WHERE e.student_id=$1`, [id]))[0];
    const tasks = (await this.ds.query(`
      SELECT count(*) FILTER (WHERE t.level='verde')::int AS verde,
             count(*) FILTER (WHERE t.level='naranja')::int AS naranja,
             count(*) FILTER (WHERE t.level='roja')::int AS roja,
             count(*)::int AS total
      FROM secretaria.task_records t JOIN secretaria.enrollments e ON e.id=t.enrollment_id
      WHERE e.student_id=$1`, [id]))[0];

    return { student, guardians, enrollments, levelTests, documents, attendance, tasks };
  }

  @Get(':id/full') @Roles('secretaria_admin','secretaria_staff','direccion')
  async oneFull(@Param('id') id: string) {
    const yearId = await this.activeYearId();

    const [student] = await this.ds.query(
      `SELECT s.id, s.first_name AS "firstName", s.last_name AS "lastName",
              s.birth_date AS "birthDate", s.grade_label AS "gradeLabel",
              s.school_origin AS "schoolOrigin",
              s.address, s.postal_code AS "postalCode", s.city, s.notes,
              s.mwpanel_student_id AS "mwpanelStudentId",
              s.family_id AS "familyId",
              s.updated_at AS "updatedAt"
       FROM secretaria.students s WHERE s.id = $1`, [id]);
    if (!student) return null;

    const guardians = await this.ds.query(
      `SELECT id, full_name AS "fullName", relationship, phone,
              phone_alt AS "phoneAlt", email, nif,
              is_primary_contact AS "isPrimary"
       FROM secretaria.guardians WHERE family_id = $1
       ORDER BY is_primary_contact DESC`, [student.familyId]);

    const enrollments = await this.ds.query(
      `SELECT e.id, e.service_id AS "serviceId", sv.name AS "serviceName",
              e.group_id AS "groupId", g.name AS "groupName",
              e.status, e.custom_fee AS "customFee",
              secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee"
       FROM secretaria.enrollments e
       JOIN secretaria.services sv ON sv.id = e.service_id
       LEFT JOIN secretaria.groups g ON g.id = e.group_id
       WHERE e.student_id = $1 AND e.academic_year_id = $2
       ORDER BY sv.name`, [id, yearId]);

    // Pendientes
    const pendingItems: string[] = [];
    if (!student.lastName) pendingItems.push('Apellidos');
    if (!student.birthDate) pendingItems.push('Fecha nacimiento');
    for (const enr of enrollments) {
      if (enr.status === 'matriculado' && !enr.groupId)
        pendingItems.push(`Grupo sin asignar — ${enr.serviceName}`);
    }
    const pendingMatriculas = await this.ds.query(
      `SELECT sv.name FROM secretaria.charges ch
       JOIN secretaria.enrollments e ON e.id = ch.enrollment_id
       JOIN secretaria.services sv ON sv.id = e.service_id
       WHERE e.student_id = $1 AND ch.concept = 'matricula' AND ch.status = 'pendiente'
         AND e.academic_year_id = $2 AND e.status = 'matriculado'`, [id, yearId]);
    for (const pm of pendingMatriculas) pendingItems.push(`Matrícula pendiente — ${pm.name}`);

    return { ...student, guardians, enrollments, pendingItems };
  }

  @Patch(':id/full') @Roles('secretaria_admin','secretaria_staff')
  async updateFull(@Param('id') id: string, @Body() b: any) {
    return this.ds.transaction(async (m) => {
      // Actualizar datos del alumno
      if (b.student) {
        const sets: string[] = [];
        const params: any[] = [];
        const push = (col: string, val: any) => { params.push(val); sets.push(`${col}=$${params.length}`); };
        if (b.student.firstName  !== undefined) push('first_name',    b.student.firstName  ?? null);
        if (b.student.lastName   !== undefined) push('last_name',     b.student.lastName   ?? null);
        if (b.student.birthDate  !== undefined) push('birth_date',    b.student.birthDate  ?? null);
        if (b.student.gradeLabel !== undefined) push('grade_label',   b.student.gradeLabel ?? null);
        if (b.student.schoolOrigin !== undefined) push('school_origin', b.student.schoolOrigin ?? null);
        if (b.student.address    !== undefined) push('address',       b.student.address    ?? null);
        if (b.student.postalCode !== undefined) push('postal_code',   b.student.postalCode ?? null);
        if (b.student.city       !== undefined) push('city',          b.student.city       ?? null);
        if (b.student.notes      !== undefined) push('notes',         b.student.notes      ?? null);
        if (sets.length > 0) {
          params.push(id);
          const idParam = params.length;
          if (b.expectedUpdatedAt) {
            // Comparacion de version en JS (robusta: no depende del shape de retorno de UPDATE en TypeORM).
            // SELECT ... FOR UPDATE bloquea la fila hasta el final de la transaccion, evitando carreras.
            const rows = await m.query(`SELECT updated_at FROM secretaria.students WHERE id=$1 FOR UPDATE`, [id]);
            if (!rows || rows.length === 0) {
              throw new VersionConflictException(null);
            }
            const current = new Date(rows[0].updated_at).getTime();
            const expected = new Date(b.expectedUpdatedAt).getTime();
            if (current !== expected) {
              const [cur] = await m.query(`SELECT * FROM secretaria.students WHERE id=$1`, [id]);
              throw new VersionConflictException(cur ?? null);
            }
          }
          // Aplicar el UPDATE (incondicional; el trigger BEFORE UPDATE sube updated_at).
          // `params` ya tiene los valores de columnas + id; idParam apunta al id.
          await m.query(`UPDATE secretaria.students SET ${sets.join(',')} WHERE id=$${idParam}`, params);
        }
      }

      // Upsert tutor principal (is_primary_contact = true)
      if (b.guardian1?.fullName) {
        const existing = await m.query(
          `SELECT g.id FROM secretaria.guardians g
           JOIN secretaria.students s ON s.family_id = g.family_id
           WHERE s.id = $1 AND g.is_primary_contact = true LIMIT 1`, [id]);
        if (existing.length > 0) {
          await m.query(
            `UPDATE secretaria.guardians SET
               full_name=$1, relationship=$2, phone=$3, phone_alt=$4, email=$5, nif=$6
             WHERE id=$7`,
            [b.guardian1.fullName, b.guardian1.relationship || 'tutor',
             b.guardian1.phone || null, b.guardian1.phoneAlt || null,
             b.guardian1.email || null, b.guardian1.nif || null,
             existing[0].id]);
        } else {
          const [student] = await m.query(`SELECT family_id FROM secretaria.students WHERE id=$1`, [id]);
          await m.query(
            `INSERT INTO secretaria.guardians
               (family_id, full_name, relationship, phone, phone_alt, email, nif, is_primary_contact)
             VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
            [student.family_id, b.guardian1.fullName, b.guardian1.relationship || 'tutor',
             b.guardian1.phone || null, b.guardian1.phoneAlt || null,
             b.guardian1.email || null, b.guardian1.nif || null]);
        }
      }

      // Upsert tutor secundario (is_primary_contact = false)
      if (b.guardian2?.fullName) {
        const [student] = await m.query(`SELECT family_id FROM secretaria.students WHERE id=$1`, [id]);
        const existing2 = await m.query(
          `SELECT id FROM secretaria.guardians WHERE family_id=$1 AND is_primary_contact=false LIMIT 1`,
          [student.family_id]);
        if (existing2.length > 0) {
          await m.query(
            `UPDATE secretaria.guardians SET
               full_name=$1, relationship=$2, phone=$3, phone_alt=$4, email=$5, nif=$6
             WHERE id=$7`,
            [b.guardian2.fullName, b.guardian2.relationship || 'tutor',
             b.guardian2.phone || null, b.guardian2.phoneAlt || null,
             b.guardian2.email || null, b.guardian2.nif || null,
             existing2[0].id]);
        } else {
          await m.query(
            `INSERT INTO secretaria.guardians
               (family_id, full_name, relationship, phone, phone_alt, email, nif, is_primary_contact)
             VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
            [student.family_id, b.guardian2.fullName, b.guardian2.relationship || 'tutor',
             b.guardian2.phone || null, b.guardian2.phoneAlt || null,
             b.guardian2.email || null, b.guardian2.nif || null]);
        }
      }

      return { ok: true };
    });
  }

  // Alta rápida de mostrador: crea familia + alumno + matrícula(s) preinscrita(s) en <1 min.
  // Acepta uno o varios servicios (serviceIds) — un alumno puede apuntarse a varios a la vez.
  @Post('quick-enroll') @Roles('secretaria_admin','secretaria_staff')
  async quickEnroll(@Body() b: QuickEnrollDto) {
    const yearId = b.academicYearId || (await this.activeYearId());
    const services = (b.serviceIds && b.serviceIds.length ? b.serviceIds : (b.serviceId ? [b.serviceId] : []));
    const family = await this.families.save(this.families.create({ displayName: b.studentName }));
    await this.ds.query(`INSERT INTO secretaria.guardians(family_id, full_name, phone, is_primary_contact) VALUES ($1,$2,$3,true)`, [family.id, b.studentName, b.phone]);
    const student = await this.students.save(this.students.create({ firstName: b.studentName, familyId: family.id }));
    const enrollments = [];
    for (const serviceId of services) {
      enrollments.push(await this.enrollments.save(this.enrollments.create({ studentId: student.id, academicYearId: yearId, serviceId, status: 'preinscrito' })));
    }
    return { family, student, enrollments };
  }

  // Apuntar a un alumno EXISTENTE a otro servicio (nueva matrícula del mismo curso)
  @Post(':id/enroll') @Roles('secretaria_admin','secretaria_staff')
  async addEnrollment(@Param('id') id: string, @Body() b: AddEnrollmentDto) {
    const yearId = b.academicYearId || (await this.activeYearId());
    const exists = await this.enrollments.findOne({ where: { studentId: id, academicYearId: yearId, serviceId: b.serviceId } });
    if (exists) return { ok: false, error: 'El alumno ya está apuntado a ese servicio este curso', enrollment: exists };
    const status = b.matriculate ? 'matriculado' : 'preinscrito';
    const enrollment: any = await this.enrollments.save(this.enrollments.create({
      studentId: id, academicYearId: yearId, serviceId: b.serviceId, status,
      ...(b.matriculate ? { enrolledAt: new Date() } : {}),
    } as any) as any);
    // Si se matricula directamente, genera recibos de matrícula y material si el programa los cobra
    if (b.matriculate) {
      for (const concept of ['matricula', 'material']) {
        await this.ds.query(`
          INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
          SELECT e.id, NULL, '${concept}', secretaria.fn_resolve_concept_fee(e.id,'${concept}'), 'pendiente'
          FROM secretaria.enrollments e
          WHERE e.id=$1 AND secretaria.fn_resolve_concept_fee(e.id,'${concept}') IS NOT NULL
            AND secretaria.fn_resolve_concept_fee(e.id,'${concept}') > 0
            AND NOT EXISTS (SELECT 1 FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.concept='${concept}')`,
          [enrollment.id]);
      }
    }
    return { ok: true, enrollment };
  }

  @Post('full-enroll') @Roles('secretaria_admin','secretaria_staff')
  async fullEnroll(@Body() b: any) {
    const yearId = b.academicYearId || (await this.activeYearId());

    return this.ds.transaction(async (m) => {
      // 1. Familia: existente (b.familyId) o nueva
      let familyId: string;
      if (b.familyId) {
        const f = await m.query(`SELECT id FROM secretaria.families WHERE id=$1`, [b.familyId]);
        if (!f[0]) throw new Error('Familia no encontrada');
        familyId = f[0].id;
      } else {
        const displayName = [b.student?.firstName, b.student?.lastName]
          .filter(Boolean).join(' ') || 'Familia sin nombre';
        const family = await m.save(m.create(Family, { displayName }));
        familyId = family.id;
        // Tutores solo al crear una familia nueva (la existente ya tiene los suyos)
        if (b.guardian1?.fullName) {
          await m.query(
            `INSERT INTO secretaria.guardians
               (family_id, full_name, relationship, phone, phone_alt, email, nif, is_primary_contact)
             VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
            [familyId, b.guardian1.fullName, b.guardian1.relationship || 'tutor',
             b.guardian1.phone || null, b.guardian1.phoneAlt || null, b.guardian1.email || null, b.guardian1.nif || null]);
        }
        if (b.guardian2?.fullName) {
          await m.query(
            `INSERT INTO secretaria.guardians
               (family_id, full_name, relationship, phone, phone_alt, email, nif, is_primary_contact)
             VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
            [familyId, b.guardian2.fullName, b.guardian2.relationship || 'tutor',
             b.guardian2.phone || null, b.guardian2.phoneAlt || null, b.guardian2.email || null, b.guardian2.nif || null]);
        }
      }

      // 4. Alumno
      const student = await m.save(m.create(Student, {
        familyId: familyId,
        firstName: b.student?.firstName || null,
        lastName:  b.student?.lastName  || null,
        birthDate: b.student?.birthDate || null,
        gradeLabel: b.student?.gradeLabel || null,
        schoolOrigin: b.student?.schoolOrigin || null,
        address: b.student?.address || null,
        postalCode: b.student?.postalCode || null,
        city: b.student?.city || null,
        notes: b.student?.notes || null,
      }));

      // 5. Matrículas + cargos
      const enrollments = [];
      const matriculaChargeIds: string[] = [];
      let totalMatricula = 0;

      for (const enrData of (b.enrollments || [])) {
        const enr = await m.save(m.create(Enrollment, {
          studentId: student.id,
          academicYearId: yearId,
          serviceId: enrData.serviceId,
          groupId: enrData.groupId || null,
          status: enrData.status || 'preinscrito',
          customFee: enrData.customFee ?? null,
        }));
        enrollments.push(enr);

        // Resolver importe matrícula para este enrollment
        const resolved = await m.query(
          `SELECT secretaria.fn_resolve_concept_fee($1,'matricula') AS amount`,
          [enr.id],
        );
        const matriculaAmount = Number(resolved[0]?.amount) || 0;
        if (matriculaAmount > 0) {
          totalMatricula += matriculaAmount;
          const chargeStatus = b.matriculaPaid ? 'pagado' : 'pendiente';
          const chargeRes = await m.query(
            `INSERT INTO secretaria.charges(enrollment_id, concept, amount_due, status)
             VALUES ($1,'matricula',$2,$3) RETURNING id`,
            [enr.id, matriculaAmount, chargeStatus],
          );
          if (b.matriculaPaid) matriculaChargeIds.push(chargeRes[0].id);
        }
      }

      // 6. Pago agrupado si se cobra matrícula ahora
      if (b.matriculaPaid && matriculaChargeIds.length > 0) {
        const paidAmount = b.matriculaPaid.amount ?? totalMatricula;
        const paidDate  = b.matriculaPaid.date || new Date().toISOString().slice(0, 10);
        const payRes = await m.query(
          `INSERT INTO secretaria.payments(family_id, amount, paid_at, method)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [familyId, paidAmount, paidDate, b.matriculaPaid.method],
        );
        const paymentId = payRes[0].id;
        const perCharge = Number((paidAmount / matriculaChargeIds.length).toFixed(2));
        for (let i = 0; i < matriculaChargeIds.length; i++) {
          const isLast = i === matriculaChargeIds.length - 1;
          const allocated = isLast
            ? Number((paidAmount - perCharge * i).toFixed(2))
            : perCharge;
          await m.query(
            `INSERT INTO secretaria.payment_allocations(payment_id, charge_id, amount)
             VALUES ($1,$2,$3)`,
            [paymentId, matriculaChargeIds[i], allocated],
          );
        }
      }

      return { family: { id: familyId }, student, enrollments };
    });
  }

  @Patch('enrollments/:id/fee') @Roles('secretaria_admin','secretaria_staff')
  async setEnrollmentFee(@Param('id') id: string, @Body() b: EnrollFeeDto) {
    await this.enrollments.update(id, { customFee: b.customFee, customFeeReason: b.customFeeReason });
    return this.enrollments.findOne({ where: { id } });
  }

  // Borrado inteligente de alumno (solo administrador):
  //  - Sin matrículas (alta por error) → borrado físico definitivo (limpia documentos/pruebas/táper).
  //  - Con matrículas/historial → baja lógica (is_active=false): sale del listado, conserva el histórico.
  @Delete(':id') @Roles('secretaria_admin')
  async remove(@Param('id') id: string) {
    return this.ds.transaction(async (m) => {
      const exists = await m.query(`SELECT id FROM secretaria.students WHERE id=$1`, [id]);
      if (!exists[0]) return { ok: false, error: 'Alumno no encontrado' };

      const enr = await m.query(`SELECT 1 FROM secretaria.enrollments WHERE student_id=$1 LIMIT 1`, [id]);
      if (enr[0]) {
        // Tiene historial (matrículas → posibles recibos/pagos): baja lógica, no se destruye nada.
        await m.query(`UPDATE secretaria.students SET is_active=false, deactivated_at=now() WHERE id=$1`, [id]);
        return { ok: true, deleted: 'soft' as const };
      }

      // Sin matrículas: eliminar dependencias incidentales y el alumno.
      await m.query(`DELETE FROM secretaria.student_documents WHERE student_id=$1`, [id]);
      await m.query(`DELETE FROM secretaria.level_tests WHERE student_id=$1`, [id]);
      await m.query(`DELETE FROM secretaria.taper_usage WHERE student_id=$1`, [id]);
      await m.query(`DELETE FROM secretaria.students WHERE id=$1`, [id]);
      return { ok: true, deleted: 'hard' as const };
    });
  }

  // Alumnos dados de baja (baja lógica), con fecha de baja para la sección "Bajas"
  @Get('inactive/list') @Roles('secretaria_admin','secretaria_staff','direccion')
  async inactiveList() {
    return this.ds.query(`
      SELECT s.id, s.first_name AS "firstName", s.last_name AS "lastName",
             s.mwpanel_student_id AS "mwpanelStudentId",
             s.deactivated_at AS "deactivatedAt",
             -- Fecha de baja: alumno desactivado, o última baja de matrícula (withdrawn o cambio de estado)
             COALESCE(
               max(e.withdrawn_at),
               max(e.status_changed_at) FILTER (WHERE e.status='baja')
             ) AS "lastWithdrawnAt",
             (NOT s.is_active) AS "studentInactive",
             COALESCE(json_agg(DISTINCT sv.name) FILTER (WHERE sv.name IS NOT NULL), '[]') AS "services"
      FROM secretaria.students s
      LEFT JOIN secretaria.enrollments e ON e.student_id=s.id
      LEFT JOIN secretaria.services sv ON sv.id=e.service_id
      WHERE s.is_active=false
         OR (
           EXISTS (SELECT 1 FROM secretaria.enrollments b WHERE b.student_id=s.id AND b.status='baja')
           AND NOT EXISTS (SELECT 1 FROM secretaria.enrollments a WHERE a.student_id=s.id AND a.status<>'baja')
         )
      GROUP BY s.id
      ORDER BY s.deactivated_at DESC NULLS LAST, s.last_name`);
  }

  // Reactivar un alumno dado de baja (vuelve al listado de Alumnos):
  // reactiva el alumno y restaura a 'matriculado' sus matrículas que estuvieran en baja.
  @Patch(':id/reactivate') @Roles('secretaria_admin')
  async reactivate(@Param('id') id: string) {
    await this.ds.query(`UPDATE secretaria.students SET is_active=true, deactivated_at=null WHERE id=$1`, [id]);
    await this.ds.query(
      `UPDATE secretaria.enrollments SET status='matriculado', enrolled_at=COALESCE(enrolled_at, now()), status_changed_at=now()
       WHERE student_id=$1 AND status='baja'`, [id]);
    return { ok: true };
  }

  // Eliminar DEFINITIVAMENTE un alumno y todo su rastro (para duplicados). Solo admin, confirmado en UI.
  // Borra matrículas, recibos y sus asignaciones de pago, documentos, pruebas y táper del alumno.
  @Delete(':id/force') @Roles('secretaria_admin')
  async forceDelete(@Param('id') id: string) {
    return this.ds.transaction(async (m) => {
      const exists = await m.query(`SELECT id FROM secretaria.students WHERE id=$1`, [id]);
      if (!exists[0]) return { ok: false, error: 'Alumno no encontrado' };
      await m.query(`DELETE FROM secretaria.payment_allocations WHERE charge_id IN (
                       SELECT c.id FROM secretaria.charges c JOIN secretaria.enrollments e ON e.id=c.enrollment_id WHERE e.student_id=$1)`, [id]);
      await m.query(`DELETE FROM secretaria.charges WHERE enrollment_id IN (SELECT id FROM secretaria.enrollments WHERE student_id=$1)`, [id]);
      await m.query(`DELETE FROM secretaria.student_documents WHERE student_id=$1`, [id]);
      await m.query(`DELETE FROM secretaria.level_tests WHERE student_id=$1`, [id]);
      await m.query(`DELETE FROM secretaria.taper_usage WHERE student_id=$1`, [id]);
      await m.query(`DELETE FROM secretaria.enrollments WHERE student_id=$1`, [id]);
      await m.query(`DELETE FROM secretaria.students WHERE id=$1`, [id]);
      return { ok: true };
    });
  }

  @Get(':id/bank') @Roles('secretaria_admin','secretaria_staff','direccion')
  async getBank(@Param('id') id: string) {
    const [st] = await this.ds.query(`SELECT family_id AS "familyId" FROM secretaria.students WHERE id=$1`, [id]);
    if (!st) throw new NotFoundException('Alumno no encontrado');
    const [familyAccount] = await this.ds.query(`
      SELECT id, iban_last4 AS "ibanLast4", holder_name AS "holderName", sepa_mandate_ref AS "mandateRef"
      FROM secretaria.bank_accounts
      WHERE family_id=$1 AND student_id IS NULL AND is_active
      ORDER BY created_at DESC LIMIT 1`, [st.familyId]);
    const [override] = await this.ds.query(`
      SELECT id, iban_last4 AS "ibanLast4", holder_name AS "holderName"
      FROM secretaria.bank_accounts
      WHERE student_id=$1 AND is_active
      ORDER BY created_at DESC LIMIT 1`, [id]);
    return { familyAccount: familyAccount || null, override: override || null };
  }

  @Post(':id/bank') @Roles('secretaria_admin','secretaria_staff')
  async setBank(@Param('id') id: string, @Body() b: StudentBankDto) {
    if (!SECRETARIA_CRYPTO_KEY) throw new BadRequestException('Falta SECRETARIA_CRYPTO_KEY en el servidor');
    if (b.scope !== 'familia' && b.scope !== 'alumno') throw new BadRequestException('scope inválido');
    const iban = normalizeIban(b.iban);
    if (!isValidIban(iban)) throw new BadRequestException('IBAN no válido');
    const last4 = iban.slice(-4);
    const [st] = await this.ds.query(`SELECT family_id AS "familyId" FROM secretaria.students WHERE id=$1`, [id]);
    if (!st) throw new NotFoundException('Alumno no encontrado');

    if (b.scope === 'familia') {
      await this.ds.query(
        `UPDATE secretaria.bank_accounts SET is_active=false WHERE family_id=$1 AND student_id IS NULL AND is_active`,
        [st.familyId]);
      await this.ds.query(`
        INSERT INTO secretaria.bank_accounts(family_id, student_id, iban_encrypted, iban_last4, holder_name, sepa_mandate_ref, sepa_mandate_date, is_active)
        VALUES ($1::uuid, NULL, pgp_sym_encrypt($2,$3), $4, $5,
                'MAND-'||substr(replace($1::text,'-',''),1,8)||'-'||to_char(now(),'YYYYMMDD'),
                now()::date, true)`,
        [st.familyId, iban, SECRETARIA_CRYPTO_KEY, last4, b.holderName || null]);
    } else {
      await this.ds.query(
        `UPDATE secretaria.bank_accounts SET is_active=false WHERE student_id=$1 AND is_active`, [id]);
      await this.ds.query(`
        INSERT INTO secretaria.bank_accounts(family_id, student_id, iban_encrypted, iban_last4, holder_name, sepa_mandate_ref, sepa_mandate_date, is_active)
        VALUES ($1::uuid, $2::uuid, pgp_sym_encrypt($3,$4), $5, $6, NULL, NULL, true)`,
        [st.familyId, id, iban, SECRETARIA_CRYPTO_KEY, last4, b.holderName || null]);
    }
    return { ok: true, ibanLast4: last4, scope: b.scope };
  }

  @Delete(':id/bank-override') @Roles('secretaria_admin','secretaria_staff')
  async deleteBankOverride(@Param('id') id: string) {
    await this.ds.query(`UPDATE secretaria.bank_accounts SET is_active=false WHERE student_id=$1 AND is_active`, [id]);
    return { ok: true };
  }
}
