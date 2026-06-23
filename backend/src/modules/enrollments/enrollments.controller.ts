import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, IsIn, IsNumber, IsArray } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const STATUSES = ['preinscrito','matriculado','pendiente','lista_espera','baja'];
const APOYO_LEVELS = ['primaria','secundaria','bachillerato'];

class BulkBajaDto {
  @IsArray() @IsUUID('all', { each: true }) enrollmentIds: string[];
}

class UpdateEnrollmentDto {
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @IsUUID() serviceId?: string;
  @IsOptional() @IsUUID() groupId?: string;
  @IsOptional() @IsString() waitlistReason?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() customFee?: number;
  @IsOptional() @IsString() customFeeReason?: string;
  @IsOptional() @IsIn(APOYO_LEVELS) apoyoLevel?: string | null;
}

@Controller('secretaria/enrollments')
@UseGuards(SecretariaAuthGuard)
export class EnrollmentsController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // Listado con nombre del alumno (academia o Escuela vía vista), grupo y tarifa resuelta
  @Get() @Roles('secretaria_admin','secretaria_staff','direccion')
  async list(@Query('academicYearId') yearId?: string, @Query('serviceId') serviceId?: string, @Query('status') status?: string) {
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (yearId) { params.push(yearId); where += ` AND e.academic_year_id = $${params.length}`; }
    if (serviceId) { params.push(serviceId); where += ` AND e.service_id = $${params.length}`; }
    if (status) { params.push(status); where += ` AND e.status = $${params.length}`; }
    return this.ds.query(`
      SELECT e.id, e.status, e.group_id AS "groupId", e.waitlist_reason AS "waitlistReason",
             e.custom_fee AS "customFee", e.custom_fee_reason AS "customFeeReason",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             sv.name AS "serviceName", e.service_id AS "serviceId", g.name AS "groupName",
             secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee",
             e.student_id AS "studentId",
             (SELECT count(*)::int FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.status='pagado') AS "paidCharges",
             (SELECT count(*)::int FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.status='pendiente') AS "pendingCharges",
             (SELECT COALESCE(sum(c.amount_due),0) FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.status='pendiente') AS "pendingAmount"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id = e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id = st.mwpanel_student_id
      JOIN secretaria.services sv ON sv.id = e.service_id
      LEFT JOIN secretaria.groups g ON g.id = e.group_id
      ${where}
      ORDER BY "studentName" ASC`, params);
  }

  // Tablero de organización (estilo "Horario"): grupos de un servicio con su horario y profesor,
  // + todos los alumnos matriculados del servicio (con su groupId, null = sin grupo).
  // Arrastrar un alumno a otro grupo = PATCH :id { groupId } y se refleja en toda la plataforma.
  @Get('board') @Roles('secretaria_admin','secretaria_staff','direccion')
  async board(@Query('serviceId') serviceId: string, @Query('academicYearId') yearId?: string) {
    const yid = yearId || (await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`).then(r => r[0]?.id));
    const groups = await this.ds.query(`
      SELECT g.id, g.name, g.room, g.color AS "color", g.capacity, pr.name AS "programName", t.full_name AS "teacherName",
             COALESCE((SELECT json_agg(json_build_object(
                 'weekday', ss.weekday, 'start', to_char(ss.start_time,'HH24:MI'),
                 'end', to_char(ss.end_time,'HH24:MI'), 'room', ss.room) ORDER BY ss.weekday, ss.start_time)
               FROM secretaria.schedule_slots ss WHERE ss.group_id=g.id), '[]') AS schedule
      FROM secretaria.groups g
      JOIN secretaria.programs pr ON pr.id=g.program_id AND pr.service_id=$2
      LEFT JOIN secretaria.teachers t ON t.id=g.teacher_id
      WHERE g.academic_year_id=$1
      ORDER BY g.sort_order, g.name`, [yid, serviceId]);
    const students = await this.ds.query(`
      SELECT e.id AS "enrollmentId", e.group_id AS "groupId", e.status, e.notes AS "comment",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2 AND e.status IN ('matriculado','preinscrito','lista_espera','pendiente')
      ORDER BY "studentName"`, [yid, serviceId]);
    return { groups, students };
  }

  @Patch(':id') @Roles('secretaria_admin','secretaria_staff')
  async update(@Param('id') id: string, @Body() b: UpdateEnrollmentDto) {
    const sets: string[] = []; const params: any[] = [];
    const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };
    // Cambio de servicio de la matrícula: comprobamos que el alumno no esté ya en ese
    // servicio este curso (restricción única) y reseteamos el grupo (pertenece al servicio anterior).
    if (b.serviceId !== undefined) {
      const [cur] = await this.ds.query(
        `SELECT student_id AS "studentId", academic_year_id AS "yearId", service_id AS "serviceId"
         FROM secretaria.enrollments WHERE id=$1`, [id]);
      if (!cur) return { ok: false, error: 'Matrícula no encontrada' };
      if (cur.serviceId !== b.serviceId) {
        const dup = await this.ds.query(
          `SELECT 1 FROM secretaria.enrollments
           WHERE student_id=$1 AND academic_year_id=$2 AND service_id=$3 AND id<>$4 LIMIT 1`,
          [cur.studentId, cur.yearId, b.serviceId, id]);
        if (dup[0]) return { ok: false, error: 'El alumno ya está matriculado en ese servicio este curso' };
        push('service_id', b.serviceId);
        push('group_id', null); // el grupo anterior no es válido en el nuevo servicio
      }
    }
    if (b.status !== undefined) { push('status', b.status); sets.push('status_changed_at = now()');
      if (b.status === 'matriculado') sets.push('enrolled_at = now()');
      if (b.status === 'baja') sets.push('withdrawn_at = now()'); }
    if (b.groupId !== undefined) push('group_id', b.groupId || null);
    if (b.waitlistReason !== undefined) push('waitlist_reason', b.waitlistReason);
    if (b.notes !== undefined) push('notes', b.notes);
    if (b.customFee !== undefined) push('custom_fee', b.customFee);
    if (b.customFeeReason !== undefined) push('custom_fee_reason', b.customFeeReason);
    if (b.apoyoLevel !== undefined) push('apoyo_level', b.apoyoLevel || null);
    if (sets.length === 0) return { ok: true };
    params.push(id);
    await this.ds.query(`UPDATE secretaria.enrollments SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    // Al MATRICULAR, generar automáticamente el recibo de matrícula y de material si el programa los cobra
    // y aún no existen (importe según la tarifa resoluble del servicio/programa/grupo).
    if (b.status === 'matriculado') {
      // Genera el recibo de matrícula y de material si hay una tarifa resoluble para ese alumno
      // (según su servicio/programa/grupo) y aún no existe.
      for (const concept of ['matricula', 'material']) {
        // concept es un literal fijo ('matricula'|'material'), sin riesgo de inyección
        await this.ds.query(`
          INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
          SELECT e.id, NULL, '${concept}', secretaria.fn_resolve_concept_fee(e.id,'${concept}'), 'pendiente'
          FROM secretaria.enrollments e
          WHERE e.id=$1
            AND secretaria.fn_resolve_concept_fee(e.id,'${concept}') IS NOT NULL
            AND secretaria.fn_resolve_concept_fee(e.id,'${concept}') > 0
            AND NOT EXISTS (SELECT 1 FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.concept='${concept}')`,
          [id]);
      }
    }
    return this.ds.query(`SELECT * FROM secretaria.enrollments WHERE id=$1`, [id]).then(r => r[0]);
  }

  // Aviso: preinscritos del curso activo cuya RESERVA (matrícula) NO está pagada ni exenta,
  // con los días que llevan esperando (para reclamar o liberar plaza).
  @Get('pending-reservations') @Roles('secretaria_admin','secretaria_staff','direccion')
  async pendingReservations() {
    return this.ds.query(`
      SELECT e.id, e.student_id AS "studentId",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             sv.name AS "serviceName",
             e.status_changed_at AS "since",
             GREATEST(0, EXTRACT(DAY FROM now() - e.status_changed_at)::int) AS "daysWaiting",
             EXISTS (SELECT 1 FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.concept='matricula') AS "reservationBilled"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id AND st.is_active=true
      JOIN secretaria.services sv ON sv.id=e.service_id
      JOIN secretaria.academic_years ay ON ay.id=e.academic_year_id AND ay.is_active=true
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.status='preinscrito'
        AND NOT EXISTS (SELECT 1 FROM secretaria.charges c
                        WHERE c.enrollment_id=e.id AND c.concept='matricula' AND c.status IN ('pagado','exento'))
      ORDER BY e.status_changed_at ASC NULLS FIRST`);
  }

  // Baja en bloque de PREINSCRIPCIONES (libera plaza). Solo administrador, acción confirmada en UI.
  @Post('bulk-baja') @Roles('secretaria_admin')
  async bulkBaja(@Body() b: BulkBajaDto) {
    if (!b.enrollmentIds?.length) return { ok: true, count: 0 };
    const r = await this.ds.query(
      `UPDATE secretaria.enrollments SET status='baja', withdrawn_at=now(), status_changed_at=now()
       WHERE id = ANY($1::uuid[]) AND status='preinscrito' RETURNING id`,
      [b.enrollmentIds]);
    // TypeORM devuelve [filas, nºAfectadas] en UPDATE...RETURNING: contar las filas reales.
    const rows = Array.isArray(r[0]) ? r[0] : r;
    return { ok: true, count: Array.isArray(rows) ? rows.length : 0 };
  }
}
