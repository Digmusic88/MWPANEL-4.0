import React from 'react';
import { Card, Empty, Table, Tag } from 'antd';
import {
  LomloeProgressCriterion,
  LomloeProgressData,
  LomloeProgressSaber,
} from '@/types/studentAutoReport';

// Mirrors the StateTag idiom from ExpedienteViewer.tsx (SP-C): same labels/colors,
// but accepts the wider `string | null` state coming from the report's data contract.
const STATE_LABEL: Record<string, string> = {
  ACHIEVED: 'Alcanzado',
  IN_PROGRESS: 'En proceso',
  NOT_ACHIEVED: 'No completado',
};
const STATE_COLOR: Record<string, string> = {
  ACHIEVED: '#52c41a',
  IN_PROGRESS: '#faad14',
  NOT_ACHIEVED: '#ff4d4f',
};
const StateTag: React.FC<{ s: string | null }> = ({ s }) =>
  s ? <Tag color={STATE_COLOR[s] || '#faad14'}>{STATE_LABEL[s] || s}</Tag> : <span style={{ color: '#bbb' }}>—</span>;

export const ReportLomloeCriteriaSection: React.FC<{ data: LomloeProgressData }> = ({ data }) => {
  const subjects = data.subjects || [];
  const hasAnyState = subjects.some((subj) =>
    subj.criteria.some((c) => c.states.T1 || c.states.T2 || c.states.T3),
  );

  if (!hasAnyState) {
    return (
      <Card title="Detalle por criterio (LOMLOE)" style={{ marginBottom: 16 }}>
        <Empty description="Sin evaluación por criterio LOMLOE en el periodo seleccionado" />
      </Card>
    );
  }

  return (
    <Card title="Detalle por criterio (LOMLOE)" style={{ marginBottom: 16 }}>
      {subjects.map((subj) => (
        <div key={subj.subjectAssignmentId} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{subj.subjectName}</div>
          <Table
            size="small"
            rowKey="criterionId"
            pagination={false}
            dataSource={subj.criteria}
            expandable={{
              rowExpandable: (r: LomloeProgressCriterion) => r.saberes.length > 0,
              expandedRowRender: (r: LomloeProgressCriterion) => (
                <Table
                  size="small"
                  rowKey="basicKnowledgeId"
                  pagination={false}
                  dataSource={r.saberes}
                  columns={[
                    { title: 'Saber', key: 'saber', render: (_: any, k: LomloeProgressSaber) => `${k.code} — ${k.name}` },
                    { title: '1ºT', key: 't1', width: 110, render: (_: any, k: LomloeProgressSaber) => <StateTag s={k.states.T1} /> },
                    { title: '2ºT', key: 't2', width: 110, render: (_: any, k: LomloeProgressSaber) => <StateTag s={k.states.T2} /> },
                    { title: '3ºT', key: 't3', width: 110, render: (_: any, k: LomloeProgressSaber) => <StateTag s={k.states.T3} /> },
                  ]}
                />
              ),
            }}
            columns={[
              {
                title: 'Criterio',
                key: 'criterio',
                render: (_: any, c: LomloeProgressCriterion) =>
                  `${c.code}${c.specificCompetencyCode ? ` · ${c.specificCompetencyCode}` : ''} — ${c.name}`,
              },
              { title: '1ºT', key: 't1', width: 130, render: (_: any, c: LomloeProgressCriterion) => <StateTag s={c.states.T1} /> },
              { title: '2ºT', key: 't2', width: 130, render: (_: any, c: LomloeProgressCriterion) => <StateTag s={c.states.T2} /> },
              { title: '3ºT', key: 't3', width: 130, render: (_: any, c: LomloeProgressCriterion) => <StateTag s={c.states.T3} /> },
            ]}
          />
        </div>
      ))}
    </Card>
  );
};

export default ReportLomloeCriteriaSection;
