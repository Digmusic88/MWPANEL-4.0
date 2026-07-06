import React, { useState } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Space,
  Progress,
  Typography,
  Tooltip,
  Popconfirm,
  Badge,
  Avatar,
  Dropdown,
  MenuProps,
  Switch,
  Row,
  Col,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  CalendarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  UserOutlined,
  AppstoreOutlined,
  BarsOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CoordinationSheet } from '../../services/coordinationService';
import CoordinationItemsFullscreen from './CoordinationItemsFullscreen';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

interface CoordinationSheetListProps {
  sheets: CoordinationSheet[];
  onEdit: (sheet: CoordinationSheet) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  canEdit?: (sheet: CoordinationSheet) => boolean;
  canDelete?: (sheet: CoordinationSheet) => boolean;
  userRole?: 'admin' | 'teacher';
}

const CoordinationSheetList: React.FC<CoordinationSheetListProps> = ({
  sheets,
  onEdit,
  onDelete,
  onToggleActive,
  canEdit = () => true,
  canDelete = () => true,
  userRole = 'admin',
}) => {
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // Cambio a lista por defecto

  const getPermissionIcon = (permissionLevel: string) => {
    switch (permissionLevel) {
      case 'open':
        return <UnlockOutlined style={{ color: '#52c41a' }} />;
      case 'restricted':
        return <TeamOutlined style={{ color: '#faad14' }} />;
      case 'readonly':
        return <LockOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <UnlockOutlined />;
    }
  };

  const getPermissionText = (permissionLevel: string) => {
    switch (permissionLevel) {
      case 'open':
        return 'Abierto';
      case 'restricted':
        return 'Restringido';
      case 'readonly':
        return 'Solo lectura';
      default:
        return 'Abierto';
    }
  };

  const getPermissionColor = (permissionLevel: string) => {
    switch (permissionLevel) {
      case 'open':
        return 'green';
      case 'restricted':
        return 'orange';
      case 'readonly':
        return 'red';
      default:
        return 'blue';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#52c41a';
    if (percentage >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const getMeetingDateStatus = (meetingDate: string) => {
    const date = dayjs(meetingDate);
    const now = dayjs();
    const diff = date.diff(now, 'day');

    if (diff < 0) {
      return { text: 'Pasada', color: 'default' };
    } else if (diff === 0) {
      return { text: 'Hoy', color: 'blue' };
    } else if (diff <= 7) {
      return { text: 'Esta semana', color: 'orange' };
    } else {
      return { text: 'Próxima', color: 'green' };
    }
  };

  const handleViewItems = (sheet: CoordinationSheet) => {
    setSelectedSheetId(sheet.id);
    setFullscreenVisible(true);
  };

  const getActionMenu = (sheet: CoordinationSheet): MenuProps => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        label: 'Ver Items (Pantalla Completa)',
        icon: <ExpandOutlined />,
        onClick: () => handleViewItems(sheet),
      },
    ];

    if (canEdit(sheet)) {
      items.push({
        key: 'edit',
        label: 'Editar',
        icon: <EditOutlined />,
        onClick: () => onEdit(sheet),
      });
      
      items.push({
        key: 'toggle',
        label: sheet.is_active ? 'Desactivar' : 'Activar',
        icon: sheet.is_active ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
        onClick: () => onToggleActive(sheet.id),
      });
    }

    if (canDelete(sheet)) {
      items.push({
        type: 'divider',
      });
      items.push({
        key: 'delete',
        label: 'Eliminar',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => onDelete(sheet.id),
      });
    }

    return { items };
  };

  const renderListItem = (sheet: CoordinationSheet) => {
    const meetingStatus = getMeetingDateStatus(sheet.meeting_date);
    const canEditSheet = canEdit(sheet);
    const canDeleteSheet = canDelete(sheet);

    return (
      <List.Item
        key={sheet.id}
        className={`${!sheet.is_active ? 'opacity-75' : ''} hover:bg-gray-50 transition-colors duration-200`}
        actions={[
          <Button
            key="view"
            type="primary"
            icon={<ExpandOutlined />}
            onClick={() => handleViewItems(sheet)}
            size="small"
          >
            Vista Completa
          </Button>,
          canEditSheet && (
            <Button
              key="edit"
              icon={<EditOutlined />}
              onClick={() => onEdit(sheet)}
              size="small"
            >
              Editar
            </Button>
          ),
          canDeleteSheet && (
            <Popconfirm
              key="delete"
              title="¿Eliminar hoja?"
              description="Esta acción no se puede deshacer"
              onConfirm={() => onDelete(sheet.id)}
              okText="Eliminar"
              cancelText="Cancelar"
              okType="danger"
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Popconfirm>
          ),
          <Dropdown key="more" menu={getActionMenu(sheet)} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>,
        ].filter(Boolean)}
      >
        <List.Item.Meta
          avatar={
            <Avatar size="large" icon={<CalendarOutlined />} style={{ backgroundColor: '#1890ff' }} />
          }
          title={
            <div className="flex items-center space-x-2 flex-wrap">
              <Tooltip title={sheet.title}>
                <Title level={5} className="mb-0 flex-1 min-w-0" style={{ margin: 0 }}>
                  {sheet.title}
                </Title>
              </Tooltip>
              
              {/* Tags en línea, sin overlap */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Tag color={meetingStatus.color} className="mb-0">
                  {meetingStatus.text}
                </Tag>
                
                <Tag color={getPermissionColor(sheet.permission_level)} className="mb-0">
                  {getPermissionIcon(sheet.permission_level)}
                  <span className="ml-1">{getPermissionText(sheet.permission_level)}</span>
                </Tag>
                
                {!sheet.is_active && (
                  <Tag color="default" className="mb-0">
                    Inactiva
                  </Tag>
                )}
              </div>
            </div>
          }
          description={
            <div className="space-y-2">
              {/* Fecha y descripción */}
              <div className="flex items-center text-sm text-gray-600">
                <CalendarOutlined className="mr-2" />
                <span>{dayjs(sheet.meeting_date).format('DD/MM/YYYY')}</span>
                <span className="ml-2 text-gray-500">
                  ({dayjs(sheet.meeting_date).fromNow()})
                </span>
              </div>
              
              {sheet.description && (
                <Text type="secondary" className="block text-sm" ellipsis={{ rows: 1 }}>
                  {sheet.description}
                </Text>
              )}
              
              {/* Progreso y estadísticas en una línea */}
              <Row gutter={16} align="middle">
                <Col flex="1">
                  <div className="flex items-center space-x-2">
                    <Text strong className="text-sm">Progreso:</Text>
                    <Progress
                      percent={sheet.progress_percentage}
                      strokeColor={getProgressColor(sheet.progress_percentage)}
                      size="small"
                      className="flex-1"
                      format={(percent) => `${percent}%`}
                    />
                  </div>
                </Col>
                <Col>
                  <Space size="large" className="text-sm">
                    <span>
                      <Text type="secondary">Total:</Text> 
                      <Text strong className="ml-1 text-blue-600">{sheet.total_items || 0}</Text>
                    </span>
                    <span>
                      <Text type="secondary">Completados:</Text> 
                      <Text strong className="ml-1 text-green-600">{sheet.completed_items || 0}</Text>
                    </span>
                    <span>
                      <Text type="secondary">Vencidos:</Text> 
                      <Text strong className="ml-1 text-red-600">{sheet.overdue_items || 0}</Text>
                    </span>
                  </Space>
                </Col>
              </Row>
              
              {/* Creador */}
              <div className="flex items-center text-xs text-gray-500">
                <UserOutlined className="mr-1" />
                <span>
                  Creado por {sheet.created_by?.profile?.firstName || 'Usuario'} {sheet.created_by?.profile?.lastName || ''}
                  el {dayjs(sheet.created_at).format('DD/MM/YYYY')}
                </span>
              </div>
            </div>
          }
        />
      </List.Item>
    );
  };

  const renderCardItem = (sheet: CoordinationSheet) => {
    const meetingStatus = getMeetingDateStatus(sheet.meeting_date);
    const canEditSheet = canEdit(sheet);
    const canDeleteSheet = canDelete(sheet);

    return (
      <List.Item key={sheet.id}>
        <Card
          hoverable
          className={`h-full ${!sheet.is_active ? 'opacity-75' : ''}`}
          title={
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0 pr-4">
                <Tooltip title={sheet.title}>
                  <Title level={5} className="mb-0 truncate">
                    {sheet.title}
                  </Title>
                </Tooltip>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Tag color={meetingStatus.color} className="mb-0">
                  {meetingStatus.text}
                </Tag>
                <Dropdown menu={getActionMenu(sheet)} trigger={['click']}>
                  <Button type="text" icon={<MoreOutlined />} size="small" />
                </Dropdown>
              </div>
            </div>
          }
          extra={
            !sheet.is_active && (
              <Tag color="default">Inactiva</Tag>
            )
          }
        >
          {/* Meeting Date */}
          <div className="flex items-center mb-3">
            <CalendarOutlined className="mr-2 text-blue-500" />
            <Text>{dayjs(sheet.meeting_date).format('DD/MM/YYYY')}</Text>
            <Text type="secondary" className="ml-2">
              ({dayjs(sheet.meeting_date).fromNow()})
            </Text>
          </div>

          {/* Description */}
          {sheet.description && (
            <Text type="secondary" className="block mb-3" ellipsis={{ rows: 2 }}>
              {sheet.description}
            </Text>
          )}

          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <Text strong>Progreso</Text>
              <Text>{sheet.progress_percentage}%</Text>
            </div>
            <Progress
              percent={sheet.progress_percentage}
              strokeColor={getProgressColor(sheet.progress_percentage)}
              size="small"
              showInfo={false}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div>
              <div className="text-lg font-semibold text-blue-500">
                {sheet.total_items || 0}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-500">
                {sheet.completed_items || 0}
              </div>
              <div className="text-xs text-gray-500">Completados</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-500">
                {sheet.overdue_items || 0}
              </div>
              <div className="text-xs text-gray-500">Vencidos</div>
            </div>
          </div>

          {/* Permission Level */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              {getPermissionIcon(sheet.permission_level)}
              <Text className="ml-2">{getPermissionText(sheet.permission_level)}</Text>
            </div>
            <Tag color={getPermissionColor(sheet.permission_level)}>
              {sheet.permission_level}
            </Tag>
          </div>

          {/* Creator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Avatar size="small" icon={<UserOutlined />} />
              <div className="ml-2">
                <Text className="text-xs">
                  {sheet.created_by?.profile?.firstName || 'Usuario'} {sheet.created_by?.profile?.lastName || ''}
                </Text>
                <div className="text-xs text-gray-500">
                  {dayjs(sheet.created_at).format('DD/MM/YYYY')}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-between">
            <Button
              type="primary"
              icon={<ExpandOutlined />}
              onClick={() => handleViewItems(sheet)}
              size="small"
            >
              Vista Completa
            </Button>

            <Space>
              {canEditSheet && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => onEdit(sheet)}
                  size="small"
                >
                  Editar
                </Button>
              )}
              
              {canDeleteSheet && (
                <Popconfirm
                  title="¿Eliminar hoja?"
                  description="Esta acción no se puede deshacer"
                  onConfirm={() => onDelete(sheet.id)}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okType="danger"
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                  />
                </Popconfirm>
              )}
            </Space>
          </div>
        </Card>
      </List.Item>
    );
  };

  return (
    <>
      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <Space>
          <Text>Vista:</Text>
          <Button.Group>
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              icon={<BarsOutlined />}
              onClick={() => setViewMode('list')}
              size="small"
            >
              Lista
            </Button>
            <Button
              type={viewMode === 'grid' ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode('grid')}
              size="small"
            >
              Tarjetas
            </Button>
          </Button.Group>
        </Space>
      </div>

      {/* List Content */}
      <List
        grid={viewMode === 'grid' ? { 
          gutter: 16, 
          xs: 1, 
          sm: 1, 
          md: 2, 
          lg: 2, 
          xl: 3, 
          xxl: 4 
        } : false}
        dataSource={sheets}
        renderItem={viewMode === 'list' ? renderListItem : renderCardItem}
        pagination={{
          pageSize: viewMode === 'list' ? 10 : 8,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} hojas`,
        }}
      />

      {/* Items Fullscreen */}
      <CoordinationItemsFullscreen
        visible={fullscreenVisible}
        sheetId={selectedSheetId}
        onClose={() => {
          setFullscreenVisible(false);
          setSelectedSheetId(null);
        }}
        userRole={userRole}
      />
    </>
  );
};

export default CoordinationSheetList;