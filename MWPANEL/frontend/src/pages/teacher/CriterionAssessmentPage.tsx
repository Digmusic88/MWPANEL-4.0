import React, { useEffect, useMemo, useState } from 'react';
import { Card, Select, Space, Typography, Spin, Alert, message, Segmented } from 'antd';
import { SaberGrid } from '@/components/criterion-assessment/SaberGrid';
import { CompetencyValuationPanel } from '@/components/criterion-assessment/CompetencyValuationPanel';
import { Valuation } from '@/types/criterionAssessment';
import { SaberGridResponse, ThreeState } from '@/types/basicKnowledgeAssessment';
import apiClient from '@/services/apiClient';
import { criterionAssessmentService } from '@/services/criterionAssessmentService';
import { basicKnowledgeAssessmentService } from '@/services/basicKnowledgeAssessmentService';
import { CriterionHelp } from '@/components/criterion-assessment/CriterionHelp';

const { Title } = Typography;

// Roll-up cliente (espejo del backend) para feedback en vivo del criterio derivado.
const STATE_VALUE: Record<ThreeState, number> = { NOT_ACHIEVED: 0, IN_PROGRESS: 1, ACHIEVED: 2 };
const VALUE_STATE: ThreeState[] = ['NOT_ACHIEVED', 'IN_PROGRESS', 'ACHIEVED'];
const rollUp = (states: number[]): ThreeState | null => {
  if (!states.length) return null;
  const mean = states.reduce((a, b) => a + b, 0) / states.length;
  return VALUE_STATE[Math.max(0, Math.min(2, Math.round(mean)))];
};

const CriterionAssessmentPage: React.FC = () => {
  const [assignments, setAssignments] = useState<{ id: string; label: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string; type?: string }[]>([]);
  const [saId, setSaId] = useState<string>();
  const [periodId, setPeriodId] = useState<string>();
  const [grid, setGrid] = useState<SaberGridResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, ThreeState>>({}); // studentId|saberId
  const [selectedStudentId, setSelectedStudentId] = useState<string>();
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [mode, setModeState] = useState<'parallel' | 'derive' | 'replace'>('parallel');

  useEffect(() => {
    apiClient
      .get('/subjects/my-assignments')
      .then((r) => setAssignments((r.data || []).map((a: any) => ({
        id: a.id, label: `${a.subject?.name ?? ''} · ${a.classGroups?.[0]?.name ?? a.classGroup?.name ?? ''}`,
      }))))
      .catch(() => message.error('No se pudieron cargar tus asignaturas'));
    apiClient.get('/evaluations/periods').then((r) => setPeriods(r.data || [])).catch(() => {});
  }, []);

  const loadGrid = async (sa: string, p: string) => {
    setLoading(true); setError(null);
    try {
      const g = await basicKnowledgeAssessmentService.getGrid(sa, p);
      setGrid(g);
      const next: Record<string, ThreeState> = {};
      for (const m of g.saberMarks) next[`${m.studentId}|${m.basicKnowledgeId}`] = m.levelValue;
      setMarks(next);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar la rejilla');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (saId && periodId) {
      setMarks({}); setSelectedStudentId(undefined); setValuation(null);
      loadGrid(saId, periodId);
    }
  }, [saId, periodId]);

  useEffect(() => {
    if (!selectedStudentId || !saId || !periodId) { setValuation(null); return; }
    setValuationLoading(true);
    criterionAssessmentService
      .getValuation(selectedStudentId, saId, periodId)
      .then((v) => setValuation(v))
      .catch(() => setValuation({ bySpecific: [], byKey: [] }))
      .finally(() => setValuationLoading(false));
  }, [selectedStudentId, saId, periodId]);

  // Criterio derivado en vivo desde las marcas locales.
  const derived = useMemo(() => {
    const out: Record<string, ThreeState | null> = {};
    if (!grid) return out;
    for (const s of grid.students) {
      for (const g of grid.groups) {
        for (const c of g.criteria) {
          const states = c.saberes
            .map((sb) => marks[`${s.id}|${sb.basicKnowledgeId}`])
            .filter((v): v is ThreeState => !!v)
            .map((v) => STATE_VALUE[v]);
          out[`${s.id}|${c.id}`] = rollUp(states);
        }
      }
    }
    return out;
  }, [grid, marks]);

  const PERIOD_TYPE_TO_GRADE_PERIOD: Record<string, string> = {
    trimester_1: 'first_trimester', trimester_2: 'second_trimester', trimester_3: 'third_trimester',
  };
  const selectedPeriod = periods.find((p) => p.id === periodId);
  const gradePeriod = selectedPeriod?.type
    ? PERIOD_TYPE_TO_GRADE_PERIOD[String(selectedPeriod.type).toLowerCase()]
    : undefined;

  useEffect(() => {
    if (saId && gradePeriod) {
      criterionAssessmentService.getMode(saId, gradePeriod).then((r) => setModeState(r.mode)).catch(() => setModeState('parallel'));
    } else {
      setModeState('parallel');
    }
  }, [saId, gradePeriod]);

  return (
    <div style={{ padding: 16 }}>
      <Title level={3}>Evaluación por Criterios</Title>
      <CriterionHelp />
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select style={{ minWidth: 280 }} placeholder="Asignatura / grupo" value={saId} onChange={setSaId}
            options={assignments.map((a) => ({ value: a.id, label: a.label }))} />
          <Select style={{ minWidth: 200 }} placeholder="Periodo" value={periodId} onChange={setPeriodId}
            options={periods.map((p) => ({ value: p.id, label: p.name }))} />
          {gradePeriod && (
            <Segmented
              value={mode}
              options={[{ label: 'Paralelo', value: 'parallel' }, { label: 'Derivar', value: 'derive' }, { label: 'Sustituir', value: 'replace' }]}
              onChange={async (v) => {
                const nv = v as 'parallel' | 'derive' | 'replace';
                const prev = mode; setModeState(nv);
                if (saId && gradePeriod) {
                  try { await criterionAssessmentService.setMode(saId, gradePeriod, nv); message.success('Modo LOMLOE actualizado'); }
                  catch { setModeState(prev); message.error('No se pudo actualizar el modo'); }
                }
              }}
            />
          )}
        </Space>
        {mode === 'replace' && gradePeriod && (
          <Alert type="info" showIcon style={{ marginTop: 8 }} message="La nota del trimestre será la valoración de criterios (sustituye exámenes/tareas/actividades)." />
        )}
        {mode === 'derive' && gradePeriod && (
          <Alert type="info" showIcon style={{ marginTop: 8 }} message="Las marcas de criterio pesan en la nota. Ajusta el peso de 'Criterios (LOMLOE)' en la modal de pesos del cuaderno." />
        )}
      </Card>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="El marcado de saberes se realiza ahora en el Cuaderno, dentro de cada trabajo. Esta vista es de solo lectura (seguimiento)."
      />
      {loading ? <Spin /> : grid && <SaberGrid grid={grid} marks={marks} derived={derived} />}
      {grid && grid.students.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <Space wrap>
            <Select style={{ minWidth: 220 }} placeholder="Ver valoración de alumno" allowClear
              value={selectedStudentId} onChange={(v) => setSelectedStudentId(v)}
              options={grid.students.map((s) => ({ value: s.id, label: s.name }))} />
          </Space>
        </Card>
      )}
      {valuationLoading && <Spin style={{ marginTop: 16 }} />}
      {!valuationLoading && valuation && <CompetencyValuationPanel valuation={valuation} />}
    </div>
  );
};

export default CriterionAssessmentPage;
