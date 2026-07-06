import React from 'react';
import { Card, Empty, Space, Tag, Typography } from 'antd';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { CompetenciesData, StudentAutoReportMetrics } from '@/types/studentAutoReport';

const { Text } = Typography;

export const ReportCompetenciesSection: React.FC<{ data: CompetenciesData; metrics: StudentAutoReportMetrics }> = ({ data, metrics }) => {
  if (!data.hasData) {
    return <Card title="Competencias clave" style={{ marginBottom: 16 }}><Empty description="Sin datos de competencias" /></Card>;
  }
  const chartData = data.items.map((c) => ({ code: c.code, competency: c.name, score: c.score ?? 0, fullMark: 5 }));
  const strengths = metrics.competencies?.strengths ?? [];
  const weaknesses = metrics.competencies?.weaknesses ?? [];
  return (
    <Card title="Competencias clave" style={{ marginBottom: 16 }}>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <RadarChart data={chartData}>
            <PolarGrid gridType="polygon" radialLines />
            <PolarAngleAxis dataKey="code" tick={{ fontSize: 12, fill: '#666' }} />
            <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10, fill: '#999' }} />
            <Radar name="Nivel" dataKey="score" stroke="#1890ff" fill="#1890ff" fillOpacity={0.2} strokeWidth={2} dot={{ fill: '#1890ff', r: 4 }} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
        <Text strong>Fortalezas:</Text>
        <Space wrap>{strengths.map((s) => <Tag key={s} color="green">{s}</Tag>)}</Space>
        <Text strong>Áreas de mejora:</Text>
        <Space wrap>{weaknesses.map((s) => <Tag key={s} color="orange">{s}</Tag>)}</Space>
      </Space>
    </Card>
  );
};
