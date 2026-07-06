import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Select,
  Space,
  message,
  Tooltip,
} from 'antd';
import {
  ThunderboltOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../services/apiClient';
import {
  criterionKnowledgeService,
  CriterionMapRow,
  KnowledgeLink,
  ScopeOption,
} from '../../services/criterionKnowledgeService';
import { GradingPageHelp } from '../../components/grading/GradingPageHelp';
import type { ColumnsType } from 'antd/es/table';

interface Props {
  initialSubjectName?: string;
  initialScope?: { scopeType: 'cycle' | 'course'; scopeId: string };
}

interface SubjectOption {
  name: string;
}

const CriterionKnowledgeMap: React.FC<Props> = ({ initialSubjectName, initialScope }) => {
  const [subjectName, setSubjectName] = useState<string | undefined>(initialSubjectName);
  const [scope, setScope] = useState(initialScope);
  const [rows, setRows] = useState<CriterionMapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [scopeOptions, setScopeOptions] = useState<ScopeOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingScopes, setLoadingScopes] = useState(false);

  // Per-criterion manual add state: criterionId -> basicKnowledgeId to link
  const [manualAdd, setManualAdd] = useState<Record<string, string | undefined>>({});
  const [candidatesMap, setCandidatesMap] = useState<Record<string, { id: string; code: string; title: string; block: string }[]>>({});
  const [loadingCandidates, setLoadingCandidates] = useState<Record<string, boolean>>({});

  // Load subjects on mount
  useEffect(() => {
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const subjectsRes = await apiClient.get('/subjects');
        const allSubjects: Array<{ name: string }> = subjectsRes.data || [];
        const uniqueNames = Array.from(new Set(allSubjects.map((s) => s.name)));
        setSubjectOptions(uniqueNames.map((n) => ({ name: n })));
      } catch {
        // Subjects load silently if they fail
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, []);

  // Load scope options in cascade when subjectName changes
  useEffect(() => {
    if (!subjectName) {
      setScopeOptions([]);
      return;
    }
    const loadScopes = async () => {
      setLoadingScopes(true);
      try {
        const scopes = await criterionKnowledgeService.getScopes(subjectName);
        setScopeOptions(scopes);
      } catch {
        // Scopes load silently if they fail
      } finally {
        setLoadingScopes(false);
      }
    };
    loadScopes();
  }, [subjectName]);

  const load = async () => {
    if (!subjectName || !scope) return;
    setLoading(true);
    try {
      const data = await criterionKnowledgeService.getMap(subjectName, scope.scopeType, scope.scopeId);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectName, scope?.scopeId]);

  const onSuggest = async () => {
    if (!subjectName || !scope) return;
    setSuggesting(true);
    const hide = message.loading('Generando sugerencias con IA…', 0);
    try {
      const r = await criterionKnowledgeService.suggest(subjectName, scope.scopeType, scope.scopeId);
      message.success(
        `Procesados ${r.criteriaProcessed ?? 0} criterios, ${r.suggestionsCreated ?? 0} sugerencias${
          r.aiUsed === false ? ' (modo sin IA)' : ''
        }`
      );
      await load();
    } catch {
      // Error shown by apiClient interceptor
    } finally {
      hide();
      setSuggesting(false);
    }
  };

  const setStatus = async (linkId: string, status: 'confirmed' | 'rejected') => {
    await criterionKnowledgeService.setStatus(linkId, status);
    await load();
  };

  const removeLink = async (linkId: string) => {
    await criterionKnowledgeService.unlink(linkId);
    await load();
  };

  const loadCandidates = async (criterionId: string) => {
    if (candidatesMap[criterionId]) return; // already loaded
    setLoadingCandidates((prev) => ({ ...prev, [criterionId]: true }));
    try {
      const items = await criterionKnowledgeService.getCandidates(criterionId);
      setCandidatesMap((prev) => ({ ...prev, [criterionId]: items }));
    } catch {
      // silent
    } finally {
      setLoadingCandidates((prev) => ({ ...prev, [criterionId]: false }));
    }
  };

  const handleManualLink = async (criterionId: string) => {
    const bkId = manualAdd[criterionId];
    if (!bkId) return;
    await criterionKnowledgeService.linkManual(criterionId, bkId);
    setManualAdd((prev) => ({ ...prev, [criterionId]: undefined }));
    setCandidatesMap((prev) => {
      const { [criterionId]: _, ...rest } = prev;
      return rest;
    });
    await load();
  };

  const renderKnowledge = (_: unknown, r: CriterionMapRow) => (
    <Space wrap>
      {r.knowledge
        .filter((k) => k.status !== 'rejected')
        .map((k: KnowledgeLink) =>
          k.status === 'confirmed' ? (
            <Tag
              key={k.linkId}
              color="green"
              closable
              onClose={(e) => {
                e.preventDefault();
                removeLink(k.linkId);
              }}
            >
              <Tooltip title={k.description || k.title}>
                <span>{k.code} {k.title}</span>
              </Tooltip>
            </Tag>
          ) : (
            <Tag key={k.linkId} color="gold" style={{ borderStyle: 'dashed' }}>
              <Tooltip title={k.description || k.title}>
                <span>{k.code} {k.title}</span>
              </Tooltip>
              {k.confidence != null ? ` (${Math.round(k.confidence * 100)}%)` : ''}
              <Tooltip title="Aceptar">
                <CheckOutlined
                  style={{ marginLeft: 6, cursor: 'pointer', color: '#52c41a' }}
                  onClick={() => setStatus(k.linkId, 'confirmed')}
                />
              </Tooltip>
              <Tooltip title="Descartar">
                <CloseOutlined
                  style={{ marginLeft: 4, cursor: 'pointer', color: '#ff4d4f' }}
                  onClick={() => setStatus(k.linkId, 'rejected')}
                />
              </Tooltip>
            </Tag>
          )
        )}
      {/* Manual add */}
      <Space.Compact size="small">
        <Select
          showSearch
          allowClear
          size="small"
          placeholder="Añadir saber…"
          style={{ width: 180 }}
          filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
          onDropdownVisibleChange={(open) => open && loadCandidates(r.criterion.id)}
          loading={loadingCandidates[r.criterion.id]}
          value={manualAdd[r.criterion.id]}
          onChange={(v) =>
            setManualAdd((prev) => ({ ...prev, [r.criterion.id]: v }))
          }
          options={(candidatesMap[r.criterion.id] || []).map((k) => ({
            value: k.id,
            label: `${k.code} ${k.title}`,
          }))}
        />
        <Button
          size="small"
          icon={<PlusOutlined />}
          disabled={!manualAdd[r.criterion.id]}
          onClick={() => handleManualLink(r.criterion.id)}
        />
      </Space.Compact>
    </Space>
  );

  const columns: ColumnsType<CriterionMapRow> = [
    {
      title: 'Criterio',
      width: 260,
      render: (_, r) => (
        <span>
          <b>{r.criterion.code}</b> {r.criterion.description}
        </span>
      ),
    },
    {
      title: 'Saberes básicos',
      render: renderKnowledge,
    },
    {
      title: 'Competencia clave',
      width: 200,
      render: (_, r) => (
        <Space wrap>
          {r.keyCompetencies.map((kc) => (
            <Tag key={kc.id} color="blue">
              {kc.code}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <GradingPageHelp
        title="Conexión criterios ↔ saberes básicos"
        whatIs="Esta página permite curar la relación entre los criterios de evaluación y los saberes básicos del currículo. Cada criterio puede estar vinculado a uno o varios saberes (confirmados manualmente o sugeridos por IA)."
        steps={[
          'Selecciona la asignatura y el ámbito (ciclo o curso).',
          'Pulsa "Generar sugerencias con IA" para obtener propuestas automáticas.',
          'Revisa cada saber: acepta (✓) los correctos y descarta (✕) los incorrectos.',
          'Añade saberes manualmente usando el buscador de cada fila.',
        ]}
        purpose="Garantiza que los criterios de evaluación quedan correctamente vinculados a los saberes básicos del decreto curricular de Navarra, facilitando la trazabilidad de la evaluación competencial."
      />

      <Card
        title="Criterios ↔ Saberes básicos"
        extra={
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={suggesting}
            disabled={!subjectName || !scope}
            onClick={onSuggest}
          >
            Generar sugerencias con IA
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Asignatura"
            style={{ width: 200 }}
            loading={loadingSubjects}
            showSearch
            value={subjectName}
            onChange={(v) => {
              setSubjectName(v);
              setScope(undefined);
            }}
            options={subjectOptions.map((s) => ({ value: s.name, label: s.name }))}
            filterOption={(input, opt) =>
              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            placeholder="Ámbito (ciclo / curso)"
            style={{ width: 240 }}
            loading={loadingScopes}
            showSearch
            disabled={!subjectName}
            value={scope ? `${scope.scopeType}:${scope.scopeId}` : undefined}
            onChange={(v: string) => {
              if (!v) { setScope(undefined); return; }
              const [type, ...rest] = v.split(':');
              setScope({ scopeType: type as 'cycle' | 'course', scopeId: rest.join(':') });
            }}
            options={scopeOptions.map((s) => ({
              value: `${s.scopeType}:${s.scopeId}`,
              label: s.scopeType === 'cycle' ? `Ciclo: ${s.label}` : `Curso: ${s.label}`,
            }))}
            filterOption={(input, opt) =>
              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            allowClear
          />
          <Button onClick={load} disabled={!subjectName || !scope}>
            Cargar mapa
          </Button>
        </Space>

        <Table<CriterionMapRow>
          rowKey={(r) => r.criterion.id}
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          size="middle"
          locale={{ emptyText: 'Selecciona asignatura y ámbito para cargar los criterios.' }}
        />
      </Card>
    </div>
  );
};

export default CriterionKnowledgeMap;
