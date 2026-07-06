import React, { useMemo } from 'react';
import { Table, Tooltip, Typography, Tag, Popover } from 'antd';
import { SaberGridResponse, ThreeState } from '@/types/basicKnowledgeAssessment';

type MarkMap = Record<string, ThreeState>;          // key: studentId|basicKnowledgeId
type DerivedMap = Record<string, ThreeState | null>; // key: studentId|criterionId

const mkey = (studentId: string, saberId: string) => `${studentId}|${saberId}`;
const ckey = (studentId: string, criterionId: string) => `${studentId}|${criterionId}`;

const STATE_TAG: Record<ThreeState, { color: string; text: string }> = {
  NOT_ACHIEVED: { color: 'red', text: 'No completado' },
  IN_PROGRESS: { color: 'orange', text: 'En proceso' },
  ACHIEVED: { color: 'green', text: 'Alcanzado' },
};

interface Props {
  grid: SaberGridResponse;
  marks: MarkMap;
  derived: DerivedMap;
  onMarkChange?: (studentId: string, saberId: string, v: ThreeState) => void;
}

export const SaberGrid: React.FC<Props> = ({ grid, marks, derived, onMarkChange }) => {
  const columns = useMemo(() => {
    const cols: any[] = [{ title: 'Alumno', dataIndex: 'name', fixed: 'left', width: 200 }];
    for (const g of grid.groups) {
      cols.push({
        title: <Tooltip title={g.specificCompetency.name}>{g.specificCompetency.code}</Tooltip>,
        children: g.criteria.map((c) => ({
          title: <Tooltip title={c.description}>{c.code}</Tooltip>,
          children: [
            ...c.saberes.map((s) => ({
              title: (
                <Popover
                  trigger="hover"
                  title={`${s.code} ${s.title}`}
                  content={<div style={{ maxWidth: 320 }}><Typography.Text>{s.description || 'Sin descripción.'}</Typography.Text></div>}
                >
                  <span style={{ color: '#389e0d', cursor: 'help' }}>{s.code}</span>
                </Popover>
              ),
              key: `s-${c.id}-${s.basicKnowledgeId}`,
              width: 130,
              render: (_: any, student: { id: string }) => {
                const v = marks[mkey(student.id, s.basicKnowledgeId)];
                return v ? <Tag color={STATE_TAG[v].color}>{STATE_TAG[v].text}</Tag> : <span style={{ color: '#bbb' }}>—</span>;
              },
            })),
            {
              title: <Tooltip title={`Criterio ${c.code} — derivado de sus saberes`}><span style={{ fontWeight: 600 }}>⇒ {c.code}</span></Tooltip>,
              key: `d-${c.id}`,
              width: 110,
              render: (_: any, student: { id: string }) => {
                const st = derived[ckey(student.id, c.id)];
                return st ? <Tag color={STATE_TAG[st].color}>{STATE_TAG[st].text}</Tag> : <Typography.Text type="secondary">—</Typography.Text>;
              },
            },
          ],
        })),
      });
    }
    return cols;
  }, [grid, marks, derived, onMarkChange]);

  if (!grid.groups.length) {
    return <Typography.Text type="secondary">Esta asignatura no tiene criterios/saberes para el curso del grupo.</Typography.Text>;
  }
  return (
    <Table rowKey="id" dataSource={grid.students} columns={columns} pagination={false} scroll={{ x: 'max-content' }} size="small" />
  );
};
