/**
 * @archivo: StaffTasksPage.tsx
 * @modulo: Staff (Claustro) - Admin
 * @funcion: Pagina de gestion de tareas del claustro para administradores
 */

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Typography,
  message,
  Spin,
  Empty,
  Tag,
  Alert,
  Modal,
  Tabs,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  TeamOutlined,
  FilterOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useStaffTasks,
  useCreateStaffTask,
  useUpdateStaffTask,
  useDeleteStaffTask,
  useArchiveStats,
} from '@/hooks/useStaffTasks';
import { useStaffDashboardStats, useStaffUsers } from '@/hooks/useStaffDashboard';
import { StaffTaskCard, StaffTaskList, StaffTaskForm, StaffTaskDetail, StaffProgressCard, StaffTaskArchive } from '@/components/staff';
import type { StaffTask, StaffTaskStatus, StaffTaskPriority, CreateStaffTaskDto, UpdateStaffTaskDto } from '@/types/staff';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const StaffTasksPage: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // State for tab and filters
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffTaskStatus | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<StaffTaskPriority | undefined>(undefined);
  const [assignedToFilter, setAssignedToFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // State for modals
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Queries
  const {
    data: tasksData,
    isLoading: tasksLoading,
    refetch: refetchTasks,
    error: tasksError,
  } = useStaffTasks({
    search: searchTerm || undefined,
    status: statusFilter,
    priority: priorityFilter,
    assignedTo: assignedToFilter,
    dueDateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
    dueDateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
  });

  const { data: stats, isLoading: statsLoading } = useStaffDashboardStats();
  const { data: archiveStats } = useArchiveStats();

  // Get all staff users for task assignment
  const { data: staffUsers } = useStaffUsers();

  // Mutations
  const createTask = useCreateStaffTask();
  const updateTask = useUpdateStaffTask();
  const deleteTask = useDeleteStaffTask();

  const tasks = tasksData?.data || [];

  // Handlers
  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsFormModalVisible(true);
  };

  const handleEditTask = (task: StaffTask) => {
    setSelectedTask(task);
    setIsFormModalVisible(true);
    setIsDetailOpen(false);
  };

  const handleViewTask = (task: StaffTask) => {
    setDetailTaskId(task.id);
    setIsDetailOpen(true);
  };

  const handleFormSubmit = async (values: CreateStaffTaskDto | UpdateStaffTaskDto) => {
    try {
      if (selectedTask) {
        await updateTask.mutateAsync({ id: selectedTask.id, data: values as UpdateStaffTaskDto });
        message.success('Tarea actualizada exitosamente');
      } else {
        await createTask.mutateAsync(values as CreateStaffTaskDto);
        message.success('Tarea creada exitosamente');
      }
      setIsFormModalVisible(false);
      setSelectedTask(null);
      refetchTasks();
    } catch (error) {
      message.error('Error al guardar la tarea');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
      message.success('Tarea eliminada exitosamente');
      refetchTasks();
    } catch (error) {
      message.error('Error al eliminar la tarea');
    }
  };

  const handleFormCancel = () => {
    setIsFormModalVisible(false);
    setSelectedTask(null);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setDetailTaskId(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter(undefined);
    setPriorityFilter(undefined);
    setAssignedToFilter(undefined);
    setDateRange(null);
  };


  if (tasksError) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Title level={2} className="mb-2">
            <TeamOutlined className="mr-2" />
            Tareas del Claustro
          </Title>
          <Alert
            message="Error al cargar las tareas"
            description="Ocurrio un error al cargar las tareas del claustro. Por favor, intente de nuevo."
            type="error"
            showIcon
            action={
              <Button onClick={() => refetchTasks()} icon={<ReloadOutlined />}>
                Reintentar
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} className="mb-2">
            <TeamOutlined className="mr-2" />
            Tareas del Claustro
          </Title>
          <Text type="secondary">
            Gestiona las tareas administrativas del equipo docente
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateTask}
          size="large"
        >
          Nueva Tarea
        </Button>
      </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="mb-6 flex justify-center">
          <Spin size="large" />
        </div>
      ) : stats ? (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Total de Tareas"
                value={stats.tasks.total}
                prefix={<UnorderedListOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Completadas"
                value={stats.tasks.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
                suffix={
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    ({stats.tasks.completionRate}%)
                  </Text>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="En Progreso"
                value={stats.tasks.inProgress}
                prefix={<SyncOutlined spin />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title={
                  <Space>
                    Vencidas
                    {stats.tasks.overdue > 0 && (
                      <Badge count={stats.tasks.overdue} style={{ backgroundColor: '#ff4d4f' }} />
                    )}
                  </Space>
                }
                value={stats.tasks.overdue}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: stats.tasks.overdue > 0 ? '#ff4d4f' : '#8c8c8c' }}
              />
            </Card>
          </Col>
        </Row>
      ) : null}

      {/* Tabs: Active / Archive */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'active' | 'archive')}
        className="mb-6"
        items={[
          {
            key: 'active',
            label: (
              <span>
                <UnorderedListOutlined className="mr-2" />
                Activas
                {stats?.tasks?.total !== undefined && (
                  <Badge count={stats.tasks.total - stats.tasks.completed} className="ml-2" style={{ backgroundColor: '#1890ff' }} />
                )}
              </span>
            ),
            children: (
              <>
                {/* Filters */}
                <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Buscar tareas..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Estado"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="pending">
                <Tag color="gold">Pendiente</Tag>
              </Select.Option>
              <Select.Option value="in_progress">
                <Tag color="blue">En progreso</Tag>
              </Select.Option>
              <Select.Option value="completed">
                <Tag color="green">Completada</Tag>
              </Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Prioridad"
              value={priorityFilter}
              onChange={setPriorityFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="high">
                <Tag color="red">Alta</Tag>
              </Select.Option>
              <Select.Option value="medium">
                <Tag color="orange">Media</Tag>
              </Select.Option>
              <Select.Option value="low">
                <Tag color="default">Baja</Tag>
              </Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Asignado a"
              value={assignedToFilter}
              onChange={setAssignedToFilter}
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {(staffUsers || []).map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : user.email}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              placeholder={['Fecha desde', 'Fecha hasta']}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
        <Row className="mt-4" justify="space-between" align="middle">
          <Col>
            <Space>
              <Button onClick={clearFilters} icon={<FilterOutlined />}>
                Limpiar Filtros
              </Button>
              <Button onClick={() => refetchTasks()} icon={<ReloadOutlined />}>
                Actualizar
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<AppstoreOutlined />}
                type={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
              />
              <Button
                icon={<UnorderedListOutlined />}
                type={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => setViewMode('list')}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Tasks Grid/List */}
      {tasksLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : tasks.length > 0 ? (
        viewMode === 'list' ? (
          <StaffTaskList
            tasks={tasks}
            onTaskClick={handleViewTask}
            showCreator={true}
            loading={tasksLoading}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {tasks.map(task => (
              <Col xs={24} sm={12} lg={8} xl={6} key={task.id}>
                <StaffTaskCard
                  task={task}
                  onClick={() => handleViewTask(task)}
                  showCreator={true}
                />
              </Col>
            ))}
          </Row>
        )
      ) : (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No se encontraron tareas"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTask}>
              Crear Primera Tarea
            </Button>
          </Empty>
        </Card>
      )}
              </>
            ),
          },
          {
            key: 'archive',
            label: (
              <span>
                <InboxOutlined className="mr-2" />
                Archivo
                {archiveStats?.total !== undefined && archiveStats.total > 0 && (
                  <Badge count={archiveStats.total} className="ml-2" style={{ backgroundColor: '#52c41a' }} />
                )}
              </span>
            ),
            children: (
              <StaffTaskArchive
                onViewDetail={(task) => {
                  setDetailTaskId(task.id);
                  setIsDetailOpen(true);
                }}
              />
            ),
          },
        ]}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={selectedTask ? 'Editar Tarea' : 'Nueva Tarea'}
        open={isFormModalVisible}
        onCancel={handleFormCancel}
        footer={null}
        width={600}
        destroyOnClose
      >
        <StaffTaskForm
          task={selectedTask || undefined}
          users={staffUsers || []}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          loading={createTask.isPending || updateTask.isPending}
        />
      </Modal>

      {/* Task Detail Drawer */}
      <StaffTaskDetail
        taskId={detailTaskId}
        open={isDetailOpen}
        onClose={handleDetailClose}
        onEdit={handleEditTask}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default StaffTasksPage;
