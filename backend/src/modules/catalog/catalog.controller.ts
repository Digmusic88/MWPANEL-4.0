import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AcademicYear, Service, Program, Group } from './entities';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { isOnlyTeacher, teacherIdOf } from '../../common/teacher-scope';

@Controller('secretaria/catalog')
@UseGuards(SecretariaAuthGuard)
export class CatalogController {
  constructor(
    @InjectRepository(AcademicYear) private years: Repository<AcademicYear>,
    @InjectRepository(Service) private services: Repository<Service>,
    @InjectRepository(Program) private programs: Repository<Program>,
    @InjectRepository(Group) private groups: Repository<Group>,
    @InjectDataSource() private ds: DataSource,
  ) {}

  @Get('years') listYears() { return this.years.find({ order: { label: 'DESC' } }); }
  @Get('services') listServices() { return this.services.find({ order: { name: 'ASC' } }); }
  @Get('programs') listPrograms(@Query('serviceId') serviceId?: string) {
    return this.programs.find({ where: serviceId ? { serviceId } as any : {}, order: { levelOrder: 'ASC' } });
  }
  @Get('groups')
  async listGroups(@Req() req: any, @Query('academicYearId') yearId?: string) {
    const where: any = {};
    if (yearId) where.academicYearId = yearId;
    // RGPD: un profesor solo ve sus propios grupos
    if (isOnlyTeacher(req.user)) {
      where.teacherId = (await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000';
    }
    const groups = await this.groups.find({ where, order: { name: 'ASC' } });
    if (groups.length === 0) return [];

    const groupIds = groups.map(g => g.id);

    // Tarifas propias de cada grupo (mensualidad y matricula)
    const customFees: { group_id: string; concept: string; amount: string }[] =
      await this.ds.query(
        `SELECT group_id, concept, amount::numeric FROM secretaria.fee_schedules
         WHERE group_id = ANY($1::uuid[]) AND is_active = true
           AND concept IN ('mensualidad','matricula')`,
        [groupIds],
      );

    // Tarifas heredadas: nivel programa y nivel servicio, para los programas de estos grupos
    const programIds = [...new Set(groups.map(g => g.programId).filter(Boolean))];
    const inheritedFees: { program_id: string | null; service_id: string; concept: string; amount: string }[] =
      programIds.length > 0
        ? await this.ds.query(
            `SELECT f.program_id, f.service_id, f.concept, f.amount::numeric
             FROM secretaria.fee_schedules f
             WHERE f.group_id IS NULL AND f.is_active = true
               AND f.concept IN ('mensualidad','matricula')
               AND (
                 f.program_id = ANY($1::uuid[])
                 OR (f.program_id IS NULL AND f.service_id IN (
                   SELECT service_id FROM secretaria.programs WHERE id = ANY($1::uuid[])
                 ))
               )
             ORDER BY f.program_id NULLS LAST`,
            [programIds],
          )
        : [];

    // Mapas auxiliares
    const customByGroup: Record<string, Record<string, number>> = {};
    for (const f of customFees) {
      if (!customByGroup[f.group_id]) customByGroup[f.group_id] = {};
      customByGroup[f.group_id][f.concept] = Number(f.amount);
    }

    // Para heredado: programa gana sobre servicio
    const inheritedByProgram: Record<string, Record<string, number>> = {};
    const inheritedByService: Record<string, Record<string, number>> = {};
    for (const f of inheritedFees) {
      const amt = Number(f.amount);
      if (f.program_id) {
        if (!inheritedByProgram[f.program_id]) inheritedByProgram[f.program_id] = {};
        inheritedByProgram[f.program_id][f.concept] = amt;
      } else {
        if (!inheritedByService[f.service_id]) inheritedByService[f.service_id] = {};
        inheritedByService[f.service_id][f.concept] = amt;
      }
    }

    // Mapa programId → serviceId (para resolver herencia servicio)
    const programServiceMap: Record<string, string> = {};
    if (programIds.length > 0) {
      const ps: { id: string; service_id: string }[] = await this.ds.query(
        `SELECT id, service_id FROM secretaria.programs WHERE id = ANY($1::uuid[])`,
        [programIds],
      );
      for (const p of ps) programServiceMap[p.id] = p.service_id;
    }

    // Nota: esta resolución por grupo/programa/servicio no cubre la tarifa de Apoyo por etapa+horas
    // (Apoyo se calcula en SQL con secretaria.fn_resolve_apoyo_fee y no usa grupos). No reutilizar para Apoyo sin adaptarla.
    const resolveFee = (group: (typeof groups)[0], concept: string): { amount: number | null; isCustom: boolean } => {
      const custom = customByGroup[group.id]?.[concept];
      if (custom !== undefined) return { amount: custom, isCustom: true };
      const progFee = group.programId ? inheritedByProgram[group.programId]?.[concept] : undefined;
      if (progFee !== undefined) return { amount: progFee, isCustom: false };
      const svcId = group.programId ? programServiceMap[group.programId] : undefined;
      const svcFee = svcId ? inheritedByService[svcId]?.[concept] : undefined;
      return { amount: svcFee ?? null, isCustom: false };
    };

    return groups.map(g => ({
      ...g,
      serviceId: g.programId ? (programServiceMap[g.programId] || null) : null,
      feeMonthly: resolveFee(g, 'mensualidad'),
      feeMatricula: resolveFee(g, 'matricula'),
    }));
  }

  @Post('groups') @Roles('secretaria_admin','secretaria_staff')
  async createGroup(@Body() b: Partial<Group> & { customFeeMonthly?: number | null; customFeeMatricula?: number | null }) {
    const { customFeeMonthly, customFeeMatricula, ...groupData } = b;
    const group = await this.groups.save(this.groups.create(groupData));
    await this.upsertGroupFees(group.id, group.academicYearId, customFeeMonthly, customFeeMatricula);
    return group;
  }

  // Reordenar las columnas de grupos del tablero (orden personalizado)
  @Post('groups/reorder') @Roles('secretaria_admin','secretaria_staff')
  async reorderGroups(@Body() b: { ids: string[] }) {
    const ids = b.ids || [];
    for (let i = 0; i < ids.length; i++) {
      await this.ds.query(`UPDATE secretaria.groups SET sort_order=$2 WHERE id=$1`, [ids[i], i]);
    }
    return { ok: true };
  }

  @Patch('groups/:id') @Roles('secretaria_admin','secretaria_staff')
  async updateGroup(@Param('id') id: string, @Body() b: Partial<Group> & { customFeeMonthly?: number | null; customFeeMatricula?: number | null }) {
    const { customFeeMonthly, customFeeMatricula, ...groupData } = b;
    if (Object.keys(groupData).length > 0) await this.groups.update(id, groupData);
    // Sincroniza el aula con el horario por aulas: al cambiar el aula del grupo,
    // se mueven todas sus franjas a esa aula (y viceversa desde Organización).
    if (groupData.room !== undefined) {
      await this.ds.query(`UPDATE secretaria.schedule_slots SET room=$1 WHERE group_id=$2`, [groupData.room || null, id]);
    }
    const group = await this.groups.findOne({ where: { id } });
    if (customFeeMonthly !== undefined || customFeeMatricula !== undefined) {
      await this.upsertGroupFees(id, group.academicYearId, customFeeMonthly, customFeeMatricula);
    }
    return group;
  }

  @Delete('groups/:id') @Roles('secretaria_admin')
  async deleteGroup(@Param('id') id: string) {
    // Bloquea si el grupo tiene alumnos matriculados (enrollments.group_id es SET NULL,
    // asi que un DELETE crudo no fallaria -> comprobacion explicita).
    const rows = await this.ds.query(
      `SELECT count(*)::int AS n FROM secretaria.enrollments WHERE group_id = $1`,
      [id],
    );
    const n: number = rows[0]?.n ?? 0;
    if (n > 0) {
      return { ok: false, error: `No se puede borrar: el grupo tiene ${n} alumno(s). Quitalos del grupo primero.` };
    }
    // Grupo vacio: la cascada elimina sus franjas de horario, tarifas de grupo y
    // apartados/entradas de cuaderno (irrelevantes sin alumnos).
    await this.groups.delete(id);
    return { ok: true };
  }

  private async upsertGroupFees(
    groupId: string,
    academicYearId: string,
    monthly?: number | null,
    matricula?: number | null,
  ) {
    const rows = await this.ds.query(
      `SELECT p.service_id FROM secretaria.groups g JOIN secretaria.programs p ON p.id=g.program_id WHERE g.id=$1`,
      [groupId],
    );
    const serviceId: string | undefined = rows[0]?.service_id;
    if (!serviceId) return;

    const handle = async (concept: string, amount: number | null | undefined) => {
      if (amount === undefined) return;
      await this.ds.query(
        `DELETE FROM secretaria.fee_schedules WHERE group_id=$1 AND concept=$2::secretaria.fee_concept AND academic_year_id=$3`,
        [groupId, concept, academicYearId],
      );
      if (amount !== null) {
        await this.ds.query(
          `INSERT INTO secretaria.fee_schedules(academic_year_id, service_id, group_id, concept, amount, is_active)
           VALUES ($1,$2,$3,$4::secretaria.fee_concept,$5,true)`,
          [academicYearId, serviceId, groupId, concept, amount],
        );
      }
    };

    await handle('mensualidad', monthly);
    await handle('matricula', matricula);
  }

  @Post('programs') @Roles('secretaria_admin','secretaria_staff')
  createProgram(@Body() b: Partial<Program> & { mockExamType?: string | null }) {
    const data: Partial<Program> = { ...b };
    if ('mockExamType' in b) data.mockExamType = b.mockExamType || null;
    return this.programs.save(this.programs.create(data));
  }

  @Patch('programs/:id') @Roles('secretaria_admin','secretaria_staff')
  async updateProgram(@Param('id') id: string, @Body() b: Partial<Program> & { mockExamType?: string | null }) {
    const data: Partial<Program> = { ...b };
    if ('mockExamType' in b) data.mockExamType = b.mockExamType || null;
    await this.programs.update(id, data);
    return this.programs.findOne({ where: { id } });
  }

  @Delete('programs/:id') @Roles('secretaria_admin')
  async deleteProgram(@Param('id') id: string) { await this.programs.delete(id); return { ok: true }; }

  @Post('years') @Roles('secretaria_admin')
  createYear(@Body() b: { label: string; startDate: string; endDate: string }) {
    return this.years.save(this.years.create({ ...b, isActive: false, isEnrollmentOpen: true } as any));
  }

  @Patch('years/:id/activate') @Roles('secretaria_admin')
  async activateYear(@Param('id') id: string) {
    await this.years.createQueryBuilder().update().set({ isActive: false }).execute();
    await this.years.update(id, { isActive: true });
    return this.years.findOne({ where: { id } });
  }

  // Abrir/cerrar el periodo de matrícula (reserva de plaza) de un curso
  @Patch('years/:id/enrollment') @Roles('secretaria_admin')
  async setEnrollmentOpen(@Param('id') id: string, @Body() b: { open: boolean }) {
    await this.years.update(id, { isEnrollmentOpen: !!b.open } as any);
    return this.years.findOne({ where: { id } });
  }

  // Preparar el curso siguiente: copia grupos, sus horarios y las tarifas
  // del curso origen al curso destino. No copia matrículas ni alumnos.
  // Preparar curso siguiente (migración limpia):
  //  - Copia las TARIFAS del curso origen (si el destino no tiene aún).
  //  - NO copia grupos ni horarios (se crean a mano), salvo que copyStructure=true (opcional).
  //  - Pasa a PREINSCRITO (sin grupo) a los alumnos MATRICULADOS y activos del origen.
  @Post('years/:id/rollover') @Roles('secretaria_admin')
  async rollover(@Param('id') sourceId: string, @Body() b: { targetYearId: string; copyStructure?: boolean }) {
    const targetId = b.targetYearId;
    if (!targetId || targetId === sourceId) return { ok: false, error: 'Elige un curso destino distinto del origen' };
    const copyStructure = b.copyStructure === true;
    return this.ds.transaction(async (m) => {
      const map: Record<string, string> = {};
      let groupsN = 0, slots = 0;

      // 1) (Opcional) Copiar grupos y horarios, solo si se pide y el destino no tiene grupos
      if (copyStructure) {
        const existing = await m.query(`SELECT count(*)::int AS n FROM secretaria.groups WHERE academic_year_id=$1`, [targetId]);
        if (existing[0].n === 0) {
          const groups = await m.query(`SELECT id, program_id, name, teacher_id, room, capacity, notes FROM secretaria.groups WHERE academic_year_id=$1`, [sourceId]);
          for (const g of groups) {
            const ng = await m.query(
              `INSERT INTO secretaria.groups(academic_year_id, program_id, name, teacher_id, room, capacity, notes)
               VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
              [targetId, g.program_id, g.name, g.teacher_id, g.room, g.capacity, g.notes]);
            map[g.id] = ng[0].id;
          }
          groupsN = groups.length;
          for (const oldGid of Object.keys(map)) {
            const r = await m.query(
              `INSERT INTO secretaria.schedule_slots(group_id, weekday, start_time, end_time, room)
               SELECT $2, weekday, start_time, end_time, room FROM secretaria.schedule_slots WHERE group_id=$1 RETURNING id`,
              [oldGid, map[oldGid]]);
            slots += r.length;
          }
        }
      }

      // 2) Copiar las TARIFAS que FALTEN en el destino (idempotente: rellena huecos sin duplicar).
      //    Sin copia de estructura se omiten las tarifas de grupo (no hay grupos en el destino).
      let feeCount = 0;
      const fees = await m.query(`SELECT service_id, program_id, group_id, concept, amount, label, is_active FROM secretaria.fee_schedules WHERE academic_year_id=$1`, [sourceId]);
      for (const f of fees) {
        if (f.group_id && !copyStructure) continue;
        const newGroup = f.group_id ? (map[f.group_id] || null) : null;
        const ex = await m.query(
          `SELECT 1 FROM secretaria.fee_schedules
           WHERE academic_year_id=$1 AND service_id=$2 AND program_id IS NOT DISTINCT FROM $3
             AND group_id IS NOT DISTINCT FROM $4 AND concept=$5 LIMIT 1`,
          [targetId, f.service_id, f.program_id, newGroup, f.concept]);
        if (ex[0]) continue;
        await m.query(
          `INSERT INTO secretaria.fee_schedules(academic_year_id, service_id, program_id, group_id, concept, amount, label, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [targetId, f.service_id, f.program_id, newGroup, f.concept, f.amount, f.label, f.is_active]);
        feeCount++;
      }

      // 3) Alumnos MATRICULADOS y activos del origen → PREINSCRITO (sin grupo) en el destino.
      const enr = await m.query(
        `INSERT INTO secretaria.enrollments(student_id, academic_year_id, service_id, status)
         SELECT e.student_id, $2, e.service_id, 'preinscrito'
         FROM secretaria.enrollments e
         JOIN secretaria.students s ON s.id=e.student_id AND s.is_active=true
         WHERE e.academic_year_id=$1 AND e.status='matriculado'
         ON CONFLICT (student_id, academic_year_id, service_id) DO NOTHING
         RETURNING id`,
        [sourceId, targetId]);

      return { ok: true, groups: groupsN, slots, fees: feeCount, enrollments: enr.length };
    });
  }

  // Vista previa de la migración: cuántos alumnos (matriculados+activos) del origen se traerían,
  // y cuántos ya existen en el destino (no se duplican).
  @Get('years/:id/migrate-preview') @Roles('secretaria_admin','secretaria_staff','direccion')
  async migratePreview(@Param('id') sourceId: string, @Query('targetYearId') targetId?: string) {
    const src = await this.ds.query(
      `SELECT count(*)::int AS n FROM secretaria.enrollments e
       JOIN secretaria.students s ON s.id=e.student_id AND s.is_active=true
       WHERE e.academic_year_id=$1 AND e.status='matriculado'`, [sourceId]);
    let already = 0;
    if (targetId) {
      const dup = await this.ds.query(
        `SELECT count(*)::int AS n FROM secretaria.enrollments e
         JOIN secretaria.students s ON s.id=e.student_id AND s.is_active=true
         JOIN secretaria.enrollments t ON t.student_id=e.student_id AND t.service_id=e.service_id AND t.academic_year_id=$2
         WHERE e.academic_year_id=$1 AND e.status='matriculado'`, [sourceId, targetId]);
      already = dup[0].n;
    }
    return { candidates: src[0].n, alreadyInTarget: already, toMigrate: src[0].n - already };
  }
}
