import React, { useEffect, useMemo, useState } from 'react';
import { Card, Select, Space, Row, Col, Statistic, Table, Empty, Typography } from 'antd';
import apiClient from '@services/apiClient';
import { useCurrentAcademicYear } from '@/hooks/useCurrentAcademicYear';
import ExpedienteViewer from './ExpedienteViewer';
import BuildYearExpedientesButton from './BuildYearExpedientesButton';
import { SyncExpedienteButton } from './SyncExpedienteButton';

const { Title } = Typography;

export interface PerfEntry {
  subjectAssignmentId: string;
  title?: string;
  subjectAssignment?: { subject?: { name?: string } };
  period: string;
  numericValue: number | string | null;
  isPassing: boolean;
}

export interface PerformanceSummary {
  perSubject: Array<{ subject: string; average: number }>;
  passingPct: number;
  totalSubjects: number;
}

const toNum = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Resumen desde las entradas ANNUAL: media por asignatura (0-100) y % aprobados. */
export function computeSummary(entries: PerfEntry[]): PerformanceSummary {
  const annual = (entries || []).filter((e) => e.period === 'annual');
  const perSubject = annual.map((e) => ({
    subject: e.title || e.subjectAssignment?.subject?.name || 'Asignatura',
    average: round2(toNum(e.numericValue) ?? 0),
  }));
  const total = annual.length;
  const passing = annual.filter((e) => e.isPassing).length;
  const passingPct = total > 0 ? round2((passing / total) * 100) : 0;
  return { perSubject, passingPct, totalSubjects: total };
}

interface StudentLite {
  id: string;
  user?: { profile?: { firstName?: string; lastName?: string } };
}

const studentName = (s: StudentLite): string => {
  const first = s.user?.profile?.firstName || '';
  const last = s.user?.profile?.lastName || '';
  return `${first} ${last}`.trim() || 'Alumno';
};

interface AdminPerformanceSectionProps {
  students: StudentLite[];
  academicYearId?: string;
}

const AdminPerformanceSection: React.FC<AdminPerformanceSectionProps> = ({ students, academicYearId: _academicYearId }) => {
  const { currentAcademicYear } = useCurrentAcademicYear();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [entries, setEntries] = useState<PerfEntry[]>([]);

  const yearName: string | undefined = currentAcademicYear?.name;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedId || !yearName) { setEntries([]); return; }
      try {
        const res = await apiClient.get(
          `/academic-records/student/${selectedId}?academicYear=${encodeURIComponent(yearName)}`,
        );
        const records = res.data?.records || [];
        if (!cancelled) setEntries(records.length > 0 ? records[0].entries || [] : []);
      } catch {
        if (!cancelled) setEntries([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, yearName]);

  const summary = useMemo(() => computeSummary(entries), [entries]);

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>Alumno:</span>
          <Select
            style={{ width: 280 }}
            placeholder="Selecciona un alumno"
            showSearch
            optionFilterProp="label"
            value={selectedId}
            onChange={setSelectedId}
            options={students.map((s) => ({ value: s.id, label: studentName(s) }))}
          />
          {selectedId && yearName && (
            <SyncExpedienteButton studentId={selectedId} academicYearName={yearName} />
          )}
          <BuildYearExpedientesButton academicYearId={currentAcademicYear?.id} />
        </Space>
      </Card>

      {!selectedId ? (
        <Empty description="Selecciona un alumno para ver su rendimiento" />
      ) : (
        <>
          <Card title="Resumen de rendimiento" style={{ marginBottom: 16 }}>
            {summary.totalSubjects === 0 ? (
              <Empty description="Sin datos de rendimiento para el año actual" />
            ) : (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col><Statistic title="Asignaturas" value={summary.totalSubjects} /></Col>
                  <Col><Statistic title="% Aprobadas" value={summary.passingPct} suffix="%" /></Col>
                </Row>
                <Title level={5}>Media por asignatura</Title>
                <Table
                  rowKey="subject"
                  size="small"
                  pagination={false}
                  dataSource={summary.perSubject}
                  columns={[
                    { title: 'Asignatura', dataIndex: 'subject', key: 'subject' },
                    {
                      title: 'Media (anual)',
                      dataIndex: 'average',
                      key: 'average',
                      render: (v: number) => `${v.toFixed(2)} / 100`,
                    },
                  ]}
                />
              </>
            )}
          </Card>

          <ExpedienteViewer studentId={selectedId} />
        </>
      )}
    </div>
  );
};

export default AdminPerformanceSection;
