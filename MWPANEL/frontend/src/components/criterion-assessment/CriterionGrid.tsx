import React, { useMemo } from 'react';
import { Table, Tooltip, Typography } from 'antd';
import { GridResponse, AchievementLevel } from '@/types/criterionAssessment';
import { AssessmentCell } from './AssessmentCell';
import CriterionKnowledgePopover from './CriterionKnowledgePopover';

type CellMap = Record<string, { levelValue?: AchievementLevel; numericValue?: number }>;

const key = (studentId: string, criterionId: string) => `${studentId}|${criterionId}`;

interface Props {
  grid: GridResponse;
  cells: CellMap;
  onCellChange: (studentId: string, criterionId: string, v: { levelValue?: AchievementLevel; numericValue?: number }) => void;
}

export const CriterionGrid: React.FC<Props> = ({ grid, cells, onCellChange }) => {
  const columns = useMemo(() => {
    const sourceByKey = new Map<string, 'manual' | 'derived'>();
    for (const a of grid.assessments || []) {
      if (a.source) sourceByKey.set(key(a.studentId, a.evaluationCriterionId), a.source);
    }
    const cols: any[] = [
      { title: 'Alumno', dataIndex: 'name', fixed: 'left', width: 200 },
    ];
    for (const g of grid.groups) {
      cols.push({
        title: <Tooltip title={g.specificCompetency.name}>{g.specificCompetency.code}</Tooltip>,
        children: g.criteria.map((c) => ({
          title: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><Tooltip title={c.description}>{c.code}</Tooltip><CriterionKnowledgePopover criterionId={c.id} /></span>,
          key: c.id,
          width: 90,
          render: (_: any, student: { id: string }) => (
            <AssessmentCell
              scaleType={grid.scaleConfig.scaleType}
              numericMax={grid.scaleConfig.numericMax}
              value={cells[key(student.id, c.id)] || {}}
              onChange={(v) => onCellChange(student.id, c.id, v)}
              source={sourceByKey.get(key(student.id, c.id))}
            />
          ),
        })),
      });
    }
    return cols;
  }, [grid, cells, onCellChange]);

  if (!grid.groups.length) {
    return (
      <Typography.Text type="secondary">
        Esta asignatura no tiene criterios para el curso del grupo.
      </Typography.Text>
    );
  }

  return (
    <Table
      rowKey="id"
      dataSource={grid.students}
      columns={columns}
      pagination={false}
      scroll={{ x: 'max-content' }}
      size="small"
    />
  );
};
