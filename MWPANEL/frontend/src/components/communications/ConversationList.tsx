import React, { useState } from 'react';
import {
  Card,
  List,
  Avatar,
  Typography,
  Badge,
  Space,
  Button,
  Input,
  Tooltip,
  Empty,
  Spin,
  Tag,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface ConversationSummary {
  id: string;
  title?: string;
  type?: 'direct' | 'group';
  participant: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    role?: string;
  };
  // Para grupos
  participantCount?: number;
  lastMessage?: {
    id: string;
    content: string;
    sender: {
      id: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    createdAt: string;
  };
  unreadCount: number;
  lastMessageAt: string;
  isActive: boolean;
}

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  loading?: boolean;
  currentUserId: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  loading = false,
  currentUserId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: es });
    } else if (isYesterday(date)) {
      return 'Ayer';
    } else {
      return format(date, 'dd/MM', { locale: es });
    }
  };

  const truncateContent = (content: string, maxLength: number = 50) => {
    // Remove HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '');
    if (textContent.length <= maxLength) return textContent;
    return textContent.substring(0, maxLength) + '...';
  };

  const getRoleColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return '#ff4d4f';
      case 'teacher':
        return '#1890ff';
      case 'family':
        return '#52c41a';
      case 'student':
        return '#faad14';
      default:
        return '#8c8c8c';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'Admin';
      case 'teacher':
        return 'Profesor';
      case 'family':
        return 'Familia';
      case 'student':
        return 'Estudiante';
      default:
        return 'Usuario';
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const participantName = `${conv.participant?.profile?.firstName || ''} ${conv.participant?.profile?.lastName || ''}`.toLowerCase();
    const title = (conv.title || '').toLowerCase();
    const lastMessageContent = conv.lastMessage?.content.toLowerCase() || '';
    return (
      participantName.includes(search) ||
      title.includes(search) ||
      lastMessageContent.includes(search)
    );
  });

  const renderConversationItem = (conversation: ConversationSummary) => {
    const isGroup = conversation.type === 'group';
    const participantName = conversation.participant?.profile
      ? `${conversation.participant.profile.firstName} ${conversation.participant.profile.lastName}`
      : 'Usuario';
    const isSelected = conversation.id === selectedConversationId;
    const isFromCurrentUser = conversation.lastMessage?.sender.id === currentUserId;

    // Obtener el nombre del remitente del último mensaje para grupos
    const lastMessageSenderName = conversation.lastMessage?.sender?.profile
      ? `${conversation.lastMessage.sender.profile.firstName}`
      : '';

    return (
      <List.Item
        key={conversation.id}
        className={`cursor-pointer transition-all duration-200 px-4 py-3 ${
          isSelected ? 'bg-blue-100 border-r-4 border-blue-500' : ''
        }`}
        style={{
          backgroundColor: conversation.unreadCount > 0 && !isSelected ? '#fffbe6' : undefined,
          borderLeft: conversation.unreadCount > 0 ? '4px solid #faad14' : undefined,
        }}
        onClick={() => onSelectConversation(conversation.id)}
      >
        <div className="flex items-start w-full">
          {/* Avatar - diferente para grupos */}
          <div className="relative mr-3">
            <Avatar
              size={48}
              icon={isGroup ? <TeamOutlined /> : <UserOutlined />}
              style={{
                backgroundColor: isGroup ? '#579172' : getRoleColor(conversation.participant?.role)
              }}
            />
            {conversation.unreadCount > 0 && (
              <Badge
                count={conversation.unreadCount}
                size="small"
                className="absolute -top-1 -right-1"
              />
            )}
          </div>

          {/* Conversation details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <Title
                  level={5}
                  className="mb-0 mr-2"
                  style={{
                    fontSize: '14px',
                    fontWeight: conversation.unreadCount > 0 ? 600 : 400
                  }}
                >
                  {conversation.title || (isGroup ? 'Grupo sin nombre' : participantName)}
                </Title>
                {isGroup ? (
                  <Tag color="purple" className="text-xs py-0 px-1">
                    {conversation.participantCount || 0}
                  </Tag>
                ) : (
                  <Tooltip title={getRoleLabel(conversation.participant?.role)}>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getRoleColor(conversation.participant?.role) }}
                    />
                  </Tooltip>
                )}
              </div>
              <Text type="secondary" className="text-xs flex-shrink-0">
                {formatLastMessageTime(conversation.lastMessageAt)}
              </Text>
            </div>

            {/* Last message preview */}
            {conversation.lastMessage && (
              <div className="flex items-center">
                <Text
                  type="secondary"
                  className={`text-sm flex-1 truncate ${
                    conversation.unreadCount > 0 ? 'font-medium' : ''
                  }`}
                >
                  {/* En grupos mostrar "Nombre: mensaje" */}
                  {isGroup ? (
                    <>
                      <span className={isFromCurrentUser ? 'text-blue-500' : 'text-gray-600'}>
                        {isFromCurrentUser ? 'Tú' : lastMessageSenderName}:
                      </span>{' '}
                      {truncateContent(conversation.lastMessage.content)}
                    </>
                  ) : (
                    <>
                      {isFromCurrentUser && (
                        <span className="mr-1 text-blue-500">Tú:</span>
                      )}
                      {truncateContent(conversation.lastMessage.content)}
                    </>
                  )}
                </Text>
                {conversation.unreadCount > 0 && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />
                )}
              </div>
            )}
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <Card className="h-full flex flex-col" bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <Title level={4} className="mb-0 flex items-center">
            <MessageOutlined className="mr-2 text-blue-500" />
            Conversaciones
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onNewConversation}
            size="small"
          >
            Nueva
          </Button>
        </div>
        <Search
          placeholder="Buscar conversaciones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          prefix={<SearchOutlined />}
        />
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchTerm
                  ? "No se encontraron conversaciones"
                  : "No tienes conversaciones aún"
              }
            >
              {!searchTerm && (
                <Button type="primary" onClick={onNewConversation}>
                  Iniciar conversación
                </Button>
              )}
            </Empty>
          </div>
        ) : (
          <List
            dataSource={filteredConversations}
            renderItem={renderConversationItem}
            split={false}
            className="h-full"
          />
        )}
      </div>

      {/* Footer stats */}
      <div className="border-t p-3 bg-gray-50">
        <Space size="large" className="w-full justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-blue-600">
              {conversations.length}
            </div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-red-500">
              {conversations.reduce((acc, conv) => acc + conv.unreadCount, 0)}
            </div>
            <div className="text-xs text-gray-500">No leídos</div>
          </div>
        </Space>
      </div>
    </Card>
  );
};

export default ConversationList;