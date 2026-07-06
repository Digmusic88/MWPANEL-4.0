import React from 'react';
import { Card, Typography } from 'antd';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

const { Text } = Typography;

export interface LomloeRadarDatum {
  code: string;
  name: string;
  score: number; // 0-100
}

interface Props {
  data: LomloeRadarDatum[];
  title?: string;
  height?: number;
}

const LomloeCompetencyRadar: React.FC<Props> = ({ data, title = 'Perfil competencial LOMLOE (0-100)', height = 400 }) => {
  const overall = data.length > 0
    ? Math.round((data.reduce((s, d) => s + d.score, 0) / data.length) * 10) / 10
    : 0;

  return (
    <Card className="shadow-sm" title={title}>
      <div className="text-center mb-3">
        <Text type="secondary">Media global: </Text>
        <Text strong style={{ fontSize: 20 }}>{overall}</Text>
        <Text type="secondary"> / 100</Text>
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <RadarChart data={data}>
            <PolarGrid gridType="polygon" radialLines={true} />
            <PolarAngleAxis dataKey="code" tick={{ fontSize: 12, fill: '#666' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#999' }} tickCount={6} />
            <Radar
              name="Competencia (0-100)"
              dataKey="score"
              stroke="#722ed1"
              fill="#722ed1"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ fill: '#722ed1', strokeWidth: 1, r: 4 }}
            />
            <Tooltip
              formatter={(value: any, _n: any, entry: any) => [`${value} / 100`, entry?.payload?.name || 'Competencia']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default LomloeCompetencyRadar;
