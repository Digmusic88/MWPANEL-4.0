import React, { useEffect, useState } from 'react';
import { Card, Select, DatePicker, Space, Empty, Spin, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { academiaService, AcademiaGroup, GridStudent } from '@services/academiaService';
import AcademiaGrid, { Palette } from '../../components/teacher/academia/AcademiaGrid';
import TrafficLightFace from '../../components/teacher/academia/TrafficLightFace';

const PALETTE: Palette = {
  verde: { label: 'Bien', color: '#2E7D52' },
  naranja: { label: 'Regular', color: '#B45309' },
  roja: { label: 'Mal / no hizo', color: '#C43030' },
};
const ORDER = ['verde', 'naranja', 'roja'];
const cycle = (c?: string) => ORDER[(ORDER.indexOf(c || 'verde') + 1) % ORDER.length];

const AcademiaTareasPage: React.FC = () => {
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
      const g = await academiaService.tareasGrid(groupId, d);
      setStudents(g.students);
      const v: Record<string, string> = {};
      g.students.forEach(s => { v[s.enrollmentId] = g.records?.[s.enrollmentId]?.[d] || 'verde'; });
      setValue(v);
    } catch { message.error('No se pudieron cargar las tareas'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [groupId, date]);

  const save = async () => {
    if (!groupId) return;
    setSaving(true);
    try {
      const records = students.map(s => ({ enrollmentId: s.enrollmentId, level: value[s.enrollmentId] || 'verde' }));
      await academiaService.tareasSave(date.format('YYYY-MM-DD'), records);
      message.success('Tareas guardadas');
    } catch { message.error('No se pudo guardar'); }
    finally { setSaving(false); }
  };

  const fillAllGreen = () => setValue(Object.fromEntries(students.map(s => [s.enrollmentId, 'verde'])));

  return (
    <Card title="Tareas de tarde (Academia)">
      <Space wrap style={{ marginBottom: 16 }}>
        <Select style={{ width: 260 }} placeholder="Grupo" value={groupId} onChange={setGroupId}
          options={groups.map(g => ({ value: g.id, label: `${g.name}${g.serviceName ? ` · ${g.serviceName}` : ''}` }))} />
        <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} format="DD/MM/YYYY" />
      </Space>
      {loading ? <Spin /> : !groupId ? <Empty description="Sin grupos de academia" />
        : students.length === 0 ? <Empty description="Sin alumnos en este grupo" />
        : <AcademiaGrid students={students} value={value} palette={PALETTE} cycle={cycle}
            renderCell={(v) => <TrafficLightFace level={v} />}
            onChange={(id, next) => setValue(v => ({ ...v, [id]: next }))}
            onSave={save} onFillAll={fillAllGreen} fillAllLabel="Todas verdes" saving={saving} />}
    </Card>
  );
};
export default AcademiaTareasPage;
