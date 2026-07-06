import React, { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Statistic, Row, Col, Button, Empty, Spin, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import apiClient from '@services/apiClient';
import AcademicYearSelector from '@components/common/AcademicYearSelector';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { lomloeConversion, lomloeColor } from '@/utils/lomloe';

export interface ExpedienteViewerProps {
  studentId: string;
  showPdfButton?: boolean;
}

interface Entry {
  id: string;
  subjectAssignmentId: string;
  title?: string;
  subjectAssignment?: { subject?: { id?: string; name?: string; course?: { name?: string } } };
  period: string; // 'annual' | 'first_trimester' | 'second_trimester' | 'third_trimester'
  numericValue: number | string | null;
  isPassing: boolean;
}

interface RecordDto {
  id: string;
  finalGPA?: number | string;
  status?: string;
  isPromoted?: boolean;
  entries?: Entry[];
  student?: { educationalLevel?: { name?: string } };
}

interface SubjectRow {
  key: string;
  subject: string;
  subjectId?: string;
  course?: string; // curso escolar (nivel) — solo visible para profesor/admin (RGPD lo oculta a familia/alumno)
  first_trimester?: Entry;
  second_trimester?: Entry;
  third_trimester?: Entry;
  annual?: Entry;
}

const ADAPTATION_LABEL: Record<string, string> = {
  SIGNIFICANT: 'ACS',
  NON_SIGNIFICANT: 'No signif.',
  ACCESS: 'Acceso',
};

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
};

type ThreeState = 'NOT_ACHIEVED' | 'IN_PROGRESS' | 'ACHIEVED';
interface TrimStates { T1: ThreeState | null; T2: ThreeState | null; T3: ThreeState | null }
interface LomloeSaberRow { basicKnowledgeId: string; code: string; name: string; states: TrimStates }
interface LomloeCriterionRow { criterionId: string; code: string; name: string; specificCompetencyCode?: string; states: TrimStates; saberes: LomloeSaberRow[] }
interface LomloeSubjectRow { subjectName: string; subjectAssignmentId: string; criteria: LomloeCriterionRow[] }

const STATE_LABEL: Record<ThreeState, string> = { ACHIEVED: 'Alcanzado', IN_PROGRESS: 'En proceso', NOT_ACHIEVED: 'No completado' };
const STATE_COLOR: Record<ThreeState, string> = { ACHIEVED: '#52c41a', IN_PROGRESS: '#faad14', NOT_ACHIEVED: '#ff4d4f' };
const StateTag: React.FC<{ s: ThreeState | null }> = ({ s }) =>
  s ? <Tag color={STATE_COLOR[s]}>{STATE_LABEL[s]}</Tag> : <span style={{ color: '#bbb' }}>—</span>;

const GradeCell: React.FC<{ entry?: Entry }> = ({ entry }) => {
  if (!entry) return <span style={{ color: '#bbb' }}>—</span>;
  const value = num(entry.numericValue);
  return (
    <Space size={6}>
      <span style={{ fontWeight: 600 }}>{value !== null ? value.toFixed(2) : '—'}</span>
      {value !== null && (
        <Tag color={entry.isPassing ? 'green' : 'red'}>{entry.isPassing ? 'apto' : 'no apto'}</Tag>
      )}
    </Space>
  );
};

const ExpedienteViewer: React.FC<ExpedienteViewerProps> = ({ studentId, showPdfButton = true }) => {
  const { allAcademicYears } = useAcademicYear();
  const [yearId, setYearId] = useState<string | undefined>(undefined);
  const [record, setRecord] = useState<RecordDto | null>(null);
  const [gpa, setGpa] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lomloe, setLomloe] = useState<LomloeSubjectRow[]>([]);
  const [adaptations, setAdaptations] = useState<Record<string, string>>({});

  const yearName = allAcademicYears.find((y) => y.id === yearId)?.name;

  const fetchExpediente = useCallback(async () => {
    if (!studentId || !yearName) return;
    setLoading(true);
    try {
      const [recRes, statsRes] = await Promise.all([
        apiClient.get(`/academic-records/student/${studentId}?academicYear=${encodeURIComponent(yearName)}`),
        apiClient.get(`/academic-records/statistics/student/${studentId}?academicYear=${encodeURIComponent(yearName)}`),
      ]);
      const records: RecordDto[] = recRes.data?.records || [];
      setRecord(records.length > 0 ? records[0] : null);
      setGpa(num(statsRes.data?.averageGPA));
    } catch {
      setRecord(null);
      setGpa(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, yearName]);

  // Re-fetch al cambiar alumno o año (el nombre del año se resuelve desde yearId)
  useEffect(() => { fetchExpediente(); }, [fetchExpediente]);
  // Limpiar el año al cambiar de alumno (contrato de AcademicYearSelector)
  useEffect(() => { setYearId(undefined); setRecord(null); }, [studentId]);

  // Fetch aparte del progreso LOMLOE (criterios/saberes) — un fallo aquí no debe romper el expediente/notas
  useEffect(() => {
    if (!studentId || !yearName) { setLomloe([]); return; }
    (async () => {
      try {
        const lp = await apiClient.get(`/academic-records/lomloe-progress/${studentId}?academicYear=${encodeURIComponent(yearName)}`);
        setLomloe(lp.data?.subjects || []);
      } catch {
        setLomloe([]);
      }
    })();
  }, [studentId, yearName]);

  // Fetch aparte de adaptaciones curriculares (DUA) — un fallo aquí no debe romper el expediente/notas
  useEffect(() => {
    if (!studentId || !yearId) { setAdaptations({}); return; }
    (async () => {
      try {
        const ad = await apiClient.get(`/dua/curricular-adaptations/student/${studentId}?academicYearId=${yearId}`);
        const m: Record<string, string> = {};
        (ad.data || []).forEach((r: any) => { if (r.subjectId) m[r.subjectId] = r.type; });
        setAdaptations(m);
      } catch {
        setAdaptations({});
      }
    })();
  }, [studentId, yearId]);

  const handleDownloadPdf = async () => {
    if (!yearName) return;
    setDownloading(true);
    try {
      const gen = await apiClient.post(`/academic-records/reports/student/${studentId}/${encodeURIComponent(yearName)}`);
      const fileName = gen.data?.fileName;
      if (!fileName) throw new Error('sin fileName');
      const dl = await apiClient.get(`/academic-records/reports/download/${fileName}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(dl.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo generar el boletín');
    } finally {
      setDownloading(false);
    }
  };

  // Agrupar entradas por subjectAssignmentId -> fila con columnas por periodo
  const rows: SubjectRow[] = React.useMemo(() => {
    const entries = record?.entries || [];
    const bySubject = new Map<string, SubjectRow>();
    for (const e of entries) {
      const key = e.subjectAssignmentId;
      const subject = e.title || e.subjectAssignment?.subject?.name || 'Asignatura';
      const course = e.subjectAssignment?.subject?.course?.name;
      const subjectId = e.subjectAssignment?.subject?.id;
      const row = bySubject.get(key) || { key, subject, course, subjectId };
      if (e.period === 'first_trimester') row.first_trimester = e;
      else if (e.period === 'second_trimester') row.second_trimester = e;
      else if (e.period === 'third_trimester') row.third_trimester = e;
      else if (e.period === 'annual') row.annual = e;
      bySubject.set(key, row);
    }
    return Array.from(bySubject.values());
  }, [record]);

  const etapa = record?.student?.educationalLevel?.name;

  const columns = React.useMemo(() => [
    {
      title: 'Asignatura',
      dataIndex: 'subject',
      key: 'subject',
      render: (_: any, r: SubjectRow) => {
        const type = r.subjectId ? adaptations[r.subjectId] : undefined;
        const label = type ? ADAPTATION_LABEL[type] : undefined;
        return (
          <Space size={6}>
            <span>{r.subject}</span>
            {label && <Tag color="#3F6E58">Adaptada · {label}</Tag>}
          </Space>
        );
      },
    },
    { title: '1º Trimestre', key: 'first_trimester', render: (_: any, r: SubjectRow) => <GradeCell entry={r.first_trimester} /> },
    { title: '2º Trimestre', key: 'second_trimester', render: (_: any, r: SubjectRow) => <GradeCell entry={r.second_trimester} /> },
    { title: '3º Trimestre', key: 'third_trimester', render: (_: any, r: SubjectRow) => <GradeCell entry={r.third_trimester} /> },
    { title: 'Anual', key: 'annual', render: (_: any, r: SubjectRow) => <GradeCell entry={r.annual} /> },
    {
      title: 'Conversión LOMLOE',
      key: 'lomloe',
      render: (_: any, r: SubjectRow) => {
        const value = num(r.annual?.numericValue);
        if (value === null) return <span style={{ color: '#bbb' }}>—</span>;
        return <Tag color={lomloeColor(value)}>{lomloeConversion(value, etapa)}</Tag>;
      },
    },
  ], [etapa, adaptations]);

  return (
    <Card title="Expediente académico">
      <Space style={{ marginBottom: 16 }} wrap>
        <AcademicYearSelector studentId={studentId} value={yearId} onChange={setYearId} />
        {showPdfButton && record && (
          <Button icon={<DownloadOutlined />} loading={downloading} onClick={handleDownloadPdf}>
            Descargar boletín PDF
          </Button>
        )}
      </Space>

      {loading ? (
        <Spin />
      ) : !yearName ? (
        <Empty description="Selecciona un año académico" />
      ) : !record ? (
        <Empty description="Sin expediente para este año" />
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col>
              <Statistic title="Nota media (GPA)" value={gpa !== null ? gpa.toFixed(2) : '—'} suffix={gpa !== null ? '/100' : undefined} />
              {gpa !== null && (
                <Tag color={lomloeColor(gpa)} style={{ marginTop: 4 }}>{lomloeConversion(gpa, etapa)}</Tag>
              )}
            </Col>
            <Col>
              <Statistic title="Asignaturas" value={rows.length} />
            </Col>
            <Col>
              <div>
                <div className="ant-statistic-title" style={{ marginBottom: 4, color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>Estado</div>
                <Space>
                  <Tag color={record.status === 'active' ? 'blue' : 'default'}>{record.status || '—'}</Tag>
                  {record.isPromoted ? <Tag color="green">Promociona</Tag> : null}
                </Space>
              </div>
            </Col>
          </Row>
          {(() => {
            // Agrupar por curso escolar solo cuando hay dato de curso (profesor/admin).
            // Para familia/alumno el RGPD lo elimina en el backend → tabla plana sin nivel.
            const hasCourse = rows.some((r) => r.course);
            if (!hasCourse) {
              return <Table rowKey="key" columns={columns} dataSource={rows} pagination={false} size="middle" />;
            }
            const groups = new Map<string, SubjectRow[]>();
            for (const r of rows) {
              const c = r.course || 'Sin curso asignado';
              if (!groups.has(c)) groups.set(c, []);
              groups.get(c)!.push(r);
            }
            const sorted = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'es'));
            return sorted.map((c) => (
              <div key={c} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, margin: '8px 0', color: '#2C5F8A' }}>Curso: {c}</div>
                <Table rowKey="key" columns={columns} dataSource={groups.get(c)} pagination={false} size="middle" />
              </div>
            ));
          })()}

          {lomloe.length > 0 && (
            <Card size="small" title="Progreso LOMLOE (criterios y saberes)" style={{ marginTop: 16 }}>
              {lomloe.map((subj) => (
                <div key={subj.subjectAssignmentId} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{subj.subjectName}</div>
                  <Table
                    size="small"
                    rowKey="criterionId"
                    pagination={false}
                    dataSource={subj.criteria}
                    expandable={{
                      rowExpandable: (r: LomloeCriterionRow) => r.saberes.length > 0,
                      expandedRowRender: (r: LomloeCriterionRow) => (
                        <Table
                          size="small"
                          rowKey="basicKnowledgeId"
                          pagination={false}
                          dataSource={r.saberes}
                          columns={[
                            { title: 'Saber', key: 'saber', render: (_: any, k: LomloeSaberRow) => `${k.code} — ${k.name}` },
                            { title: '1ºT', key: 't1', width: 110, render: (_: any, k: LomloeSaberRow) => <StateTag s={k.states.T1} /> },
                            { title: '2ºT', key: 't2', width: 110, render: (_: any, k: LomloeSaberRow) => <StateTag s={k.states.T2} /> },
                            { title: '3ºT', key: 't3', width: 110, render: (_: any, k: LomloeSaberRow) => <StateTag s={k.states.T3} /> },
                          ]}
                        />
                      ),
                    }}
                    columns={[
                      { title: 'Criterio', key: 'criterio', render: (_: any, c: LomloeCriterionRow) => `${c.code}${c.specificCompetencyCode ? ` · ${c.specificCompetencyCode}` : ''} — ${c.name}` },
                      { title: '1ºT', key: 't1', width: 130, render: (_: any, c: LomloeCriterionRow) => <StateTag s={c.states.T1} /> },
                      { title: '2ºT', key: 't2', width: 130, render: (_: any, c: LomloeCriterionRow) => <StateTag s={c.states.T2} /> },
                      { title: '3ºT', key: 't3', width: 130, render: (_: any, c: LomloeCriterionRow) => <StateTag s={c.states.T3} /> },
                    ]}
                  />
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </Card>
  );
};

export default ExpedienteViewer;
