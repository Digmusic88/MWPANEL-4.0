import React, { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Select, DatePicker, InputNumber, Switch, Segmented,
  Space, Alert, message, Checkbox, Tag, Typography, Button,
} from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';
import { useRubrics } from '../../hooks/useRubrics';

const { TextArea } = Input;
const { Option } = Select;

export type WorkType = 'tarea' | 'test' | 'actividad';

export interface SubjectAssignmentLite {
  id: string;
  subject: { id: string; name: string; code: string };
  classGroup: { id: string; name: string };
}

interface StudentLite {
  id: string;
  user?: { profile?: { firstName?: string; lastName?: string } };
  classGroup?: { name?: string };
}

interface CreateWorkModalProps {
  open: boolean;
  onClose: () => void;
  defaultSubjectAssignmentId?: string;
  onCreated?: () => void;
}

const WORK_TYPE_OPTIONS = [
  { label: 'Tarea', value: 'tarea' as WorkType },
  { label: 'Test Yourself', value: 'test' as WorkType },
  { label: 'Actividad', value: 'actividad' as WorkType },
];

// Tarea task types = TaskType sin 'exam' (que es Test Yourself)
const TASK_TYPE_OPTIONS = [
  { value: 'assignment', label: 'Tarea / Ejercicio' },
  { value: 'homework', label: 'Deberes' },
  { value: 'project', label: 'Proyecto' },
  { value: 'research', label: 'Investigación' },
  { value: 'presentation', label: 'Presentación' },
  { value: 'quiz', label: 'Cuestionario' },
];

const TYPE_HELP: Record<WorkType, string> = {
  tarea: 'Trabajo evaluable con fecha de entrega (deberes, proyecto, ejercicio).',
  test: 'Autoevaluación tipo examen (Test Yourself): sin archivo y sin entrega tardía.',
  actividad: 'Valoración del día a día (emoji, nota o rúbrica), con fecha de la actividad.',
};

// Pure mapper: builds the POST endpoint + body for each work type.
export function buildWorkPayload(
  tipo: WorkType,
  values: any,
  assignments: SubjectAssignmentLite[],
): { endpoint: '/tasks' | '/activities'; body: Record<string, any> } {
  const targetStudentIds = values.targetStudentIds || [];
  const hasTargets = Array.isArray(targetStudentIds) && targetStudentIds.length > 0;
  const criterionIds: string[] = Array.isArray(values.criterionIds) ? values.criterionIds : [];
  const hasCriteria = criterionIds.length > 0;

  if (tipo === 'actividad') {
    const assignment = assignments.find((a) => a.id === values.subjectAssignmentId);
    const body: Record<string, any> = {
      name: values.title,
      description: values.description,
      subjectAssignmentId: values.subjectAssignmentId,
      classGroupId: assignment?.classGroup?.id,
      assignedDate: dayjs(values.assignedDate).format('YYYY-MM-DD'),
      reviewDate: values.reviewDate ? dayjs(values.reviewDate).format('YYYY-MM-DD') : undefined,
      valuationType: values.valuationType,
      maxScore: values.valuationType === 'score' ? values.scoreMax : undefined,
      notifyFamilies: values.notifyFamilies ?? true,
      ...(hasTargets && { targetStudentIds }),
      ...(hasCriteria && { criterionIds }),
    };
    return { endpoint: '/activities', body };
  }

  const isTest = tipo === 'test';
  const body: Record<string, any> = {
    title: values.title,
    description: values.description,
    taskType: isTest ? 'exam' : (values.taskType || 'assignment'),
    subjectAssignmentId: values.subjectAssignmentId,
    assignedDate: dayjs(values.assignedDate).toISOString(),
    dueDate: dayjs(values.dueDate).toISOString(),
    valuationType: values.valuationType,
    maxPoints: values.valuationType === 'score'
      ? (values.scoreMax ?? (isTest ? 100 : undefined))
      : (isTest ? (values.scoreMax || 100) : undefined),
    rubricId: values.valuationType === 'rubric' ? values.rubricId : undefined,
    notifyFamilies: values.notifyFamilies ?? true,
    requiresFile: isTest ? false : (values.requiresFile ?? false),
    ...(isTest && { isTestYourself: true, allowLateSubmission: false, visibleToFamilies: values.visibleToFamilies ?? false }),
    ...(hasTargets && { targetStudentIds }),
    ...(hasCriteria && { criterionIds }),
  };
  return { endpoint: '/tasks', body };
}

const CreateWorkModal: React.FC<CreateWorkModalProps> = ({ open, onClose, defaultSubjectAssignmentId, onCreated }) => {
  const [form] = Form.useForm();
  const [tipo, setTipo] = useState<WorkType>('tarea');
  const [assignments, setAssignments] = useState<SubjectAssignmentLite[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [criteriaGroups, setCriteriaGroups] = useState<Array<{ specificCompetency: { id: string; code: string; name: string }; criteria: Array<{ id: string; code: string; description: string }> }>>([]);
  const { rubrics, fetchRubrics } = useRubrics();

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ basicKnowledgeId: string; code?: string; name: string; criterionIds: string[]; confidence: number }[]>([]);
  const [aiChecked, setAiChecked] = useState<Record<string, boolean>>({});

  const runAiAnalyze = async () => {
    const saId = form.getFieldValue('subjectAssignmentId');
    const description = form.getFieldValue('description');
    if (!saId) { message.warning('Selecciona primero la asignatura'); return; }
    if (!description) { message.warning('Escribe la descripción o pega la rúbrica'); return; }
    setAiLoading(true);
    try {
      const r = await apiClient.post('/criterion-knowledge/work-tagging/suggest', { subjectAssignmentId: saId, description });
      const sugg = r.data.suggestions || [];
      setAiSuggestions(sugg);
      setAiChecked(Object.fromEntries(sugg.map((s: any) => [s.basicKnowledgeId, s.confidence >= 0.4])));
    } catch (e) { console.error('runAiAnalyze failed', e); message.error('No se pudo analizar con IA'); } finally { setAiLoading(false); }
  };

  const applyAiTagging = () => {
    const critIds = new Set<string>(form.getFieldValue('criterionIds') || []);
    aiSuggestions.filter((s) => aiChecked[s.basicKnowledgeId]).forEach((s) => s.criterionIds.forEach((c) => critIds.add(c)));
    form.setFieldsValue({ criterionIds: Array.from(critIds) });
    message.success('Criterios precargados desde la IA — revísalos abajo');
  };

  const valuationType = Form.useWatch('valuationType', form);
  const selectedAssignmentId = Form.useWatch('subjectAssignmentId', form);

  useEffect(() => {
    if (!open) return;
    setTipo('tarea');
    form.resetFields();
    form.setFieldsValue({ valuationType: 'score', taskType: 'assignment', subjectAssignmentId: defaultSubjectAssignmentId });
    apiClient.get('/activities/teacher/subject-assignments')
      .then((r) => setAssignments(r.data || []))
      .catch(() => setAssignments([]));
    apiClient.get('/subjects/my-students')
      .then((r) => setStudents(r.data || []))
      .catch(() => setStudents([]));
    fetchRubrics().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultSubjectAssignmentId]);

  useEffect(() => {
    if (!open || !selectedAssignmentId) { setCriteriaGroups([]); return; }
    apiClient.get('/criterion-assessment/applicable', { params: { subjectAssignmentId: selectedAssignmentId } })
      .then((r) => setCriteriaGroups(r.data?.groups || []))
      .catch(() => setCriteriaGroups([]));
    form.setFieldsValue({ criterionIds: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedAssignmentId]);

  const studentLabel = (s: StudentLite) => {
    const p = s.user?.profile;
    const name = `${p?.firstName || ''} ${p?.lastName || ''}`.trim() || s.id;
    return s.classGroup?.name ? `${name} (${s.classGroup.name})` : name;
  };

  const activeRubrics = (rubrics || []).filter((r: any) => r.status === 'active');

  const onRubricChange = (rubricId: string) => {
    const r = activeRubrics.find((x: any) => x.id === rubricId);
    if (r && typeof r.maxScore === 'number') {
      form.setFieldsValue({ scoreMax: r.maxScore });
    }
  };

  const handleSubmit = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows field errors
    }
    const { endpoint, body } = buildWorkPayload(tipo, values, assignments);
    setSubmitting(true);
    try {
      await apiClient.post(endpoint, body);
      message.success('Trabajo creado correctamente');
      onCreated?.();
      onClose();
    } catch (e: any) {
      const detail = e?.response?.data?.message || 'No se pudo crear el trabajo';
      message.error(Array.isArray(detail) ? detail.join(', ') : detail);
    } finally {
      setSubmitting(false);
    }
  };

  const isActividad = tipo === 'actividad';
  const isTest = tipo === 'test';

  return (
    <Modal
      open={open}
      title="Crear trabajo"
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Crear trabajo"
      confirmLoading={submitting}
      width={640}
      destroyOnClose
    >
      <Segmented
        block
        options={WORK_TYPE_OPTIONS}
        value={tipo}
        onChange={(v) => {
          const next = v as WorkType;
          setTipo(next);
          if (next === 'actividad' && form.getFieldValue('valuationType') === 'rubric') {
            form.setFieldsValue({ valuationType: 'score', rubricId: undefined });
          }
        }}
        style={{ marginBottom: 12 }}
      />
      <Alert type="info" showIcon message={TYPE_HELP[tipo]} style={{ marginBottom: 16 }} />

      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="subjectAssignmentId"
          label="Asignatura"
          rules={[{ required: true, message: 'Selecciona la asignatura' }]}
        >
          <Select placeholder="Selecciona asignatura" showSearch optionFilterProp="children">
            {assignments.map((a) => (
              <Option key={a.id} value={a.id}>
                {a.subject.name} · {a.classGroup.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="title"
          label={isActividad ? 'Nombre' : 'Título'}
          rules={[{ required: true, message: 'Escribe un título' }]}
        >
          <Input placeholder={isActividad ? 'Nombre de la actividad' : 'Título del trabajo'} />
        </Form.Item>

        {!isActividad && !isTest && (
          <Form.Item name="taskType" label="Tipo de tarea">
            <Select>
              {TASK_TYPE_OPTIONS.map((t) => (
                <Option key={t.value} value={t.value}>{t.label}</Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          name="assignedDate"
          label={isActividad ? 'Fecha de la actividad' : 'Fecha de asignación'}
          rules={[{ required: true, message: 'Selecciona la fecha' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format={isActividad ? 'DD/MM/YYYY' : 'DD/MM/YYYY HH:mm'}
            showTime={isActividad ? false : { format: 'HH:mm' }}
          />
        </Form.Item>

        {!isActividad && (
          <Form.Item
            name="dueDate"
            label="Fecha de entrega"
            rules={[{ required: true, message: 'Selecciona la fecha de entrega' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" showTime={{ format: 'HH:mm' }} />
          </Form.Item>
        )}

        {isActividad && (
          <Form.Item name="reviewDate" label="Fecha de revisión">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        )}

        <Form.Item name="valuationType" label="Tipo de valoración" rules={[{ required: true }]}>
          <Select>
            <Option value="emoji">😊 Emojis</Option>
            <Option value="score">🔢 Puntuación numérica</Option>
            {!isActividad && <Option value="rubric">📋 Rúbrica</Option>}
          </Select>
        </Form.Item>

        {valuationType === 'score' && (
          <Form.Item name="scoreMax" label="Puntuación máxima" rules={[{ required: true, message: 'Indica la puntuación máxima' }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
        )}

        {valuationType === 'rubric' && !isActividad && (
          <Form.Item name="rubricId" label="Rúbrica" rules={[{ required: true, message: 'Selecciona una rúbrica' }]}>
            <Select placeholder="Selecciona rúbrica" onChange={onRubricChange} showSearch optionFilterProp="children">
              {activeRubrics.map((r: any) => (
                <Option key={r.id} value={r.id}>{r.name}</Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item name="description" label="Descripción">
          <TextArea rows={2} placeholder="Descripción (opcional)" />
        </Form.Item>

        {criteriaGroups.length > 0 && (
          <div style={{ marginBottom: 12, padding: 12, background: '#fafafa', borderRadius: 8 }}>
            <Space style={{ marginBottom: 8 }}>
              <RobotOutlined />
              <Typography.Text strong>Asistente IA de saberes</Typography.Text>
              <Button size="small" loading={aiLoading} onClick={runAiAnalyze}>Analizar descripción/rúbrica</Button>
            </Space>
            {aiSuggestions.length > 0 && (
              <div>
                {aiSuggestions.map((s) => (
                  <div key={s.basicKnowledgeId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Checkbox checked={!!aiChecked[s.basicKnowledgeId]} onChange={(e) => setAiChecked((m) => ({ ...m, [s.basicKnowledgeId]: e.target.checked }))} />
                    <Typography.Text>{s.code ? `${s.code} · ` : ''}{s.name}</Typography.Text>
                    <Tag color={s.confidence >= 0.6 ? 'green' : s.confidence >= 0.4 ? 'gold' : 'default'}>{Math.round(s.confidence * 100)}%</Tag>
                  </div>
                ))}
                <Button size="small" type="primary" ghost onClick={applyAiTagging} style={{ marginTop: 6 }}>Confirmar y precargar criterios</Button>
              </div>
            )}
          </div>
        )}

        {criteriaGroups.length > 0 && (
          <Form.Item
            name="criterionIds"
            label="Criterios de evaluación (LOMLOE)"
            tooltip="Opcional. Qué criterios trabaja este trabajo. No cambia la nota; prepara la evaluación competencial."
          >
            <Select mode="multiple" allowClear placeholder="Sin criterios asociados" optionFilterProp="label">
              {criteriaGroups.map((g) => (
                <Select.OptGroup key={g.specificCompetency.id} label={`${g.specificCompetency.code} · ${g.specificCompetency.name}`}>
                  {g.criteria.map((c) => (
                    <Option key={c.id} value={c.id} label={`${c.code} ${c.description}`}>
                      {c.code} · {c.description}
                    </Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item name="targetStudentIds" label="Alumnos (opcional — vacío = toda la clase)">
          <Select mode="multiple" allowClear placeholder="Toda la clase" optionFilterProp="children">
            {students.map((s) => (
              <Option key={s.id} value={s.id}>{studentLabel(s)}</Option>
            ))}
          </Select>
        </Form.Item>

        <Space size="large" wrap>
          <Form.Item name="notifyFamilies" label="Notificar a familias" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          {isTest && (
            <Form.Item name="visibleToFamilies" label="Visible para familias" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          )}
          {!isActividad && !isTest && (
            <Form.Item name="requiresFile" label="Requiere archivo" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          )}
        </Space>
      </Form>
    </Modal>
  );
};

export default CreateWorkModal;
