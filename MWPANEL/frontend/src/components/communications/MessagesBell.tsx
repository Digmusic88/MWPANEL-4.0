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
  Badge,
} from 'antd';
import {
  MessageOutlined,
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
import { useNotificationStore } from '../../store/notificationStore';
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

interface MessagesResponse {
  data: Message[];
  total: number;
  unreadCount: number;
}

interface MessagesBellProps {
  className?: string;
  size?: 'small' | 'default' | 'large';
  showText?: boolean;
  onMessageClick?: (message: Message) => void;
}

const MessagesBell: React.FC<MessagesBellProps> = ({
  className = '',
  size = 'default',
  showText = false,
  onMessageClick,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { user } = useAuthStore();
  const { decrementMessagesBadge, setMessagesBadge } = useNotificationStore();

  // Hook para mensajes de grupos no leídos
  const {
    unreadCount: groupUnreadCount,
    unreadGroups,
    refreshUnreadCount: refreshGroupUnreadCount
  } = useUnreadGroupMessages(60000);

  // Total combinado de mensajes no leídos (directos + grupos)
  const totalUnreadCount = unreadCount + groupUnreadCount;

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch recent messages (last 10)
      const messagesResponse = await apiClient.get('/communications/messages?limit=10');
      setMessages(messagesResponse.data || []);
      
      // Fetch unread count
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

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      // Actualización optimista: cambiar el estado local e inmediatamente el badge del sidebar
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      decrementMessagesBadge(1);

      // Luego hacer la llamada a la API
      await apiClient.patch(`/communications/messages/${messageId}`, {
        status: 'read'
      });

      // Refrescar para asegurar consistencia
      await fetchMessages();
    } catch (error: any) {
      console.error('Error marking message as read:', error);
      message.error('Error al marcar el mensaje como leído');
      // Si hay error, recargar para restaurar estado correcto
      await fetchMessages();
    }
  };

  // Mark all messages as read
  const markAllAsRead = async () => {
    try {
      // Actualización optimista: marcar todos como leídos inmediatamente
      setMessages(prev =>
        prev.map(m => ({ ...m, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      setMessagesBadge(0);  // Actualizar badge del sidebar inmediatamente

      await apiClient.post('/communications/messages/mark-all-read');
      message.success('Todos los mensajes marcados como leídos');

      // Refrescar para asegurar consistencia
      await fetchMessages();
    } catch (error: any) {
      console.error('Error marking all messages as read:', error);
      message.error('Error al marcar todos los mensajes');
      // Si hay error, recargar para restaurar estado correcto
      await fetchMessages();
    }
  };

  // Get icon for message type
  const getMessageIcon = (type: string, priority: string) => {
    if (priority === 'urgent') {
      return <MailOutlined style={{ color: '#ff4d4f' }} />;
    }
    if (priority === 'high') {
      return <MailOutlined style={{ color: '#fa8c16' }} />;
    }
    switch (type) {
      case 'group':
        return <MailOutlined style={{ color: '#722ed1' }} />;
      default:
        return <MailOutlined style={{ color: '#1890ff' }} />;
    }
  };

  // Get color for message priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
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
      case 'urgent':
        return 'Urgente';
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

  // Handle message click
  const handleMessageClick = async (message: Message) => {
    console.log('🖱️ Message clicked:', {
      messageId: message.id,
      isRead: message.isRead,
      subject: message.subject
    });
    
    // Mark as read immediately when clicked
    if (!message.isRead) {
      console.log('🔄 Marking clicked message as read...');
      await markAsRead(message.id);
    }
    
    // Navigate to full messages page
    const roleBasePath = user?.role === UserRole.ADMIN ? '/admin' : 
                        user?.role === UserRole.TEACHER ? '/teacher' : 
                        user?.role === UserRole.STUDENT ? '/student' : 
                        user?.role === UserRole.FAMILY ? '/family' : '/';
    
    window.location.href = `${roleBasePath}/messages?messageId=${message.id}`;
    setDropdownVisible(false);
    
    // Callback for custom handling
    if (onMessageClick) {
      onMessageClick(message);
    }
  };

  // Refresh messages on mount and set up polling
  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 2 minutes
    const pollInterval = setInterval(fetchMessages, 120000);
    
    return () => clearInterval(pollInterval);
  }, [fetchMessages]);

  // Handle dropdown open/close
  const handleOpenChange = (open: boolean) => {
    console.log('🔔 Messages dropdown opened:', open);
    setDropdownVisible(open);

    // Recargar mensajes al abrir el dropdown para sincronizar con lecturas hechas en otras partes
    if (open) {
      fetchMessages();
      refreshGroupUnreadCount();
    }
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ fontSize: '16px' }}>
            Mensajes Recientes
          </Text>
          {totalUnreadCount > 0 && (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={markAllAsRead}
              style={{
                fontSize: '12px',
                height: '28px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                border: 'none',
                boxShadow: '0 2px 4px rgba(24, 144, 255, 0.3)'
              }}
            >
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

      {/* Groups with unread messages */}
      {unreadGroups.length > 0 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#faf0ff' }}>
          <Text strong style={{ fontSize: '12px', color: '#722ed1' }}>
            <TeamOutlined style={{ marginRight: 4 }} />
            Grupos con mensajes nuevos
          </Text>
          <div style={{ marginTop: 8 }}>
            {unreadGroups.slice(0, 3).map(group => (
              <div
                key={group.groupId}
                onClick={() => {
                  const roleBasePath = user?.role === UserRole.ADMIN ? '/admin' :
                                      user?.role === UserRole.TEACHER ? '/teacher' :
                                      user?.role === UserRole.STUDENT ? '/student' :
                                      user?.role === UserRole.FAMILY ? '/family' : '/';
                  window.location.href = `${roleBasePath}/group-chats?groupId=${group.groupId}`;
                  setDropdownVisible(false);
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  marginBottom: 4,
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #f0f0f0',
                }}
              >
                <Text style={{ fontSize: '12px' }}>{group.groupTitle}</Text>
                <Badge
                  count={group.unreadCount}
                  size="small"
                  style={{ backgroundColor: '#722ed1' }}
                />
              </div>
            ))}
            {unreadGroups.length > 3 && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                +{unreadGroups.length - 3} grupos más
              </Text>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxHeight: 420, overflow: 'auto', backgroundColor: 'white' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Spin size="small" />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              Cargando mensajes...
            </div>
          </div>
        ) : messages.length > 0 ? (
          <List
            size="small"
            dataSource={messages}
            renderItem={(message) => (
              <List.Item
                key={message.id}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  backgroundColor: message.isRead ? 'white' : '#f0f9ff',
                  borderLeft: message.isRead ? '3px solid #f0f0f0' : `3px solid ${getPriorityColor(message.priority)}`,
                  borderBottom: '1px solid #f5f5f5',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = message.isRead ? '#fafafa' : '#e6f7ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = message.isRead ? 'white' : '#f0f9ff';
                }}
                onClick={() => handleMessageClick(message)}
              >
                <div style={{ width: '100%' }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      {getMessageIcon(message.type, message.priority)}
                      <Text strong style={{ fontSize: '13px', lineHeight: 1.2 }}>
                        {message.subject}
                      </Text>
                      {!message.isRead && (
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
                    <Tag
                      color={getPriorityColor(message.priority)}
                      style={{ fontSize: '10px', margin: 0, padding: '0 4px', lineHeight: '16px' }}
                    >
                      {getPriorityLabel(message.priority)}
                    </Tag>
                  </div>

                  {/* Sender Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Avatar size={16} icon={<UserOutlined />} />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {message.sender.profile.firstName} {message.sender.profile.lastName}
                    </Text>
                    <ClockCircleOutlined style={{ fontSize: '10px', color: '#999' }} />
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {dayjs(message.createdAt).fromNow()}
                    </Text>
                  </div>

                  {/* Content Preview */}
                  <div
                    style={{
                      fontSize: '12px',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      color: '#999',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: message.content 
                        ? message.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...'
                        : 'Sin contenido'
                    }}
                  />
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
                  No hay mensajes
                </Text>
              }
            />
          </div>
        )}
      </div>

      {/* Footer */}
      {messages.length > 0 && (
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
              icon={<SendOutlined />}
              onClick={() => {
                setDropdownVisible(false);
                const roleBasePath = user?.role === UserRole.ADMIN ? '/admin' : 
                                   user?.role === UserRole.TEACHER ? '/teacher' : 
                                   user?.role === UserRole.STUDENT ? '/student' : 
                                   user?.role === UserRole.FAMILY ? '/family' : '/';
                window.location.href = `${roleBasePath}/messages`;
              }}
              style={{ 
                fontSize: '13px',
                color: '#1890ff',
                fontWeight: '500',
                padding: '4px 8px',
                height: 'auto'
              }}
            >
              Ver todos los mensajes
            </Button>
          </div>
        </>
      )}
    </div>
  );

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
          className="messages-bell-button"
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
          <MessageOutlined 
            style={{ 
              fontSize: size === 'small' ? '16px' : '18px',
              transition: 'all 0.2s ease'
            }} 
          />
          
          {/* Message badge - Muestra total combinado (mensajes directos + grupos) */}
          {totalUnreadCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: groupUnreadCount > 0
                  ? 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)' // Gradiente azul-púrpura si hay grupos
                  : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', // Gradiente azul solo mensajes
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
                boxShadow: groupUnreadCount > 0
                  ? '0 2px 4px rgba(114, 46, 209, 0.3)'
                  : '0 2px 4px rgba(24, 144, 255, 0.3)',
                zIndex: 10,
                animation: totalUnreadCount > 0 ? 'message-pulse 2s infinite' : 'none',
              }}
            >
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </div>
          )}
        </Button>
      </Dropdown>

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes message-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .messages-bell-button:hover .anticon {
          animation: message-bounce 0.5s ease-in-out;
        }
        
        @keyframes message-bounce {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
          75% { transform: rotate(-5deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default MessagesBell;