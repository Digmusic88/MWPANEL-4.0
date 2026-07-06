import React, { useEffect, useRef, useCallback } from 'react';
import { Badge, Button, Drawer, List, Typography, Empty, Spin, message, Space, Tooltip, Avatar } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGlobalStore } from '../store/globalStore';
import { useAuthStore } from '@store/authStore';
import api from '../services/apiClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Text, Title } = Typography;

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  metadata?: {
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
  };
}

interface NotificationResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
}

const NotificationCenter: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { updateNotificationCount } = useGlobalStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch notifications with React Query
  const [drawerWidth, setDrawerWidth] = React.useState(400);

  useEffect(() => {
    const handleResize = () => {
      setDrawerWidth(window.innerWidth < 480 ? window.innerWidth : 400);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    data: notificationData,
    isLoading,
    isError,
    error,
  } = useQuery<NotificationResponse>({
    queryKey: ['notifications', user?.id],
    queryFn: async ({ signal }) => {
      const response = await api.get('/communications/notifications', { signal });
      return response.data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 20000, // 20 seconds
    onSuccess: (data) => {
      updateNotificationCount(data.unreadCount);
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.patch(`/communications/notifications/${notificationId}/read`);
      return response.data;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      const previousNotifications = queryClient.getQueryData<NotificationResponse>(['notifications', user?.id]);

      if (previousNotifications) {
        queryClient.setQueryData<NotificationResponse>(['notifications', user?.id], {
          ...previousNotifications,
          data: previousNotifications.data.map((notification) =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          ),
          unreadCount: previousNotifications.unreadCount > 0 ? previousNotifications.unreadCount - 1 : 0,
        });
      }

      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData<NotificationResponse>(['notifications', user?.id], context.previousNotifications);
      }
      message.error('Error al marcar la notificación');
    },
    onSuccess: () => {
      message.success('Notificación marcada como leída');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch('/communications/notifications/read-all');
      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      const previousNotifications = queryClient.getQueryData<NotificationResponse>(['notifications', user?.id]);
      if (previousNotifications) {
        queryClient.setQueryData<NotificationResponse>(['notifications', user?.id], {
          ...previousNotifications,
          data: previousNotifications.data.map((notification) => ({
            ...notification,
            isRead: true,
          })),
          unreadCount: 0,
        });
      }
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData<NotificationResponse>(['notifications', user?.id], context.previousNotifications);
      }
      message.error('Error al marcar las notificaciones');
    },
    onSuccess: () => {
      message.success('Todas las notificaciones marcadas como leídas');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.delete(`/communications/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      message.success('Notificación eliminada');
    },
    onError: () => {
      message.error('Error al eliminar la notificación');
    },
  });

  // Cleanup effect for abort controller
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleOpen = useCallback(() => {
    setVisible(true);
    // Eliminado auto-marcado de notificaciones - solo marcar cuando se hace clic individual
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  const getNotificationIcon = (type: string, entityType?: string) => {
    if (entityType) {
      switch (entityType) {
        case 'task':
          return <FileTextOutlined />;
        case 'event':
          return <CalendarOutlined />;
        case 'user':
          return <UserOutlined />;
        case 'class':
          return <TeamOutlined />;
        default:
          break;
      }
    }

    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const handleMarkAsRead = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    markAsReadMutation.mutate(id);
  }, [markAsReadMutation]);

  const handleDelete = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteNotificationMutation.mutate(id);
  }, [deleteNotificationMutation]);

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const notifications = notificationData?.data || [];
  const unreadCount = notificationData?.unreadCount || 0;

  return (
    <>
      <Tooltip title="Notificaciones">
        <Badge count={unreadCount} size="small">
          <Button
            type="text"
            icon={<BellOutlined />}
            onClick={handleOpen}
            style={{ fontSize: 16 }}
          />
        </Badge>
      </Tooltip>

      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              Notificaciones
            </Title>
            {unreadCount > 0 && (
              <Button
                type="link"
                onClick={handleMarkAllAsRead}
                loading={markAllAsReadMutation.isLoading}
              >
                Marcar todas como leídas
              </Button>
            )}
          </div>
        }
        placement="right"
        onClose={handleClose}
        open={visible}
        width={drawerWidth}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : isError ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Text type="danger">Error al cargar las notificaciones</Text>
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No tienes notificaciones"
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                key={notification.id}
                style={{
                  backgroundColor: notification.isRead ? 'transparent' : '#f0f2f5',
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                }}
                onClick={() => handleMarkAsRead(notification.id)}
                actions={[
                  !notification.isRead && (
                    <Tooltip title="Marcar como leída" key="read">
                      <Button
                        type="text"
                        icon={<CheckOutlined />}
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        loading={markAsReadMutation.isLoading}
                      />
                    </Tooltip>
                  ),
                  <Tooltip title="Eliminar" key="delete">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDelete(notification.id, e)}
                      loading={deleteNotificationMutation.isLoading}
                    />
                  </Tooltip>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      icon={getNotificationIcon(notification.type, notification.metadata?.entityType)}
                      style={{ backgroundColor: 'transparent' }}
                    />
                  }
                  title={
                    <Text strong={!notification.isRead}>
                      {notification.title}
                    </Text>
                  }
                  description={
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Text>{notification.message}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(notification.createdAt).fromNow()}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
};

export default NotificationCenter;