import React from 'react';
import { Card, Empty, Row, Col, Statistic, List, Typography, Divider, Space, Tag } from 'antd';
import { AttendanceData, DuaData } from '@/types/studentAutoReport';

const { Title } = Typography;

// attendance y dua son opcionales (el backend puede no incluir el sub-bloque si no se pidió)
export const ReportAttendanceDuaSection: React.FC<{ attendance?: AttendanceData; dua?: DuaData }> = ({ attendance, dua }) => (
  <Card title="Asistencia y atención a la diversidad (DUA)" style={{ marginBottom: 16 }}>
    <Title level={5}>Asistencia</Title>
    {!attendance?.hasData ? <Empty description="Sin datos de asistencia" /> : (
      <Row gutter={16}>
        <Col><Statistic title="Asistencia" value={attendance.attendanceRate ?? undefined} suffix="%" /></Col>
        <Col><Statistic title="Presentes" value={attendance.presentDays} /></Col>
        <Col><Statistic title="Ausencias" value={attendance.absentDays} /></Col>
        <Col><Statistic title="Retrasos" value={attendance.lateDays} /></Col>
        <Col><Statistic title="Justificadas" value={attendance.justifiedAbsences} /></Col>
      </Row>
    )}
    <Divider />
    <Title level={5}>Atención a la diversidad (DUA)</Title>
    {!dua?.hasData ? <Empty description="Sin perfil DUA" /> : (
      <Space direction="vertical" style={{ width: '100%' }}>
        {dua.strengths.length > 0 && <div><b>Fortalezas:</b> <Space wrap>{dua.strengths.map((s) => <Tag key={s} color="green">{s}</Tag>)}</Space></div>}
        {dua.barriers.length > 0 && <div><b>Barreras:</b> <Space wrap>{dua.barriers.map((b) => <Tag key={b} color="red">{b}</Tag>)}</Space></div>}
        <List size="small" dataSource={dua.accommodations}
          renderItem={(a) => <List.Item><b>{a.name}</b>{a.type ? ` · ${a.type}` : ''}{a.status ? ` (${a.status})` : ''}</List.Item>} />
      </Space>
    )}
  </Card>
);
