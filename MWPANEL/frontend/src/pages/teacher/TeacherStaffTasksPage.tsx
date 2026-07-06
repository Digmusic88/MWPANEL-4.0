/**
 * @archivo: TeacherStaffTasksPage.tsx
 * @modulo: Staff (Claustro) - Teacher
 * @funcion: Pagina de tareas del claustro para profesores con archivo
 */

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Typography,
  message,
  Spin,
  Empty,
  Tag,
  Tabs,
  Badge,
  Modal,
  Progress,
  Space,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  FilterOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  InboxOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useStaffTasks,
  useMyStaffTasks,
  useMyCreatedStaffTasks,
  useCreateStaffTask,
  useUpdateStaffTask,
  useArchiveStats,
} from '@/hooks/useStaffTasks';
import { StaffTaskList, StaffTaskForm, StaffTaskDetail, StaffTaskArchive } from '@/components/staff';
import type { StaffTask, StaffTaskStatus, StaffTaskPriority, CreateStaffTaskDto, UpdateStaffTaskDto } from '@/types/staff';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text } = Typography;

const TeacherStaffTasksPage: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // State for main view (active vs archive)
  const [mainView, setMainView] = useState<'active' | 'archive'>('active');

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffTaskStatus | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<StaffTaskPriority | undefined>(undefined);
  const [activeSubTab, setActiveSubTab] = useState('my-tasks');

  // State for modals
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Queries
  const {
    data: myTasksData,
    isLoading: myTasksLoading,
    refetch: refetchMyTasks,
  } = useMyStaffTasks({
    search: searchTerm || undefined,
    status: statusFilter,
    priority: priorityFilter,
  });

  const {
    data: createdTasksData,
    isLoading: createdTasksLoading,
    refetch: refetchCreatedTasks,
  } = useMyCreatedStaffTasks({
    search: searchTerm || undefined,
    status: statusFilter,
    priority: priorityFilter,
  });

  const {
    data: allTasksData,
    isLoading: allTasksLoading,
    refetch: refetchAllTasks,
  } = useStaffTasks({
    search: searchTerm || undefined,
    status: statusFilter,
    priority: priorityFilter,
  });

  const { data: archiveStats } = useArchiveStats();

  // Mutations
  const createTask = useCreateStaffTask();
  const updateTask = useUpdateStaffTask();

  // Get tasks based on active sub tab
  const getActiveTasks = () => {
    switch (activeSubTab) {
      case 'my-tasks':
        return myTasksData?.data || [];
      case 'created':
        return createdTasksData?.data || [];
      case 'all':
        return allTasksData?.data || [];
      default:
        return [];
    }
  };

  const tasks = getActiveTasks();
  const isLoading = activeSubTab === 'my-tasks' ? myTasksLoading :
                    activeSubTab === 'created' ? createdTasksLoading : allTasksLoading;

  // Calculate stats for my tasks
  const myStats = React.useMemo(() => {
    const myTasks = myTasksData?.data || [];
    const total = myTasks.length;
    const completed = myTasks.filter(t => t.status === 'completed').length;
    const inProgress = myTasks.filter(t => t.status === 'in_progress').length;
    const pending = myTasks.filter(t => t.status === 'pending').length;
    const overdue = myTasks.filter(t =>
      t.dueDate &&
      t.status !== 'completed' &&
      dayjs(t.dueDate).isBefore(dayjs(), 'day')
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, pending, overdue, completionRate };
  }, [myTasksData]);

  // Get unique users from tasks for assignment
  const uniqueUsers = React.useMemo(() => {
    const usersMap = new Map<string, { id: string; name: string }>();
    const allTasks = allTasksData?.data || [];

    allTasks.forEach(task => {
      if (task.createdBy) {
        const name = task.createdBy.profile?.firstName
          ? `${task.createdBy.profile.firstName} ${task.createdBy.profile.lastName || ''}`.trim()
          : task.createdBy.email.split('@')[0];
        usersMap.set(task.createdBy.id, { id: task.createdBy.id, name });
      }
      task.assignments?.forEach(a => {
        const name = a.assignedTo.profile?.firstName
          ? `${a.assignedTo.profile.firstName} ${a.assignedTo.profile.lastName || ''}`.trim()
          : a.assignedTo.email.split('@')[0];
        usersMap.set(a.assignedTo.id, { id: a.assignedTo.id, name });
      });
    });
    return Array.from(usersMap.values());
  }, [allTasksData]);

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
      refetchMyTasks();
      refetchCreatedTasks();
      refetchAllTasks();
    } catch (error) {
      message.error('Error al guardar la tarea');
    }
  };

  const handleFormCancel = () => {
    setIsFormModalVisible(false);
    setSelectedTask(null);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setDetailTaskId(null);
    refetchMyTasks();
    refetchCreatedTasks();
    refetchAllTasks();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter(undefined);
    setPriorityFilter(undefined);
  };

  const handleSubTabChange = (key: string) => {
    setActiveSubTab(key);
    clearFilters();
  };

  // Count active tasks (excluding old completed)
  const activeTasksCount = (myTasksData?.data || []).filter(t => t.status !== 'completed').length +
    (myTasksData?.data || []).filter(t => {
      if (t.status !== 'completed') return false;
      const completedAt = t.completedAt ? dayjs(t.completedAt) : null;
      if (!completedAt) return true;
      return completedAt.isAfter(dayjs().subtract(7, 'day'));
    }).length;

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
            Gestiona tus tareas y colabora con el equipo docente
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

      {/* My Progress Card */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={8}>
          <Card>
            <div className="text-center">
              <Progress
                type="circle"
                percent={myStats.completionRate}
                size={100}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#52c41a',
                }}
                format={percent => (
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{percent}%</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>Completado</div>
                  </div>
                )}
              />
              <Title level={5} style={{ marginTop: 12, marginBottom: 0 }}>Mi Progreso</Title>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{myStats.total}</div>
                  <Text type="secondary">Total</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{myStats.completed}</div>
                  <Text type="secondary">Completadas</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{myStats.inProgress}</div>
                  <Text type="secondary">En Progreso</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className="text-center">
                  <Badge count={myStats.overdue} offset={[10, 0]}>
                    <div className="text-2xl font-bold text-yellow-500">{myStats.pending}</div>
                  </Badge>
                  <Text type="secondary">Pendientes</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Main Tabs: Active / Archive */}
      <Tabs
        activeKey={mainView}
        onChange={(key) => setMainView(key as 'active' | 'archive')}
        className="mb-4"
        items={[
          {
            key: 'active',
            label: (
              <span>
                <UnorderedListOutlined className="mr-2" />
                Tareas Activas
                <Badge count={myStats.total - myStats.completed + myStats.completed} className="ml-2" style={{ backgroundColor: '#1890ff' }} />
              </span>
            ),
            children: (
              <>
                {/* Sub Tabs for active tasks */}
                <Tabs activeKey={activeSubTab} onChange={handleSubTabChange} className="mb-4" size="small">
                  <Tabs.TabPane
                    tab={
                      <span>
                        <UserOutlined />
                        Mis Tareas
                        <Badge count={myTasksData?.data?.length || 0} style={{ marginLeft: 8, backgroundColor: '#1890ff' }} />
                      </span>
                    }
                    key="my-tasks"
                  />
                  <Tabs.TabPane
                    tab={
                      <span>
                        <CalendarOutlined />
                        Creadas por Mi
                        <Badge count={createdTasksData?.data?.length || 0} style={{ marginLeft: 8, backgroundColor: '#52c41a' }} />
                      </span>
                    }
                    key="created"
                  />
                  <Tabs.TabPane
                    tab={
                      <span>
                        <TeamOutlined />
                        Todas
                      </span>
                    }
                    key="all"
                  />
                </Tabs>

                {/* Filters */}
                <Card className="mb-6">
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={8}>
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
                    <Col xs={24} sm={12} md={8}>
                      <Space>
                        <Button onClick={clearFilters} icon={<FilterOutlined />}>
                          Limpiar
                        </Button>
                        <Button
                          onClick={() => {
                            refetchMyTasks();
                            refetchCreatedTasks();
                            refetchAllTasks();
                          }}
                          icon={<ReloadOutlined />}
                        >
                          Actualizar
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* Tasks List */}
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Spin size="large" />
                  </div>
                ) : tasks.length > 0 ? (
                  <StaffTaskList
                    tasks={tasks}
                    onTaskClick={handleViewTask}
                    showCreator={activeSubTab !== 'created'}
                    loading={isLoading}
                  />
                ) : (
                  <Card>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        activeSubTab === 'my-tasks'
                          ? 'No tienes tareas asignadas'
                          : activeSubTab === 'created'
                          ? 'No has creado ninguna tarea'
                          : 'No se encontraron tareas'
                      }
                    >
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTask}>
                        Crear Tarea
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
          users={uniqueUsers.map(u => ({ id: u.id, email: u.name, profile: { firstName: u.name, lastName: '' } }))}
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

export default TeacherStaffTasksPage;
