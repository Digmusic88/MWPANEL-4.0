import React, { useState, useEffect, useCallback } from 'react';
import {
  Dropdown,
  Drawer,
  Button,
  Badge,
  Tabs,
  List,
  Typography,
  Empty,
  Spin,
  message,
  Tag,
  Divider,
  Avatar,
} from 'antd';
import { useResponsive } from '../../hooks/useResponsive';
import {
  BellOutlined,
  MessageOutlined,
  UserOutlined,
  EyeOutlined,
  SendOutlined,
  MailOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  BookOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import apiClient from '../../services/apiClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/user';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { useUnreadGroupMessages } from '../../hooks/useUnreadGroupMessages';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Text } = Typography;

// ─── Types ───────────────────────────────────────────────────────────────────

interface DirectMessage {
  id: string;
  subject: string;
  content: string;
  type: 'individual' | 'group';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sender: { id: string; profile: { firstName: string; lastName: string } };
}

interface FamilyAlert {
  id: string;
  alertType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  isViewed: boolean;
  createdAt: string;
  student?: { id: string; firstName: string; lastName: string };
  metadata?: any;
}

interface AlertSummary {
  totalAlerts: number;
  unviewedAlerts: number;
  criticalAlerts: number;
  alertsByType: Record<string, number>;
  alerts: FamilyAlert[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const priorityColor = (p: string) =>
  ({ urgent: '#ff4d4f', high: '#fa8c16', medium: '#faad14', low: '#52c41a', critical: '#ff4d4f' }[p] ?? '#d9d9d9');

const priorityLabel = (p: string) =>
  ({ urgent: 'Urgente', high: 'Alto', medium: 'Medio', low: 'Bajo', critical: 'Crítico' }[p] ?? p);

const notifIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    attendance: <CalendarOutlined style={{ color: '#fa8c16' }} />,
    grade: <FileTextOutlined style={{ color: '#52c41a' }} />,
    task: <BookOutlined style={{ color: '#1890ff' }} />,
    behavior: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
  };
  return icons[type] ?? <BellOutlined style={{ color: '#722ed1' }} />;
};

// ─── Messages Panel ───────────────────────────────────────────────────────────

const MessagesPanel: React.FC<{
  onClose: () => void;
  roleBasePath: string;
}> = ({ onClose, roleBasePath }) => {
  const [msgs, setMsgs] = useState<DirectMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const { unreadCount: groupUnread, unreadGroups, refreshUnreadCount } = useUnreadGroupMessages(60000);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const [msgsRes, countRes] = await Promise.all([
        apiClient.get('/communications/messages?limit=10'),
        apiClient.get('/communications/messages/unread-count'),
      ]);
      setMsgs(msgsRes.data || []);
      setUnread(countRes.data?.count || 0);
    } catch (e: any) {
      if (e.response?.status !== 401) message.error('Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const markAsRead = async (id: string) => {
    setMsgs(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    setUnread(prev => Math.max(0, prev - 1));
    await apiClient.patch(`/communications/messages/${id}`, { status: 'read' });
    fetch();
  };

  const markAllAsRead = async () => {
    setMsgs(prev => prev.map(m => ({ ...m, isRead: true })));
    setUnread(0);
    await apiClient.post('/communications/messages/mark-all-read');
    message.success('Todos los mensajes marcados como leídos');
    fetch();
  };

  const total = unread + groupUnread;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '8px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {msgs.length} mensajes · {unread} sin leer
          {groupUnread > 0 && <Tag color="purple" style={{ marginLeft: 8, fontSize: 11 }}><TeamOutlined /> {groupUnread} grupos</Tag>}
        </Text>
        {total > 0 && (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={markAllAsRead}
            style={{ fontSize: 12, padding: 0 }}>
            Marcar todo leído
          </Button>
        )}
      </div>

      {/* Unread groups */}
      {unreadGroups.length > 0 && (
        <div style={{ padding: '6px 16px', backgroundColor: '#faf0ff', borderBottom: '1px solid #f0f0f0' }}>
          {unreadGroups.slice(0, 3).map(g => (
            <div key={g.groupId}
              onClick={() => { window.location.href = `${roleBasePath}/group-chats?groupId=${g.groupId}`; onClose(); }}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', marginBottom: 3,
                backgroundColor: 'white', borderRadius: 4, cursor: 'pointer', border: '1px solid #f0f0f0' }}>
              <Text style={{ fontSize: 12 }}>{g.groupTitle}</Text>
              <Badge count={g.unreadCount} size="small" style={{ backgroundColor: '#722ed1' }} />
            </div>
          ))}
          {unreadGroups.length > 3 && <Text type="secondary" style={{ fontSize: 11 }}>+{unreadGroups.length - 3} más</Text>}
        </div>
      )}

      {/* List */}
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center' }}><Spin size="small" /></div>
        ) : msgs.length === 0 ? (
          <div style={{ padding: 24 }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay mensajes" /></div>
        ) : (
          <List size="small" dataSource={msgs} renderItem={m => (
            <List.Item
              style={{ padding: '8px 16px', cursor: 'pointer',
                backgroundColor: m.isRead ? 'white' : '#f0f9ff',
                borderLeft: `3px solid ${m.isRead ? '#f0f0f0' : priorityColor(m.priority)}`,
                borderBottom: '1px solid #f5f5f5' }}
              onClick={async () => {
                if (!m.isRead) await markAsRead(m.id);
                window.location.href = `${roleBasePath}/messages?messageId=${m.id}`;
                onClose();
              }}
            >
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <MailOutlined style={{ color: '#1890ff', fontSize: 13 }} />
                    <Text strong style={{ fontSize: 13 }}>{m.subject}</Text>
                    {!m.isRead && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#1890ff', flexShrink: 0 }} />}
                  </div>
                  <Tag color={priorityColor(m.priority)} style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                    {priorityLabel(m.priority)}
                  </Tag>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar size={14} icon={<UserOutlined />} />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {m.sender.profile.firstName} {m.sender.profile.lastName}
                  </Text>
                  <ClockCircleOutlined style={{ fontSize: 10, color: '#999' }} />
                  <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(m.createdAt).fromNow()}</Text>
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 3, overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}
                  dangerouslySetInnerHTML={{ __html: m.content?.replace(/<[^>]*>/g, '').substring(0, 100) ?? '' }}
                />
              </div>
            </List.Item>
          )} />
        )}
      </div>

      {/* Footer */}
      {msgs.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={{ padding: '10px 16px', textAlign: 'center' }}>
            <Button type="link" size="small" icon={<SendOutlined />}
              onClick={() => { window.location.href = `${roleBasePath}/messages`; onClose(); }}
              style={{ fontSize: 13, fontWeight: 500 }}>
              Ver todos los mensajes
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Notifications Panel ─────────────────────────────────────────────────────

const NotificationsPanel: React.FC<{
  onClose: () => void;
  roleBasePath: string;
}> = ({ onClose, roleBasePath }) => {
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const getEndpoint = useCallback(() => {
    switch (user?.role) {
      case UserRole.TEACHER: return '/teacher-notifications';
      case UserRole.STUDENT: return '/students/notifications';
      default: return '/families/alerts';
    }
  }, [user?.role]);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(getEndpoint());
      if (user?.role === UserRole.TEACHER || user?.role === UserRole.STUDENT) {
        const n = res.data;
        setSummary({
          totalAlerts: n.totalNotifications,
          unviewedAlerts: n.unviewedNotifications,
          criticalAlerts: n.criticalNotifications,
          alertsByType: n.notificationsByType,
          alerts: n.notifications.map((x: any) => ({
            id: x.id, alertType: x.type, priority: x.priority,
            title: x.title, description: x.description,
            isViewed: x.isViewed, createdAt: x.createdAt,
            student: x.student, metadata: x.metadata,
          })),
        });
      } else {
        setSummary(res.data);
      }
    } catch {
      setSummary({ totalAlerts: 0, unviewedAlerts: 0, criticalAlerts: 0, alertsByType: {}, alerts: [] });
    } finally {
      setLoading(false);
    }
  }, [getEndpoint, user?.role]);

  useEffect(() => { fetch(); }, [fetch]);

  const markAsViewed = async (id: string) => {
    const ep = user?.role === UserRole.TEACHER ? `/teacher-notifications/${id}/view`
      : user?.role === UserRole.STUDENT ? `/student-notifications/${id}/view`
      : `/families/alerts/${id}/view`;
    await apiClient.post(ep);
    fetch();
  };

  const markAllViewed = async () => {
    const ep = user?.role === UserRole.TEACHER ? '/teacher-notifications/view-all'
      : user?.role === UserRole.STUDENT ? '/student-notifications/view-all'
      : '/families/alerts/view-all';
    await apiClient.post(ep);
    message.success('Todas las notificaciones marcadas como vistas');
    fetch();
  };

  const alerts = summary?.alerts ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '8px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {summary?.unviewedAlerts ?? 0} sin ver · {summary?.criticalAlerts ?? 0} críticas
        </Text>
        {(summary?.unviewedAlerts ?? 0) > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllViewed}
            style={{ fontSize: 12, padding: 0 }}>
            Marcar todo visto
          </Button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center' }}><Spin size="small" /></div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: 24 }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay notificaciones" /></div>
        ) : (
          <List size="small" dataSource={alerts} renderItem={a => (
            <List.Item
              style={{ padding: '8px 16px', cursor: 'pointer',
                backgroundColor: a.isViewed ? 'white' : '#fffbe6',
                borderLeft: `3px solid ${a.isViewed ? '#f0f0f0' : priorityColor(a.priority)}`,
                borderBottom: '1px solid #f5f5f5' }}
              actions={[
                !a.isViewed && (
                  <Button key="view" type="link" size="small" icon={<EyeOutlined />}
                    onClick={e => { e.stopPropagation(); markAsViewed(a.id); }}
                    style={{ fontSize: 11, padding: 0 }}>
                    Visto
                  </Button>
                ),
              ].filter(Boolean) as React.ReactNode[]}
              onClick={() => { markAsViewed(a.id); onClose(); }}
            >
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  {notifIcon(a.alertType)}
                  <Text strong style={{ fontSize: 13 }}>{a.title}</Text>
                  {!a.isViewed && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fa8c16', flexShrink: 0 }} />}
                  <Tag color={priorityColor(a.priority)} style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px', marginLeft: 'auto' }}>
                    {priorityLabel(a.priority)}
                  </Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>{a.description}</Text>
                <div style={{ marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {a.student && (
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      <UserOutlined /> {a.student.firstName} {a.student.lastName}
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    <ClockCircleOutlined /> {dayjs(a.createdAt).fromNow()}
                  </Text>
                </div>
              </div>
            </List.Item>
          )} />
        )}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={{ padding: '10px 16px', textAlign: 'center' }}>
            <Button type="link" size="small" icon={<BellOutlined />}
              onClick={() => { window.location.href = `${roleBasePath}/notifications`; onClose(); }}
              style={{ fontSize: 13, fontWeight: 500 }}>
              Ver todas las notificaciones
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── ActivityCenter ───────────────────────────────────────────────────────────

interface ActivityCenterProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
}

const ActivityCenter: React.FC<ActivityCenterProps> = ({ size = 'default', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  const { user } = useAuthStore();
  const { isMobile } = useResponsive();

  const { unreadCount: msgDirect } = useUnreadMessages();
  const { unreadCount: msgGroup } = useUnreadGroupMessages(60000);
  const { unreadCount: notifCount } = useUnreadNotifications(user);

  const safeMsgDirect = typeof msgDirect === 'number' ? msgDirect : 0;
  const safeMsgGroup = typeof msgGroup === 'number' ? msgGroup : 0;
  const safeNotif = typeof notifCount === 'number' ? notifCount : 0;

  const totalMessages = safeMsgDirect + safeMsgGroup;
  const totalBadge = totalMessages + safeNotif;

  const roleBasePath = user?.role === UserRole.ADMIN ? '/admin'
    : user?.role === UserRole.TEACHER ? '/teacher'
    : user?.role === UserRole.STUDENT ? '/student'
    : user?.role === UserRole.FAMILY ? '/family'
    : '/';

  const showNotifications = user?.role !== UserRole.ADMIN;

  const tabItems = [
    {
      key: 'messages',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageOutlined />
          Mensajes
          {totalMessages > 0 && (
            <Badge count={totalMessages} size="small" style={{ marginLeft: 2 }} />
          )}
        </span>
      ),
      children: <MessagesPanel onClose={() => setOpen(false)} roleBasePath={roleBasePath} />,
    },
    ...(showNotifications ? [{
      key: 'notifications',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BellOutlined />
          Notificaciones
          {safeNotif > 0 && (
            <Badge count={safeNotif} size="small" style={{ marginLeft: 2 }} />
          )}
        </span>
      ),
      children: <NotificationsPanel onClose={() => setOpen(false)} roleBasePath={roleBasePath} />,
    }] : []),
  ];

  const panelContent = (
    <>
      {!isMobile && (
        <div style={{ padding: '12px 16px 0', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 15 }}>Centro de actividad</Text>
        </div>
      )}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="small"
        style={{ marginTop: 0 }}
        tabBarStyle={{ paddingLeft: 12, paddingRight: 12, marginBottom: 0 }}
        destroyInactiveTabPane={false}
      />
    </>
  );

  const triggerButton = (
    <Button
      type="text"
      shape="circle"
      size={size}
      onClick={() => setOpen(true)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: size === 'small' ? 32 : 40,
        width: size === 'small' ? 32 : 40,
        color: '#595959',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f5f5f5'; e.currentTarget.style.color = '#1890ff'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#595959'; }}
    >
      <BellOutlined style={{ fontSize: size === 'small' ? 16 : 18 }} />
      {totalBadge > 0 && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          background: safeNotif > 0
            ? 'linear-gradient(135deg, #fa8c16 0%, #ff4d4f 100%)'
            : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          color: 'white',
          borderRadius: '50%',
          minWidth: size === 'small' ? 16 : 18,
          height: size === 'small' ? 16 : 18,
          fontSize: 10,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 2px',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 10,
        }}>
          {totalBadge > 99 ? '99+' : totalBadge}
        </div>
      )}
    </Button>
  );

  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
      {isMobile ? (
        <>
          {triggerButton}
          <Drawer
            title="Centro de actividad"
            placement="bottom"
            height="75vh"
            open={open}
            onClose={() => setOpen(false)}
            styles={{
              body: { padding: 0, overflow: 'hidden' },
              header: { borderBottom: '1px solid #f0f0f0', padding: '12px 16px' },
            }}
            closeIcon={true}
          >
            {panelContent}
          </Drawer>
        </>
      ) : (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          open={open}
          onOpenChange={setOpen}
          dropdownRender={() => (
            <div style={{
              width: 460,
              backgroundColor: 'white',
              borderRadius: 8,
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}>
              {panelContent}
            </div>
          )}
          arrow={false}
        >
          {triggerButton}
        </Dropdown>
      )}
    </div>
  );
};

export default ActivityCenter;
