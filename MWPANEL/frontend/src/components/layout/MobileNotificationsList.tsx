
import React, { useState, useEffect, useCallback } from 'react';
import {
  List,
  Typography,
  Empty,
  Spin,
  message,
  Tag,
  Divider,
  Avatar,
  Badge,
  Button
} from 'antd';
import {
  UserOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  BellOutlined,
  CheckOutlined
} from '@ant-design/icons';
import apiClient from '../../services/apiClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/user';
import AttendanceNotificationModal from '../family/AttendanceNotificationModal';
import { FamilyAlert, AlertSummary } from '../family/NotificationBell';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Text } = Typography;

export const MobileNotificationsList: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<FamilyAlert | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { user } = useAuthStore();

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      let apiEndpoint: string;
      switch (user?.role) {
        case UserRole.TEACHER: apiEndpoint = '/teacher-notifications'; break;
        case UserRole.STUDENT: apiEndpoint = '/students/notifications'; break;
        default: apiEndpoint = '/families/alerts'; break;
      }
      const response = await apiClient.get(apiEndpoint);
      
      if (user?.role === UserRole.TEACHER || user?.role === UserRole.STUDENT) {
        const notifs = response.data;
        const transformedAlerts: AlertSummary = {
          totalAlerts: notifs.totalNotifications,
          unviewedAlerts: notifs.unviewedNotifications,
          criticalAlerts: notifs.criticalNotifications,
          alertsByType: notifs.notificationsByType,
          alerts: notifs.notifications.map((n: any) => ({ ...n, alertType: n.type, isViewed: n.isViewed }))
        };
        setAlerts(transformedAlerts);
      } else {
        setAlerts(response.data);
      }
    } catch (error: any) {
      if (error.response?.status !== 401) message.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsViewed = async (alertId: string) => {
    try {
      let endpoint: string;
      switch (user?.role) {
        case UserRole.TEACHER: endpoint = `/teacher-notifications/${alertId}/view`; break;
        case UserRole.STUDENT: endpoint = `/student-notifications/${alertId}/view`; break;
        default: endpoint = `/families/alerts/${alertId}/view`; break;
      }
      await apiClient.post(endpoint);
      await fetchAlerts();
      message.success('Notificación marcada como vista');
    } catch (error) {
      message.error('Error al marcar la notificación');
    }
  };
  
  const markAllAsViewed = async () => {
    try {
      let endpoint: string;
      switch (user?.role) {
        case UserRole.TEACHER: endpoint = '/teacher-notifications/view-all'; break;
        case UserRole.STUDENT: endpoint = '/student-notifications/view-all'; break;
        default: endpoint = '/families/alerts/view-all'; break;
      }
      await apiClient.post(endpoint);
      await fetchAlerts();
      message.success('Todas las notificaciones marcadas como vistas');
    } catch (error: any) {
      message.error('Error al marcar todas las notificaciones');
    }
  };

  const handleAlertClick = async (alert: FamilyAlert) => {
    if (!alert.isViewed) {
      await markAsViewed(alert.id);
    }
    setSelectedAlert(alert);
    setModalVisible(true);
  };

  useEffect(() => {
    fetchAlerts();
    const pollInterval = setInterval(fetchAlerts, 120000);
    return () => clearInterval(pollInterval);
  }, [fetchAlerts]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#fa8c16';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
        case 'critical': return 'Crítico';
        case 'high': return 'Alto';
        case 'medium': return 'Medio';
        case 'low': return 'Bajo';
        default: return priority;
    }
  };

  return (
    <>
      <div style={{ height: 'calc(100vh - 110px)', overflowY: 'auto' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1-x solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: '16px' }}>Notificaciones</Text>
            {alerts && alerts.unviewedAlerts > 0 && (
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllAsViewed}>
                Marcar todas como vistas
              </Button>
            )}
          </div>
          {alerts && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {alerts.totalAlerts} total, {alerts.unviewedAlerts} sin ver
            </Text>
          )}
        </div>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}><Spin /></div>
        ) : alerts && alerts.alerts.length > 0 ? (
          <List
            dataSource={alerts.alerts}
            renderItem={(alert) => (
              <List.Item
                key={alert.id}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: alert.isViewed ? 'white' : '#f6ffed',
                  borderLeft: `4px solid ${alert.isViewed ? '#f0f0f0' : getPriorityColor(alert.priority)}`,
                  borderBottom: '1px solid #f5f5f5',
                }}
                onClick={() => handleAlertClick(alert)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text strong>{alert.title}</Text>
                    {!alert.isViewed && <Badge status="processing" />}
                  </div>
                  {alert.student && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                       <Avatar size={18} icon={<UserOutlined />} />
                       <Text type="secondary" style={{ fontSize: '12px' }}>{alert.student.firstName} {alert.student.lastName}</Text>
                    </div>
                  )}
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>{alert.description}</Text>
                  <Text type="secondary" style={{ fontSize: '11px' }}>{dayjs(alert.createdAt).fromNow()}</Text>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Empty description="No hay notificaciones" />
          </div>
        )}
      </div>
      {selectedAlert && (
        <AttendanceNotificationModal
          alert={selectedAlert}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onMarkAsViewed={() => markAsViewed(selectedAlert.id)}
        />
      )}
    </>
  );
};
