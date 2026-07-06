/**
 * @archivo: StaffMeetingsPage.tsx
 * @modulo: Staff (Claustro) - Admin
 * @funcion: Pagina de gestion de reuniones del claustro para administradores
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
  Calendar,
  Badge,
  List,
  Tabs,
  Pagination,
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
  UnorderedListOutlined,
  AppstoreOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  useStaffMeetings,
  useStaffMeetingStats,
  useUpcomingStaffMeetings,
  useCreateStaffMeeting,
  useUpdateStaffMeeting,
  useUpdateStaffMeetingStatus,
  useDeleteStaffMeeting,
} from '@/hooks/useStaffMeetings';
import { useStaffDashboardStats, useStaffUsers } from '@/hooks/useStaffDashboard';
import { StaffMeetingCard, StaffMeetingForm, StaffMeetingDetail } from '@/components/staff';
import type { StaffMeeting, StaffMeetingStatus, CreateStaffMeetingDto, UpdateStaffMeetingDto } from '@/types/staff';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const StaffMeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffMeetingStatus | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [archivedTab, setArchivedTab] = useState<'active' | 'archived'>('active');
  const [pendingCloseOnly, setPendingCloseOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Reset pagination when filters change
  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, dateRange]);

  // State for modals
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<StaffMeeting | null>(null);
  const [detailMeetingId, setDetailMeetingId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Queries
  const {
    data: meetingsData,
    isLoading: meetingsLoading,
    refetch: refetchMeetings,
    error: meetingsError,
  } = useStaffMeetings({
    search: searchTerm || undefined,
    status: statusFilter,
    archived: archivedTab,
    pendingClose: pendingCloseOnly || undefined,
    scheduledDateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
    scheduledDateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
    page,
    limit: pageSize,
    sortOrder: archivedTab === 'archived' ? 'DESC' : 'ASC',
  });

  const { data: upcomingMeetings, isLoading: upcomingLoading } = useUpcomingStaffMeetings();
  // "Próximas" = solo reuniones futuras. findUpcoming incluye también las activas
  // vencidas (pendientes de cierre), que se muestran aparte y no son "próximas".
  const futureMeetings = (upcomingMeetings || []).filter(m => new Date(m.scheduledDate).getTime() > Date.now());
  const { data: stats, isLoading: statsLoading } = useStaffDashboardStats();
  const { data: meetingStats } = useStaffMeetingStats();
  const { data: staffUsers, isLoading: usersLoading } = useStaffUsers();

  // Mutations
  const createMeeting = useCreateStaffMeeting();
  const updateMeeting = useUpdateStaffMeeting();
  const deleteMeeting = useDeleteStaffMeeting();
  const updateStatus = useUpdateStaffMeetingStatus();

  const meetings = meetingsData?.data || [];

  // Transform staff users for the form
  const formUsers = React.useMemo(() => {
    if (!staffUsers) return [];
    return staffUsers.map(user => ({
      id: user.id,
      email: user.email,
      profile: user.profile,
    }));
  }, [staffUsers]);

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
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter(undefined);
    setDateRange(null);
    setPage(1);
    setPendingCloseOnly(false);
  };

  const handleTabChange = (key: string) => {
    setArchivedTab(key as 'active' | 'archived');
    setPendingCloseOnly(false);
    setPage(1);
  };

  // Calendar cell renderer
  const dateCellRender = (value: Dayjs) => {
    const dayMeetings = meetings.filter(
      m => dayjs(m.scheduledDate).format('YYYY-MM-DD') === value.format('YYYY-MM-DD')
    );

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayMeetings.slice(0, 3).map(meeting => (
          <li key={meeting.id}>
            <Badge
              status={
                meeting.status === 'completed' ? 'success' :
                meeting.status === 'cancelled' ? 'error' :
                meeting.status === 'in_progress' ? 'processing' : 'default'
              }
              text={
                <Text
                  ellipsis
                  style={{ fontSize: '11px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewMeeting(meeting);
                  }}
                >
                  {meeting.title}
                </Text>
              }
            />
          </li>
        ))}
        {dayMeetings.length > 3 && (
          <li>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              +{dayMeetings.length - 3} mas
            </Text>
          </li>
        )}
      </ul>
    );
  };

  if (meetingsError) {
    return (
      <div className="p-6">
        <Alert
          message="Error al cargar las reuniones"
          description="Ocurrio un error al cargar las reuniones. Por favor, intente de nuevo."
          type="error"
          showIcon
          action={
            <Button onClick={() => refetchMeetings()} icon={<ReloadOutlined />}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

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
            Gestiona las reuniones del equipo docente y sus agendas
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

      {/* Statistics Cards (clicables) */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => { setPendingCloseOnly(false); setStatusFilter(undefined); setArchivedTab('active'); setPage(1); }} style={{ cursor: 'pointer' }}>
            <Statistic title="Activas" value={meetingStats?.scheduled ?? 0} prefix={<CalendarOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => { setPendingCloseOnly(false); setStatusFilter(undefined); setArchivedTab('active'); setPage(1); }} style={{ cursor: 'pointer' }}>
            <Statistic title="En curso" value={meetingStats?.inProgress ?? 0} prefix={<SyncOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => { setArchivedTab('active'); setStatusFilter(undefined); setPendingCloseOnly(true); setPage(1); }} style={{ cursor: 'pointer' }}>
            <Statistic title="Pendientes de cierre" value={meetingStats?.pendingClose ?? 0} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => { setPendingCloseOnly(false); setStatusFilter(undefined); setArchivedTab('archived'); setPage(1); }} style={{ cursor: 'pointer' }}>
            <Statistic title="Archivadas" value={(meetingStats?.completed ?? 0) + (meetingStats?.cancelled ?? 0)} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#8c8c8c' }} />
          </Card>
        </Col>
      </Row>

      {/* Upcoming Meetings */}
      {!upcomingLoading && futureMeetings.length > 0 && (
        <Card title="Proximas Reuniones" className="mb-6" size="small">
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={futureMeetings.slice(0, 4)}
            renderItem={meeting => (
              <List.Item>
                <StaffMeetingCard
                  meeting={meeting}
                  onClick={() => handleViewMeeting(meeting)}
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Active / Archived tabs */}
      <Tabs
        activeKey={archivedTab}
        onChange={handleTabChange}
        className="mb-4"
        items={[
          { key: 'active', label: 'Activas' },
          { key: 'archived', label: 'Archivadas' },
        ]}
      />

      {/* Indicador de filtro "Pendientes de cierre" activo */}
      {pendingCloseOnly && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Mostrando solo reuniones pendientes de cierre"
          description="Las reuniones que aún no han terminado no aparecen aquí. Quita el filtro para ver todas las activas."
          action={
            <Button size="small" onClick={() => setPendingCloseOnly(false)}>
              Ver todas las activas
            </Button>
          }
        />
      )}

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
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
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              placeholder={['Desde', 'Hasta']}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Button onClick={clearFilters} icon={<FilterOutlined />}>
                Limpiar
              </Button>
              <Button onClick={() => refetchMeetings()} icon={<ReloadOutlined />}>
                Actualizar
              </Button>
              <Button
                icon={<AppstoreOutlined />}
                type={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
              />
              <Button
                icon={<CalendarOutlined />}
                type={viewMode === 'calendar' ? 'primary' : 'default'}
                onClick={() => setViewMode('calendar')}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Meetings Grid/Calendar */}
      {meetingsLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : viewMode === 'calendar' ? (
        <Card>
          <Calendar cellRender={dateCellRender} />
        </Card>
      ) : meetings.length > 0 ? (
        <Row gutter={[16, 16]}>
          {meetings.map(meeting => (
            <Col xs={24} sm={12} lg={8} xl={6} key={meeting.id}>
              {pendingCloseOnly && (
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  style={{ marginBottom: 8 }}
                  loading={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: meeting.id, status: 'completed' })}
                >
                  Cerrar
                </Button>
              )}
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
            description="No se encontraron reuniones"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateMeeting}>
              Crear Primera Reunion
            </Button>
          </Empty>
        </Card>
      )}

      {/* Pagination */}
      {viewMode === 'grid' && meetingsData?.meta && meetingsData.meta.total > pageSize && (
        <div className="mt-6 flex justify-center">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={meetingsData.meta.total}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
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

export default StaffMeetingsPage;
