import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Card, Select, Button, Table, InputNumber, Tag, Space, Typography, Modal, Form,
  Input, message, Tooltip, Switch, Empty, Spin, Alert, Popconfirm, Tabs, Popover,
} from 'antd';
import {
  PlusOutlined, BookOutlined, EyeOutlined, EyeInvisibleOutlined, TeamOutlined,
  ReloadOutlined, QuestionCircleOutlined, FormOutlined, FileTextOutlined, ExperimentOutlined,
  BarsOutlined, RadarChartOutlined, SyncOutlined, FileAddOutlined, ControlOutlined,
} from '@ant-design/icons';
import apiClient from '../../services/apiClient';
import { useResponsive } from '../../hooks/useResponsive';
import { GradingPageHelp } from '../../components/grading/GradingPageHelp';
import SectionInfoBanner from '../../components/common/SectionInfoBanner';
import GradebookWeightsModal from '../../components/teacher/GradebookWeightsModal';
import CreateWorkModal from '../../components/teacher/CreateWorkModal';
import WorkSaberDrawer from '../../components/teacher/WorkSaberDrawer';
import TrabajosTab from '../../components/teacher/TrabajosTab';

// Herramientas absorbidas en el Cuaderno como pestañas (se reutilizan tal cual)
const RubricsPageWithFolders = React.lazy(() => import('./RubricsPageWithFolders'));
const TeacherEvaluationsPage = React.lazy(() => import('./TeacherEvaluationsPage'));

const TabFallback = () => (
  <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
);

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * Cuaderno del Profesor — TODO en una sola página:
 *  - elegir o crear una asignatura (cuelga del año académico activo)
 *  - ver TODAS las calificaciones que ya existen: actividades numéricas (editables aquí),
 *    tareas/deberes y Test Yourself (se ven aquí, se crean en su herramienta)
 *  - añadir columnas evaluables y poner notas
 *  - publicar/ocultar cada nota a las familias
 * Todas las notas se expresan en porcentaje (0-100%).
 */

interface StudentRow {
  id: string;
  enrollmentNumber: string;
  name: string;
}

interface Assignment {
  id: string;
  subject: { id: string; name: string; code: string };
  classGroup: { id: string; name: string };
  academicYear: { id: string; name: string };
}

interface GradeColumn {
  id: string;
  source: 'activity' | 'task' | 'test';
  name: string;
  maxScore: number;
  weight?: number | null;
  editable: boolean;
  visibleToFamilies: boolean;
  grades: Record<string, number | null>;
  individualWeights?: Record<string, number | null>;
}

interface CentralizedRow {
  studentId: string;
  finalGrade: number | null;
  isPassing: boolean;
  hasData: boolean;
}

const sourceMeta: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  activity: { label: 'Actividad', color: 'green', icon: <FormOutlined /> },
  task: { label: 'Tarea', color: 'blue', icon: <FileTextOutlined /> },
  test: { label: 'Test Yourself', color: 'purple', icon: <ExperimentOutlined /> },
};

const GradebookCore: React.FC = () => {
  const { isMobile } = useResponsive();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [columns, setColumns] = useState<GradeColumn[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [headerInfo, setHeaderInfo] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBook, setLoadingBook] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [saberCell, setSaberCell] = useState<{ work: { id: string; source: string; name: string }; student: { id: string; name: string } } | null>(null);
  const [centralizedGrades, setCentralizedGrades] = useState<Map<string, CentralizedRow>>(new Map());
  const [recalcLoading, setRecalcLoading] = useState(false);
  // Periodo de cálculo de la nota ponderada. 'continuous' = comportamiento histórico
  // (nota global de curso). Un trimestre aplica el modo LOMLOE (derivar/sustituir) de ese trimestre.
  const [gradePeriod, setGradePeriod] = useState<string>('continuous');
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [createWorkOpen, setCreateWorkOpen] = useState(false);

  const [newSubjectOpen, setNewSubjectOpen] = useState(false);
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classGroups, setClassGroups] = useState<any[]>([]);
  const [subjectForm] = Form.useForm();
  const [columnForm] = Form.useForm();
  const [subjectMode, setSubjectMode] = useState<'existing' | 'new'>('existing');

  const selected = assignments.find((a) => a.id === selectedId) || headerInfo;

  useEffect(() => { fetchAssignments(); }, []);
  useEffect(() => {
    if (selectedId) {
      fetchGradebook(selectedId);
      fetchCentralizedGrades(selectedId);
    }
  }, [selectedId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/activities/teacher/subject-assignments');
      setAssignments(res.data || []);
      if (res.data?.length && !selectedId) setSelectedId(res.data[0].id);
    } catch (e) {
      message.error('No se pudieron cargar tus asignaturas');
    } finally {
      setLoading(false);
    }
  };

  const fetchGradebook = async (assignmentId: string) => {
    setLoadingBook(true);
    try {
      const res = await apiClient.get(`/grades/gradebook/${assignmentId}`);
      setStudents(res.data?.students || []);
      setColumns(res.data?.columns || []);
      if (res.data?.assignment) setHeaderInfo(res.data.assignment);
    } catch (e) {
      message.error('No se pudieron cargar las notas de esta asignatura');
    } finally {
      setLoadingBook(false);
    }
  };

  const fetchCentralizedGrades = async (assignmentId: string, period: string = gradePeriod) => {
    try {
      const res = await apiClient.get(`/centralized-grades/class/${assignmentId}?period=${period}`);
      const rows: CentralizedRow[] = res.data?.grades || [];
      const map = new Map<string, CentralizedRow>();
      rows.forEach((r) => { if (r?.studentId) map.set(r.studentId, r); });
      setCentralizedGrades(map);
    } catch (e) {
      // Fallo de lectura -> mapa vacío; la columna mostrará "—" sin romper el Cuaderno.
      setCentralizedGrades(new Map());
    }
  };

  const recalcular = async () => {
    if (!selectedId) return;
    setRecalcLoading(true);
    const hide = message.loading('Recalculando notas ponderadas…', 0);
    try {
      const res = await apiClient.post(`/centralized-grades/recalculate-real/${selectedId}?period=${gradePeriod}`);
      const successful = res.data?.successful ?? 0;
      const failed = res.data?.failed ?? 0;
      await fetchCentralizedGrades(selectedId, gradePeriod);
      hide();
      if (failed > 0) {
        message.warning(`Recalculadas ${successful} notas, ${failed} con errores.`);
      } else {
        message.success(`Notas ponderadas recalculadas (${successful} alumnos).`);
      }
    } catch (e: any) {
      hide();
      message.error(e.response?.data?.message || 'No se pudo recalcular la nota ponderada');
    } finally {
      setRecalcLoading(false);
    }
  };

  const openNewSubject = async () => {
    setNewSubjectOpen(true);
    setSubjectMode('existing');
    subjectForm.resetFields();
    try {
      const [s, c, g] = await Promise.all([
        apiClient.get('/subjects'),
        apiClient.get('/class-groups/available-courses'),
        apiClient.get('/class-groups'),
      ]);
      setSubjects(s.data || []);
      setCourses(c.data || []);
      setClassGroups(g.data || []);
    } catch (e) {
      message.error('No se pudieron cargar los datos para crear la asignatura');
    }
  };

  const handleCreateSubject = async (values: any) => {
    try {
      const payload: any = { classGroupId: values.classGroupId, weeklyHours: values.weeklyHours || 1 };
      if (subjectMode === 'existing') {
        payload.subjectId = values.subjectId;
      } else {
        payload.newSubject = {
          name: values.name, code: values.code, weeklyHours: values.weeklyHours || 1,
          courseId: values.courseId, description: values.description,
        };
      }
      const res = await apiClient.post('/subjects/teacher/quick-setup', payload);
      message.success('Asignatura lista para calificar');
      setNewSubjectOpen(false);
      await fetchAssignments();
      if (res.data?.id) setSelectedId(res.data.id);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo crear la asignatura');
    }
  };

  const handleCreateColumn = async (values: any) => {
    if (!selected) return;
    try {
      await apiClient.post('/activities', {
        name: values.name,
        classGroupId: selected.classGroup.id,
        subjectAssignmentId: selected.id,
        valuationType: 'score',
        maxScore: values.maxScore,
        assignedDate: new Date().toISOString().split('T')[0],
        description: values.tipo,
        notifyFamilies: false,
        visibleToFamilies: false,
      });
      message.success('Columna añadida');
      setNewColumnOpen(false);
      columnForm.resetFields();
      fetchGradebook(selected.id);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo añadir la columna');
    }
  };

  const saveGrade = async (column: GradeColumn, studentId: string, value: number | null) => {
    if (value === null || value === undefined) return;
    const cellKey = `${column.id}-${studentId}`;
    setSavingCell(cellKey);
    try {
      await apiClient.post(`/activities/${column.id}/assess/${studentId}`, { value: String(value) });
      setColumns((prev) => prev.map((c) => (c.id === column.id ? { ...c, grades: { ...c.grades, [studentId]: value } } : c)));
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo guardar la nota');
    } finally {
      setSavingCell(null);
    }
  };

  const toggleColumnVisibility = async (column: GradeColumn, visible: boolean) => {
    try {
      await apiClient.patch(`/activities/${column.id}`, { visibleToFamilies: visible });
      setColumns((prev) => prev.map((c) => (c.id === column.id ? { ...c, visibleToFamilies: visible } : c)));
      message.success(visible ? `"${column.name}" visible para familias` : `"${column.name}" oculta para familias`);
    } catch (e) {
      message.error('No se pudo cambiar la visibilidad');
    }
  };

  const setAllVisibility = async (visible: boolean) => {
    const editable = columns.filter((c) => c.editable);
    try {
      await Promise.all(editable.map((c) => apiClient.patch(`/activities/${c.id}`, { visibleToFamilies: visible })));
      setColumns((prev) => prev.map((c) => (c.editable ? { ...c, visibleToFamilies: visible } : c)));
      message.success(visible ? 'Actividades publicadas a familias' : 'Actividades ocultas');
    } catch (e) {
      message.error('No se pudieron actualizar todas las columnas');
    }
  };

  // Refresca notas ponderadas + cuaderno tras cambiar cualquier peso (columna o categoría).
  const onWeightsChanged = async () => {
    await recalcular();
    if (selectedId) await fetchGradebook(selectedId);
  };

  // Persiste el peso de UNA columna (activity → /activities, task/test → /tasks) y recalcula.
  const saveColumnWeight = async (column: GradeColumn, weight: number | null) => {
    try {
      const endpoint = column.source === 'activity' ? `/activities/${column.id}` : `/tasks/${column.id}`;
      await apiClient.patch(endpoint, { weight });
      setColumns((prev) => prev.map((c) => (c.id === column.id ? { ...c, weight } : c)));
      message.success(weight === null ? 'Peso vaciado (reparto equitativo)' : `Peso de "${column.name}" actualizado`);
      await onWeightsChanged();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo guardar el peso de la columna');
    }
  };

  // Persiste el peso de UNA nota concreta (alumno × columna), que sustituye al peso
  // de la columna solo para ese alumno. Requiere que la celda ya tenga nota.
  const saveIndividualWeight = async (column: GradeColumn, studentId: string, weight: number | null) => {
    const g = column.grades[studentId];
    if (g === null || g === undefined) {
      message.warning('Primero pon una nota en esta celda');
      return;
    }
    try {
      await apiClient.post(`/activities/${column.id}/assess/${studentId}`, { value: String(g), weight });
      setColumns((prev) => prev.map((c) => (c.id === column.id
        ? { ...c, individualWeights: { ...(c.individualWeights || {}), [studentId]: weight } }
        : c)));
      message.success(weight === null ? 'Peso individual quitado (usa el de la columna)' : 'Peso individual guardado');
      await onWeightsChanged();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo guardar el peso de la nota');
    }
  };

  // % efectivo de la columna dentro de su categoría (mismo source). Peso vacío cuenta como 1
  // SOLO si alguna columna de la categoría tiene peso; si TODAS están vacías → null (reparto equitativo).
  const effectiveWeightPercent = (column: GradeColumn): number | null => {
    const sameCat = columns.filter((c) => c.source === column.source);
    const anyWeighted = sameCat.some((c) => c.weight !== null && c.weight !== undefined);
    if (!anyWeighted) return null;
    const w = (col: GradeColumn) => (col.weight === null || col.weight === undefined ? 1 : col.weight);
    const total = sameCat.reduce((s, c) => s + w(c), 0);
    if (total <= 0) return null;
    return Math.round((w(column) / total) * 100);
  };

  const finalPercent = (studentId: string): number | null => {
    const vals: number[] = [];
    columns.forEach((c) => {
      const g = c.grades[studentId];
      if (g !== null && g !== undefined) vals.push(Math.max(0, Math.min(100, (g / (c.maxScore || 10)) * 100)));
    });
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
  };

  const gradeColor = (pct: number | null) => {
    if (pct === null) return undefined;
    if (pct >= 90) return '#52c41a';
    if (pct >= 70) return '#1890ff';
    if (pct >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const editableCount = useMemo(() => columns.filter((c) => c.editable).length, [columns]);

  const tableColumns: any[] = [
    {
      // En móvil la columna de nombre se mantiene fija pero estrecha, para dejar
      // espacio a las columnas de notas (que antes quedaban tapadas).
      title: 'Alumno/a', dataIndex: 'name', key: 'name', fixed: 'left', width: isMobile ? 116 : 210,
      render: (name: string, row: StudentRow) => (
        <div>
          <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>{name}</Text>
          {!isMobile && (<><br /><Text type="secondary" style={{ fontSize: 11 }}>{row.enrollmentNumber}</Text></>)}
        </div>
      ),
    },
    ...columns.map((c) => {
      const meta = sourceMeta[c.source];
      return {
        title: (
          <div style={{ textAlign: 'center', minWidth: 110 }}>
            <Tag color={meta.color} icon={meta.icon} style={{ marginBottom: 2 }}>{meta.label}</Tag>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>/ {c.maxScore} pts</Text>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Text type="secondary" style={{ fontSize: 10 }}>peso</Text>
              <Tooltip title="Peso de esta columna dentro de su categoría. Vacío = reparto equitativo. 0 = no cuenta.">
                <InputNumber
                  size="small"
                  min={0}
                  step={0.5}
                  style={{ width: 60 }}
                  defaultValue={c.weight ?? undefined}
                  onBlur={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    const cur = c.weight ?? null;
                    if (raw === '') {
                      if (cur !== null) saveColumnWeight(c, null);
                      return;
                    }
                    const v = parseFloat(raw.replace(',', '.'));
                    if (!isNaN(v) && v !== cur) saveColumnWeight(c, v);
                  }}
                  onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
                />
              </Tooltip>
              {(() => { const eff = effectiveWeightPercent(c); return eff !== null ? (
                <Text type="secondary" style={{ fontSize: 10 }}>({eff}%)</Text>
              ) : null; })()}
            </div>
            <div style={{ marginTop: 4 }}>
              {c.editable ? (
                <Tooltip title={c.visibleToFamilies ? 'Visible para familias (clic para ocultar)' : 'Oculta para familias (clic para publicar)'}>
                  <Switch size="small" checked={c.visibleToFamilies} onChange={(v) => toggleColumnVisibility(c, v)}
                    checkedChildren={<EyeOutlined />} unCheckedChildren={<EyeInvisibleOutlined />} />
                </Tooltip>
              ) : (
                <Tooltip title={c.visibleToFamilies ? 'Visible para familias' : 'Oculta para familias'}>
                  <Tag color={c.visibleToFamilies ? 'green' : 'default'} style={{ fontSize: 10 }}>
                    {c.visibleToFamilies ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  </Tag>
                </Tooltip>
              )}
            </div>
          </div>
        ),
        key: c.id, width: isMobile ? 96 : 130, align: 'center' as const,
        render: (_: any, row: StudentRow) => {
          const g = c.grades[row.id];
          if (!c.editable) {
            return g === null || g === undefined
              ? <Text type="secondary">—</Text>
              : <Text>{g}<Text type="secondary" style={{ fontSize: 11 }}>/{c.maxScore}</Text></Text>;
          }
          const cellKey = `${c.id}-${row.id}`;
          const indivWeight = c.individualWeights?.[row.id];
          const hasOverride = indivWeight !== null && indivWeight !== undefined;
          return (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <InputNumber min={0} max={c.maxScore} step={0.1} defaultValue={g ?? undefined} style={{ width: isMobile ? 66 : 78 }}
                disabled={savingCell === cellKey}
                onBlur={(e) => {
                  const raw = (e.target as HTMLInputElement).value;
                  const v = raw === '' ? null : parseFloat(raw.replace(',', '.'));
                  if (v !== null && v !== (g ?? null)) saveGrade(c, row.id, v);
                }}
                onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
              />
              <Popover
                trigger="click"
                title="Peso de esta nota"
                content={
                  <div style={{ maxWidth: 200 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Peso de ESTA nota. Vacío = usa el peso de la columna. 0 = esta nota no cuenta.
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <InputNumber
                        min={0}
                        step={0.5}
                        style={{ width: 90 }}
                        defaultValue={indivWeight ?? undefined}
                        onBlur={(e) => {
                          const raw = (e.target as HTMLInputElement).value;
                          const cur = indivWeight ?? null;
                          if (raw === '') {
                            if (cur !== null) saveIndividualWeight(c, row.id, null);
                            return;
                          }
                          const v = parseFloat(raw.replace(',', '.'));
                          if (!isNaN(v) && v !== cur) saveIndividualWeight(c, row.id, v);
                        }}
                        onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
                      />
                    </div>
                  </div>
                }
              >
                <Tooltip title={hasOverride ? `Peso individual: ${indivWeight}` : 'Peso individual de esta nota'}>
                  <Button
                    type="text"
                    size="small"
                    icon={<ControlOutlined style={{ fontSize: 11, color: hasOverride ? '#faad14' : '#d9d9d9' }} />}
                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, minWidth: 18, padding: 0, lineHeight: '18px' }}
                  />
                </Tooltip>
              </Popover>
              <Tooltip title="Saberes de este trabajo">
                <Button type="text" size="small" icon={<BookOutlined style={{ fontSize: 11 }} />}
                  onClick={() => setSaberCell({ work: { id: c.id, source: c.source, name: c.name }, student: { id: row.id, name: row.name } })}
                  style={{ position: 'absolute', bottom: -6, right: -6, width: 18, height: 18, minWidth: 18, padding: 0, lineHeight: '18px', opacity: 0.55 }} />
              </Tooltip>
            </div>
          );
        },
      };
    }),
    {
      // En móvil NO se fija a la derecha (si no, tapa las columnas del medio):
      // queda como última columna a la que se llega desplazando.
      title: 'Nota final', key: 'final', fixed: isMobile ? undefined : 'right', width: isMobile ? 84 : 110, align: 'center' as const,
      render: (_: any, row: StudentRow) => {
        const cg = centralizedGrades.get(row.id);
        const simple = finalPercent(row.id);
        const simpleHint = simple === null ? 'Sin notas en el cuaderno' : `Media simple del cuaderno: ${simple}%`;
        if (!cg || cg.finalGrade === null) {
          return (
            <Tooltip title={`Sin nota ponderada — pulsa Recalcular. ${simpleHint}`}>
              <Text type="secondary">—</Text>
            </Tooltip>
          );
        }
        const weighted = cg.finalGrade;
        return (
          <Tooltip title={simpleHint}>
            <Text style={{ color: gradeColor(weighted), fontWeight: 700, fontSize: 15 }}>{weighted}%</Text>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div style={{ padding: isMobile ? 8 : 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Title level={isMobile ? 4 : 3} style={{ marginBottom: 0 }}><BookOutlined /> Cuaderno del Profesor</Title>
        <Text type="secondary">
          Todo en un sitio: tus asignaturas, todas las notas ya existentes (actividades, tareas y Test Yourself), poner calificaciones y decidir qué se publica a las familias. Las notas se calculan en porcentaje (0-100%).
        </Text>
      </div>

      <GradingPageHelp
        title="El Cuaderno del Profesor — ¿qué es y cómo se usa?"
        whatIs="El cuaderno reúne las calificaciones numéricas de tus alumnos por asignatura: actividades (editables aquí), tareas/deberes y Test Yourself (se ven aquí, se crean en su herramienta). Todas las notas se expresan en porcentaje (0-100%)."
        steps={[
          'Selecciona la asignatura y grupo en el desplegable superior (o crea una nueva con «Nueva asignatura»).',
          'Verás todas las columnas de notas: actividades en verde, tareas en azul, Test Yourself en morado.',
          'Para añadir una prueba o trabajo, pulsa «Nueva columna» e introduce nombre, tipo y puntuación máxima.',
          'Introduce la nota de cada alumno directamente en la celda y sal del campo (Tab/Enter/clic) para guardar automáticamente.',
          'Usa el interruptor de cada columna de actividad para publicarla o ocultarla a las familias.',
          'La columna «Nota final» calcula la media de todas las notas en porcentaje automáticamente.',
        ]}
        purpose="Las notas del cuaderno alimentan los boletines y el expediente académico. Junto a la evaluación por competencias y por criterios, dan la visión completa del alumno."
      />

      <Alert type="info" showIcon icon={<QuestionCircleOutlined />} style={{ marginBottom: 16 }}
        message="Cómo funciona"
        description={
          <span>
            Aquí aparecen <strong>todas las calificaciones que ya tienes creadas</strong> en cada asignatura: las <Tag color="green">Actividades</Tag> se editan aquí mismo;
            las <Tag color="blue">Tareas</Tag> y <Tag color="purple">Test Yourself</Tag> se muestran (se crean en su herramienta). Usa <strong>+ Nueva columna</strong> para una prueba/trabajo
            y el interruptor de cada actividad para publicarla a las familias. La <strong>nota final</strong> es la media en %.
          </span>
        }
      />

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
        <Space wrap>
          <Select style={{ minWidth: 340 }} placeholder="Selecciona una asignatura" value={selectedId}
            onChange={setSelectedId} loading={loading}
            notFoundContent={loading ? <Spin size="small" /> : 'No tienes asignaturas todavía'}>
            {assignments.map((a) => (
              <Option key={a.id} value={a.id}>{a.subject.name} · {a.classGroup.name} · {a.academicYear?.name}</Option>
            ))}
          </Select>
          <Button icon={<PlusOutlined />} onClick={openNewSubject}>Nueva asignatura</Button>
          <Button icon={<ReloadOutlined />} onClick={() => selectedId && fetchGradebook(selectedId)}>Actualizar</Button>
        </Space>
      </Card>

      {!selected ? (
        <Card><Empty description="Selecciona o crea una asignatura para empezar" /></Card>
      ) : (
        <Card
          title={
            <Space wrap>
              <TeamOutlined />
              <span>{selected.subject?.name} — {selected.classGroup?.name}</span>
              {selected.academicYear?.name && <Tag color="blue">{selected.academicYear.name}</Tag>}
              <Tag>{students.length} alumnos</Tag>
              <Tag>{columns.length} columnas</Tag>
            </Space>
          }
          extra={
            <Space wrap>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { columnForm.resetFields(); setNewColumnOpen(true); }}>
                Nueva columna
              </Button>
              <Button icon={<FileAddOutlined />} onClick={() => setCreateWorkOpen(true)}>
                Crear trabajo
              </Button>
              <Tooltip title="Periodo de la nota ponderada. 'Curso completo' es la nota global de siempre. Elige un trimestre para aplicar el modo LOMLOE (derivar/sustituir por criterios) de ese trimestre.">
                <Select
                  size="small"
                  style={{ minWidth: 160 }}
                  value={gradePeriod}
                  onChange={(v) => { setGradePeriod(v); if (selectedId) fetchCentralizedGrades(selectedId, v); }}
                >
                  <Option value="continuous">Curso completo</Option>
                  <Option value="first_trimester">1º Trimestre</Option>
                  <Option value="second_trimester">2º Trimestre</Option>
                  <Option value="third_trimester">3º Trimestre</Option>
                </Select>
              </Tooltip>
              <Tooltip title="Recalcula la nota ponderada de todos los alumnos (incluye lo calificado en lote). Respeta el periodo seleccionado.">
                <Button icon={<SyncOutlined />} loading={recalcLoading} onClick={recalcular}>
                  Recalcular
                </Button>
              </Tooltip>
              <Tooltip title="Ver y editar los pesos (Test Yourself / Tareas / Actividades) de la nota ponderada.">
                <Button icon={<BarsOutlined />} onClick={() => setWeightsOpen(true)}>
                  Pesos
                </Button>
              </Tooltip>
              {editableCount > 0 && (
                <>
                  <Popconfirm title="¿Publicar todas las actividades a las familias?" onConfirm={() => setAllVisibility(true)} okText="Publicar" cancelText="Cancelar">
                    <Button icon={<EyeOutlined />}>Publicar actividades</Button>
                  </Popconfirm>
                  <Popconfirm title="¿Ocultar todas las actividades a las familias?" onConfirm={() => setAllVisibility(false)} okText="Ocultar" cancelText="Cancelar">
                    <Button icon={<EyeInvisibleOutlined />}>Ocultar actividades</Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          }
        >
          {loadingBook ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : students.length === 0 ? (
            <Empty description="No hay alumnos en este grupo" />
          ) : columns.length === 0 ? (
            <Empty description="Aún no hay notas. Pulsa 'Nueva columna' para añadir tu primera prueba o trabajo." />
          ) : (
            <>
              {isMobile && columns.length > 1 && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  👉 Desliza la tabla en horizontal para ver todas las columnas. El nombre del alumno queda fijo a la izquierda.
                </Text>
              )}
              <Table rowKey="id" dataSource={students} columns={tableColumns} pagination={false}
                scroll={{ x: 'max-content' }} size={isMobile ? 'small' : 'middle'} />
            </>
          )}
        </Card>
      )}

      {/* Modal: Nueva asignatura */}
      <Modal title="Nueva asignatura" open={newSubjectOpen} onCancel={() => setNewSubjectOpen(false)}
        onOk={() => subjectForm.submit()} okText="Crear y empezar a calificar">
        <Form form={subjectForm} layout="vertical" onFinish={handleCreateSubject}>
          <Form.Item label="Asignatura">
            <Select value={subjectMode} onChange={setSubjectMode}>
              <Option value="existing">Elegir una asignatura existente</Option>
              <Option value="new">Crear una asignatura nueva</Option>
            </Select>
          </Form.Item>
          {subjectMode === 'existing' ? (
            <Form.Item name="subjectId" label="Asignatura" rules={[{ required: true, message: 'Elige una asignatura' }]}>
              <Select showSearch optionFilterProp="children" placeholder="Buscar asignatura">
                {subjects.map((s) => <Option key={s.id} value={s.id}>{s.name} ({s.code})</Option>)}
              </Select>
            </Form.Item>
          ) : (
            <>
              <Form.Item name="name" label="Nombre (currículo de Navarra)" rules={[{ required: true, message: 'Indica el nombre' }]}>
                <Input placeholder="p. ej. Lengua Castellana y Literatura" />
              </Form.Item>
              <Form.Item name="code" label="Código" rules={[{ required: true, message: 'Indica un código' }]}>
                <Input placeholder="p. ej. LCL" />
              </Form.Item>
              <Form.Item name="courseId" label="Curso" rules={[{ required: true, message: 'Elige el curso' }]}>
                <Select showSearch optionFilterProp="children" placeholder="Curso">
                  {courses.map((c) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </>
          )}
          <Form.Item name="classGroupId" label="Grupo de clase" rules={[{ required: true, message: 'Elige el grupo' }]}>
            <Select showSearch optionFilterProp="children" placeholder="Grupo">
              {classGroups.map((g) => <Option key={g.id} value={g.id}>{g.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="weeklyHours" label="Horas semanales" initialValue={1}>
            <InputNumber min={1} max={40} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Nueva columna */}
      <Modal title="Nueva columna de notas" open={newColumnOpen} onCancel={() => setNewColumnOpen(false)}
        onOk={() => columnForm.submit()} okText="Añadir columna">
        <Form form={columnForm} layout="vertical" onFinish={handleCreateColumn}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Indica un nombre' }]}>
            <Input placeholder="p. ej. Examen Tema 3, Trabajo en grupo..." />
          </Form.Item>
          <Form.Item name="tipo" label="Tipo" initialValue="Prueba">
            <Select>
              <Option value="Prueba">Prueba / Examen</Option>
              <Option value="Trabajo">Trabajo</Option>
              <Option value="Practica">Práctica</Option>
              <Option value="Otro">Otro</Option>
            </Select>
          </Form.Item>
          <Form.Item name="maxScore" label="Puntuación máxima" initialValue={10} rules={[{ required: true, message: 'Indica la puntuación máxima' }]}>
            <InputNumber min={1} max={1000} style={{ width: '100%' }} />
          </Form.Item>
          <Text type="secondary">La nota de cada alumno se convertirá automáticamente a porcentaje sobre esta puntuación máxima.</Text>
        </Form>
      </Modal>

      {/* Modal: Pesos de la nota ponderada */}
      <GradebookWeightsModal
        open={weightsOpen}
        subjectId={selected?.subject?.id}
        subjectAssignmentId={selectedId}
        columns={columns}
        onChanged={onWeightsChanged}
        onClose={() => setWeightsOpen(false)}
      />

      {/* Modal: Crear trabajo unificado */}
      <CreateWorkModal
        open={createWorkOpen}
        onClose={() => setCreateWorkOpen(false)}
        defaultSubjectAssignmentId={selectedId}
      />

      {/* Cajón: saberes de una celda (trabajo x alumno) */}
      <WorkSaberDrawer
        open={!!saberCell}
        onClose={() => setSaberCell(null)}
        work={saberCell?.work ?? null}
        student={saberCell?.student ?? null}
      />
    </div>
  );
};

/**
 * Cuaderno del Profesor — hub único con pestañas que reúne TODO lo de
 * calificación/evaluación en una sola página, sin páginas sueltas duplicadas.
 */
const TeacherGradebookPage: React.FC = () => {
  const items = [
    { key: 'notas', label: <span><BookOutlined /> Notas</span>, children: <GradebookCore /> },
    { key: 'trabajos', label: <span><FileTextOutlined /> Trabajos</span>, children: <TrabajosTab /> },
    { key: 'rubricas', label: <span><BarsOutlined /> Rúbricas</span>, children: <Suspense fallback={<TabFallback />}><RubricsPageWithFolders /></Suspense> },
    { key: 'competencias', label: <span><RadarChartOutlined /> Evaluación Competencial</span>, children: <Suspense fallback={<TabFallback />}><TeacherEvaluationsPage /></Suspense> },
  ];

  return (
    <div style={{ padding: 8 }}>
      <SectionInfoBanner text="Tu cuaderno de notas del grupo/asignatura." />
      <Tabs defaultActiveKey="notas" items={items} destroyInactiveTabPane size="large" />
    </div>
  );
};

export default TeacherGradebookPage;
