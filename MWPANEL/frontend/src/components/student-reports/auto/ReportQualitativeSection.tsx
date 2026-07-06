import React from 'react';
import { Card, Empty, List, Tag } from 'antd';
import { QualitativeData } from '@/types/studentAutoReport';

export const ReportQualitativeSection: React.FC<{ data: QualitativeData }> = ({ data }) => (
  <Card title="Informes cualitativos" style={{ marginBottom: 16 }}>
    {!data.hasData ? <Empty description="Sin informes cualitativos" /> : (
      <List
        dataSource={data.reports}
        renderItem={(r) => <List.Item>
          <List.Item.Meta
            title={<span>{r.date ?? ''}{r.contextTag ? <> · <Tag>{r.contextTag}</Tag></> : ''}{r.author ? ` · ${r.author}` : ''}</span>}
            description={r.content}
          />
        </List.Item>}
      />
    )}
  </Card>
);
