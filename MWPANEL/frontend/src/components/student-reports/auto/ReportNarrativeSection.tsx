import React from 'react';
import { Card, Typography, Divider, List } from 'antd';
import { StudentAutoReportNarrative } from '@/types/studentAutoReport';

const { Title, Paragraph } = Typography;

// academicAssessment y socioEmotionalAssessment son string; strengths/improvementAreas/recommendations son string[]
const TextBlock: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <>
    <Title level={5}>{title}</Title>
    <Paragraph>{text || 'Sin información.'}</Paragraph>
  </>
);

const ListBlock: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <>
    <Title level={5}>{title}</Title>
    {items && items.length
      ? <List size="small" dataSource={items} renderItem={(i) => <List.Item>{i}</List.Item>} />
      : <Paragraph>Sin información.</Paragraph>}
  </>
);

export const ReportNarrativeSection: React.FC<{ narrative: StudentAutoReportNarrative }> = ({ narrative }) => (
  <Card title="Valoración" style={{ marginBottom: 16 }}>
    <TextBlock title="Valoración académica" text={narrative.academicAssessment} />
    {narrative.detailedAcademic && (
      <>
        <Divider />
        <TextBlock title="Valoración académica detallada" text={narrative.detailedAcademic} />
      </>
    )}
    <Divider />
    <TextBlock title="Valoración emocional y social" text={narrative.socioEmotionalAssessment} />
    {narrative.lomloeAssessment && (
      <>
        <Divider />
        <TextBlock title="Valoración LOMLOE" text={narrative.lomloeAssessment} />
      </>
    )}
    <Divider />
    <ListBlock title="Fortalezas" items={narrative.strengths} />
    <Divider />
    <ListBlock title="Áreas de mejora" items={narrative.improvementAreas} />
    <Divider />
    <ListBlock title="Recomendaciones" items={narrative.recommendations} />
  </Card>
);
