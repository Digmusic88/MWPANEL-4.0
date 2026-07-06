import React from 'react';
import { Card, Table, Empty, Statistic } from 'antd';
import { AcademicData } from '@/types/studentAutoReport';

const fmt = (n: number | null) => (n === null || n === undefined ? '—' : n);

export const ReportAcademicSection: React.FC<{ data: AcademicData }> = ({ data }) => (
  <Card title="Rendimiento académico" style={{ marginBottom: 16 }}>
    {!data.hasData ? (
      <Empty description="Sin datos académicos para los filtros seleccionados" />
    ) : (
      <>
        <Statistic title="Media global" value={data.overallAverage ?? undefined} suffix="/ 100" style={{ marginBottom: 16 }} />
        <Table
          rowKey="subjectId"
          dataSource={data.subjects}
          pagination={false}
          size="small"
          columns={[
            { title: 'Asignatura', dataIndex: 'name' },
            { title: 'Media', dataIndex: 'average', render: fmt },
            { title: 'Tareas', dataIndex: 'taskAverage', render: fmt },
            { title: 'Actividades', dataIndex: 'activityAverage', render: fmt },
            { title: 'Exámenes', dataIndex: 'examAverage', render: fmt },
            { title: 'Nº ítems', dataIndex: 'gradedItems' },
          ]}
        />
      </>
    )}
  </Card>
);
