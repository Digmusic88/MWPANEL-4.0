import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, Empty, Segmented, Select } from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
} from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// Colores por destreza (replica App.tsx skill colors)
const SKILL_COLOR: Record<string, string> = {
  reading: '#2563EB',
  'reading & writing': '#2563EB',
  'reading & use of english': '#4F46E5',
  writing: '#16A34A',
  listening: '#7C3AED',
  speaking: '#C43030',
  'use of english': '#0891B2',
  vocabulary: '#B45309',
  grammar: '#0D9488',
};
const skillColor = (name: string) => SKILL_COLOR[name.toLowerCase()] || '#579172';

type SkillPoint = { date: string | null; examName: string; value: number | null; np: boolean };

type Metrics = {
  kpis: {
    last: number | null;
    best: number | null;
    average: number | null;
    count: number;
    trend: 'up' | 'down' | 'flat' | null;
  };
  skills: { name: string; latest: number | null; latestNp: boolean }[];
  evolution: { date: string | null; examName: string; overall: number | null }[];
  skillSeries: Record<string, SkillPoint[]>;
  calls: {
    examName: string;
    examDate: string | null;
    overall: number | null;
    parts: { part: string; score: number | null; status: string; kind: 'scored' | 'pending' | 'np' }[];
  }[];
};

type Props = {
  data: {
    fullName?: string;
    targetLevel?: { code: string; label: string } | null;
    metrics: Metrics;
    byYear?: { year: string; metrics: Metrics }[];
  } | null;
};

const TrendIcon = ({ t }: { t: string | null }) =>
  t === 'up' ? <ArrowUpOutlined style={{ color: '#16A34A' }} />
  : t === 'down' ? <ArrowDownOutlined style={{ color: '#C43030' }} />
  : t === 'flat' ? <MinusOutlined style={{ color: '#9B9BAB' }} />
  : <span>—</span>;

// Stable skill order: canonical Cambridge skills first, then others
const SKILL_ORDER = ['Reading', 'Writing', 'Listening', 'Speaking', 'Use of English', 'Reading & Writing', 'Reading & Use of English', 'Vocabulary', 'Grammar'];
const sortSkills = (skills: Metrics['skills']) =>
  [...skills].sort((a, b) => {
    const ai = SKILL_ORDER.findIndex(s => s.toLowerCase() === a.name.toLowerCase());
    const bi = SKILL_ORDER.findIndex(s => s.toLowerCase() === b.name.toLowerCase());
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

const ALL_YEARS = 'Todos los cursos';

export default function MockResultsPanel({ data }: Props) {
  const [view, setView] = useState<string>('Global');
  const byYear = data?.byYear || [];
  const [year, setYear] = useState<string>(ALL_YEARS);

  // Al cambiar de alumno: resetear destreza y elegir el curso más reciente por defecto
  useEffect(() => {
    setView('Global');
    setYear(byYear.length ? byYear[0].year : ALL_YEARS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data || !data.metrics || data.metrics.calls.length === 0) {
    return <Empty description="Sin simulacros registrados" />;
  }

  // Métricas activas: del curso seleccionado, o globales ("Todos los cursos")
  const activeMetrics: Metrics =
    year === ALL_YEARS ? data.metrics : (byYear.find((y) => y.year === year)?.metrics || data.metrics);

  const { kpis, skills, evolution, skillSeries } = activeMetrics;
  const sortedSkills = sortSkills(skills);

  // Datos de la gráfica según la selección de destreza
  const chartData =
    view === 'Global'
      ? evolution.map((e) => ({ name: e.examName, valor: e.overall }))
      : (skillSeries[view] || []).map((p) => ({ name: p.examName, valor: p.value }));

  const yearOptions = [
    { value: ALL_YEARS, label: ALL_YEARS },
    ...byYear.map((y) => ({ value: y.year, label: y.year })),
  ];

  return (
    <div>
      {/* Selector de curso escolar (sólo si hay varios cursos en el historial) */}
      {byYear.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#9B9BAB' }}>Curso escolar:</span>
          <Select
            size="small"
            value={year}
            onChange={(v) => { setYear(v); setView('Global'); }}
            options={yearOptions}
            style={{ minWidth: 190 }}
          />
        </div>
      )}

      {/* KPIs */}
      <Row gutter={[12, 12]}>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic
              title="Último"
              valueRender={() => <span>{kpis.last == null ? '—' : `${kpis.last.toFixed(1)}%`}</span>}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic
              title="Mejor"
              valueRender={() => <span>{kpis.best == null ? '—' : `${kpis.best.toFixed(1)}%`}</span>}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic
              title="Media"
              valueRender={() => <span>{kpis.average == null ? '—' : `${kpis.average.toFixed(1)}%`}</span>}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic title="Simulacros" value={kpis.count} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic
              title="Tendencia"
              valueRender={() => <TrendIcon t={kpis.trend} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card size="small">
            <Statistic
              title="Nivel objetivo"
              valueRender={() => <span>{data.targetLevel?.label || '—'}</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* Barras por destreza */}
      <Card size="small" title="Por destreza (último simulacro con dato)" style={{ marginTop: 12 }}>
        {sortedSkills.map((s) => (
          <div key={s.name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
              <span>{s.name}</span>
              {s.latestNp ? (
                <Tag color="default">NP</Tag>
              ) : (
                <span>{s.latest == null ? 'pendiente' : `${s.latest.toFixed(1)}%`}</span>
              )}
            </div>
            <Progress
              percent={s.latest == null ? undefined : s.latest}
              showInfo={false}
              strokeColor={s.latestNp ? '#D1D5DB' : skillColor(s.name)}
              trailColor={s.latestNp ? '#F3F4F6' : undefined}
            />
          </div>
        ))}
      </Card>

      {/* Evolución histórica */}
      <Card
        size="small"
        title={year === ALL_YEARS ? 'Evolución histórica (todos los cursos)' : `Evolución histórica · ${year}`}
        style={{ marginTop: 12 }}
        extra={
          <Segmented
            size="small"
            value={view}
            onChange={(v) => setView(v as string)}
            options={['Global', ...sortedSkills.map((s) => s.name)]}
          />
        }
      >
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: unknown) =>
                  v == null ? 'NP / pendiente' : `${(v as number).toFixed(1)}%`
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="valor"
                name={view}
                stroke={view === 'Global' ? '#579172' : skillColor(view)}
                strokeWidth={2}
                connectNulls
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
