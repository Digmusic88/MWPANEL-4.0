import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Avatar,
  Typography,
  Space,
  Button,
  Divider,
  Tooltip,
  Badge,
  message,
  Modal,
  Spin,
  Tag,
  List,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  DoubleRightOutlined,
  FileOutlined,
  DownloadOutlined,
  TeamOutlined,
  SettingOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import RichTextEditor from '../common/RichTextEditor';
import ImageWithAuth from './ImageWithAuth';
import VideoWithAuth from './VideoWithAuth';
import MediaGalleryModal from './MediaGalleryModal';
import type { GalleryMediaItem } from './MediaGalleryModal';
import LinkPreviewCard, { extractUrls } from './LinkPreviewCard';
import YouTubePlayerModal from './YouTubePlayerModal';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../services/apiClient';
import { parseLocalDateNative } from '../../utils/dateUtils';

const { Title, Text } = Typography;

interface MessageAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  contentType: 'text' | 'html' | 'markdown';
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
  isRead: boolean;
    readAt?: string;
    createdAt: string;
    replies?: Message[];
    parentMessageId?: string;
    attachments?: MessageAttachment[];
    seenBy?: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      readAt: string;
      viewCount?: number;
    }>;
  }
  
  interface Conversation {
    id: string;
    title?: string;
    type?: 'direct' | 'group';
    participant: {
      id: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    participants?: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      isCreator: boolean;
      isAdmin: boolean;
    }>;
    createdById?: string;
    messages: Message[];
    lastMessageAt: string;
  }
  
  interface ConversationViewProps {
    conversation: Conversation;
    onBack: () => void;
    onSendMessage: (content: string, parentId?: string) => Promise<void>;
    loading?: boolean;
    // Props para grupos
    isGroupChat?: boolean;
    onShowMembers?: () => void;
    participantCount?: number;
    isAdmin?: boolean;
  }
  
  const ConversationView: React.FC<ConversationViewProps> = ({
    conversation,
    onBack,
    onSendMessage,
    loading = false,
    isGroupChat = false,
    onShowMembers,
    participantCount,
    isAdmin = false,
  }) => {
    const { user } = useAuthStore();
  
    // Determinar si es grupo por el tipo o por la prop
    const isGroup = isGroupChat || conversation.type === 'group';
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [markedAsRead, setMarkedAsRead] = useState<Set<string>>(new Set());

  // Image gallery modal state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // YouTube player modal state
  const [youtubeVisible, setYoutubeVisible] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [seenByModalData, setSeenByModalData] = useState<Message['seenBy'] | null>(null);

  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = (entry.target as HTMLDivElement).dataset.messageId;
            if (messageId && !markedAsRead.has(messageId)) {
              // Check if the message is not from the current user
              const message = conversation.messages.find(m => m.id === messageId);
              if (message && message.sender.id !== user?.id) {
                communicationsService.markGroupChatMessageAsRead(messageId).catch(err => {
                  console.error(`Failed to mark message ${messageId} as read`, err);
                });
                setMarkedAsRead(prev => new Set(prev).add(messageId));
              }
            }
          }
        });
      },
      { threshold: 0.8 }
    );

    const currentRefs = messageRefs.current;
    currentRefs.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => {
      currentRefs.forEach(ref => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [conversation.messages, user?.id, markedAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  const formatMessageTime = (dateString: string) => {
    // Use parseLocalDateNative to avoid UTC conversion
    // Backend sends "2024-10-13T14:00:00.000" as local Madrid time
    const date = parseLocalDateNative(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: es });
    } else if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm', { locale: es })}`;
    } else {
      return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    }
  };

  // Collect all image and video attachments for gallery navigation
  const allMedia: GalleryMediaItem[] = React.useMemo(() => {
    const media: GalleryMediaItem[] = [];
    conversation.messages.forEach((msg) => {
      const senderName = `${msg.sender.profile.firstName} ${msg.sender.profile.lastName}`;
      msg.attachments?.forEach((att) => {
        if (att.mimeType?.startsWith('image/')) {
          media.push({
            id: att.id,
            filename: att.originalName,
            sender: senderName,
            date: formatMessageTime(msg.createdAt),
            type: 'image',
          });
        } else if (att.mimeType?.startsWith('video/')) {
          media.push({
            id: att.id,
            filename: att.originalName,
            sender: senderName,
            date: formatMessageTime(msg.createdAt),
            type: 'video',
          });
        }
      });
    });
    return media;
  }, [conversation.messages]);

  const openGallery = (attachmentId: string) => {
    const idx = allMedia.findIndex((item) => item.id === attachmentId);
    setGalleryIndex(idx >= 0 ? idx : 0);
    setGalleryVisible(true);
  };

  const openYoutube = (videoId: string, title: string) => {
    setYoutubeVideoId(videoId);
    setYoutubeTitle(title);
    setYoutubeVisible(true);
  };

  const renderMessageStatus = (message: Message) => {
    if (message.sender.id !== user?.id) return null;

    if (message.isRead) {
      return (
        <Tooltip title="Leído">
          <DoubleRightOutlined className="text-blue-500 text-xs" />
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title="Enviado">
          <CheckOutlined className="text-gray-400 text-xs" />
        </Tooltip>
      );
    }
  };

  const renderSeenBy = (message: Message) => {
    if (!isAdmin || !message.seenBy || message.seenBy.length === 0) {
      return null;
    }

    // Don't show "seen by" for your own messages if you're the only one who's seen it
    if (message.sender.id === user?.id && message.seenBy.length === 1 && message.seenBy[0].userId === user?.id) {
      return null;
    }

    return (
      <div
        className="flex items-center text-xs text-blue-500 cursor-pointer mr-2"
        onClick={() => setSeenByModalData(message.seenBy || null)}
      >
        <EyeOutlined className="mr-1" /> Visto por {message.seenBy.length}
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!messageContent.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(messageContent);
      setMessageContent('');
      message.success('Mensaje enviado');
    } catch (error) {
      console.error('Error sending message:', error);
      message.error('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (msg: Message) => {
    const isOwnMessage = msg.sender.id === user?.id;
    const senderName = `${msg.sender.profile.firstName} ${msg.sender.profile.lastName}`;

    return (
      <div
        key={msg.id}
        ref={el => messageRefs.current.set(msg.id, el!)}
        data-message-id={msg.id}
        className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isOwnMessage ? 'ml-2' : 'mr-2'}`}>
            <Avatar size="small" icon={<UserOutlined />} />
          </div>
          
          {/* Message bubble */}
          <div
            className={`px-4 py-2 rounded-lg relative ${
              isOwnMessage
                ? 'bg-blue-500 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}
          >
            {/* Sender name - En grupos siempre, en directo solo para recibidos */}
            {(isGroup || !isOwnMessage) && (
              <div className={`text-xs font-medium mb-1 ${isOwnMessage ? 'text-blue-100' : 'text-blue-600'}`}>
                {senderName}
              </div>
            )}
            
            {/* Message content */}
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: msg.content }}
            />

            {/* Link Previews */}
            {(() => {
              const urls = extractUrls(msg.content || '');
              return urls.length > 0 ? (
                <div>
                  {urls.map((url) => (
                    <LinkPreviewCard key={url} url={url} onYouTubeClick={openYoutube} />
                  ))}
                </div>
              ) : null;
            })()}

            {/* Archivos Adjuntos */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mt-3 pt-2" style={{ borderTop: isOwnMessage ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e8e8e8' }}>
                {msg.attachments.map((attachment) => {
                  // Detectar tipo de archivo por el mimeType
                  const isImage = attachment.mimeType?.startsWith('image/');
                  const isVideo = attachment.mimeType?.startsWith('video/');

                  return (
                    <div key={attachment.id} className="mb-2">
                      {isImage ? (
                        // Renderizar imagen inline (estilo WhatsApp)
                        <div>
                          <div className={`mb-1 text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                            {attachment.originalName} ({(attachment.size / 1024).toFixed(2)} KB)
                          </div>
                          <ImageWithAuth
                            attachmentId={attachment.id}
                            alt={attachment.originalName}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '300px',
                              borderRadius: '8px',
                              border: isOwnMessage ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e8e8e8',
                              cursor: 'pointer',
                            }}
                            onClick={() => openGallery(attachment.id)}
                          />
                        </div>
                      ) : isVideo ? (
                        // Renderizar vídeo inline con controles
                        <div>
                          <div className={`mb-1 text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                            {attachment.originalName} ({(attachment.size / 1024).toFixed(2)} KB)
                          </div>
                          <VideoWithAuth
                            attachmentId={attachment.id}
                            style={{
                              border: isOwnMessage ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e8e8e8',
                            }}
                            onClick={() => openGallery(attachment.id)}
                          />
                        </div>
                      ) : (
                        // Renderizar archivo descargable (otros tipos)
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px',
                            backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.1)' : '#fafafa',
                            borderRadius: '6px',
                            border: isOwnMessage ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e8e8e8',
                          }}
                        >
                          <FileOutlined style={{ fontSize: '16px', color: isOwnMessage ? '#fff' : '#1890ff', marginRight: '8px' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className={`text-xs font-medium overflow-hidden overflow-ellipsis whitespace-nowrap ${isOwnMessage ? 'text-white' : 'text-gray-800'}`}>
                              {attachment.originalName}
                            </div>
                            <div className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                              {(attachment.size / 1024).toFixed(2)} KB
                            </div>
                          </div>
                          <Button
                            type="link"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => {
                              window.open(
                                `/api/communications/attachments/${attachment.id}/download`,
                                '_blank'
                              );
                            }}
                            style={{ color: isOwnMessage ? '#fff' : '#1890ff' }}
                          >
                            Descargar
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Time and status */}
            <div className={`flex items-center justify-end mt-2 text-xs ${
              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {renderSeenBy(msg)}
              <ClockCircleOutlined className="mr-1" />
              <span className="mr-2">{formatMessageTime(msg.createdAt)}</span>
              {renderMessageStatus(msg)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 flex items-center px-4 py-3 border-b bg-gray-50">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className="mr-3"
        />
        <Avatar
          icon={isGroup ? <TeamOutlined /> : <UserOutlined />}
          className="mr-3"
          style={isGroup ? { backgroundColor: '#579172' } : undefined}
        />
        <div className="flex-1">
          <div className="flex items-center">
            <Title level={5} className="mb-0 mr-2">
              {conversation.title || (
                isGroup
                  ? 'Grupo sin nombre'
                  : `${conversation.participant?.profile?.firstName || ''} ${conversation.participant?.profile?.lastName || ''}`
              )}
            </Title>
            {isGroup && (
              <Tag color="purple" className="text-xs">
                Grupo
              </Tag>
            )}
          </div>
          <Text type="secondary" className="text-sm">
            {isGroup ? (
              <Space>
                <span>{participantCount || conversation.participants?.length || 0} participantes</span>
                <span>•</span>
                <span>Última actividad: {formatMessageTime(conversation.lastMessageAt)}</span>
              </Space>
            ) : (
              `Última actividad: ${formatMessageTime(conversation.lastMessageAt)}`
            )}
          </Text>
        </div>
        {/* Boton ver miembros solo para grupos */}
        {isGroup && onShowMembers && (
          <Tooltip title="Ver miembros del grupo">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={onShowMembers}
            />
          </Tooltip>
        )}
      </div>

      {/* Messages area - Scrollable container */}
      <div
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
        style={{
          maxHeight: 'calc(100vh - 300px)',
          minHeight: '400px'
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {conversation.messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input - Fixed at bottom */}
      <div className="flex-shrink-0 border-t bg-white p-3">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <RichTextEditor
              content={messageContent}
              onChange={setMessageContent}
              placeholder="Escribe un mensaje..."
              height="36px"
              compactToolbar
            />
          </div>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={sending}
            disabled={!messageContent.trim() || sending}
            size="large"
            shape="circle"
          />
        </div>
      </div>

      {/* Media Gallery Modal (images + videos) */}
      <MediaGalleryModal
        visible={galleryVisible}
        media={allMedia}
        initialIndex={galleryIndex}
        onClose={() => setGalleryVisible(false)}
      />

      {/* YouTube Player Modal */}
      <YouTubePlayerModal
        visible={youtubeVisible}
        videoId={youtubeVideoId}
        title={youtubeTitle}
        onClose={() => setYoutubeVisible(false)}
      />

      {/* Seen By Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined />
            <span>Visto por {seenByModalData?.length || 0} usuario{(seenByModalData?.length || 0) !== 1 ? 's' : ''}</span>
          </div>
        }
        open={!!seenByModalData}
        onCancel={() => setSeenByModalData(null)}
        footer={null}
        width={440}
      >
        <List
          dataSource={seenByModalData || []}
          renderItem={(seen) => (
            <List.Item>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Avatar size="small" icon={<UserOutlined />} />
                  <div>
                    <div className="font-medium text-sm">{seen.firstName} {seen.lastName}</div>
                    <div className="text-xs text-gray-400">{formatMessageTime(seen.readAt)}</div>
                  </div>
                </div>
                {(seen.viewCount || 1) > 1 && (
                  <Tag color="blue">{seen.viewCount} veces</Tag>
                )}
              </div>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default ConversationView;