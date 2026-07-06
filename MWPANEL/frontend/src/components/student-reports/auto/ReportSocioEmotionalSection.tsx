import React from 'react';
import { Card, Empty, Tag, List, Statistic, Space } from 'antd';
import { SocioEmotionalData } from '@/types/studentAutoReport';

export const ReportSocioEmotionalSection: React.FC<{ data: SocioEmotionalData }> = ({ data }) => (
  <Card title="Valoración emocional y social" style={{ marginBottom: 16 }}>
    {!data.hasData ? (
      <Empty description="Sin observaciones formativas registradas" />
    ) : (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Statistic title="Observaciones" value={data.totalObservations} />
        <Space wrap>{Object.entries(data.byAspect).map(([k, v]) => <Tag key={k} color="cyan">{k}: {v}</Tag>)}</Space>
        {data.requiresFollowUp > 0 && <Tag color="orange">Requieren seguimiento: {data.requiresFollowUp}</Tag>}
        <List
          size="small"
          dataSource={data.notes}
          renderItem={(o) => <List.Item>{o.date ? `${o.date} · ` : ''}{o.text}{o.context ? ` (${o.context})` : ''}</List.Item>}
        />
      </Space>
    )}
  </Card>
);
