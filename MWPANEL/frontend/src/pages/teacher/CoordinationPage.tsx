import React, { useState, useEffect } from 'react';
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
  Alert
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  BarChartOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { coordinationSheetsApi, CoordinationSheet, CoordinationStats } from '../../services/coordinationService';
import CoordinationSheetList from '../../components/coordination/CoordinationSheetList';
import CoordinationSheetModal from '../../components/coordination/CoordinationSheetModal';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const TeacherCoordinationPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isActive, setIsActive] = useState<boolean | undefined>(true); // Default to active for teachers
  const [permissionLevel, setPermissionLevel] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<CoordinationSheet | null>(null);

  // Query for coordination sheets
  const {
    data: sheets = [],
    isLoading: sheetsLoading,
    refetch: refetchSheets,
    error: sheetsError,
  } = useQuery({
    queryKey: ['coordination-sheets', searchTerm, isActive, permissionLevel, dateRange],
    queryFn: () => coordinationSheetsApi.getSheets({
      search: searchTerm || undefined,
      is_active: isActive,
      permission_level: permissionLevel as any,
      from_date: dateRange?.[0]?.format('YYYY-MM-DD'),
      to_date: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
    retry: 1,
    staleTime: 30000, // 30 segundos
    gcTime: 300000, // 5 minutos
    onError: (error) => {
      console.error('❌ TEACHER COORDINATION: Error loading sheets:', error);
      // No mostrar error al usuario para no bloquear navegación
    },
  });

  // Query for coordination statistics
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['coordination-stats'],
    queryFn: coordinationSheetsApi.getStats,
    retry: 1,
    staleTime: 60000, // 1 minuto
    gcTime: 300000, // 5 minutos
    onError: (error) => {
      console.error('❌ TEACHER COORDINATION: Error loading stats:', error);
      // No mostrar error al usuario para no bloquear navegación
    },
  });

  const handleCreateSheet = () => {
    setSelectedSheet(null);
    setIsModalVisible(true);
  };

  const handleEditSheet = (sheet: CoordinationSheet) => {
    // Check if user can edit this sheet
    if (!canEditSheet(sheet)) {
      message.warning('No tienes permisos para editar esta hoja de coordinación');
      return;
    }
    setSelectedSheet(sheet);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedSheet(null);
    refetchSheets();
  };

  const handleDeleteSheet = async (id: string) => {
    const sheet = sheets.find(s => s.id === id);
    if (!sheet || !canDeleteSheet(sheet)) {
      message.warning('No tienes permisos para eliminar esta hoja de coordinación');
      return;
    }

    try {
      await coordinationSheetsApi.deleteSheet(id);
      message.success('Hoja de coordinación eliminada exitosamente');
      refetchSheets();
    } catch (error) {
      message.error('Error al eliminar la hoja de coordinación');
    }
  };

  const handleToggleActive = async (id: string) => {
    const sheet = sheets.find(s => s.id === id);
    if (!sheet || !canEditSheet(sheet)) {
      message.warning('No tienes permisos para modificar esta hoja de coordinación');
      return;
    }

    try {
      await coordinationSheetsApi.toggleActive(id);
      message.success('Estado actualizado exitosamente');
      refetchSheets();
    } catch (error) {
      message.error('Error al actualizar el estado');
    }
  };

  const canEditSheet = (sheet: CoordinationSheet): boolean => {
    if (!user) return false;
    
    // If not editable, only creators can edit
    if (!sheet.is_editable && sheet.created_by?.id !== user.id) return false;
    
    // If readonly, nobody except admin can edit (admin handled in backend)
    if (sheet.permission_level === 'readonly') return false;
    
    // If open, everyone can edit
    if (sheet.permission_level === 'open') return true;
    
    // If restricted, only allowed editors or creator can edit
    if (sheet.permission_level === 'restricted') {
      return sheet.allowed_editors?.includes(user.id) || sheet.created_by?.id === user.id;
    }
    
    return false;
  };

  const canDeleteSheet = (sheet: CoordinationSheet): boolean => {
    if (!user) return false;
    // Only creator can delete (admin can always delete, handled in backend)
    return sheet.created_by?.id === user.id;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setIsActive(true); // Reset to active for teachers
    setPermissionLevel(undefined);
    setDateRange(null);
  };

  // Filter sheets to show upcoming meetings first
  const sortedSheets = [...sheets].sort((a, b) => {
    const dateA = dayjs(a.meeting_date);
    const dateB = dayjs(b.meeting_date);
    const now = dayjs();
    
    // Upcoming meetings first, then past meetings
    const aIsFuture = dateA.isAfter(now);
    const bIsFuture = dateB.isAfter(now);
    
    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;
    
    // Both future or both past, sort by date
    return aIsFuture ? dateA.diff(now) : dateB.diff(dateA);
  });

  // Error fallback para evitar bloqueo de navegación
  if (sheetsError && statsError) {
    console.warn('⚠️ TEACHER COORDINATION: Ambas APIs fallaron, mostrando interfaz limitada');
    return (
      <div className="p-6">
        <div className="mb-6">
          <Title level={2} className="mb-2">
            <FileTextOutlined className="mr-2" />
            Reuniones Claustro
          </Title>
          <Alert
            message="Servicio temporalmente no disponible"
            description="El sistema de coordinación presenta problemas. Puedes navegar a otras secciones mientras se resuelve."
            type="warning"
            showIcon
            className="mb-4"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Title level={2} className="mb-2">
            <FileTextOutlined className="mr-2" />
            Reuniones Claustro
          </Title>
          <Text type="secondary">
            Consulta y gestiona los acuerdos de las reuniones de claustro
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateSheet}
          size="large"
        >
          Nueva Hoja de Coordinación
        </Button>
      </div>

      {/* Info Alert for Teachers */}
      <Alert
        message="Información para Profesores"
        description="Puedes crear nuevas hojas de coordinación, editar las que tienes permisos y completar los items asignados. Los permisos de edición pueden estar restringidos por el administrador."
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        className="mb-6"
        closable
      />

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="mb-6 flex justify-center">
          <Spin size="large" />
        </div>
      ) : stats ? (
        <Row gutter={16} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Hojas Activas"
                value={stats.active_sheets}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
                suffix={`/ ${stats.total_sheets}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Items Completados"
                value={stats.completed_items}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
                suffix={`/ ${stats.total_items}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Items Pendientes"
                value={stats.pending_items}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Items Vencidos"
                value={stats.overdue_items}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      ) : null}

      {/* Quick Actions for Teachers */}
      {stats && stats.overdue_items > 0 && (
        <Alert
          message={`Tienes ${stats.overdue_items} item(s) vencido(s)`}
          description="Revisa los items vencidos y marca como completados los que hayas terminado."
          type="warning"
          showIcon
          className="mb-6"
          action={
            <Button size="small" danger onClick={() => setSearchTerm('vencido')}>
              Ver Items Vencidos
            </Button>
          }
        />
      )}

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Buscar hojas..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Estado"
              value={isActive}
              onChange={setIsActive}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value={true}>Activa</Select.Option>
              <Select.Option value={false}>Inactiva</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Permisos"
              value={permissionLevel}
              onChange={setPermissionLevel}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="open">Abierto</Select.Option>
              <Select.Option value="restricted">Restringido</Select.Option>
              <Select.Option value="readonly">Solo lectura</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              placeholder={['Fecha desde', 'Fecha hasta']}
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button onClick={clearFilters} style={{ width: '100%' }}>
              Limpiar Filtros
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Sheets List */}
      {sheetsLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : sortedSheets.length > 0 ? (
        <CoordinationSheetList
          sheets={sortedSheets}
          onEdit={handleEditSheet}
          onDelete={handleDeleteSheet}
          onToggleActive={handleToggleActive}
          canEdit={canEditSheet}
          canDelete={canDeleteSheet}
          userRole="teacher"
        />
      ) : (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No se encontraron hojas de coordinación"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateSheet}>
              Crear Primera Hoja
            </Button>
          </Empty>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <CoordinationSheetModal
        visible={isModalVisible}
        sheet={selectedSheet}
        onClose={handleModalClose}
        userRole="teacher"
      />
    </div>
  );
};

export default TeacherCoordinationPage;