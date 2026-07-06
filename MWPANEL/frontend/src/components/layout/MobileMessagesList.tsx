
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
  SendOutlined,
  MailOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import apiClient from '../../services/apiClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/user';
import { useUnreadGroupMessages } from '../../hooks/useUnreadGroupMessages';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Text } = Typography;

interface Message {
  id: string;
  subject: string;
  content: string;
  type: 'individual' | 'group';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sender: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  recipient?: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

export const MobileMessagesList: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const {
    unreadCount: groupUnreadCount,
    unreadGroups,
  } = useUnreadGroupMessages(60000);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const messagesResponse = await apiClient.get('/communications/messages?limit=20');
      setMessages(messagesResponse.data || []);
      const unreadResponse = await apiClient.get('/communications/messages/unread-count');
      setUnreadCount(unreadResponse.data?.count || 0);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      if (error.response?.status !== 401) {
        message.error('Error al cargar los mensajes');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (messageId: string) => {
    try {
      await apiClient.patch(`/communications/messages/${messageId}`, { status: 'read' });
      await fetchMessages();
      message.success('Mensaje marcado como leído');
    } catch (error: any) {
      message.error('Error al marcar el mensaje como leído');
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/communications/messages/mark-all-read');
      await fetchMessages();
      message.success('Todos los mensajes marcados como leídos');
    } catch (error: any) {
      message.error('Error al marcar todos los mensajes');
    }
  };

  const handleMessageClick = async (msg: Message) => {
    if (!msg.isRead) {
      await markAsRead(msg.id);
    }
    const roleBasePath = user?.role === UserRole.ADMIN ? '/admin' :
                        user?.role === UserRole.TEACHER ? '/teacher' :
                        user?.role === UserRole.STUDENT ? '/student' :
                        user?.role === UserRole.FAMILY ? '/family' : '/';
    window.location.href = `${roleBasePath}/messages?messageId=${msg.id}`;
  };

  useEffect(() => {
    fetchMessages();
    const pollInterval = setInterval(fetchMessages, 120000);
    return () => clearInterval(pollInterval);
  }, [fetchMessages]);

  const getMessageIcon = (type: string, priority: string) => {
    if (priority === 'urgent') return <MailOutlined style={{ color: '#ff4d4f' }} />;
    if (priority === 'high') return <MailOutlined style={{ color: '#fa8c16' }} />;
    if (type === 'group') return <MailOutlined style={{ color: '#722ed1' }} />;
    return <MailOutlined style={{ color: '#1890ff' }} />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ff4d4f';
      case 'high': return '#fa8c16';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alto';
      case 'medium': return 'Medio';
      case 'low': return 'Bajo';
      default: return priority;
    }
  };
  
  const roleBasePath = user?.role === UserRole.ADMIN ? '/admin' : 
                     user?.role === UserRole.TEACHER ? '/teacher' : 
                     user?.role === UserRole.STUDENT ? '/student' : 
                     user?.role === UserRole.FAMILY ? '/family' : '/';

  return (
    <div style={{ height: 'calc(100vh - 110px)', overflowY: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: '16px' }}>Mensajes Recientes</Text>
          {unreadCount > 0 && (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={markAllAsRead}>
              Marcar todos como leídos
            </Button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {messages.length} mensajes, {unreadCount} sin leer
          </Text>
          {groupUnreadCount > 0 && (
            <Tag color="purple" style={{ fontSize: '11px', margin: 0 }}>
              <TeamOutlined /> {groupUnreadCount} en grupos
            </Tag>
          )}
        </div>
      </div>
      
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center' }}><Spin /></div>
      ) : messages.length > 0 ? (
        <List
          size="small"
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item
              key={msg.id}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: msg.isRead ? 'white' : '#f0f9ff',
                borderLeft: `4px solid ${msg.isRead ? '#f0f0f0' : getPriorityColor(msg.priority)}`,
                borderBottom: '1px solid #f5f5f5',
              }}
              onClick={() => handleMessageClick(msg)}
            >
              <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      {getMessageIcon(msg.type, msg.priority)}
                      <Text strong style={{ fontSize: '14px', lineHeight: 1.3 }}>{msg.subject}</Text>
                      {!msg.isRead && <Badge status="processing" />}
                    </div>
                    <Tag color={getPriorityColor(msg.priority)} style={{ fontSize: '10px' }}>{getPriorityLabel(msg.priority)}</Tag>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Avatar size={18} icon={<UserOutlined />} />
                    <Text type="secondary" style={{ fontSize: '12px' }}>{msg.sender.profile.firstName} {msg.sender.profile.lastName}</Text>
                    <ClockCircleOutlined style={{ fontSize: '11px', color: '#999' }} />
                    <Text type="secondary" style={{ fontSize: '11px' }}>{dayjs(msg.createdAt).fromNow()}</Text>
                  </div>
                  <div
                    style={{ fontSize: '13px', lineHeight: 1.4, color: '#666' }}
                    dangerouslySetInnerHTML={{ __html: msg.content ? msg.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : 'Sin contenido' }}
                  />
              </div>
            </List.Item>
          )}
        />
      ) : (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Empty description="No hay mensajes" />
        </div>
      )}
      <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
         <Button type="primary" icon={<SendOutlined />} onClick={() => { window.location.href = `${roleBasePath}/messages`; }}>
            Ver todos los mensajes
         </Button>
      </div>
    </div>
  );
};
