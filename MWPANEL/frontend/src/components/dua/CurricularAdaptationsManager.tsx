import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Modal,
  Select,
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Typography,
  Empty,
  Spin,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';
import AcademicYearSelector from '@components/common/AcademicYearSelector';
import {
  curricularAdaptationService,
  CurricularAdaptation,
  CurricularAdaptationType,
} from '@services/curricularAdaptationService';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface StudentLite {
  id: string;
  user?: { profile?: { firstName?: string; lastName?: string } };
}

interface SubjectLite {
  id: string;
  name: string;
}

const studentName = (s: StudentLite): string => {
  const first = s.user?.profile?.firstName || '';
  const last = s.user?.profile?.lastName || '';
  return `${first} ${last}`.trim() || 'Alumno';
};

const TYPE_OPTIONS: { value: CurricularAdaptationType; label: string; color: string }[] = [
  { value: 'SIGNIFICANT', label: 'Significativa (ACS)', color: '#C43030' },
  { value: 'NON_SIGNIFICANT', label: 'No significativa', color: '#B45309' },
  { value: 'ACCESS', label: 'Acceso', color: '#579172' },
];

const typeInfo = (type: CurricularAdaptationType) =>
  TYPE_OPTIONS.find((t) => t.value === type) || { value: type, label: type, color: '#579172' };

interface AdaptationFormValues {
  subjectId: string;
  type: CurricularAdaptationType;
  notes?: string;
  dateRange?: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
}

const CurricularAdaptationsManager: React.FC = () => {
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const [academicYearId, setAcademicYearId] = useState<string | undefined>(undefined);

  const [subjects, setSubjects] = useState<SubjectLite[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [adaptations, setAdaptations] = useState<CurricularAdaptation[]>([]);
  const [adaptationsLoading, setAdaptationsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CurricularAdaptation | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<AdaptationFormValues>();

  // Cargar alumnos (mismo patrón que AdminExpedientePage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/students');
        if (!cancelled) setStudents(res.data || []);
      } catch {
        if (!cancelled) message.error('No se pudieron cargar los alumnos');
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cargar asignaturas del alumno seleccionado
  useEffect(() => {
    if (!studentId) {
      setSubjects([]);
      return;
    }
    let cancelled = false;
    setSubjectsLoading(true);
    (async () => {
      try {
        const res = await apiClient.get(`/subjects/student/${studentId}`);
        if (!cancelled) setSubjects(res.data || []);
      } catch {
        if (!cancelled) setSubjects([]);
      } finally {
        if (!cancelled) setSubjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const fetchAdaptations = useCallback(async () => {
    if (!studentId) {
      setAdaptations([]);
      return;
    }
    setAdaptationsLoading(true);
    try {
      const data = await curricularAdaptationService.listForStudent(studentId, academicYearId);
      setAdaptations(data || []);
    } catch {
      message.error('No se pudieron cargar las adaptaciones curriculares');
      setAdaptations([]);
    } finally {
      setAdaptationsLoading(false);
    }
  }, [studentId, academicYearId]);

  useEffect(() => {
    fetchAdaptations();
  }, [fetchAdaptations]);

  const handleStudentChange = (value: string) => {
    setStudentId(value);
    setAcademicYearId(undefined);
  };

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: CurricularAdaptation) => {
    setEditing(record);
    form.setFieldsValue({
      subjectId: record.subjectId,
      type: record.type,
      notes: record.notes || undefined,
      dateRange: [
        record.startDate ? dayjs(record.startDate) : null,
        record.endDate ? dayjs(record.endDate) : null,
      ],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleDelete = async (record: CurricularAdaptation) => {
    try {
      await curricularAdaptationService.remove(record.id);
      message.success('Adaptación eliminada');
      fetchAdaptations();
    } catch {
      message.error('No se pudo eliminar la adaptación');
    }
  };

  const handleSubmit = async (values: AdaptationFormValues) => {
    if (!studentId || !academicYearId) return;
    setSaving(true);
    const [start, end] = values.dateRange || [null, null];
    try {
      if (editing) {
        await curricularAdaptationService.update(editing.id, {
          type: values.type,
          notes: values.notes ?? null,
          startDate: start ? start.format('YYYY-MM-DD') : null,
          endDate: end ? end.format('YYYY-MM-DD') : null,
        });
        message.success('Adaptación actualizada');
      } else {
        await curricularAdaptationService.upsert({
          studentId,
          subjectId: values.subjectId,
          academicYearId,
          type: values.type,
          notes: values.notes ?? undefined,
          startDate: start ? start.format('YYYY-MM-DD') : undefined,
          endDate: end ? end.format('YYYY-MM-DD') : undefined,
        });
        message.success('Adaptación creada');
      }
      closeModal();
      fetchAdaptations();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo guardar la adaptación');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Asignatura',
      key: 'subject',
      render: (_: unknown, record: CurricularAdaptation) => record.subject?.name || '—',
    },
    {
      title: 'Tipo',
      key: 'type',
      render: (_: unknown, record: CurricularAdaptation) => {
        const info = typeInfo(record.type);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: 'Notas',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string | null) => notes || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Vigencia',
      key: 'dates',
      render: (_: unknown, record: CurricularAdaptation) => {
        if (!record.startDate && !record.endDate) return <span style={{ color: '#bbb' }}>—</span>;
        const start = record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '…';
        const end = record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : '…';
        return `${start} - ${end}`;
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: CurricularAdaptation) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Popconfirm
            title="¿Eliminar esta adaptación curricular?"
            okText="Eliminar"
            cancelText="Cancelar"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Title level={3}>
        <ToolOutlined style={{ marginRight: 8 }} />
        Adaptaciones curriculares
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text>Alumno:</Text>
          <Select
            style={{ width: 280 }}
            placeholder="Selecciona un alumno"
            showSearch
            loading={studentsLoading}
            optionFilterProp="label"
            value={studentId}
            onChange={handleStudentChange}
            options={students.map((s) => ({ value: s.id, label: studentName(s) }))}
          />
          <Text>Año académico:</Text>
          <AcademicYearSelector value={academicYearId} onChange={setAcademicYearId} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!studentId || !academicYearId}
            onClick={openCreateModal}
          >
            Nueva adaptación
          </Button>
        </Space>
      </Card>

      <Card>
        {!studentId ? (
          <Empty description="Selecciona un alumno para ver sus adaptaciones curriculares" />
        ) : !academicYearId ? (
          <Empty description="Selecciona un año académico" />
        ) : adaptationsLoading ? (
          <Spin />
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={adaptations}
            pagination={false}
            locale={{ emptyText: 'Sin adaptaciones curriculares para este alumno y año' }}
          />
        )}
      </Card>

      <Modal
        title={editing ? 'Editar adaptación curricular' : 'Nueva adaptación curricular'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editing ? 'Guardar' : 'Crear'}
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="subjectId"
            label="Asignatura"
            rules={[{ required: true, message: 'Selecciona una asignatura' }]}
          >
            <Select
              placeholder="Selecciona una asignatura"
              loading={subjectsLoading}
              disabled={!!editing}
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
              notFoundContent={subjectsLoading ? <Spin size="small" /> : 'Sin asignaturas para este alumno'}
            />
          </Form.Item>
          <Form.Item name="type" label="Tipo" rules={[{ required: true, message: 'Selecciona un tipo' }]}>
            <Select
              placeholder="Selecciona un tipo"
              options={TYPE_OPTIONS.map((t) => ({
                value: t.value,
                label: <Tag color={t.color}>{t.label}</Tag>,
              }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <TextArea rows={3} placeholder="Observaciones sobre la adaptación" />
          </Form.Item>
          <Form.Item name="dateRange" label="Vigencia (opcional)">
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowEmpty={[true, true]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CurricularAdaptationsManager;
