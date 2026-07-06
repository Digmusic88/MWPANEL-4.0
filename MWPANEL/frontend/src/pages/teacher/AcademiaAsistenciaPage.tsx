import React, { useEffect, useState } from 'react';
import { Card, Select, DatePicker, Space, Empty, Spin, message, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { academiaService, AcademiaGroup, GridStudent } from '@services/academiaService';
import AcademiaGrid, { Palette } from '../../components/teacher/academia/AcademiaGrid';

const PALETTE: Palette = {
  presente: { label: 'Presente', color: '#2E7D52' },
  retraso: { label: 'Retraso', color: '#B45309' },
  justificada: { label: 'Justificada', color: '#1677ff' },
  ausente: { label: 'Ausente', color: '#C43030' },
};
const ORDER = ['presente', 'retraso', 'justificada', 'ausente'];
const cycle = (c?: string) => ORDER[(ORDER.indexOf(c || '') + 1) % ORDER.length];

const AcademiaAsistenciaPage: React.FC = () => {
  const [groups, setGroups] = useState<AcademiaGroup[]>([]);
  const [groupId, setGroupId] = useState<string>();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [students, setStudents] = useState<GridStudent[]>([]);
  const [value, setValue] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { academiaService.myGroups().then(r => { setGroups(r.groups); if (r.groups[0]) setGroupId(r.groups[0].id); }).catch(() => setGroups([])); }, []);

  const load = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const d = date.format('YYYY-MM-DD');
      const g = await academiaService.attendanceGrid(groupId, d);
      setStudents(g.students);
      const v: Record<string, string> = {};
      g.students.forEach(s => { const val = g.records?.[s.enrollmentId]?.[d]; if (val) v[s.enrollmentId] = val; });
      setValue(v);
    } catch { message.error('No se pudo cargar la asistencia'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [groupId, date]);

  const save = async () => {
    if (!groupId) return;
    setSaving(true);
    try {
      const records = students.map(s => ({ enrollmentId: s.enrollmentId, status: value[s.enrollmentId] || 'presente' }));
      await academiaService.attendanceSave(date.format('YYYY-MM-DD'), records);
      message.success('Asistencia guardada');
    } catch { message.error('No se pudo guardar'); }
    finally { setSaving(false); }
  };

  const fillAllPresent = () => setValue(Object.fromEntries(students.map(s => [s.enrollmentId, 'presente'])));

  const present = students.filter(s => ['presente', 'retraso'].includes(value[s.enrollmentId])).length;
  const pct = students.length ? Math.round((present / students.length) * 100) : 0;

  return (
    <Card title="Asistencia de tarde (Academia)">
      <Space wrap style={{ marginBottom: 16 }}>
        <Select style={{ width: 260 }} placeholder="Grupo" value={groupId} onChange={setGroupId}
          options={groups.map(g => ({ value: g.id, label: `${g.name}${g.serviceName ? ` · ${g.serviceName}` : ''}` }))} />
        <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} format="DD/MM/YYYY" />
        {students.length > 0 && <Typography.Text type="secondary">Asistencia: {pct}%</Typography.Text>}
      </Space>
      {loading ? <Spin /> : !groupId ? <Empty description="Sin grupos de academia" />
        : students.length === 0 ? <Empty description="Sin alumnos en este grupo" />
        : <AcademiaGrid students={students} value={value} palette={PALETTE} cycle={cycle}
            onChange={(id, next) => setValue(v => ({ ...v, [id]: next }))} onSave={save}
            onFillAll={fillAllPresent} fillAllLabel="Todos presente" saving={saving} />}
    </Card>
  );
};
export default AcademiaAsistenciaPage;
