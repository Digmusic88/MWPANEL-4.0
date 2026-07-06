/**
 * @archivo: TeacherStaffMeetingsPage.tsx
 * @modulo: Staff (Claustro) - Teacher
 * @funcion: Pagina de reuniones del claustro para profesores
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
  List,
  Space,
  Timeline,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  FilterOutlined,
  ReloadOutlined,
  UserOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useStaffMeetings,
  useStaffMeetingStats,
  useUpcomingStaffMeetings,
  useCreateStaffMeeting,
  useUpdateStaffMeeting,
} from '@/hooks/useStaffMeetings';
import { useStaffUsers } from '@/hooks/useStaffDashboard';
import { StaffMeetingCard, StaffMeetingForm, StaffMeetingDetail } from '@/components/staff';
import type { StaffMeeting, StaffMeetingStatus, CreateStaffMeetingDto, UpdateStaffMeetingDto } from '@/types/staff';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TeacherStaffMeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffMeetingStatus | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [pendingCloseOnly, setPendingCloseOnly] = useState(false);
  const { data: meetingStats } = useStaffMeetingStats();

  // State for modals
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<StaffMeeting | null>(null);
  const [detailMeetingId, setDetailMeetingId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Queries
  const {
    data: allMeetingsData,
    isLoading: allMeetingsLoading,
    refetch: refetchMeetings,
  } = useStaffMeetings({
    search: searchTerm || undefined,
    status: statusFilter,
    archived: activeTab,
    pendingClose: pendingCloseOnly || undefined,
    sortOrder: activeTab === 'archived' ? 'DESC' : 'ASC',
    limit: 50,
  });

  const {
    data: upcomingMeetings,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
  } = useUpcomingStaffMeetings();

  // Mutations
  const createMeeting = useCreateStaffMeeting();
  const updateMeeting = useUpdateStaffMeeting();

  // Get all staff users for the form
  const { data: staffUsers, isLoading: usersLoading } = useStaffUsers();

  const allMeetings = allMeetingsData?.data || [];

  // Transform staff users for the form
  const formUsers = React.useMemo(() => {
    if (!staffUsers) return [];
    return staffUsers.map(user => ({
      id: user.id,
      email: user.email,
      profile: user.profile,
    }));
  }, [staffUsers]);

  const meetings = allMeetings;
  const isLoading = allMeetingsLoading;

  // Handlers
  const handleCreateMeeting = () => {
    setSelectedMeeting(null);
    setIsFormModalVisible(true);
  };

  const handleEditMeeting = (meeting: StaffMeeting) => {
    setSelectedMeeting(meeting);
    setIsFormModalVisible(true);
    setIsDetailOpen(false);
  };

  const handleViewMeeting = (meeting: StaffMeeting) => {
    setDetailMeetingId(meeting.id);
    setIsDetailOpen(true);
  };

  const handleFormSubmit = async (values: CreateStaffMeetingDto | UpdateStaffMeetingDto) => {
    try {
      if (selectedMeeting) {
        await updateMeeting.mutateAsync({ id: selectedMeeting.id, data: values as UpdateStaffMeetingDto });
        message.success('Reunion actualizada exitosamente');
      } else {
        await createMeeting.mutateAsync(values as CreateStaffMeetingDto);
        message.success('Reunion creada exitosamente');
      }
      setIsFormModalVisible(false);
      setSelectedMeeting(null);
      refetchMeetings();
      refetchUpcoming();
    } catch (error) {
      message.error('Error al guardar la reunion');
    }
  };

  const handleFormCancel = () => {
    setIsFormModalVisible(false);
    setSelectedMeeting(null);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setDetailMeetingId(null);
    refetchMeetings();
    refetchUpcoming();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter(undefined);
    setPendingCloseOnly(false);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'active' | 'archived');
    clearFilters();
  };

  // Stats
  const myMeetingsCount = allMeetings.filter(m =>
    m.createdById === currentUserId || m.attendees?.some(a => a.id === currentUserId)
  ).length;

  // "Próxima" = la siguiente reunión que aún NO ha empezado (futura). findUpcoming
  // incluye también las activas ya vencidas (pendientes de cierre), que no son próximas;
  // la lista llega ordenada ascendente, así que la primera futura es la próxima real.
  const futureMeetings = (upcomingMeetings || []).filter(m => dayjs(m.scheduledDate).isAfter(dayjs()));
  const nextMeeting = futureMeetings[0];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} className="mb-2">
            <CalendarOutlined className="mr-2" />
            Reuniones del Claustro
          </Title>
          <Text type="secondary">
            Consulta y participa en las reuniones del equipo docente
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateMeeting}
          size="large"
        >
          Nueva Reunion
        </Button>
      </div>

      {/* Quick Stats */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={6}>
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">{futureMeetings.length}</div>
              <Text type="secondary">Proximas Reuniones</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{myMeetingsCount}</div>
              <Text type="secondary">Mis Reuniones</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-500">{allMeetings.length}</div>
              <Text type="secondary">Total Reuniones</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card hoverable onClick={() => { setActiveTab('active'); setPendingCloseOnly(true); }} style={{ cursor: 'pointer' }}>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: '#fa8c16' }}>{meetingStats?.pendingClose ?? 0}</div>
              <Text type="secondary">Pendientes de cierre</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Next Meeting Alert — solo la próxima reunión futura */}
      {nextMeeting && (
        <Alert
          message={
            <Space>
              <ClockCircleOutlined />
              <span>Proxima reunion:</span>
              <Text strong>{nextMeeting.title}</Text>
              <span>-</span>
              <Text>{dayjs(nextMeeting.scheduledDate).format('DD/MM/YYYY [a las] HH:mm')}</Text>
            </Space>
          }
          type="info"
          showIcon
          className="mb-6"
          action={
            <Button size="small" onClick={() => handleViewMeeting(nextMeeting)}>
              Ver Detalles
            </Button>
          }
        />
      )}

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={handleTabChange} className="mb-4">
        <TabPane
          tab={
            <span>
              <ClockCircleOutlined />
              Activas
            </span>
          }
          key="active"
        />
        <TabPane
          tab={
            <span>
              <HistoryOutlined />
              Archivadas
            </span>
          }
          key="archived"
        />
      </Tabs>

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Buscar reuniones..."
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
              <Select.Option value="scheduled">
                <Tag color="blue">Programada</Tag>
              </Select.Option>
              <Select.Option value="in_progress">
                <Tag color="processing">En curso</Tag>
              </Select.Option>
              <Select.Option value="completed">
                <Tag color="green">Completada</Tag>
              </Select.Option>
              <Select.Option value="cancelled">
                <Tag color="red">Cancelada</Tag>
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
                  refetchMeetings();
                  refetchUpcoming();
                }}
                icon={<ReloadOutlined />}
              >
                Actualizar
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Meetings Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : meetings.length > 0 ? (
        <Row gutter={[16, 16]}>
          {meetings.map(meeting => (
            <Col xs={24} sm={12} lg={8} xl={6} key={meeting.id}>
              <StaffMeetingCard
                meeting={meeting}
                onClick={() => handleViewMeeting(meeting)}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              activeTab === 'archived'
                ? 'No hay reuniones archivadas'
                : 'No hay reuniones activas'
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateMeeting}>
              Crear Reunion
            </Button>
          </Empty>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={selectedMeeting ? 'Editar Reunion' : 'Nueva Reunion'}
        open={isFormModalVisible}
        onCancel={handleFormCancel}
        footer={null}
        width={700}
        destroyOnClose
      >
        <StaffMeetingForm
          meeting={selectedMeeting || undefined}
          users={formUsers}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          loading={createMeeting.isPending || updateMeeting.isPending || usersLoading}
        />
      </Modal>

      {/* Meeting Detail Drawer */}
      <StaffMeetingDetail
        meetingId={detailMeetingId}
        open={isDetailOpen}
        onClose={handleDetailClose}
        onEdit={handleEditMeeting}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default TeacherStaffMeetingsPage;
