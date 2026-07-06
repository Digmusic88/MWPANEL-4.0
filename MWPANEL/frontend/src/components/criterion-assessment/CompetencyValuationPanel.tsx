import React from 'react';
import { Card, Table, Empty, Tag, Typography } from 'antd';
import { Valuation } from '@/types/criterionAssessment';

export const CompetencyValuationPanel: React.FC<{ valuation: Valuation }> = ({ valuation }) => {
  if (!valuation || (!valuation.byKey.length && !valuation.bySpecific.length)) {
    return (
      <Card title="Valoración competencial" style={{ marginTop: 16 }}>
        <Empty description="Sin datos de valoración" />
      </Card>
    );
  }
  return (
    <Card title="Valoración competencial" style={{ marginTop: 16 }}>
      <Typography.Title level={5}>Competencias clave</Typography.Title>
      <div style={{ marginBottom: 12 }}>
        {valuation.byKey.map((k) => (
          <Tag key={k.code} color="blue" style={{ marginBottom: 4 }}>
            <span>{k.code}</span>
            {': '}
            <span>{k.score}</span>
          </Tag>
        ))}
      </div>
      <Typography.Title level={5}>Competencias específicas</Typography.Title>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={valuation.bySpecific}
        columns={[
          { title: 'Código', dataIndex: 'code', width: 90 },
          { title: 'Competencia', dataIndex: 'name' },
          { title: 'Valoración', dataIndex: 'score', width: 110 },
        ]}
      />
    </Card>
  );
};
