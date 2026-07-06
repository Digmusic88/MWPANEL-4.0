/**
 * @archivo: StaffTaskArchive.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Vista de archivo de tareas completadas con filtros
 */

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Statistic,
  Empty,
  Spin,
  Typography,
  Space,
  Input,
} from 'antd';
import {
  CheckCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useArchivedStaffTasks, useArchiveStats, useReactivateStaffTask } from '@/hooks/useStaffTasks';
import { useStaffTags } from '@/hooks/useStaffTags';
import { staffDashboardApi } from '@/services/staffService';
import { useQuery } from '@tanstack/react-query';
import { StaffArchivedTaskCard } from './StaffArchivedTaskCard';
import type { StaffTask, StaffArchiveFilters } from '@/types/staff';

const { Title, Text } = Typography;

// Meses en español
const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

// Generar años desde 2024 hasta el actual
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2023 }, (_, i) => ({
  value: 2024 + i,
  label: String(2024 + i),
}));

interface StaffTaskArchiveProps {
  onViewDetail?: (task: StaffTask) => void;
}

export const StaffTaskArchive: React.FC<StaffTaskArchiveProps> = ({ onViewDetail }) => {
  const [filters, setFilters] = useState<StaffArchiveFilters>({
    year: currentYear,
    page: 1,
    limit: 20,
  });
  const [searchText, setSearchText] = useState('');

  // Queries
  const { data: archivedData, isLoading: isLoadingTasks } = useArchivedStaffTasks({
    ...filters,
    search: searchText || undefined,
  });
  const { data: stats, isLoading: isLoadingStats } = useArchiveStats();
  const { data: tags } = useStaffTags();
  const { data: staffUsers } = useQuery({
    queryKey: ['staff-dashboard', 'users'],
    queryFn: () => staffDashboardApi.getStaffUsers(),
  });

  // Mutations
  const reactivateMutation = useReactivateStaffTask();

  const handleFilterChange = (key: keyof StaffArchiveFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handleReactivate = (taskId: string) => {
    reactivateMutation.mutate(taskId);
  };

  return (
    <div className="staff-task-archive">
      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Archivadas"
              value={stats?.total || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              loading={isLoadingStats}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Este Mes"
              value={stats?.thisMonth || 0}
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
              loading={isLoadingStats}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tiempo Promedio"
              value={stats?.avgCompletionDays ?? '-'}
              suffix={stats?.avgCompletionDays !== null ? 'días' : ''}
              prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
              loading={isLoadingStats}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6} md={4}>
            <Select
              placeholder="Mes"
              allowClear
              value={filters.month}
              onChange={(v) => handleFilterChange('month', v)}
              options={MONTHS}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={6} md={4}>
            <Select
              placeholder="Año"
              value={filters.year}
              onChange={(v) => handleFilterChange('year', v)}
              options={YEARS}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={6} md={4}>
            <Select
              placeholder="Categoría"
              allowClear
              value={filters.tagId}
              onChange={(v) => handleFilterChange('tagId', v)}
              style={{ width: '100%' }}
            >
              {tags?.map(tag => (
                <Select.Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={6} md={4}>
            <Select
              placeholder="Completado por"
              allowClear
              value={filters.completedById}
              onChange={(v) => handleFilterChange('completedById', v)}
              style={{ width: '100%' }}
            >
              {staffUsers?.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.profile?.firstName
                    ? `${user.profile.firstName} ${user.profile.lastName || ''}`
                    : user.email.split('@')[0]}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Buscar por título..."
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
        </Row>
      </Card>

      {/* Results count */}
      {archivedData && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Mostrando {archivedData.data.length} de {archivedData.meta.total} tareas archivadas
          </Text>
        </div>
      )}

      {/* Task List */}
      <Spin spinning={isLoadingTasks}>
        {archivedData?.data && archivedData.data.length > 0 ? (
          <div>
            {archivedData.data.map(task => (
              <StaffArchivedTaskCard
                key={task.id}
                task={task}
                onReactivate={handleReactivate}
                onViewDetail={onViewDetail}
                isReactivating={reactivateMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <Empty
            description="No hay tareas archivadas con los filtros seleccionados"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Spin>

      {/* Top Completers (only for admin if stats available) */}
      {stats?.byCompleter && stats.byCompleter.length > 0 && (
        <Card title="Top Completadores" style={{ marginTop: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {stats.byCompleter.slice(0, 5).map((completer, index) => (
              <div
                key={completer.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: index < stats.byCompleter.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <Space>
                  <Text strong style={{ width: 24 }}>#{index + 1}</Text>
                  <Text>{completer.name}</Text>
                </Space>
                <Text type="secondary">{completer.count} tareas</Text>
              </div>
            ))}
          </Space>
        </Card>
      )}
    </div>
  );
};

export default StaffTaskArchive;
