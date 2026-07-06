import React, { useEffect, useState } from 'react';
import { Drawer, Segmented, Spin, Empty, Button, message, Typography } from 'antd';
import { workSaberService, ThreeState, WorkSaber } from '../../services/workSaberService';

const STATE_OPTIONS = [
  { label: 'No', value: 'NOT_ACHIEVED' }, { label: 'Proc', value: 'IN_PROGRESS' }, { label: 'Alc', value: 'ACHIEVED' },
];

interface Props { open: boolean; onClose: () => void; work: { id: string; source: string; name: string } | null; student: { id: string; name: string } | null; }

const WorkSaberDrawer: React.FC<Props> = ({ open, onClose, work, student }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saberes, setSaberes] = useState<WorkSaber[]>([]);
  const [marks, setMarks] = useState<Record<string, ThreeState>>({});

  useEffect(() => {
    if (!open || !work || !student) return;
    setLoading(true);
    workSaberService.getCell(work.id, work.source, student.id)
      .then((c) => { setSaberes(c.saberes || []); setMarks(c.marks || {}); })
      .catch(() => message.error('No se pudieron cargar los saberes'))
      .finally(() => setLoading(false));
  }, [open, work, student]);

  const save = async () => {
    if (!work || !student) return;
    setSaving(true);
    try {
      const payload = Object.entries(marks).map(([basicKnowledgeId, levelValue]) => ({ basicKnowledgeId, levelValue }));
      const res = await workSaberService.bulk(work.id, work.source, student.id, payload);
      if (res.saved === 0 && payload.length > 0) {
        message.warning('No se guardó: la fecha del trabajo no cae en ningún trimestre configurado.');
      } else {
        message.success(`Guardado (${res.saved} saberes, ${res.derived} criterios derivados)`);
        onClose();
      }
    } catch { message.error('No se pudo guardar'); } finally { setSaving(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} width={420}
      title={work && student ? `${student.name} · ${work.name}` : 'Saberes'}
      extra={<Button type="primary" loading={saving} disabled={!saberes.length} onClick={save}>Guardar</Button>}>
      {loading ? <Spin /> : !saberes.length ? (
        <Empty description="Sin saberes asociados. Taguea criterios en el trabajo o usa el asistente IA." />
      ) : (
        saberes.map((s) => (
          <div key={s.id} style={{ marginBottom: 14 }}>
            <Typography.Text>{s.code ? `${s.code} · ` : ''}{s.name}</Typography.Text>
            <div style={{ marginTop: 4 }}>
              <Segmented size="small" options={STATE_OPTIONS} value={marks[s.id]}
                onChange={(v) => setMarks((m) => ({ ...m, [s.id]: v as ThreeState }))} />
            </div>
          </div>
        ))
      )}
    </Drawer>
  );
};

export default WorkSaberDrawer;
