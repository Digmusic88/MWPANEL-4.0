import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, Button, Alert, Spin, Typography, Space, Tag, Tooltip, Divider, message } from 'antd';
import apiClient from '../../services/apiClient';

const { Text } = Typography;

interface WeightComponent { weight: number; enabled?: boolean; minimumItems?: number; scale?: string }
type WeightConfiguration = Record<string, WeightComponent>;

interface ColumnLite {
  id: string;
  source: 'activity' | 'task' | 'test';
  name: string;
  weight?: number | null;
}

interface GradebookWeightsModalProps {
  open: boolean;
  subjectId?: string;
  subjectAssignmentId?: string;
  columns?: ColumnLite[];
  onChanged?: () => void;
  onClose: () => void;
  onSaved?: () => void;
}

// Categorías de columnas (por source) para la sección de pesos por columna.
const COLUMN_CATEGORIES: Array<{ source: 'test' | 'task' | 'activity'; label: string }> = [
  { source: 'test', label: 'Test Yourself' },
  { source: 'task', label: 'Tareas' },
  { source: 'activity', label: 'Actividades' },
];

// Solo estos 4 componentes son editables; el resto (si existiera) se muestra en solo-lectura.
const EDITABLE: Array<{ key: 'exams' | 'tasks' | 'activities' | 'criteria'; label: string }> = [
  { key: 'exams', label: 'Test Yourself' },
  { key: 'tasks', label: 'Tareas' },
  { key: 'activities', label: 'Actividades' },
  { key: 'criteria', label: 'Criterios (LOMLOE)' },
];

const READONLY_LABELS: Record<string, string> = {
  evaluations: 'Evaluación competencial',
  rubrics: 'Rúbricas',
  ai_assessments: 'IA',
  projects: 'Proyectos',
  participation: 'Participación',
  homework: 'Deberes',
  presentations: 'Presentaciones',
};

const GradebookWeightsModal: React.FC<GradebookWeightsModalProps> = ({ open, subjectId, subjectAssignmentId, columns, onChanged, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [weightConfig, setWeightConfig] = useState<WeightConfiguration | null>(null);
  const [editWeights, setEditWeights] = useState<Record<string, number>>({});
  const [sumError, setSumError] = useState(false);

  useEffect(() => {
    if (open && subjectId) loadConfig(subjectId);
    if (!open) { setSumError(false); }
  }, [open, subjectId]);

  const loadConfig = async (sid: string) => {
    setLoading(true);
    setSumError(false);
    try {
      const res = await apiClient.get(`/grade-configurations?subjectId=${sid}`);
      const list = res.data || [];
      const cfg = Array.isArray(list) && list.length > 0 ? list[0] : null;
      if (!cfg) {
        setConfigId(null);
        setWeightConfig(null);
        setEditWeights({});
        return;
      }
      const wc: WeightConfiguration = cfg.weightConfiguration || {};
      setConfigId(cfg.id);
      setWeightConfig(wc);
      const initial: Record<string, number> = {};
      EDITABLE.forEach(({ key }) => { initial[key] = Number(wc[key]?.weight ?? 0); });
      setEditWeights(initial);
    } catch {
      setConfigId(null);
      setWeightConfig(null);
      setEditWeights({});
      message.error('No se pudieron cargar los pesos de la asignatura');
    } finally {
      setLoading(false);
    }
  };

  const currentSum = EDITABLE.reduce((s, { key }) => s + (Number(editWeights[key]) || 0), 0);

  const handleSave = async () => {
    if (currentSum !== 100) { setSumError(true); return; }
    if (!configId || !weightConfig) return;
    setSaving(true);
    try {
      const updated: WeightConfiguration = { ...weightConfig };
      EDITABLE.forEach(({ key }) => {
        const prev = weightConfig[key] || { weight: 0 };
        const w = Number(editWeights[key]) || 0;
        updated[key] = { ...prev, weight: w, enabled: w > 0 };
      });
      await apiClient.put(`/grade-configurations/${configId}`, { weightConfiguration: updated });
      message.success('Pesos guardados. Pulsa Recalcular para aplicar los nuevos pesos.');
      onSaved?.();
      onClose();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudieron guardar los pesos');
    } finally {
      setSaving(false);
    }
  };

  const readonlyEntries = weightConfig
    ? Object.entries(weightConfig).filter(([k]) => !EDITABLE.some((e) => e.key === k))
    : [];

  const cols = columns || [];

  // Persiste el peso de UNA columna (activity → /activities, task/test → /tasks) y avisa al padre.
  const patchColumnWeight = async (col: ColumnLite, weight: number | null) => {
    try {
      const endpoint = col.source === 'activity' ? `/activities/${col.id}` : `/tasks/${col.id}`;
      await apiClient.patch(endpoint, { weight });
      message.success(weight === null ? 'Peso vaciado (reparto equitativo)' : `Peso de "${col.name}" actualizado`);
      onChanged?.();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo guardar el peso de la columna');
    }
  };

  // % efectivo dentro de su categoría (mismo source). Vacío cuenta como 1 solo si algún par tiene peso.
  const columnEffectivePercent = (col: ColumnLite): number | null => {
    const sameCat = cols.filter((c) => c.source === col.source);
    const anyWeighted = sameCat.some((c) => c.weight !== null && c.weight !== undefined);
    if (!anyWeighted) return null;
    const w = (x: ColumnLite) => (x.weight === null || x.weight === undefined ? 1 : x.weight);
    const total = sameCat.reduce((s, c) => s + w(c), 0);
    if (total <= 0) return null;
    return Math.round((w(col) / total) * 100);
  };

  return (
    <Modal
      title="Pesos de la nota ponderada"
      open={open}
      onCancel={onClose}
      footer={
        weightConfig
          ? [
              <Button key="cancel" onClick={onClose}>Cancelar</Button>,
              <Button key="save" type="primary" loading={saving} onClick={handleSave}>Guardar</Button>,
            ]
          : [<Button key="close" onClick={onClose}>Cerrar</Button>]
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : !weightConfig ? (
        <Alert
          type="info"
          showIcon
          message="Aún no hay configuración de pesos"
          description="Aún no hay configuración de pesos; pulsa Recalcular para crearla con los pesos por defecto (Test Yourself 40 / Tareas 30 / Actividades 30) y luego edítalos."
        />
      ) : (
        <>
          <Text type="secondary">
            Ajusta el peso de cada componente. La suma debe ser 100. Tras guardar, pulsa Recalcular para aplicar los cambios.
            El peso de Criterios solo se aplica a la nota cuando el modo LOMLOE del trimestre es 'derivar'.
          </Text>
          <Form layout="horizontal" labelCol={{ span: 10 }} wrapperCol={{ span: 10 }} style={{ marginTop: 16 }}>
            {EDITABLE.map(({ key, label }) => (
              <Form.Item key={key} label={label}>
                <InputNumber
                  aria-label={label}
                  min={0}
                  max={100}
                  value={editWeights[key]}
                  onChange={(v) => { setEditWeights((p) => ({ ...p, [key]: Number(v) || 0 })); setSumError(false); }}
                  addonAfter="%"
                  style={{ width: 120 }}
                />
              </Form.Item>
            ))}
          </Form>
          <Space style={{ marginBottom: 8 }}>
            <Text strong>Suma:</Text>
            <Tag color={currentSum === 100 ? 'green' : 'red'}>{currentSum}%</Tag>
          </Space>
          {sumError && (
            <Alert type="error" showIcon style={{ marginTop: 8 }} message="Los pesos deben sumar 100 antes de guardar." />
          )}
          {readonlyEntries.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Otros componentes (solo lectura):</Text>
              <div style={{ marginTop: 6 }}>
                {readonlyEntries.map(([k, v]) => (
                  <Tag key={k} style={{ marginBottom: 4 }}>{(READONLY_LABELS[k] || k)}: {Number(v?.weight ?? 0)}%</Tag>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {cols.length > 0 && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <Text strong>Peso por columna (dentro de cada categoría)</Text>
          <div style={{ marginTop: 4, marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Ajusta cuánto pesa cada columna dentro de su categoría. Vacío = reparto equitativo. 0 = no cuenta.
              Al editar se recalcula la nota ponderada automáticamente.
            </Text>
          </div>
          {COLUMN_CATEGORIES.map(({ source, label }) => {
            const catCols = cols.filter((c) => c.source === source);
            if (catCols.length === 0) return null;
            return (
              <div key={source} style={{ marginBottom: 12 }}>
                <Text type="secondary" strong style={{ fontSize: 12 }}>{label}</Text>
                {catCols.map((col) => {
                  const eff = columnEffectivePercent(col);
                  return (
                    <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</span>
                      <Tooltip title="Peso de esta columna dentro de su categoría. Vacío = reparto equitativo. 0 = no cuenta.">
                        <InputNumber
                          aria-label={`Peso de ${col.name}`}
                          size="small"
                          min={0}
                          step={0.5}
                          style={{ width: 90 }}
                          addonAfter="peso"
                          defaultValue={col.weight ?? undefined}
                          onBlur={(e) => {
                            const raw = (e.target as HTMLInputElement).value;
                            const cur = col.weight ?? null;
                            if (raw === '') { if (cur !== null) patchColumnWeight(col, null); return; }
                            const v = parseFloat(raw.replace(',', '.'));
                            if (!isNaN(v) && v !== cur) patchColumnWeight(col, v);
                          }}
                          onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
                        />
                      </Tooltip>
                      <span style={{ width: 48, textAlign: 'right' }}>
                        {eff !== null ? <Tag color="blue" style={{ margin: 0 }}>{eff}%</Tag> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </Modal>
  );
};

export default GradebookWeightsModal;
