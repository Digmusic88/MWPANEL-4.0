import React, { useEffect, useMemo, useState } from 'react';
import { Table, Tag, Input, Segmented, Button, Alert, Empty, Space, Select } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';
import SectionInfoBanner from '../common/SectionInfoBanner';
import { toWorkItems, WorkItem, WorkKind } from './workItems';

const KIND_META: Record<WorkKind, { label: string; color: string }> = {
  tarea: { label: 'Tarea', color: 'blue' },
  test: { label: 'Test Yourself', color: 'purple' },
  actividad: { label: 'Actividad', color: 'green' },
};

const VALUATION_LABEL: Record<string, string> = {
  emoji: '😊 Emoji',
  score: '🔢 Nota',
  rubric: '📋 Rúbrica',
};

const TrabajosTab: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<'todos' | WorkKind>('todos');
  const [search, setSearch] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [academicYearId, setAcademicYearId] = useState<string | undefined>(undefined);
  const [years, setYears] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    apiClient.get('/academic-years').then((r) => setYears(r.data || [])).catch(() => setYears([]));
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const yearParam = academicYearId ? `&academicYearId=${academicYearId}` : '';
    const actsYearParam = academicYearId ? `?academicYearId=${academicYearId}` : '';
    const [tasksRes, actsRes] = await Promise.all([
      apiClient.get(`/tasks/teacher/my-tasks?limit=1000${yearParam}`).catch(() => ({ data: { tasks: [], total: 0 } })),
      apiClient.get(`/activities${actsYearParam}`).catch(() => ({ data: [] })),
    ]);
    const rawTasks = tasksRes.data?.tasks || [];
    const rawActs = Array.isArray(actsRes.data) ? actsRes.data : [];
    setItems(toWorkItems(rawTasks, rawActs));
    setTruncated((tasksRes.data?.total || 0) > rawTasks.length);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (it) =>
        (kindFilter === 'todos' || it.kind === kindFilter) &&
        (!q || (it.title || '').toLowerCase().includes(q)),
    );
  }, [items, kindFilter, search]);

  const columns = [
    {
      title: 'Tipo', dataIndex: 'kind', key: 'kind', width: 130,
      render: (k: WorkKind) => <Tag color={KIND_META[k].color}>{KIND_META[k].label}</Tag>,
    },
    { title: 'Título', dataIndex: 'title', key: 'title' },
    { title: 'Asignatura/Grupo', dataIndex: 'context', key: 'context' },
    {
      title: 'Valoración', dataIndex: 'valuationType', key: 'valuationType', width: 120,
      render: (v: string) => VALUATION_LABEL[v] || v,
    },
    {
      title: 'Fecha', dataIndex: 'date', key: 'date', width: 120,
      render: (d: string | null) => (d ? dayjs(d).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => <Tag>{s}</Tag>,
    },
    {
      title: 'Acción', key: 'action', width: 110,
      render: (_: unknown, r: WorkItem) => (
        <Button size="small" onClick={() => navigate(r.href)}>Abrir</Button>
      ),
    },
  ];

  return (
    <div>
      <SectionInfoBanner text="Trabajos reúne tus Tareas, Test Yourself y Actividades en una sola lista. Pulsa Abrir para calificar o editar cada uno." />
      <Space wrap style={{ margin: '12px 0' }}>
        <Select
          aria-label="Año académico"
          placeholder="Año académico"
          allowClear
          style={{ width: 180 }}
          value={academicYearId}
          onChange={(v) => setAcademicYearId(v)}
          options={[
            { label: 'Todos los años', value: undefined as any },
            ...years.map((y) => ({ label: y.name, value: y.id })),
          ]}
        />
        <Segmented
          value={kindFilter}
          onChange={(v) => setKindFilter(v as 'todos' | WorkKind)}
          options={[
            { label: 'Todos', value: 'todos' },
            { label: 'Tareas', value: 'tarea' },
            { label: 'Test Yourself', value: 'test' },
            { label: 'Actividades', value: 'actividad' },
          ]}
        />
        <Input.Search
          placeholder="Buscar por título"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240 }}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchAll}>Recargar</Button>
      </Space>
      {truncated && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Mostrando los primeros 1000 trabajos; usa el buscador para afinar."
        />
      )}
      <Table
        rowKey={(r) => `${r.kind}:${r.id}`}
        columns={columns}
        dataSource={filtered}
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: <Empty description="No tienes trabajos todavía" /> }}
      />
    </div>
  );
};

export default TrabajosTab;
