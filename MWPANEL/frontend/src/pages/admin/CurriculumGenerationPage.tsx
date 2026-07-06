import React, { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Button,
  Select,
  Space,
  Input,
  message,
  Modal,
  Divider,
  Typography,
} from 'antd';
import {
  ThunderboltOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../services/apiClient';
import {
  curriculumGenerationService,
  Generation,
  GenPayload,
  GenSpecific,
  GenCriterion,
  GenKnowledge,
} from '../../services/curriculumGenerationService';
import { criterionKnowledgeService } from '../../services/criterionKnowledgeService';
import { GradingPageHelp } from '../../components/grading/GradingPageHelp';

const { Text } = Typography;

// 8 key competency codes per LOMLOE
const KEY_COMPETENCY_OPTIONS = [
  { value: 'CCL', label: 'CCL – Comunicación lingüística' },
  { value: 'CP', label: 'CP – Plurilingüe' },
  { value: 'STEM', label: 'STEM – Matemática y ciencias' },
  { value: 'CD', label: 'CD – Digital' },
  { value: 'CPSAA', label: 'CPSAA – Personal, social y aprender a aprender' },
  { value: 'CC', label: 'CC – Ciudadana' },
  { value: 'CE', label: 'CE – Emprendedora' },
  { value: 'CCEC', label: 'CCEC – Conciencia y expresión culturales' },
];

const KNOWLEDGE_TYPE_OPTIONS = [
  { value: 'KNOWLEDGE', label: 'Conocimiento' },
  { value: 'SKILL', label: 'Habilidad' },
  { value: 'ATTITUDE', label: 'Actitud' },
];

interface Props {
  initialDraft?: Generation;
}

interface SubjectOption {
  name: string;
}

interface ScopeOption {
  label: string;
  value: string; // "cycle:ID" | "course:ID"
}

const CurriculumGenerationPage: React.FC<Props> = ({ initialDraft }) => {
  const [subjectName, setSubjectName] = useState<string | undefined>(initialDraft?.subjectName);
  const [scopeValue, setScopeValue] = useState<string | undefined>(
    initialDraft ? `${initialDraft.scopeType}:${initialDraft.scopeId}` : undefined
  );
  const [draft, setDraft] = useState<Generation | undefined>(initialDraft);
  const [payload, setPayload] = useState<GenPayload | undefined>(initialDraft?.payload);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [scopeOptions, setScopeOptions] = useState<ScopeOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingScopes, setLoadingScopes] = useState(false);
  const [allScopesHaveCurriculum, setAllScopesHaveCurriculum] = useState(false);

  // Load subjects on mount
  useEffect(() => {
    const load = async () => {
      setLoadingSubjects(true);
      try {
        const res = await apiClient.get('/subjects');
        const all: Array<{ name: string }> = res.data || [];
        const unique = Array.from(new Set(all.map((s) => s.name)));
        setSubjectOptions(unique.map((n) => ({ name: n })));
      } catch {
        // silent
      } finally {
        setLoadingSubjects(false);
      }
    };
    load();
  }, []);

  // Cascade: load scopes when subjectName changes
  useEffect(() => {
    if (!subjectName) { setScopeOptions([]); setAllScopesHaveCurriculum(false); return; }
    const load = async () => {
      setLoadingScopes(true);
      setAllScopesHaveCurriculum(false);
      try {
        // available-courses returns raw Course entities:
        // { id, name, cycle: { id, name, educationalLevel: { name, code } } }
        // LOMLOE scope logic: SECUNDARIA → by course; INFANTIL/PRIMARIA → by cycle (deduplicated)
        const res = await apiClient.get('/class-groups/available-courses');
        const courses: any[] = res.data || [];
        const seen = new Set<string>();
        const allScopes: ScopeOption[] = [];
        for (const c of courses) {
          const levelCode = c.cycle?.educationalLevel?.code;
          const levelName = c.cycle?.educationalLevel?.name ?? '';
          if (levelCode === 'SECUNDARIA') {
            const v = `course:${c.id}`;
            if (!seen.has(v)) {
              seen.add(v);
              allScopes.push({ value: v, label: `${c.name}${levelName ? ' · ' + levelName : ''}` });
            }
          } else if (c.cycle?.id) {
            const v = `cycle:${c.cycle.id}`;
            if (!seen.has(v)) {
              seen.add(v);
              allScopes.push({ value: v, label: `${c.cycle.name}${levelName ? ' · ' + levelName : ''}` });
            }
          }
        }

        // Filter out scopes that already have criteria for this subject
        let filteredScopes = allScopes;
        try {
          const withCriteria = await criterionKnowledgeService.getScopes(subjectName);
          const filled = new Set(withCriteria.map((s) => `${s.scopeType}:${s.scopeId}`));
          filteredScopes = allScopes.filter((o) => !filled.has(o.value));
        } catch {
          // If getScopes fails, fall back to showing all scopes (defensive)
          filteredScopes = allScopes;
        }

        setScopeOptions(filteredScopes);
        if (allScopes.length > 0 && filteredScopes.length === 0) {
          setAllScopesHaveCurriculum(true);
        }
      } catch {
        // silent
      } finally {
        setLoadingScopes(false);
      }
    };
    load();
  }, [subjectName]);

  const parseScopeValue = (v: string): { scopeType: 'cycle' | 'course'; scopeId: string } => {
    const [type, ...rest] = v.split(':');
    return { scopeType: type as 'cycle' | 'course', scopeId: rest.join(':') };
  };

  const handleGenerate = async () => {
    if (!subjectName || !scopeValue) return;
    setGenerating(true);
    const hide = message.loading('Generando currículo con IA…', 0);
    try {
      const { scopeType, scopeId } = parseScopeValue(scopeValue);
      const gen = await curriculumGenerationService.generate(subjectName, scopeType, scopeId);
      setDraft(gen);
      setPayload(gen.payload);
      message.success('Borrador generado correctamente.');
    } catch {
      // error shown by interceptor
    } finally {
      hide();
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!draft || !payload) return;
    setSaving(true);
    try {
      const updated = await curriculumGenerationService.save(draft.id, payload);
      setDraft(updated);
      message.success('Borrador guardado.');
    } catch {
      // error shown by interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleApply = () => {
    if (!draft || !payload) return;
    Modal.confirm({
      title: 'Confirmar y crear currículo',
      content: 'Se crearán todas las competencias específicas, criterios y saberes del borrador en la base de datos. Esta acción no se puede deshacer fácilmente.',
      okText: 'Confirmar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setApplying(true);
        try {
          // Save latest edits first; abort if save fails
          try {
            await curriculumGenerationService.save(draft.id, payload);
          } catch {
            message.error('No se pudieron guardar los cambios; revisa antes de confirmar');
            setApplying(false);
            return;
          }
          const result = await curriculumGenerationService.apply(draft.id);
          Modal.info({
            title: 'Currículo creado',
            content: (
              <div>
                <p>Competencias específicas creadas: <strong>{result?.specificsCreated ?? 0}</strong></p>
                <p>Criterios creados: <strong>{result?.criteriaCreated ?? 0}</strong></p>
                <p>Saberes creados: <strong>{result?.knowledgeCreated ?? 0}</strong></p>
                {(result?.skippedExisting ?? 0) > 0 && (
                  <p>Omitidos (ya existían): <strong>{result.skippedExisting}</strong></p>
                )}
                {(result?.invalidKeyCodes ?? 0) > 0 && (
                  <p style={{ color: '#fa8c16' }}>Códigos de competencia clave inválidos: <strong>{result.invalidKeyCodes}</strong></p>
                )}
              </div>
            ),
          });
          setDraft(undefined);
          setPayload(undefined);
        } catch {
          // error shown by interceptor
        } finally {
          setApplying(false);
        }
      },
    });
  };

  // ── Payload mutation helpers ──────────────────────────────────────────────

  const updateSpecific = (idx: number, field: keyof GenSpecific, value: unknown) => {
    setPayload((prev) => {
      if (!prev) return prev;
      const specs = prev.specificCompetencies.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s
      );
      return { ...prev, specificCompetencies: specs };
    });
  };

  const updateCriterion = (specIdx: number, critIdx: number, field: keyof GenCriterion, value: string) => {
    setPayload((prev) => {
      if (!prev) return prev;
      const specs = prev.specificCompetencies.map((s, si) => {
        if (si !== specIdx) return s;
        const criteria = s.criteria.map((c, ci) =>
          ci === critIdx ? { ...c, [field]: value } : c
        );
        return { ...s, criteria };
      });
      return { ...prev, specificCompetencies: specs };
    });
  };

  const addCriterion = (specIdx: number) => {
    setPayload((prev) => {
      if (!prev) return prev;
      const specs = prev.specificCompetencies.map((s, si) => {
        if (si !== specIdx) return s;
        return { ...s, criteria: [...s.criteria, { code: '', description: '' }] };
      });
      return { ...prev, specificCompetencies: specs };
    });
  };

  const removeCriterion = (specIdx: number, critIdx: number) => {
    setPayload((prev) => {
      if (!prev) return prev;
      const specs = prev.specificCompetencies.map((s, si) => {
        if (si !== specIdx) return s;
        return { ...s, criteria: s.criteria.filter((_, ci) => ci !== critIdx) };
      });
      return { ...prev, specificCompetencies: specs };
    });
  };

  const removeSpecific = (specIdx: number) => {
    setPayload((prev) => {
      if (!prev) return prev;
      return { ...prev, specificCompetencies: prev.specificCompetencies.filter((_, i) => i !== specIdx) };
    });
  };

  const addSpecific = () => {
    setPayload((prev) => {
      if (!prev) return prev;
      const newSpec: GenSpecific = { code: '', name: '', description: '', keyCompetencyCodes: [], criteria: [] };
      return { ...prev, specificCompetencies: [...prev.specificCompetencies, newSpec] };
    });
  };

  const updateKnowledge = (idx: number, field: keyof GenKnowledge, value: string) => {
    setPayload((prev) => {
      if (!prev) return prev;
      const basicKnowledge = prev.basicKnowledge.map((k, i) =>
        i === idx ? { ...k, [field]: value } : k
      );
      return { ...prev, basicKnowledge };
    });
  };

  const removeKnowledge = (idx: number) => {
    setPayload((prev) => {
      if (!prev) return prev;
      return { ...prev, basicKnowledge: prev.basicKnowledge.filter((_, i) => i !== idx) };
    });
  };

  const addKnowledge = () => {
    setPayload((prev) => {
      if (!prev) return prev;
      const newK: GenKnowledge = { code: '', block: '', title: '', description: '', knowledgeType: 'KNOWLEDGE' };
      return { ...prev, basicKnowledge: [...prev.basicKnowledge, newK] };
    });
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <GradingPageHelp
        title="Generación de currículo con IA"
        whatIs="Esta página genera automáticamente competencias específicas, criterios de evaluación y saberes básicos para una asignatura y ámbito (curso o ciclo) usando un modelo de IA entrenado con el decreto curricular de Navarra."
        steps={[
          'Selecciona la asignatura y el ámbito (curso o ciclo).',
          'Pulsa "Generar con IA" para obtener un borrador completo.',
          'Revisa y edita el borrador: añade, modifica o elimina entradas.',
          'Pulsa "Guardar borrador" para persistir cambios sin aplicarlos.',
          'Cuando el borrador sea correcto, pulsa "Confirmar y crear currículo".',
        ]}
        purpose='Agiliza la configuración inicial del currículo. Nada se crea en la base de datos hasta que pulsas "Confirmar y crear currículo".'
      />

      {/* Selection + Generate */}
      <Card
        title="Generar currículo con IA"
        extra={
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={generating}
            disabled={!subjectName || !scopeValue}
            onClick={handleGenerate}
          >
            Generar con IA
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Space wrap>
          <Select
            placeholder="Asignatura"
            style={{ width: 220 }}
            loading={loadingSubjects}
            showSearch
            value={subjectName}
            onChange={(v) => { setSubjectName(v); setScopeValue(undefined); }}
            options={subjectOptions.map((s) => ({ value: s.name, label: s.name }))}
            filterOption={(input, opt) =>
              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            placeholder="Ámbito (ciclo / curso)"
            style={{ width: 260 }}
            loading={loadingScopes}
            showSearch
            disabled={!subjectName || allScopesHaveCurriculum}
            allowClear
            value={scopeValue}
            onChange={(v) => setScopeValue(v || undefined)}
            options={scopeOptions}
            filterOption={(input, opt) =>
              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </Space>
        {allScopesHaveCurriculum && (
          <Alert
            style={{ marginTop: 12 }}
            type="info"
            showIcon
            message="Esta asignatura ya tiene currículo en todos sus ámbitos"
          />
        )}
      </Card>

      {/* Draft editor */}
      {payload && draft && (
        <>
          {/* Action bar */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              Guardar borrador
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={applying}
              onClick={handleApply}
            >
              Confirmar y crear currículo
            </Button>
          </div>

          {/* Specific competencies */}
          <Card
            title={<Text strong>Competencias específicas ({payload.specificCompetencies.length})</Text>}
            style={{ marginBottom: 16 }}
            extra={
              <Button size="small" icon={<PlusOutlined />} onClick={addSpecific}>
                Añadir específica
              </Button>
            }
          >
            {payload.specificCompetencies.map((spec, si) => (
              <Card
                key={si}
                size="small"
                style={{ marginBottom: 12, background: '#fafafa' }}
                extra={
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeSpecific(si)}
                  />
                }
                title={<Text type="secondary">Específica {si + 1}</Text>}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    <Input
                      size="small"
                      placeholder="Código"
                      style={{ width: 120 }}
                      value={spec.code}
                      onChange={(e) => updateSpecific(si, 'code', e.target.value)}
                    />
                    <Input
                      size="small"
                      placeholder="Nombre"
                      style={{ width: 280 }}
                      value={spec.name}
                      onChange={(e) => updateSpecific(si, 'name', e.target.value)}
                    />
                    <Select
                      mode="tags"
                      size="small"
                      placeholder="Competencias clave"
                      style={{ minWidth: 200 }}
                      value={spec.keyCompetencyCodes}
                      onChange={(v) => updateSpecific(si, 'keyCompetencyCodes', v)}
                      options={KEY_COMPETENCY_OPTIONS}
                    />
                  </Space>
                  <Input.TextArea
                    size="small"
                    placeholder="Descripción de la competencia específica"
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    value={spec.description}
                    onChange={(e) => updateSpecific(si, 'description', e.target.value)}
                  />

                  {/* Criteria */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Criterios de evaluación ({spec.criteria.length})
                      </Text>
                      <Button size="small" icon={<PlusOutlined />} onClick={() => addCriterion(si)}>
                        Añadir criterio
                      </Button>
                    </div>
                    {spec.criteria.map((crit, ci) => (
                      <div key={ci} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                        <Input
                          size="small"
                          placeholder="Código"
                          style={{ width: 80, flexShrink: 0 }}
                          value={crit.code}
                          onChange={(e) => updateCriterion(si, ci, 'code', e.target.value)}
                        />
                        <Input.TextArea
                          size="small"
                          placeholder="Descripción del criterio"
                          autoSize={{ minRows: 1, maxRows: 3 }}
                          style={{ flex: 1 }}
                          value={crit.description}
                          onChange={(e) => updateCriterion(si, ci, 'description', e.target.value)}
                        />
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeCriterion(si, ci)}
                        />
                      </div>
                    ))}
                    {spec.criteria.length === 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>Sin criterios. Usa "Añadir criterio".</Text>
                    )}
                  </div>
                </Space>
              </Card>
            ))}
            {payload.specificCompetencies.length === 0 && (
              <Text type="secondary">Sin competencias específicas. Usa "Añadir específica".</Text>
            )}
          </Card>

          {/* Basic Knowledge */}
          <Card
            title={<Text strong>Saberes básicos ({payload.basicKnowledge.length})</Text>}
            extra={
              <Button size="small" icon={<PlusOutlined />} onClick={addKnowledge}>
                Añadir saber
              </Button>
            }
          >
            {payload.basicKnowledge.map((k, ki) => (
              <div key={ki} style={{ marginBottom: 8 }}>
                <Space wrap style={{ width: '100%' }}>
                  <Input
                    size="small"
                    placeholder="Código"
                    style={{ width: 80 }}
                    value={k.code}
                    onChange={(e) => updateKnowledge(ki, 'code', e.target.value)}
                  />
                  <Input
                    size="small"
                    placeholder="Bloque"
                    style={{ width: 100 }}
                    value={k.block}
                    onChange={(e) => updateKnowledge(ki, 'block', e.target.value)}
                  />
                  <Input
                    size="small"
                    placeholder="Título"
                    style={{ width: 240 }}
                    value={k.title}
                    onChange={(e) => updateKnowledge(ki, 'title', e.target.value)}
                  />
                  <Select
                    size="small"
                    style={{ width: 130 }}
                    value={k.knowledgeType}
                    onChange={(v) => updateKnowledge(ki, 'knowledgeType', v)}
                    options={KNOWLEDGE_TYPE_OPTIONS}
                  />
                  <Input.TextArea
                    size="small"
                    placeholder="Descripción"
                    autoSize={{ minRows: 1, maxRows: 2 }}
                    style={{ width: 280 }}
                    value={k.description}
                    onChange={(e) => updateKnowledge(ki, 'description', e.target.value)}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeKnowledge(ki)}
                  />
                </Space>
                <Divider style={{ margin: '6px 0' }} />
              </div>
            ))}
            {payload.basicKnowledge.length === 0 && (
              <Text type="secondary">Sin saberes básicos. Usa "Añadir saber".</Text>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default CurriculumGenerationPage;
