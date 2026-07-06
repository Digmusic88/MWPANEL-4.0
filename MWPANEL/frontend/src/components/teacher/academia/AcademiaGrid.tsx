import React from 'react';
import { Table, Button, Space, Typography } from 'antd';

export interface GridStudentRow { enrollmentId: string; studentName: string; }
export interface Palette { [value: string]: { label: string; color: string } }

interface Props {
  students: GridStudentRow[];
  value: Record<string, string>;               // enrollmentId -> valor del día
  palette: Palette;
  cycle: (current: string | undefined) => string; // valor siguiente al clicar
  renderCell?: (value: string) => React.ReactNode; // opcional (p.ej. carita)
  onChange: (enrollmentId: string, next: string) => void;
  onSave: () => void;
  onFillAll?: () => void;
  fillAllLabel?: string;
  saving?: boolean;
}

const AcademiaGrid: React.FC<Props> = ({ students, value, palette, cycle, renderCell, onChange, onSave, onFillAll, fillAllLabel, saving }) => {
  const columns = [
    { title: 'Alumno/a', dataIndex: 'studentName', key: 'name' },
    {
      title: 'Estado', key: 'state', width: 140,
      render: (_: any, r: GridStudentRow) => {
        const v = value[r.enrollmentId];
        const meta = v ? palette[v] : undefined;
        return (
          <div onClick={() => onChange(r.enrollmentId, cycle(v))}
               style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '2px 10px', borderRadius: 14, background: meta ? meta.color : '#f0f0f0',
                        color: meta ? '#fff' : '#888', userSelect: 'none' }}>
            {renderCell ? renderCell(v) : null}
            <span>{meta ? meta.label : '—'}</span>
          </div>
        );
      },
    },
  ];
  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={onSave} loading={saving}>Guardar</Button>
        {onFillAll && <Button onClick={onFillAll}>{fillAllLabel || 'Rellenar todos'}</Button>}
        <Typography.Text type="secondary">Haz clic en un estado para cambiarlo.</Typography.Text>
      </Space>
      <Table rowKey="enrollmentId" size="small" pagination={false} dataSource={students} columns={columns} />
    </div>
  );
};
export default AcademiaGrid;
