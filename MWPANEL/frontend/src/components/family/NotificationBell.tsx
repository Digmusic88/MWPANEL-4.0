import React, { useState, useEffect, useCallback } from 'react';
import {
  Dropdown,
  Button,
  List,
  Typography,
  Space,
  Empty,
  Spin,
  message,
  Tag,
  Divider,
  Avatar,
} from 'antd';
import {
  BellOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckOutlined,
  EyeOutlined,
  UserOutlined as DeleteIcon,
} from '@ant-design/icons';
import apiClient from '../../services/apiClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import AttendanceNotificationModal from './AttendanceNotificationModal';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/user';
import { useFamilyTaskBadges } from '../../hooks/useFamilyTaskBadges';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Text } = Typography;

export interface FamilyAlert {
  id: string;
  alertType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  isViewed: boolean;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  metadata?: any;
}

export interface AlertSummary {
  totalAlerts: number;
  unviewedAlerts: number;
  criticalAlerts: number;
  alertsByType: Record<string, number>;
  alerts: FamilyAlert[];
}

interface NotificationBellProps {
  className?: string;
  size?: 'small' | 'default' | 'large';
  showText?: boolean;
  onNotificationClick?: (alert: FamilyAlert) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  size = 'default',
  showText = false,
  onNotificationClick,
}) => {
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<FamilyAlert | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { user } = useAuthStore();

  // Family task badges (tareas vencidas sin entregar + devueltas)
  const familyTaskBadges = useFamilyTaskBadges();
  const taskBadgeCount = user?.role === UserRole.FAMILY
    ? (typeof familyTaskBadges.totalCount === 'number' ? familyTaskBadges.totalCount : 0)
    : 0;

  // NotificationBell component ready

  // FUNCIÓN ELIMINADA: autoMarkAsViewed
  // Las notificaciones ya no se marcan automáticamente al abrir el dropdown
  // Solo se marcan como leídas cuando el usuario hace clic en cada notificación individual

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Determine API endpoint based on user role
      let apiEndpoint: string;
      switch (user?.role) {
        case UserRole.TEACHER:
          apiEndpoint = '/teacher-notifications';
          break;
        case UserRole.STUDENT:
          apiEndpoint = '/students/notifications';
          break;
        case UserRole.FAMILY:
        default:
          apiEndpoint = '/families/alerts';
          break;
      }
      
      // Try to fetch real alerts first
      try {
        const response = await apiClient.get(apiEndpoint);
        
        // Transform teacher/student notifications to family alert format for compatibility
        if (user?.role === UserRole.TEACHER || user?.role === UserRole.STUDENT) {
          const teacherNotifications = response.data;
          const transformedAlerts: AlertSummary = {
            totalAlerts: teacherNotifications.totalNotifications,
            unviewedAlerts: teacherNotifications.unviewedNotifications,
            criticalAlerts: teacherNotifications.criticalNotifications,
            alertsByType: teacherNotifications.notificationsByType,
            alerts: teacherNotifications.notifications.map((notif: any) => ({
              id: notif.id,
              alertType: notif.type,
              priority: notif.priority,
              title: notif.title,
              description: notif.description,
              isViewed: notif.isViewed,
              createdAt: notif.createdAt,
              student: notif.student,
              metadata: notif.metadata,
            }))
          };
          setAlerts(transformedAlerts);
        } else {
          setAlerts(response.data);
        }
      } catch (apiError: any) {
        console.log('API not available, setting empty alerts:', apiError.response?.status);
        
        // If API fails, set empty alerts instead of showing fake notifications
        const emptyAlerts: AlertSummary = {
          totalAlerts: 0,
          unviewedAlerts: 0,
          criticalAlerts: 0,
          alertsByType: {},
          alerts: []
        };
        
        setAlerts(emptyAlerts);
      }
    } catch (error: any) {
      console.error('Error fetching family alerts:', error);
      if (error.response?.status !== 401) {
        message.error('Error al cargar las notificaciones familiares');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark alert as viewed
  const markAsViewed = async (alertId: string) => {
    try {
      let endpoint: string;
      switch (user?.role) {
        case UserRole.TEACHER:
          endpoint = `/teacher-notifications/${alertId}/view`;
          break;
        case UserRole.STUDENT:
          endpoint = `/student-notifications/${alertId}/view`;
          break;
        case UserRole.FAMILY:
        default:
          endpoint = `/families/alerts/${alertId}/view`;
          break;
      }
      
      console.log('📤 Manual mark as viewed - API call:', {
        alertId,
        endpoint,
        userRole: user?.role
      });
      
      const response = await apiClient.post(endpoint);
      console.log('✅ Manual mark as viewed - API response:', response.data);
      
      await fetchAlerts(); // Refresh alerts
      console.log('🔄 fetchAlerts completed after manual mark');
      message.success('Notificación marcada como vista');
    } catch (error: any) {
      console.error('❌ Error marking alert as viewed:', error);
      if (error.response) {
        console.error('❌ Manual mark API Error Details:', {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url
        });
        
        // Handle specific error cases
        if (error.response.status === 404) {
          console.warn('⚠️ Notification not found, possibly a demo notification that no longer exists');
          // Refresh alerts to remove stale notifications from UI
          await fetchAlerts();
          message.warning('Notificación no encontrada. Actualizando lista...');
          return;
        }
      }
      message.error('Error al marcar la notificación como vista');
    }
  };

  // Mark all alerts as viewed
  const markAllAsViewed = async () => {
    try {
      let endpoint: string;
      switch (user?.role) {
        case UserRole.TEACHER:
          endpoint = '/teacher-notifications/view-all';
          break;
        case UserRole.STUDENT:
          endpoint = '/student-notifications/view-all';
          break;
        case UserRole.FAMILY:
        default:
          endpoint = '/families/alerts/view-all';
          break;
      }
      
      await apiClient.post(endpoint);
      await fetchAlerts(); // Refresh alerts
      message.success('Todas las notificaciones marcadas como vistas');
    } catch (error: any) {
      console.error('Error marking all alerts as viewed:', error);
      message.error('Error al marcar todas las notificaciones');
    }
  };

  // Ensure DeleteIcon is included in build (force import detection)
  const ensureIconsImported = () => {
    return DeleteIcon ? true : false;
  };

  // Delete individual notification
  const deleteNotification = async (notificationId: string) => {
    try {
      // For teacher notifications from teacher-notifications endpoint, 
      // we need to handle them differently since they don't exist in communications/notifications
      if (user?.role === UserRole.TEACHER) {
        // Teacher notifications are not deletable - they are view-only status notifications
        // Instead of trying to delete, just mark as viewed and refresh
        console.log('🔔 Teacher notification - marking as viewed instead of deleting:', notificationId);
        await markAsViewed(notificationId);
        message.success('Notificación marcada como vista');
        return;
      }
      
      // For other roles, use the general notifications delete endpoint
      await apiClient.delete(`/communications/notifications/${notificationId}`);
      await fetchAlerts(); // Refresh alerts
      message.success('Notificación eliminada correctamente');
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        console.warn('⚠️ Notification not found, possibly already deleted');
        // Refresh alerts to remove stale notifications from UI
        await fetchAlerts();
        message.warning('Notificación no encontrada. Actualizando lista...');
        return;
      }
      
      message.error('Error al eliminar la notificación');
    }
  };

  // Get icon for alert type
  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      // Family alert types
      case 'student_absent':
      case 'student_late':
      case 'pattern_absences':
      case 'pattern_tardiness':
      case 'unjustified_absence':
        return <ClockCircleOutlined />;
      case 'pending_tasks':
      case 'low_task_grade':
        return <FileTextOutlined />;
      case 'low_subject_grade':
        return <BookOutlined />;
      case 'upcoming_exam':
        return <CalendarOutlined />;
      
      // Teacher alert types
      case 'attendance_request':
        return <ClockCircleOutlined />;
      case 'meeting_request':
        return <CalendarOutlined />;
      case 'urgent_task':
        return <FileTextOutlined />;
      
      // Student alert types
      case 'task_deadline':
        return <FileTextOutlined />;
      case 'low_grade':
        return <BookOutlined />;
      case 'exam_reminder':
        return <CalendarOutlined />;
      case 'teacher_message':
        return <ExclamationCircleOutlined />;
      
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  // Get color for alert priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#ff4d4f';
      case 'high':
        return '#fa8c16';
      case 'medium':
        return '#faad14';
      case 'low':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'Crítico';
      case 'high':
        return 'Alto';
      case 'medium':
        return 'Medio';
      case 'low':
        return 'Bajo';
      default:
        return priority;
    }
  };

  // Handle alert click
  const handleAlertClick = async (alert: FamilyAlert) => {
    console.log('🖱️ Alert clicked:', {
      alertId: alert.id,
      isViewed: alert.isViewed,
      title: alert.title
    });
    
    // Mark as viewed immediately when clicked
    if (!alert.isViewed) {
      console.log('🔄 Marking clicked alert as viewed...');
      await markAsViewed(alert.id);
    } else {
      console.log('ℹ️ Alert already viewed, skipping mark as viewed');
    }
    
    // Open modal for detailed view
    setSelectedAlert(alert);
    setModalVisible(true);
    setDropdownVisible(false);
    
    // Callback for custom handling
    if (onNotificationClick) {
      onNotificationClick(alert);
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedAlert(null);
  };

  // Refresh alerts on mount and set up polling
  useEffect(() => {
    fetchAlerts();
    
    // Poll for new alerts every 2 minutes
    const pollInterval = setInterval(fetchAlerts, 120000);
    
    return () => clearInterval(pollInterval);
  }, [fetchAlerts]);

  // Create dropdown menu content
  const dropdownContent = (
    <div style={{ 
      width: 450, 
      maxHeight: 520, 
      overflow: 'hidden',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', backgroundColor: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: '16px' }}>
            {user?.role === UserRole.TEACHER 
              ? 'Notificaciones del Profesor' 
              : user?.role === UserRole.STUDENT 
                ? 'Notificaciones del Estudiante'
                : 'Notificaciones Familiares'}
          </Text>
          {alerts && alerts.unviewedAlerts > 0 && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={markAllAsViewed}
              style={{ padding: 0 }}
            >
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

      {/* Sección de tareas pendientes (solo para familias) */}
      {user?.role === UserRole.FAMILY && taskBadgeCount > 0 && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#fff7ed',
          borderBottom: '1px solid #fed7aa',
        }}>
          <Text style={{ fontSize: '12px', fontWeight: 600, color: '#c2410c', display: 'block', marginBottom: 6 }}>
            ⚠️ Tareas pendientes de tus hijos
          </Text>
          {familyTaskBadges.overdueCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                backgroundColor: '#fff',
                borderRadius: 6,
                border: '1px solid #fa8c16',
                marginBottom: familyTaskBadges.returnedCount > 0 ? 6 : 0,
                cursor: 'pointer',
              }}
              onClick={() => {
                setDropdownVisible(false);
                window.location.href = '/family/tasks';
              }}
            >
              <FileTextOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
              <div style={{ flex: 1 }}>
                <Text style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', display: 'block' }}>
                  {familyTaskBadges.overdueCount} tarea{familyTaskBadges.overdueCount > 1 ? 's' : ''} sin entregar
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  La fecha de entrega ya ha pasado
                </Text>
              </div>
              <div style={{
                backgroundColor: '#fa8c16',
                color: 'white',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                padding: '0 5px',
              }}>
                {familyTaskBadges.overdueCount}
              </div>
            </div>
          )}
          {familyTaskBadges.returnedCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                backgroundColor: '#fff',
                borderRadius: 6,
                border: '1px solid #ff7a00',
                cursor: 'pointer',
              }}
              onClick={() => {
                setDropdownVisible(false);
                window.location.href = '/family/tasks';
              }}
            >
              <ExclamationCircleOutlined style={{ color: '#ff7a00', fontSize: 16 }} />
              <div style={{ flex: 1 }}>
                <Text style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed', display: 'block' }}>
                  {familyTaskBadges.returnedCount} tarea{familyTaskBadges.returnedCount > 1 ? 's' : ''} para revisar
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  El profesor ha devuelto para corrección
                </Text>
              </div>
              <div style={{
                backgroundColor: '#ff7a00',
                color: 'white',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                padding: '0 5px',
              }}>
                {familyTaskBadges.returnedCount}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ maxHeight: 420, overflow: 'auto', backgroundColor: 'white' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Spin size="small" />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              Cargando notificaciones...
            </div>
          </div>
        ) : alerts && alerts.alerts.length > 0 ? (
          <List
            size="small"
            dataSource={alerts.alerts}
            renderItem={(alert) => (
              <List.Item
                key={alert.id}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  backgroundColor: alert.isViewed ? 'white' : '#f6ffed',
                  borderLeft: alert.isViewed ? '3px solid #f0f0f0' : `3px solid ${getPriorityColor(alert.priority)}`,
                  borderBottom: '1px solid #f5f5f5',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = alert.isViewed ? '#fafafa' : '#f0f9ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = alert.isViewed ? 'white' : '#f6ffed';
                }}
                onClick={() => handleAlertClick(alert)}
              >
                <div style={{ width: '100%' }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      {getAlertIcon(alert.alertType)}
                      <Text strong style={{ fontSize: '13px', lineHeight: 1.2 }}>
                        {alert.title}
                      </Text>
                      {!alert.isViewed && (
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#1890ff',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Tag
                        color={getPriorityColor(alert.priority)}
                        style={{ fontSize: '10px', margin: 0, padding: '0 4px', lineHeight: '16px' }}
                      >
                        {getPriorityLabel(alert.priority)}
                      </Tag>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(alert.id);
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: '#ff4d4f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#d73027';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ff4d4f';
                        }}
                        title="Eliminar notificación"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Student Info */}
                  {alert.student && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Avatar size={16} icon={<UserOutlined />} />
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {alert.student.firstName} {alert.student.lastName}
                      </Text>
                    </div>
                  )}

                  {/* Description */}
                  <Text
                    type="secondary"
                    style={{
                      fontSize: '12px',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {alert.description}
                  </Text>

                  {/* Time */}
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {dayjs(alert.createdAt).fromNow()}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  No hay notificaciones familiares
                </Text>
              }
            />
          </div>
        )}
      </div>

      {/* Footer */}
      {alerts && alerts.alerts.length > 0 && (
        <>
          <Divider style={{ margin: 0, backgroundColor: '#f0f0f0' }} />
          <div style={{ 
            padding: '12px 16px', 
            textAlign: 'center', 
            backgroundColor: 'white',
            borderRadius: '0 0 8px 8px'
          }}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setDropdownVisible(false);
                // Navigate to notifications page if available
              }}
              style={{ 
                fontSize: '13px',
                color: '#1890ff',
                fontWeight: '500',
                padding: '4px 8px',
                height: 'auto'
              }}
            >
              Ver todas las notificaciones
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const unviewedCount = (alerts?.unviewedAlerts || 0) + taskBadgeCount;

  // Modern notification bell with safe Dropdown implementation
  const handleOpenChange = async (open: boolean) => {
    console.log('🔔 Dropdown opened:', open);
    setDropdownVisible(open);
    if (open) {
      console.log('📋 Current alerts state:', alerts);
      
      // Ensure alerts are loaded first
      if (!alerts) {
        console.log('📥 No alerts loaded, fetching...');
        await fetchAlerts();
      }
      
      // ELIMINADO: Auto-marcado de notificaciones al abrir dropdown
      // Las notificaciones solo se marcarán como leídas al hacer clic en cada una individualmente
      console.log('ℹ️ Dropdown abierto - esperando clic individual en notificaciones para marcar como leídas');
    }
  };

  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        open={dropdownVisible}
        onOpenChange={handleOpenChange}
        dropdownRender={() => dropdownContent}
        arrow={false}
      >
        <Button
          type="text"
          shape="circle"
          size={size}
          className="notification-bell-button"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            color: '#595959',
            transition: 'all 0.2s ease',
            height: size === 'small' ? '32px' : '40px',
            width: size === 'small' ? '32px' : '40px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.color = '#1890ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#595959';
          }}
        >
          <BellOutlined 
            style={{ 
              fontSize: size === 'small' ? '16px' : '18px',
              transition: 'all 0.2s ease'
            }} 
          />
          
          {/* Modern notification badge - only show if there are actual unviewed alerts */}
          {unviewedCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'linear-gradient(135deg, #ff4757 0%, #ff3838 100%)',
                color: 'white',
                borderRadius: '50%',
                minWidth: size === 'small' ? '16px' : '18px',
                height: size === 'small' ? '16px' : '18px',
                fontSize: '10px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 2px',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(255, 71, 87, 0.3)',
                zIndex: 10,
                animation: unviewedCount > 0 ? 'notification-pulse 2s infinite' : 'none',
              }}
            >
              {unviewedCount > 99 ? '99+' : unviewedCount}
            </div>
          )}
        </Button>
      </Dropdown>

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes notification-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .notification-bell-button:hover .anticon {
          animation: bell-ring 0.5s ease-in-out;
        }
        
        @keyframes bell-ring {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-10deg); }
          75% { transform: rotate(5deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>

      {/* Optional modal for detailed view */}
      {selectedAlert && (
        <AttendanceNotificationModal
          alert={selectedAlert}
          visible={modalVisible}
          onClose={handleCloseModal}
          onMarkAsViewed={() => markAsViewed(selectedAlert.id)}
        />
      )}
    </div>
  );
};

export default NotificationBell;