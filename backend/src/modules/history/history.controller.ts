import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const TABLE_LABEL: Record<string, string> = {
  groups: 'Grupo', schedule_slots: 'Horario', apoyo_assignments: 'Apoyo', enrollments: 'Matrícula',
  students: 'Alumno', charges: 'Recibo', payments: 'Pago', bank_accounts: 'Cuenta bancaria', sepa_batches: 'Remesa SEPA',
};
const FIELD_LABEL: Record<string, string> = {
  status: 'Estado', group_id: 'Grupo', service_id: 'Servicio', teacher_id: 'Profesor', name: 'Nombre',
  room: 'Aula', weekday: 'Día', start_time: 'Inicio', end_time: 'Fin', slot_time: 'Hora', color: 'Color',
  capacity: 'Aforo', sort_order: 'Orden', custom_fee: 'Tarifa especial', amount_due: 'Importe', concept: 'Concepto',
  first_name: 'Nombre', last_name: 'Apellidos', birth_date: 'Fecha nac.',
};
const TRACK: Record<string, string[]> = {
  groups: ['name', 'teacher_id', 'room', 'color', 'capacity', 'sort_order'],
  schedule_slots: ['weekday', 'start_time', 'end_time', 'room', 'group_id'],
  apoyo_assignments: ['weekday', 'slot_time', 'room', 'enrollment_id'],
  enrollments: ['status', 'group_id', 'service_id', 'custom_fee'],
  students: ['first_name', 'last_name', 'birth_date'],
  charges: ['status', 'amount_due', 'concept'],
};
const DOW = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

@Controller('secretaria/history')
@UseGuards(SecretariaAuthGuard)
@Roles('secretaria_admin', 'secretaria_staff', 'direccion')
export class HistoryController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  @Get()
  async list(@Query('limit') limit?: string) {
    const n = Math.min(parseInt(limit || '80', 10) || 80, 200);
    const rows = await this.ds.query(`
      SELECT id, table_name AS "table", record_id AS "recordId", action, old_data AS "old", new_data AS "new", at
      FROM secretaria.audit_log
      WHERE table_name = ANY($1)
      ORDER BY at DESC LIMIT $2`, [Object.keys(TABLE_LABEL), n]);

    // Mapas de nombres para enriquecer
    const [grp, stu, tea, svc] = await Promise.all([
      this.ds.query(`SELECT id, name FROM secretaria.groups`),
      this.ds.query(`SELECT st.id, COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS name FROM secretaria.students st LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id`),
      this.ds.query(`SELECT id, full_name AS name FROM secretaria.teachers`),
      this.ds.query(`SELECT id, name FROM secretaria.services`),
    ]);
    const gMap: any = {}; grp.forEach((r: any) => gMap[r.id] = r.name);
    const sMap: any = {}; stu.forEach((r: any) => sMap[r.id] = r.name);
    const tMap: any = {}; tea.forEach((r: any) => tMap[r.id] = r.name);
    const vMap: any = {}; svc.forEach((r: any) => vMap[r.id] = r.name);
    // enrollment → student (para apoyo/charges)
    const enr = await this.ds.query(`SELECT id, student_id AS "studentId" FROM secretaria.enrollments`);
    const eMap: any = {}; enr.forEach((r: any) => eMap[r.id] = r.studentId);

    const resolveVal = (field: string, val: any): string => {
      if (val === null || val === undefined || val === '') return '—';
      if (field === 'group_id') return gMap[val] || 'grupo';
      if (field === 'teacher_id') return tMap[val] || 'profesor';
      if (field === 'service_id') return vMap[val] || 'servicio';
      if (field === 'weekday') return DOW[Number(val)] || String(val);
      if ((field === 'start_time' || field === 'end_time') && typeof val === 'string') return val.slice(0, 5);
      return String(val);
    };
    const entityName = (e: any): string => {
      const d = e.new || e.old || {};
      switch (e.table) {
        case 'groups': return gMap[e.recordId] || d.name || 'grupo';
        case 'students': return sMap[e.recordId] || `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'alumno';
        case 'schedule_slots': return gMap[d.group_id] || 'grupo';
        case 'enrollments': return `${sMap[d.student_id] || 'alumno'}${d.service_id ? ` · ${vMap[d.service_id] || ''}` : ''}`;
        case 'apoyo_assignments': return sMap[eMap[d.enrollment_id]] || 'alumno (apoyo)';
        case 'charges': return `${sMap[eMap[d.enrollment_id]] || 'alumno'} · ${d.concept || ''}`;
        default: return '';
      }
    };

    return rows.map((e: any) => {
      const changes: any[] = [];
      if (e.action === 'UPDATE' && e.old && e.new) {
        for (const f of (TRACK[e.table] || [])) {
          if (JSON.stringify(e.old[f]) !== JSON.stringify(e.new[f])) {
            changes.push({ field: FIELD_LABEL[f] || f, from: resolveVal(f, e.old[f]), to: resolveVal(f, e.new[f]) });
          }
        }
      }
      return {
        id: e.id, at: e.at, action: e.action,
        tableLabel: TABLE_LABEL[e.table] || e.table,
        entity: entityName(e),
        changes,
      };
    });
  }

  @Post(':id/revert') @Roles('secretaria_admin', 'secretaria_staff')
  async revert(@Param('id') id: string) {
    const r = await this.ds.query(`SELECT secretaria.fn_revert_audit($1) AS res`, [id]);
    return r[0].res;
  }
}
