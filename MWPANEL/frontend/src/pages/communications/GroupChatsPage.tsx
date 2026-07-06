/**
 * @archivo: GroupChatsPage.tsx
 * @modulo: Communications - Group Chats
 * @funcion: Pagina principal para gestionar grupos de chat estilo WhatsApp
 * @creado_por: Sistema de Grupos MW Panel 2.0
 * @fecha: 2025-12-15
 * @actualizado: 2026-02-10 - Rediseno movil tipo WhatsApp
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Button,
  Typography,
  Spin,
  Empty,
  Avatar,
  List,
  Space,
  Tag,
  Input,
  Badge,
  Tooltip,
  message,
  Modal,
  Dropdown,
} from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  PaperClipOutlined,
  FileOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  DownloadOutlined,
  MessageOutlined,
  EyeOutlined,
  EditOutlined,
  MoreOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

import { useAuthStore } from '../../store/authStore';
import { useResponsive } from '../../hooks/useResponsive';
import { useGroupChats } from '../../hooks/useGroupChats';
import CreateGroupChatModal from '../../components/communications/CreateGroupChatModal';
import { GroupMembersPanel } from '../../components/communications/GroupMembersPanel';
import RichTextEditor from '../../components/common/RichTextEditor';
import VoiceNotePlayer from '../../components/communications/VoiceNotePlayer';
import ImageWithAuth from '../../components/communications/ImageWithAuth';
import VideoWithAuth from '../../components/communications/VideoWithAuth';
import MediaGalleryModal from '../../components/communications/MediaGalleryModal';
import type { GalleryMediaItem } from '../../components/communications/MediaGalleryModal';
import LinkPreviewCard, { extractUrls } from '../../components/communications/LinkPreviewCard';
import YouTubePlayerModal from '../../components/communications/YouTubePlayerModal';
import VoiceRecorderButton from '../../components/communications/VoiceRecorderButton';
import type {
  GroupChatSummary,
  GroupChatDetail,
  GroupChatMessage,
} from '../../services/communications.service';

const { Title, Text } = Typography;

const GroupChatsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { isMobile } = useResponsive();

  const {
    groups,
    currentGroup,
    messages,
    availableUsers,
    loading,
    loadingMessages,
    fetchGroups,
    selectGroup,
    clearSelectedGroup,
    createGroup,
    updateGroup,
    sendMessage,
    markAsRead,
    fetchAvailableUsers,
    addMembers,
    removeMember,
    leaveGroup,
    promoteMember,
    demoteMember,
    editMessage,
    deleteMessage,
    markGroupAsUnread,
  } = useGroupChats();

  const [searchTerm, setSearchTerm] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [membersDrawerVisible, setMembersDrawerVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingMessage, setEditingMessage] = useState<GroupChatMessage | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showSeenByModal, setShowSeenByModal] = useState(false);
  const [seenByList, setSeenByList] = useState<any[]>([]);

  // Media gallery modal state (images + videos)
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // YouTube player modal state
  const [youtubeVisible, setYoutubeVisible] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');

  useEffect(() => {
    fetchGroups();
    // Solo admin/profesor pueden crear grupos y ver usuarios disponibles.
    // Las familias/alumnos no deben llamar a este endpoint (devolvía 403).
    if (user?.role === 'admin' || user?.role === 'teacher') {
      fetchAvailableUsers();
    }
  }, [fetchGroups, fetchAvailableUsers, user?.role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const canCreateGroup = user?.role === 'admin' || user?.role === 'teacher';

  const isCurrentUserGroupAdmin = (): boolean => {
    if (!currentGroup || !user) return false;
    if (currentGroup.createdById === user.id) return true;
    const currentParticipant = currentGroup.participants?.find(p => p.id === user.id);
    return currentParticipant?.isAdmin || false;
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: es });
    } else if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm', { locale: es })}`;
    } else {
      return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    }
  };

  const filteredGroups = groups.filter((group) =>
    group.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ];

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImageOutlined style={{ color: '#52c41a' }} />;
    if (mimeType === 'application/pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (mimeType.includes('word')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    if (mimeType.startsWith('video/')) return <PlayCircleOutlined style={{ color: '#722ed1' }} />;
    if (mimeType.startsWith('audio/')) return <SoundOutlined style={{ color: '#fa8c16' }} />;
    return <FileOutlined style={{ color: '#8c8c8c' }} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (!allowedFileTypes.includes(file.type)) {
        message.error(`Tipo de archivo no permitido: ${file.name}`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        message.error(`Archivo muy grande (max 50MB): ${file.name}`);
        return false;
      }
      return true;
    });

    if (selectedFiles.length + validFiles.length > 10) {
      message.warning('Maximo 10 archivos por mensaje');
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isMessageEmpty = (content: string) => {
    return !content || content.replace(/<[^>]*>/g, '').trim() === '';
  };

  const handleSendMessage = async () => {
    if ((isMessageEmpty(messageContent) && selectedFiles.length === 0) || !currentGroup || sending) return;

    setSending(true);
    try {
      await sendMessage(currentGroup.id, messageContent, selectedFiles.length > 0 ? selectedFiles : undefined);
      setMessageContent('');
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async (file: File, _duration: number) => {
    if (!currentGroup || sending) return;
    setSending(true);
    try {
      await sendMessage(currentGroup.id, '', [file]);
    } catch (err) {
      console.error('Error sending voice note:', err);
    } finally {
      setSending(false);
    }
  };

  const canUseVoice = user?.role === 'teacher' || user?.role === 'admin';

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const canSeeSeenBy = user?.role === 'admin' || user?.role === 'teacher';

  const canEditMessage = (msg: GroupChatMessage) => {
    if (msg.sender.id !== user?.id) return false;
    const createdAt = new Date(msg.createdAt);
    const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursElapsed <= 24;
  };

  const canDeleteMessage = (msg: GroupChatMessage) => {
    const isOwner = msg.sender.id === user?.id;
    const isPlatformAdmin = user?.role === 'admin';
    if (isPlatformAdmin) return true;
    const isGroupAdmin = currentGroup?.participants.some(
      p => p.id === user?.id && p.isAdmin
    ) || currentGroup?.createdById === user?.id;
    if (isGroupAdmin) return true;
    if (isOwner) {
      const createdAt = new Date(msg.createdAt);
      const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      return hoursElapsed <= 1;
    }
    return false;
  };

  const formatSeenByDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const hoursAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 24) {
      return format(date, 'HH:mm', { locale: es });
    } else if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm', { locale: es })}`;
    } else {
      return format(date, "d MMM yyyy 'a las' HH:mm", { locale: es });
    }
  };

  const handleStartEdit = (msg: GroupChatMessage) => {
    setEditingMessage(msg);
    setEditMessageContent(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !currentGroup) return;
    if (!editMessageContent.trim()) {
      message.error('El mensaje no puede estar vacio');
      return;
    }
    setSavingEdit(true);
    const success = await editMessage(currentGroup.id, editingMessage.id, editMessageContent);
    setSavingEdit(false);
    if (success) {
      setEditingMessage(null);
      setEditMessageContent('');
    }
  };

  const handleDeleteMessage = async (msg: GroupChatMessage) => {
    if (!currentGroup) return;
    await deleteMessage(currentGroup.id, msg.id);
  };

  const handleSeenByClick = (seenBy: any[]) => {
    setSeenByList(seenBy);
    setShowSeenByModal(true);
  };

  // Collect all image and video attachments for gallery
  const allGalleryMedia: GalleryMediaItem[] = React.useMemo(() => {
    const media: GalleryMediaItem[] = [];
    messages.forEach((msg) => {
      const senderName = `${msg.sender.firstName} ${msg.sender.lastName}`.trim();
      msg.attachments?.forEach((att) => {
        if (att.mimeType?.startsWith('image/')) {
          media.push({
            id: att.id,
            filename: att.originalName || att.filename,
            sender: senderName,
            date: formatMessageTime(msg.createdAt),
            type: 'image',
          });
        } else if (att.mimeType?.startsWith('video/')) {
          media.push({
            id: att.id,
            filename: att.originalName || att.filename,
            sender: senderName,
            date: formatMessageTime(msg.createdAt),
            type: 'video',
          });
        }
      });
    });
    return media;
  }, [messages]);

  const openGallery = (attachmentId: string) => {
    const idx = allGalleryMedia.findIndex((item) => item.id === attachmentId);
    setGalleryIndex(idx >= 0 ? idx : 0);
    setGalleryVisible(true);
  };

  const openYoutube = (videoId: string, title: string) => {
    setYoutubeVideoId(videoId);
    setYoutubeTitle(title);
    setYoutubeVisible(true);
  };

  // ==========================================
  // RENDER: Mensaje individual
  // ==========================================
  const renderMessage = (msg: GroupChatMessage) => {
    const isOwnMessage = msg.sender.id === user?.id;
    const senderName = `${msg.sender.firstName} ${msg.sender.lastName}`.trim();
    const showEditDelete = isOwnMessage && (canEditMessage(msg) || canDeleteMessage(msg));

    const messageMenuItems = [];
    if (canEditMessage(msg)) {
      messageMenuItems.push({
        key: 'edit',
        label: 'Editar mensaje',
        icon: <EditOutlined />,
        onClick: () => handleStartEdit(msg),
      });
    }
    if (canDeleteMessage(msg)) {
      messageMenuItems.push({
        key: 'delete',
        label: 'Eliminar mensaje',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: 'Eliminar mensaje?',
            content: 'Este mensaje sera eliminado para todos los participantes del grupo. Esta accion no se puede deshacer.',
            okText: 'Eliminar',
            cancelText: 'Cancelar',
            okType: 'danger',
            onOk: () => handleDeleteMessage(msg),
          });
        },
      });
    }

    return (
      <div
        key={msg.id}
        className={`flex mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
      >
        <div className={`flex items-start ${isMobile ? 'max-w-[85%]' : 'max-w-[70%]'} ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isMobile && (
            <div className={`flex-shrink-0 ${isOwnMessage ? 'ml-2' : 'mr-2'}`}>
              <Avatar size="small" icon={<UserOutlined />} />
            </div>
          )}

          {showEditDelete && messageMenuItems.length > 0 && isOwnMessage && (
            <Dropdown
              menu={{ items: messageMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="default"
                size="small"
                icon={<MoreOutlined style={{ fontSize: '14px' }} />}
                className="flex-shrink-0 mr-1"
                style={{
                  backgroundColor: '#EDF6F1',
                  borderColor: '#579172',
                  color: '#579172',
                  padding: '2px 6px',
                  height: '24px',
                  minWidth: '24px',
                  borderRadius: '6px',
                }}
              />
            </Dropdown>
          )}

          <div
            className={`${isMobile ? 'px-3 py-2' : 'px-4 py-2'} rounded-2xl relative ${
              isOwnMessage
                ? 'text-white rounded-br-sm'
                : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
            }`}
            style={isOwnMessage ? { backgroundColor: '#579172' } : {}}
          >
            {!isOwnMessage && (
              <div className="text-xs font-semibold mb-1" style={{ color: '#579172' }}>
                {senderName}
              </div>
            )}

            {msg.content && (
              <div
                className={`text-sm ${isMobile ? 'text-[13px]' : ''} message-content${isOwnMessage ? ' message-content-own' : ''}`}
                dangerouslySetInnerHTML={{ __html: msg.content }}
              />
            )}

            {/* Link Previews */}
            {msg.content && (() => {
              const urls = extractUrls(msg.content);
              return urls.length > 0 ? (
                <div>
                  {urls.map((url) => (
                    <LinkPreviewCard key={url} url={url} onYouTubeClick={openYoutube} />
                  ))}
                </div>
              ) : null;
            })()}

            {msg.isEdited && (
              <div
                className="text-xs italic mt-1"
                style={{ color: isOwnMessage ? 'rgba(255,255,255,0.65)' : '#9ca3af' }}
              >
                (editado)
              </div>
            )}

            {msg.attachments && msg.attachments.length > 0 && (
              <div
                className={`mt-2 space-y-1 ${msg.content ? 'border-t pt-2' : ''}`}
                style={{ borderColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }}
              >
                {msg.attachments.map((att) => {
                  const isImage = att.mimeType?.startsWith('image/');
                  const isAudio = att.mimeType?.startsWith('audio/');
                  const isVideo = att.mimeType?.startsWith('video/');
                  if (isAudio) {
                    return (
                      <div key={att.id} style={{ padding: '6px 4px 2px' }}>
                        <VoiceNotePlayer
                          src={`/api/communications/attachments/${att.id}/stream`}
                          isOwn={isOwnMessage}
                        />
                      </div>
                    );
                  }
                  if (isImage) {
                    return (
                      <div key={att.id} style={{ marginTop: 4 }}>
                        <ImageWithAuth
                          attachmentId={att.id}
                          alt={att.originalName || att.filename}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'block',
                          }}
                          onClick={() => openGallery(att.id)}
                        />
                      </div>
                    );
                  }
                  if (isVideo) {
                    return (
                      <div key={att.id} style={{ marginTop: 4 }}>
                        <VideoWithAuth
                          attachmentId={att.id}
                          onClick={() => openGallery(att.id)}
                        />
                      </div>
                    );
                  }
                  return (
                  <a
                    key={att.id}
                    href={`/api/communications/attachments/${att.id}/download`}
                    download={att.originalName || att.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-md transition-colors"
                    style={isOwnMessage
                      ? { backgroundColor: 'rgba(0,0,0,0.15)' }
                      : { backgroundColor: '#f3f4f6' }
                    }
                  >
                    {getFileIcon(att.mimeType)}
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium truncate ${isOwnMessage ? 'text-white' : 'text-gray-800'}`}>
                        {att.originalName}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: isOwnMessage ? 'rgba(255,255,255,0.65)' : '#6b7280' }}
                      >
                        {formatFileSize(att.size)}
                      </div>
                    </div>
                    <DownloadOutlined className={isOwnMessage ? 'text-white' : 'text-gray-600'} />
                  </a>
                  );
                })}
              </div>
            )}

            <div
              className="flex items-center justify-end mt-1 gap-2 text-xs"
              style={{ color: isOwnMessage ? 'rgba(255,255,255,0.65)' : '#9ca3af' }}
            >
              {canSeeSeenBy && msg.seenBy && msg.seenBy.length > 0 && (
                isMobile ? (
                  <div
                    className="flex items-center cursor-pointer"
                    style={{ color: isOwnMessage ? 'rgba(255,255,255,0.65)' : '#3b82f6' }}
                    onClick={() => handleSeenByClick(msg.seenBy || [])}
                  >
                    <EyeOutlined className="mr-1" />
                    <span>{msg.seenBy.length}</span>
                  </div>
                ) : (
                  <Tooltip
                    title={
                      <div style={{ whiteSpace: 'pre-line' }}>
                        {msg.seenBy
                          .map(seen => `${seen.firstName} ${seen.lastName} - ${formatSeenByDate(seen.readAt)}`)
                          .join('\n')}
                      </div>
                    }
                  >
                    <div
                      className="flex items-center cursor-pointer"
                      style={{ color: isOwnMessage ? 'rgba(255,255,255,0.65)' : '#3b82f6' }}
                    >
                      <EyeOutlined className="mr-1" />
                      <span>Visto por {msg.seenBy.length}</span>
                    </div>
                  </Tooltip>
                )
              )}
              <span className="flex items-center">
                <ClockCircleOutlined className="mr-1" />
                {formatMessageTime(msg.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: Lista de grupos (sidebar / pantalla completa en movil)
  // ==========================================
  const renderGroupList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <Title level={4} className="mb-0 flex items-center">
            <TeamOutlined className="mr-2 text-green-700" />
            Grupos
          </Title>
          {canCreateGroup && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              size="small"
              style={{ backgroundColor: '#579172', borderColor: '#579172' }}
            >
              Nuevo
            </Button>
          )}
        </div>
        <Input
          placeholder="Buscar grupos..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Spin />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-4">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchTerm
                  ? 'No se encontraron grupos'
                  : canCreateGroup
                  ? 'No tienes grupos. Crea el primero!'
                  : 'No perteneces a ningun grupo'
              }
            />
          </div>
        ) : (
          <List
            dataSource={filteredGroups}
            renderItem={renderGroupItem}
            split={false}
          />
        )}
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 border-t p-3 bg-gray-50">
        <Space size="large" className="w-full justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-green-700">
              {groups.length}
            </div>
            <div className="text-xs text-gray-500">Grupos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-red-500">
              {groups.reduce((acc, g) => acc + g.unreadCount, 0)}
            </div>
            <div className="text-xs text-gray-500">No leidos</div>
          </div>
        </Space>
      </div>
    </div>
  );

  // ==========================================
  // RENDER: Item de grupo en la lista
  // ==========================================
  const renderGroupItem = (group: GroupChatSummary) => {
    const isSelected = !isMobile && currentGroup?.id === group.id;

    const groupContextMenuItems = [
      {
        key: 'mark-unread',
        label: 'Marcar como no leído',
        icon: <EyeInvisibleOutlined />,
        onClick: (e: any) => {
          e.domEvent?.stopPropagation();
          markGroupAsUnread(group.id);
        },
      },
    ];

    return (
      <List.Item
        key={group.id}
        className={`cursor-pointer transition-all duration-150 px-4 py-3 ${
          isSelected ? 'bg-green-50 border-l-4 border-green-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
        }`}
        style={{
          backgroundColor: group.unreadCount > 0 && !isSelected ? '#fef7ff' : undefined,
        }}
        onClick={() => selectGroup(group.id)}
      >
        <div className="flex items-center w-full">
          <div className="relative mr-3 flex-shrink-0">
            <Avatar
              size={isMobile ? 50 : 48}
              icon={<TeamOutlined />}
              style={{ backgroundColor: '#579172' }}
            />
            {group.unreadCount > 0 && (
              <Badge
                count={group.unreadCount}
                size="small"
                className="absolute -top-1 -right-1"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <Text
                strong
                className="truncate"
                style={{
                  fontSize: isMobile ? '15px' : '14px',
                  fontWeight: group.unreadCount > 0 ? 600 : 400,
                  maxWidth: '60%',
                  display: 'block',
                }}
              >
                {group.title}
              </Text>
              <Text type="secondary" className="text-xs flex-shrink-0 ml-2">
                {formatMessageTime(group.lastMessageAt || new Date().toISOString())}
              </Text>
            </div>

            {group.lastMessage && (
              <Text
                type="secondary"
                className={`text-sm truncate block ${
                  group.unreadCount > 0 ? 'font-medium text-gray-700' : ''
                }`}
                style={{ fontSize: isMobile ? '13px' : '12px' }}
              >
                {group.lastMessage.senderName}: {group.lastMessage.content.replace(/<[^>]*>/g, '').slice(0, 40)}
              </Text>
            )}
          </div>

          <Dropdown
            menu={{ items: groupContextMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              className="flex-shrink-0 ml-1"
              style={{ color: '#8c8c8c' }}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </List.Item>
    );
  };

  // ==========================================
  // RENDER: Vista previa de archivos adjuntos
  // ==========================================
  const renderFilePreview = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <div className="px-3 py-2 bg-gray-50 border-b">
        <div className="flex items-center justify-between mb-1">
          <Text type="secondary" className="text-xs">
            <PaperClipOutlined className="mr-1" />
            {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''}
          </Text>
          <Button type="text" size="small" danger onClick={() => setSelectedFiles([])}>
            Quitar todos
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-white rounded border border-gray-200 text-xs"
            >
              {getFileIcon(file.type)}
              <span className="truncate max-w-[80px]" title={file.name}>
                {file.name}
              </span>
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeFile(index)}
                className="text-red-500"
                style={{ padding: '0 2px', height: '18px' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: Barra de entrada de mensaje
  // ==========================================
  const [voiceRecorderActive, setVoiceRecorderActive] = React.useState(false);

  const renderMessageInput = () => (
    <div className="flex-shrink-0 border-t bg-white">
      {!voiceRecorderActive && renderFilePreview()}
      <div className={`flex items-end gap-2 ${isMobile ? 'p-2' : 'p-3'}`} style={{ alignItems: 'flex-end' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept={allowedFileTypes.join(',')}
          style={{ display: 'none' }}
        />

        {/* Botón adjuntar — oculto mientras se graba */}
        {!voiceRecorderActive && (
          <Button
            type="text"
            icon={<PaperClipOutlined style={{ fontSize: isMobile ? '20px' : '18px', color: '#579172' }} />}
            onClick={() => fileInputRef.current?.click()}
            style={{ minWidth: isMobile ? '40px' : '44px', minHeight: isMobile ? '40px' : '44px', flexShrink: 0 }}
          />
        )}

        {/* Editor de texto — oculto mientras se graba */}
        {!voiceRecorderActive && (
          <div className="flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
            <RichTextEditor
              content={messageContent}
              onChange={setMessageContent}
              placeholder="Escribe un mensaje..."
              height={isMobile ? '32px' : '36px'}
              showToolbar={true}
              showEmojis={true}
              compactToolbar
            />
          </div>
        )}

        {/* VoiceRecorder — solo para teacher/admin, se expande al grabar */}
        {canUseVoice && (
          <VoiceRecorderButton
            onSend={(file, _duration) => {
              setVoiceRecorderActive(false);
              handleSendVoice(file, _duration);
            }}
            onStateChange={setVoiceRecorderActive}
            disabled={sending}
          />
        )}

        {/* Botón enviar texto — oculto mientras se graba */}
        {!voiceRecorderActive && (
          <Button
            type="primary"
            icon={<SendOutlined style={{ fontSize: isMobile ? '18px' : '20px', color: 'white' }} />}
            onClick={handleSendMessage}
            loading={sending}
            disabled={(isMessageEmpty(messageContent) && selectedFiles.length === 0) || sending}
            shape="circle"
            style={{
              backgroundColor: '#579172',
              borderColor: '#579172',
              minWidth: isMobile ? '40px' : '48px',
              minHeight: isMobile ? '40px' : '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );

  // ==========================================
  // RENDER: Chat header
  // ==========================================
  const renderChatHeader = () => {
    if (!currentGroup) return null;

    return (
      <div className="flex-shrink-0 flex items-center px-3 py-2.5 border-b bg-white shadow-sm"
        style={{ minHeight: isMobile ? '56px' : '64px' }}
      >
        {isMobile && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined style={{ fontSize: '18px' }} />}
            onClick={clearSelectedGroup}
            className="mr-1"
            style={{ minWidth: '36px', minHeight: '36px' }}
          />
        )}
        <Avatar
          icon={<TeamOutlined />}
          size={isMobile ? 36 : 40}
          style={{ backgroundColor: '#579172' }}
          className="mr-2 flex-shrink-0"
        />
        <div className="flex-1 min-w-0" onClick={isMobile ? () => setMembersDrawerVisible(true) : undefined} style={isMobile ? { cursor: 'pointer' } : undefined}>
          <Title level={5} className="mb-0 truncate" style={{ fontSize: isMobile ? '15px' : '16px', lineHeight: '1.3' }}>
            {currentGroup.title}
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {currentGroup.participants?.length || 0} participante{currentGroup.participants?.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <Button
          type="text"
          icon={<SettingOutlined style={{ fontSize: '18px', color: '#579172' }} />}
          onClick={() => setMembersDrawerVisible(true)}
          style={{ minWidth: '40px', minHeight: '40px' }}
        />
      </div>
    );
  };

  // ==========================================
  // RENDER: Area de mensajes
  // ==========================================
  const renderMessagesArea = () => (
    <div
      className="flex-1 overflow-y-auto p-3"
      style={{
        backgroundColor: '#f0f2f5',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e0e0e0\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      }}
    >
      {loadingMessages ? (
        <div className="flex justify-center items-center h-full">
          <Spin size="large" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="bg-white bg-opacity-80 rounded-xl px-6 py-4 text-center">
            <MessageOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
            <div className="mt-2 text-gray-500 text-sm">
              No hay mensajes aun. Se el primero en escribir!
            </div>
          </div>
        </div>
      ) : (
        <>
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );

  // ==========================================
  // RENDER: Chat completo (header + mensajes + input)
  // ==========================================
  const renderChat = () => {
    if (!currentGroup) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50">
          <TeamOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
          <Title level={4} type="secondary" className="mt-4">
            Selecciona un grupo
          </Title>
          <Text type="secondary">
            Elige un grupo de la lista para ver los mensajes
          </Text>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {renderChatHeader()}
        {renderMessagesArea()}
        {renderMessageInput()}
      </div>
    );
  };

  // ==========================================
  // LAYOUT PRINCIPAL
  // ==========================================

  // MOVIL: Pantalla completa alternando lista <-> chat (tipo WhatsApp)
  if (isMobile) {
    return (
      <div
        style={{
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100dvh - 64px)',
          margin: '-12px',
          overflow: 'hidden',
        }}
      >
        {/* Mostrar lista de grupos O el chat, nunca ambos */}
        {!currentGroup ? renderGroupList() : renderChat()}

        {/* Modales */}
        <CreateGroupChatModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onGroupCreated={(groupId) => {
            selectGroup(groupId);
          }}
        />

        <GroupMembersPanel
          visible={membersDrawerVisible}
          onClose={() => setMembersDrawerVisible(false)}
          group={currentGroup}
          availableUsers={availableUsers}
          onAddMembers={async (userIds) => {
            if (!currentGroup) return false;
            return addMembers(currentGroup.id, userIds);
          }}
          onRemoveMember={async (userId) => {
            if (!currentGroup) return false;
            return removeMember(currentGroup.id, userId);
          }}
          onLeaveGroup={async () => {
            if (!currentGroup) return false;
            return leaveGroup(currentGroup.id);
          }}
          onUpdateGroup={async (data) => {
            if (!currentGroup) return null;
            return updateGroup(currentGroup.id, data);
          }}
          onPromoteMember={async (userId) => {
            if (!currentGroup) return false;
            return promoteMember(currentGroup.id, userId);
          }}
          onDemoteMember={async (userId) => {
            if (!currentGroup) return false;
            return demoteMember(currentGroup.id, userId);
          }}
        />

        <Modal
          title="Editar mensaje"
          open={!!editingMessage}
          onCancel={() => { setEditingMessage(null); setEditMessageContent(''); }}
          onOk={handleSaveEdit}
          okText="Guardar"
          cancelText="Cancelar"
          confirmLoading={savingEdit}
          okButtonProps={{ disabled: !editMessageContent.trim() }}
          width={isMobile ? '95%' : 600}
        >
          {editingMessage && (
            <div className="space-y-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Text type="secondary" className="text-xs">
                  Mensaje original de {editingMessage.sender.firstName} {editingMessage.sender.lastName}
                </Text>
              </div>
              <Input.TextArea
                value={editMessageContent}
                onChange={(e) => setEditMessageContent(e.target.value)}
                placeholder="Escribe tu mensaje..."
                autoSize={{ minRows: 3, maxRows: 8 }}
                style={{ fontSize: '14px' }}
              />
              <Text type="secondary" className="text-xs block">
                Solo puedes editar tus mensajes dentro de las primeras 24 horas
              </Text>
            </div>
          )}
        </Modal>

        <Modal
          title="Visto por"
          open={showSeenByModal}
          onCancel={() => setShowSeenByModal(false)}
          footer={null}
          width={isMobile ? '90%' : undefined}
        >
          <List
            itemLayout="horizontal"
            dataSource={seenByList}
            renderItem={item => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={`${item.firstName} ${item.lastName}`}
                  description={`Visto a las ${formatSeenByDate(item.readAt)}`}
                />
              </List.Item>
            )}
          />
        </Modal>

        {/* Media Gallery Modal (images + videos) */}
        <MediaGalleryModal
          visible={galleryVisible}
          media={allGalleryMedia}
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
      </div>
    );
  }

  // DESKTOP: Layout de dos columnas
  return (
    <div className="p-4 md:p-6">
      <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Panel izquierdo: Lista de grupos */}
        <div className="flex-shrink-0 bg-white rounded-lg shadow-sm border overflow-hidden" style={{ width: '320px' }}>
          {renderGroupList()}
        </div>

        {/* Panel derecho: Chat */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden">
          {renderChat()}
        </div>
      </div>

      {/* Modales */}
      <CreateGroupChatModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onGroupCreated={(groupId) => {
          selectGroup(groupId);
        }}
      />

      <GroupMembersPanel
        visible={membersDrawerVisible}
        onClose={() => setMembersDrawerVisible(false)}
        group={currentGroup}
        availableUsers={availableUsers}
        onAddMembers={async (userIds) => {
          if (!currentGroup) return false;
          return addMembers(currentGroup.id, userIds);
        }}
        onRemoveMember={async (userId) => {
          if (!currentGroup) return false;
          return removeMember(currentGroup.id, userId);
        }}
        onLeaveGroup={async () => {
          if (!currentGroup) return false;
          return leaveGroup(currentGroup.id);
        }}
        onUpdateGroup={async (data) => {
          if (!currentGroup) return null;
          return updateGroup(currentGroup.id, data);
        }}
        onPromoteMember={async (userId) => {
          if (!currentGroup) return false;
          return promoteMember(currentGroup.id, userId);
        }}
        onDemoteMember={async (userId) => {
          if (!currentGroup) return false;
          return demoteMember(currentGroup.id, userId);
        }}
      />

      <Modal
        title="Editar mensaje"
        open={!!editingMessage}
        onCancel={() => { setEditingMessage(null); setEditMessageContent(''); }}
        onOk={handleSaveEdit}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={savingEdit}
        okButtonProps={{ disabled: !editMessageContent.trim() }}
        width={600}
      >
        {editingMessage && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <Text type="secondary" className="text-xs">
                Mensaje original de {editingMessage.sender.firstName} {editingMessage.sender.lastName}
              </Text>
            </div>
            <Input.TextArea
              value={editMessageContent}
              onChange={(e) => setEditMessageContent(e.target.value)}
              placeholder="Escribe tu mensaje..."
              autoSize={{ minRows: 3, maxRows: 10 }}
              style={{ fontSize: '14px' }}
            />
            <Text type="secondary" className="text-xs block">
              Solo puedes editar tus mensajes dentro de las primeras 24 horas
            </Text>
          </div>
        )}
      </Modal>

      <Modal
        title="Visto por"
        open={showSeenByModal}
        onCancel={() => setShowSeenByModal(false)}
        footer={null}
      >
        <List
          itemLayout="horizontal"
          dataSource={seenByList}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={`${item.firstName} ${item.lastName}`}
                description={`Visto a las ${formatSeenByDate(item.readAt)}`}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Media Gallery Modal (images + videos) */}
      <MediaGalleryModal
        visible={galleryVisible}
        media={allGalleryMedia}
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
    </div>
  );
};

// ─── CSS global para contenido de mensajes de grupo
const groupChatStyles = `
  .message-content {
    line-height: 1.6;
  }
  .message-content p {
    margin-bottom: 10px;
    line-height: 1.6;
  }
  .message-content p:last-child {
    margin-bottom: 0;
  }
  .message-content ul, .message-content ol {
    margin-left: 16px;
    margin-bottom: 10px;
  }
  .message-content li {
    margin-bottom: 4px;
  }
  .message-content strong, .message-content b {
    font-weight: 700;
  }
  .message-content em, .message-content i {
    font-style: italic;
  }
  .message-content blockquote {
    border-left: 4px solid rgba(0,0,0,0.2);
    padding-left: 12px;
    margin: 8px 0;
    opacity: 0.85;
  }
  .message-content code {
    background-color: rgba(0,0,0,0.08);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 0.9em;
  }
  .message-content-own,
  .message-content-own p,
  .message-content-own li,
  .message-content-own h1,
  .message-content-own h2,
  .message-content-own h3,
  .message-content-own strong,
  .message-content-own b,
  .message-content-own em,
  .message-content-own i,
  .message-content-own span {
    color: white !important;
  }
  .message-content-own a {
    color: rgba(255,255,255,0.85) !important;
    text-decoration: underline;
  }
  .message-content-own blockquote {
    border-left-color: rgba(255,255,255,0.4);
    color: rgba(255,255,255,0.85) !important;
  }
  .message-content-own code {
    background-color: rgba(255,255,255,0.2);
    color: white !important;
  }
`;

// Inyectar estilos una sola vez
if (typeof document !== 'undefined' && !document.getElementById('group-chat-message-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'group-chat-message-styles';
  styleEl.textContent = groupChatStyles;
  document.head.appendChild(styleEl);
}

export default GroupChatsPage;
