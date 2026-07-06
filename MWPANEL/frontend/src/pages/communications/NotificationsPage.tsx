import React, { useState, useEffect } from 'react';
import { formatDateToMadrid, formatTimeOnlyToMadrid, formatDateOnlyToMadrid } from '../../utils/dateUtils';
import {
  Card,
  List,
  Avatar,
  Typography,
  Button,
  Space,
  Tag,
  Empty,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Tooltip,
} from 'antd';
import {
  BellOutlined,
  MessageOutlined,
  BookOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckOutlined,
  DeleteOutlined,
  SettingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import apiClient from '../../services/apiClient';

const { Title, Text } = Typography;

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'evaluation' | 'message' | 'announcement' | 'academic' | 'attendance' | 'reminder' | 'system';
  status: 'unread' | 'read' | 'dismissed';
  triggeredBy?: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  relatedStudent?: {
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  relatedGroup?: {
    name: string;
  };
  actionUrl?: string;
  readAt?: string;
  dismissedAt?: string;
  createdAt: string;
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: undefined,
    status: undefined,
  });
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
    dismissed: 0,
  });

  useEffect(() => {
    fetchNotifications();
  }, [filters]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);

      const response = await apiClient.get(`/communications/notifications?${params.toString()}`);
      const notificationsData = response.data;
      setNotifications(notificationsData);

      // Calcular estadísticas
      const total = notificationsData.length;
      const unread = notificationsData.filter((n: Notification) => n.status === 'unread').length;
      const read = notificationsData.filter((n: Notification) => n.status === 'read').length;
      const dismissed = notificationsData.filter((n: Notification) => n.status === 'dismissed').length;

      setStats({ total, unread, read, dismissed });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      message.error('Error al cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/communications/notifications/${notificationId}`, {
        status: 'read',
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      message.error('Error al marcar como leída');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post('/communications/notifications/mark-all-read');
      message.success('Todas las notificaciones marcadas como leídas');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      message.error('Error al marcar todas como leídas');
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      await apiClient.patch(`/communications/notifications/${notificationId}`, {
        status: 'dismissed',
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error dismissing notification:', error);
      message.error('Error al descartar la notificación');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'evaluation': return <BookOutlined style={{ color: '#1890ff' }} />;
      case 'message': return <MessageOutlined style={{ color: '#52c41a' }} />;
      case 'announcement': return <BellOutlined style={{ color: '#faad14' }} />;
      case 'academic': return <CalendarOutlined style={{ color: '#722ed1' }} />;
      case 'attendance': return <UserOutlined style={{ color: '#f5222d' }} />;
      case 'reminder': return <BellOutlined style={{ color: '#fa8c16' }} />;
      case 'system': return <SettingOutlined style={{ color: '#13c2c2' }} />;
      default: return <BellOutlined />;
    }
  };

  const getNotificationTypeTag = (type: string) => {
    const configs = {
      evaluation: { color: 'blue', text: 'Evaluación' },
      message: { color: 'green', text: 'Mensaje' },
      announcement: { color: 'orange', text: 'Comunicado' },
      academic: { color: 'purple', text: 'Académico' },
      attendance: { color: 'red', text: 'Asistencia' },
      reminder: { color: 'gold', text: 'Recordatorio' },
      system: { color: 'cyan', text: 'Sistema' },
    };

    const config = configs[type as keyof typeof configs] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'unread':
        return <Tag color="green">No leída</Tag>;
      case 'read':
        return <Tag color="blue">Leída</Tag>;
      case 'dismissed':
        return <Tag color="gray">Descartada</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return formatTimeOnlyToMadrid(date);
    } else {
      return formatDateOnlyToMadrid(date);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como leída si no lo está
    if (notification.status === 'unread') {
      handleMarkAsRead(notification.id);
    }

    // Navegar a la URL de acción si existe
    if (notification.actionUrl) {
      // Aquí podrías usar react-router para navegar
      console.log('Navigate to:', notification.actionUrl);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BellOutlined /> Centro de Notificaciones
      </Title>

      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total"
              value={stats.total}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="No Leídas"
              value={stats.unread}
              valueStyle={{ color: '#cf1322' }}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Leídas"
              value={stats.read}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Descartadas"
              value={stats.dismissed}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<DeleteOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtros y acciones */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Select
              placeholder="Filtrar por tipo"
              allowClear
              style={{ width: 180 }}
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
            >
              <Select.Option value="evaluation">Evaluación</Select.Option>
              <Select.Option value="message">Mensaje</Select.Option>
              <Select.Option value="announcement">Comunicado</Select.Option>
              <Select.Option value="academic">Académico</Select.Option>
              <Select.Option value="attendance">Asistencia</Select.Option>
              <Select.Option value="reminder">Recordatorio</Select.Option>
              <Select.Option value="system">Sistema</Select.Option>
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Filtrar por estado"
              allowClear
              style={{ width: 150 }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Select.Option value="unread">No leídas</Select.Option>
              <Select.Option value="read">Leídas</Select.Option>
              <Select.Option value="dismissed">Descartadas</Select.Option>
            </Select>
          </Col>
          <Col flex="auto">
            <Space style={{ float: 'right' }}>
              <Button icon={<ReloadOutlined />} onClick={fetchNotifications}>
                Actualizar
              </Button>
              {stats.unread > 0 && (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleMarkAllAsRead}
                >
                  Marcar todas como leídas
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Lista de notificaciones */}
      <Card>
        {notifications.length === 0 ? (
          <Empty
            description="No hay notificaciones"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            itemLayout="vertical"
            loading={loading}
            pagination={{
              total: notifications.length,
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} notificaciones`,
            }}
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                key={notification.id}
                style={{
                  cursor: 'pointer',
                  backgroundColor: notification.status === 'unread' ? '#f6ffed' : 'transparent',
                  borderLeft: notification.status === 'unread' ? '3px solid #52c41a' : 'none',
                  borderRadius: '4px',
                  marginBottom: '8px',
                }}
                onClick={() => handleNotificationClick(notification)}
                actions={[
                  <Space key="actions">
                    {notification.status === 'unread' && (
                      <Tooltip title="Marcar como leída">
                        <Button
                          type="text"
                          icon={<CheckOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        />
                      </Tooltip>
                    )}
                    <Tooltip title="Descartar">
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(notification.id);
                        }}
                      />
                    </Tooltip>
                  </Space>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      icon={getNotificationIcon(notification.type)}
                      style={{ backgroundColor: 'transparent' }}
                      size="large"
                    />
                  }
                  title={
                    <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Text strong={notification.status === 'unread'} style={{ fontSize: '16px' }}>
                          {notification.title}
                        </Text>
                        <div style={{ marginTop: '4px' }}>
                          <Space>
                            {getNotificationTypeTag(notification.type)}
                            {getStatusTag(notification.status)}
                          </Space>
                        </div>
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatDate(notification.createdAt)}
                      </Text>
                    </Space>
                  }
                  description={
                    <div style={{ marginTop: '8px' }}>
                      <Text style={{ fontSize: '14px' }}>
                        {notification.content}
                      </Text>
                      <div style={{ marginTop: '8px' }}>
                        {notification.triggeredBy && (
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <UserOutlined style={{ marginRight: '4px' }} />
                              Por: {notification.triggeredBy.profile.firstName} {notification.triggeredBy.profile.lastName}
                            </Text>
                          </div>
                        )}
                        {notification.relatedStudent && (
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <BookOutlined style={{ marginRight: '4px' }} />
                              Estudiante: {notification.relatedStudent.user.profile.firstName} {notification.relatedStudent.user.profile.lastName}
                            </Text>
                          </div>
                        )}
                        {notification.relatedGroup && (
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <UserOutlined style={{ marginRight: '4px' }} />
                              Grupo: {notification.relatedGroup.name}
                            </Text>
                          </div>
                        )}
                        {notification.readAt && (
                          <div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Leída: {formatDateToMadrid(notification.readAt)}
                            </Text>
                          </div>
                        )}
                        {notification.dismissedAt && (
                          <div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Descartada: {formatDateToMadrid(notification.dismissedAt)}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;