import React from 'react';
import { Card, Tag, Typography, Space } from 'antd';
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { StudentAutoReportResult, OverallVerdict } from '@/types/studentAutoReport';

dayjs.locale('es');
const { Title, Text } = Typography;

const VERDICT_MAP: Record<OverallVerdict, { label: string; color: string }> = {
  consolidado: { label: 'Consolidado', color: 'green' },
  en_progreso: { label: 'En progreso', color: 'blue' },
  necesita_apoyo: { label: 'Necesita apoyo', color: 'orange' },
  sin_datos: { label: 'Sin datos', color: 'default' },
};

export const ReportVerdictHeader: React.FC<{ result: StudentAutoReportResult }> = ({ result }) => {
  const { student, metrics, narrative, generatedAt } = result;
  const v = VERDICT_MAP[metrics.overallVerdict] ?? VERDICT_MAP.sin_datos;
  return (
    <Card style={{ marginBottom: 16 }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space align="center" wrap>
          <Title level={4} style={{ margin: 0 }}>{student.firstName} {student.lastName}</Title>
          <Tag color={v.color}>{v.label}</Tag>
          {narrative.aiGenerated
            ? <Tag icon={<RobotOutlined />} color="purple">IA</Tag>
            : <Tag icon={<ThunderboltOutlined />}>Automático</Tag>}
        </Space>
        <Text type="secondary">
          {student.educationalLevel}{student.classGroup ? ` · ${student.classGroup}` : ''} · Matrícula {student.enrollmentNumber}
        </Text>
        <Text type="secondary">Generado el {dayjs(generatedAt).format('D [de] MMMM [de] YYYY, HH:mm')}</Text>
      </Space>
    </Card>
  );
};
