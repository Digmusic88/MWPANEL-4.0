import React, { useState, useEffect, useRef } from 'react';
import { formatDateToMadrid, formatDateTimeShort, formatRelativeTime } from '../../utils/dateUtils';
import dayjs from 'dayjs';
import {
  Button,
  Modal,
  Popconfirm,
  Form,
  Select,
  Input,
  DatePicker,
  Switch,
  message as antMessage,
  Typography,
  Spin,
  Empty,
  Badge,
  Avatar,
  Space,
  Tag,
  Tooltip,
  Dropdown,
  Tabs,
  Card,
  List,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  MessageOutlined,
  PlusOutlined,
  UserOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  MoreOutlined,
  PaperClipOutlined,
  FileOutlined,
  DownloadOutlined,
  CloseOutlined,
  SearchOutlined,
  ControlOutlined,
  MailOutlined,
  SaveOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import VoiceNotePlayer from '../../components/communications/VoiceNotePlayer';
import { useResponsive } from '../../hooks/useResponsive';
import useClassGroups from '../../hooks/useClassGroups';
import MessagingEditor from '../../components/communications/MessagingEditor';
import ImageWithAuth from '../../components/communications/ImageWithAuth';
import VideoWithAuth from '../../components/communications/VideoWithAuth';
import MediaGalleryModal from '../../components/communications/MediaGalleryModal';
import type { GalleryMediaItem } from '../../components/communications/MediaGalleryModal';
import LinkPreviewCard, { extractUrls } from '../../components/communications/LinkPreviewCard';
import YouTubePlayerModal from '../../components/communications/YouTubePlayerModal';
import apiClient from '../../services/apiClient';
import VoiceRecorderButton from '../../components/communications/VoiceRecorderButton';

const { Title, Text } = Typography;
const { Option } = Select;

import FamilyChildrenTags from '../../components/communications/FamilyChildrenTags';
import useDraftAutosave, { DraftStatus } from '../../hooks/useDraftAutosave';
import DraftSaveIndicator from '../../components/communications/DraftSaveIndicator';

// Interfaces basadas en el sistema existente de mensajes
interface MessageAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: string;
  url?: string; // Google Drive URL for audio notes
}

interface Message {
  id: string;
  subject: string;
  content: string;
  type: 'direct' | 'group' | 'announcement' | 'notification';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'sent' | 'delivered' | 'read';
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
  recipientId?: string;
  targetGroup?: {
    id: string;
    name: string;
  };
  relatedStudent?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  replies?: Message[];
  attachments?: MessageAttachment[];
  isEdited?: boolean;
  editedAt?: string;
  isDraft?: boolean;
}

interface ConversationThread {
  participantId: string;
  participant: {
    id: string;
    role?: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    familyInfo?: {
      children: string;
      childrenCount: number;
    };
  };
  messages: Message[];
  unreadCount: number;
  lastMessage: Message;
  lastMessageAt: string;
}

// Helper function para formatear nombres de usuario con información de familia
const formatUserName = (user: {
  profile: { firstName: string; lastName: string };
  role?: string;
  familyInfo?: { children: string; childrenCount: number };
}): string => {
  const baseName = `${user.profile.firstName} ${user.profile.lastName}`;

  if (user.role === 'family' && user.familyInfo?.children) {
    return `${baseName} (${user.familyInfo.children})`;
  }

  return baseName;
};

// Helper function para asegurar que familyInfo esté presente buscando en availableUsers si es necesario
const getUserWithFamilyInfo = (
  user: { id: string; role?: string; profile: { firstName: string; lastName: string }; familyInfo?: { children: string; childrenCount: number } },
  availableUsersLookup: Array<{ id: string; role: string; familyInfo?: { children: string; childrenCount: number } }>
): typeof user => {
  if (user.familyInfo) {
    return user;
  }

  if (user.role === 'family' && availableUsersLookup.length > 0) {
    const foundUser = availableUsersLookup.find(u => u.id === user.id);
    if (foundUser?.familyInfo) {
      return {
        ...user,
        familyInfo: foundUser.familyInfo
      };
    }
  }

  return user;
};


const ConversationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { isMobile } = useResponsive();
  const { classGroups } = useClassGroups();
  const { decrementMessagesBadge, fetchMessagesBadge } = useNotificationStore();

  // Estados
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);

  // Paginación: acumulamos mensajes página a página y re-agrupamos conversaciones
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allMessages, setAllMessages] = useState<Message[]>([]);

  // Paginación de la conversación abierta (carga el hilo 1:1 con scroll infinito hacia arriba)
  const THREAD_PAGE_SIZE = 30;
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [threadPage, setThreadPage] = useState(1);
  const [threadHasMore, setThreadHasMore] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadLoadingMore, setThreadLoadingMore] = useState(false);
  // Buscador dentro de la conversación
  const [threadSearchInput, setThreadSearchInput] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  const restoreScrollRef = React.useRef<{ height: number; top: number } | null>(null);
  const shouldScrollToBottomRef = React.useRef(false);

  // Estados para borradores
  const [drafts, setDrafts] = useState<Message[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [mainActiveTab, setMainActiveTab] = useState<'conversations' | 'drafts'>('conversations');
  const [selectedDraft, setSelectedDraft] = useState<Message | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [draftEditContent, setDraftEditContent] = useState<string>('');

  // Estados para edición de mensajes enviados
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editMessageContent, setEditMessageContent] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Estados para borradores en conversaciones activas
  const [conversationDraft, setConversationDraft] = useState<string>('');
  const [savingConversationDraft, setSavingConversationDraft] = useState(false);
  const [loadingConversationDraft, setLoadingConversationDraft] = useState(false);
  const [currentEditorContent, setCurrentEditorContent] = useState<string>('');

  // Estados para archivos adjuntos
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [conversationFiles, setConversationFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const conversationFileInputRef = React.useRef<HTMLInputElement>(null);

  // Estado para grabación de voz en conversaciones
  const [voiceRecordingActive, setVoiceRecordingActive] = useState(false);
  // Estado para grabación de voz en modal de nuevo mensaje
  const [modalVoiceRecordingActive, setModalVoiceRecordingActive] = useState(false);

  // Ref para scroll automático
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<{
    id: string;
    email: string;
    role: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    familyInfo?: {
      children: string;
      childrenCount: number;
    };
  }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendMethod, setSendMethod] = useState<'individual' | 'bulk'>('individual');
  const [bulkRecipients, setBulkRecipients] = useState<string[]>([]);

  // Estados para selección de padres por grupos de clase
  const [selectedClassGroups, setSelectedClassGroups] = useState<string[]>([]);
  const [loadingParentsByGroups, setLoadingParentsByGroups] = useState(false);

  // Estado para búsqueda de conversaciones
  const [searchText, setSearchText] = useState<string>('');

  // Estado para modo admin
  const [adminMode, setAdminMode] = useState<'direct' | 'supervision' | null>(
    user?.role === 'admin' ? 'direct' : null
  );

  // Contadores de mensajes no leídos para las pestañas de admin
  const [directUnreadCount, setDirectUnreadCount] = useState<number>(0);
  const [supervisionUnreadCount, setSupervisionUnreadCount] = useState<number>(0);

  // Media gallery (images + videos), YouTube player, and link previews
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [youtubeVisible, setYoutubeVisible] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');

  // Form para nuevo mensaje
  const [form] = Form.useForm();
  // Autoguardado local del modal "Nuevo Mensaje": conserva el texto aunque
  // se cierre el modal sin querer, se recargue la página o se navegue fuera.
  const composeAutosave = useDraftAutosave('conversations-new-message');
  // Autoguardado de la respuesta EN EL SERVIDOR (persiste tras recargar y entre dispositivos)
  const [replyDraftStatus, setReplyDraftStatus] = useState<DraftStatus>('idle');
  const [replyDraftSavedAt, setReplyDraftSavedAt] = useState<Date | null>(null);
  const replySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Participantes cuyas conversaciones tienen un borrador pendiente (para el indicador en la lista)
  const [draftParticipantIds, setDraftParticipantIds] = useState<Set<string>>(new Set());

  // Envíos programados (estilo Gmail)
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleWhen, setScheduleWhen] = useState<any>(null);
  const [scheduleToAll, setScheduleToAll] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledListOpen, setScheduledListOpen] = useState(false);
  const [scheduledList, setScheduledList] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  // Participantes con un envío programado pendiente (para el indicador en la lista)
  const [scheduledParticipantIds, setScheduledParticipantIds] = useState<Set<string>>(new Set());
  // Edición de un envío programado
  const [editingScheduled, setEditingScheduled] = useState<any>(null);
  const [editSchedContent, setEditSchedContent] = useState<string>('');
  const [editSchedSubject, setEditSchedSubject] = useState<string>('');
  const [editSchedWhen, setEditSchedWhen] = useState<any>(null);
  const [savingSchedEdit, setSavingSchedEdit] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState<string>('');

  // Al abrir una conversación: cargar el hilo completo paginado y resetear búsqueda.
  useEffect(() => {
    if (selectedConversation?.participantId) {
      setThreadSearchInput('');
      setThreadSearch('');
      setThreadMessages([]);
      setThreadPage(1);
      setThreadHasMore(false);
      loadThreadMessages(selectedConversation.participantId, { page: 1 });
    } else {
      setThreadMessages([]);
      setThreadHasMore(false);
      setThreadSearchInput('');
      setThreadSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.participantId]);

  // Scroll: o bien restaura posición tras prepend (cargar antiguos), o baja al final tras nueva carga/envío.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (restoreScrollRef.current) {
      const { height: prevHeight, top: prevTop } = restoreScrollRef.current;
      // Tras prepend, mantener la posición visual del usuario añadiendo el delta de alto.
      requestAnimationFrame(() => {
        const newHeight = container.scrollHeight;
        container.scrollTop = prevTop + (newHeight - prevHeight);
        restoreScrollRef.current = null;
      });
      return;
    }

    if (shouldScrollToBottomRef.current) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        shouldScrollToBottomRef.current = false;
      });
    }
  }, [threadMessages]);

  // useEffect para actualizar conversación seleccionada cuando las conversaciones cambian
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const updatedConversation = conversations.find(
        c => c.participantId === selectedConversation.participantId
      );
      if (updatedConversation) {
        setSelectedConversation(updatedConversation);
      }
    }
  }, [conversations]);

  // Cargar usuarios disponibles
  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await apiClient.get('/communications/available-recipients');
      const users = response.data || [];

      const filteredUsers = users
        .filter((u: any) => u.id !== user?.id)
        .filter((u: any) => {
          const firstName = u.profile?.firstName || u.firstName || '';
          const lastName = u.profile?.lastName || u.lastName || '';
          const displayName = u.displayName || '';

          if (!firstName.trim() && !lastName.trim() && !displayName.trim()) {
            return false;
          }

          if (firstName === 'Sin nombre') {
            return false;
          }

          return true;
        })
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          profile: {
            firstName: u.profile?.firstName || u.firstName || u.displayName?.split(' ')[0] || 'Usuario',
            lastName: u.profile?.lastName || u.lastName || u.displayName?.split(' ').slice(1).join(' ') || ''
          },
          displayName: u.displayName || `${u.profile?.firstName || u.firstName || ''} ${u.profile?.lastName || u.lastName || ''}`.trim(),
          familyInfo: u.familyInfo
        }))
        .filter((u, index, arr) =>
          arr.findIndex(usr => usr.id === u.id) === index
        );

      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading available users:', error);
      antMessage.error('Error al cargar usuarios disponibles');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Función para enriquecer conversaciones con familyInfo de availableUsers
  const enrichConversationsWithFamilyInfo = (convList: ConversationThread[]) => {
    return convList.map(conversation => {
      const userWithFamilyInfo = availableUsers.find(u => u.id === conversation.participant.id);

      if (userWithFamilyInfo && userWithFamilyInfo.role === 'family') {
        const enrichedParticipant = {
          ...conversation.participant,
          familyInfo: userWithFamilyInfo.familyInfo
        };

        return {
          ...conversation,
          participant: enrichedParticipant
        };
      }

      return conversation;
    });
  };

  // Cargar mensajes paginados y organizarlos en conversaciones.
  // append=true acumula con los ya cargados (botón "Cargar mensajes anteriores").
  const loadConversations = async (append: boolean = false, page: number = 1) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const PAGE_SIZE = 50;
      let pageMessages: Message[] = [];
      let hasMore = false;

      if (user?.role === 'admin' && adminMode) {
        const response = await apiClient.get(
          `/communications/admin/messages?mode=${adminMode}&page=${page}&limit=${PAGE_SIZE}`
        );
        pageMessages = response.data.messages || [];
        hasMore = response.data.hasMore || false;
      } else {
        const response = await apiClient.get(`/communications/messages?page=${page}&limit=${PAGE_SIZE}`);
        pageMessages = response.data.data || [];
        hasMore = response.data.hasMore || false;
      }

      const mergedSource = append ? [...allMessages, ...pageMessages] : pageMessages;
      setAllMessages(mergedSource);
      setHasMoreMessages(hasMore);
      setMessagesPage(page);

      const conversationMap = new Map<string, ConversationThread>();

      mergedSource.forEach((message) => {
        const isMyMessage = message.sender.id === user?.id;
        const participant = isMyMessage ? message.recipient : message.sender;

        if (!participant) return;

        const participantId = participant.id;

        if (!conversationMap.has(participantId)) {
          conversationMap.set(participantId, {
            participantId,
            participant,
            messages: [],
            unreadCount: 0,
            lastMessage: message,
            lastMessageAt: message.createdAt,
          });
        }

        const conversation = conversationMap.get(participantId)!;
        conversation.messages.push(message);

        if (new Date(message.createdAt) > new Date(conversation.lastMessageAt)) {
          conversation.lastMessage = message;
          conversation.lastMessageAt = message.createdAt;
        }

        if (!message.isRead && message.sender.id !== user?.id) {
          conversation.unreadCount++;
        }

        if (message.replies) {
          message.replies.forEach((reply) => {
            conversation.messages.push(reply);
            if (!reply.isRead && reply.sender.id !== user?.id) {
              conversation.unreadCount++;
            }
          });
        }
      });

      const conversationList = Array.from(conversationMap.values()).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      conversationList.forEach(conversation => {
        conversation.messages.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

      if (availableUsers.length > 0) {
        const enrichedConversations = enrichConversationsWithFamilyInfo(conversationList);
        setConversations(enrichedConversations);
      } else {
        setConversations(conversationList);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      antMessage.error('Error al cargar las conversaciones');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadOlderMessages = () => {
    if (!hasMoreMessages || loadingMore) return;
    loadConversations(true, messagesPage + 1);
  };

  // Carga (o pagina) los mensajes de un hilo 1:1 con un usuario concreto.
  // - page=1, append=false: primera carga al abrir la conversación o tras búsqueda
  // - append=true: scroll hacia arriba para cargar mensajes más antiguos
  const loadThreadMessages = async (
    partnerId: string,
    opts: { page?: number; append?: boolean; search?: string } = {}
  ): Promise<void> => {
    const { page = 1, append = false, search = '' } = opts;
    try {
      if (append) {
        setThreadLoadingMore(true);
        const container = messagesContainerRef.current;
        if (container) {
          restoreScrollRef.current = {
            height: container.scrollHeight,
            top: container.scrollTop,
          };
        }
      } else {
        setThreadLoading(true);
      }

      const params = new URLSearchParams();
      params.set('partnerId', partnerId);
      params.set('page', String(page));
      params.set('limit', String(THREAD_PAGE_SIZE));
      if (search && search.trim()) params.set('search', search.trim());

      const response = await apiClient.get(`/communications/messages?${params.toString()}`);
      // Excluir borradores: nunca deben aparecer como globos de mensaje enviado en el hilo
      const fetched: Message[] = (response.data?.data || []).filter((m: any) => !m.isDraft);
      const hasMore: boolean = response.data?.hasMore || false;

      // Backend devuelve más recientes primero (DESC). En UI mostramos ascendente.
      const sortedAsc = [...fetched].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      if (append) {
        setThreadMessages(prev => [...sortedAsc, ...prev]);
      } else {
        setThreadMessages(sortedAsc);
        shouldScrollToBottomRef.current = true;
      }
      setThreadPage(page);
      setThreadHasMore(hasMore);
    } catch (error) {
      console.error('Error loading thread messages:', error);
      antMessage.error('Error al cargar los mensajes de la conversación');
    } finally {
      setThreadLoading(false);
      setThreadLoadingMore(false);
    }
  };

  // Recarga el hilo activo (página 1) tras enviar/editar/eliminar mensajes.
  // Conserva el filtro de búsqueda actual.
  const refreshActiveThread = async () => {
    if (!selectedConversation?.participantId) return;
    await loadThreadMessages(selectedConversation.participantId, {
      page: 1,
      search: threadSearch,
    });
  };

  // Handler de scroll en el área de mensajes: al subir cerca del top, carga más antiguos.
  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!selectedConversation) return;
    const target = e.currentTarget;
    if (
      target.scrollTop < 80 &&
      threadHasMore &&
      !threadLoadingMore &&
      !threadLoading
    ) {
      loadThreadMessages(selectedConversation.participantId, {
        page: threadPage + 1,
        append: true,
        search: threadSearch,
      });
    }
  };

  // Función para obtener contadores de mensajes no leídos para las pestañas de admin
  const loadAdminUnreadCounts = async () => {
    if (user?.role !== 'admin') return;

    try {
      const [directResponse, supervisionResponse] = await Promise.all([
        apiClient.get('/communications/admin/messages?mode=direct'),
        apiClient.get('/communications/admin/messages?mode=supervision')
      ]);

      const directMessages = directResponse.data.messages || [];
      let directUnread = 0;
      directMessages.forEach((msg: Message) => {
        if (!msg.isRead && msg.sender.id !== user?.id) {
          directUnread++;
        }
        if (msg.replies) {
          msg.replies.forEach((reply) => {
            if (!reply.isRead && reply.sender.id !== user?.id) {
              directUnread++;
            }
          });
        }
      });
      setDirectUnreadCount(directUnread);

      const supervisionMessages = supervisionResponse.data.messages || [];
      let supervisionUnread = 0;
      supervisionMessages.forEach((msg: Message) => {
        if (!msg.isRead && msg.sender.id !== user?.id) {
          supervisionUnread++;
        }
        if (msg.replies) {
          msg.replies.forEach((reply) => {
            if (!reply.isRead && reply.sender.id !== user?.id) {
              supervisionUnread++;
            }
          });
        }
      });
      setSupervisionUnreadCount(supervisionUnread);
    } catch (error) {
      console.error('Error loading admin unread counts:', error);
    }
  };

  // Cargar borradores del usuario
  const loadDrafts = async () => {
    try {
      setLoadingDrafts(true);
      const response = await apiClient.get('/communications/drafts');
      const draftsData = response.data || [];
      setDrafts(draftsData);
    } catch (error) {
      console.error('Error loading drafts:', error);
      antMessage.error('Error al cargar los borradores');
    } finally {
      setLoadingDrafts(false);
    }
  };

  // Eliminar un borrador
  const deleteDraft = async (draftId: string) => {
    try {
      await apiClient.delete(`/communications/drafts/${draftId}`);
      antMessage.success('Borrador eliminado');
      await loadDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      antMessage.error('Error al eliminar el borrador');
    }
  };

  // Enviar un borrador
  const sendDraft = async (draft: Message, content: string) => {
    try {
      setSending(true);

      await apiClient.delete(`/communications/messages/${draft.id}`);

      const messageData = {
        type: 'direct' as const,
        priority: draft.priority || 'normal',
        subject: draft.subject || 'Mensaje directo',
        content: content,
        recipientId: draft.recipient?.id || draft.recipientId,
        isDraft: false,
      };

      await apiClient.post('/communications/messages', messageData);

      antMessage.success('Mensaje enviado correctamente');
      setSelectedDraft(null);
      setEditingDraft(false);
      setDraftEditContent('');
      await loadDrafts();
      await loadConversations();
      await refreshActiveThread();
    } catch (error) {
      console.error('Error sending draft:', error);
      antMessage.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  // Actualizar contenido de un borrador
  const updateDraft = async (draftId: string, newContent: string) => {
    try {
      setSavingDraft(true);
      await apiClient.patch(`/communications/drafts/${draftId}`, {
        content: newContent,
      });
      antMessage.success('Borrador actualizado');
      await loadDrafts();
    } catch (error) {
      console.error('Error updating draft:', error);
      antMessage.error('Error al actualizar el borrador');
    } finally {
      setSavingDraft(false);
    }
  };

  // Enviar nuevo mensaje (individual o bulk)
  const sendMessage = async (content: string, recipientId?: string) => {
    if (sendMethod === 'bulk') {
      if (bulkRecipients.length === 0) {
        antMessage.error('Selecciona al menos un destinatario para envío masivo');
        return;
      }
      await sendBulkMessage(content);
      return;
    }

    if (!recipientId && !selectedConversation) {
      antMessage.error('No se ha seleccionado un destinatario');
      return;
    }

    try {
      setSending(true);

      const finalRecipientId = recipientId || selectedConversation?.participantId;

      const filesToSend = showNewMessage ? selectedFiles : conversationFiles;

      if (filesToSend.length > 0) {
        const formData = new FormData();
        formData.append('type', 'direct');
        formData.append('priority', 'normal');
        formData.append('subject', 'Mensaje directo');
        formData.append('content', content);
        formData.append('recipientId', finalRecipientId);

        filesToSend.forEach((file) => {
          formData.append('attachments', file);
        });

        await apiClient.post('/communications/messages/with-attachments', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        antMessage.success(`Mensaje enviado con ${filesToSend.length} archivo(s) adjunto(s)`);

        if (showNewMessage) {
          setSelectedFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          setConversationFiles([]);
          if (conversationFileInputRef.current) conversationFileInputRef.current.value = '';
        }
      } else {
        const messageData = {
          type: 'direct' as const,
          priority: 'normal' as const,
          subject: 'Mensaje directo',
          content,
          recipientId: finalRecipientId,
        };

        await apiClient.post('/communications/messages', messageData);
        antMessage.success('Mensaje enviado correctamente');
      }

      await loadConversations();
      await refreshActiveThread();

      if (showNewMessage) {
        setShowNewMessage(false);
        form.resetFields();
        setSendMethod('individual');
        setBulkRecipients([]);
        setNewMessageContent('');
        composeAutosave.clearDraft();
      }

      setCurrentEditorContent('');
      setReplyDraftStatus('idle');
      setReplyDraftSavedAt(null);
      // Borrar el borrador del destinatario (vale tanto para el modal como para la respuesta)
      const sentRecipientId = finalRecipientId || selectedConversation?.participantId;
      if (sentRecipientId) clearReplyDraft(sentRecipientId);
    } catch (error) {
      console.error('Error sending message:', error);
      antMessage.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  // Enviar nota de voz en conversación activa
  const sendVoiceMessage = async (audioFile: File) => {
    if (!selectedConversation) {
      antMessage.error('No se ha seleccionado una conversación');
      return;
    }
    try {
      setSending(true);
      const formData = new FormData();
      formData.append('type', 'direct');
      formData.append('priority', 'normal');
      formData.append('subject', 'Nota de voz');
      formData.append('content', '🎤 Nota de voz');
      formData.append('recipientId', selectedConversation.participantId);
      formData.append('attachments', audioFile);

      await apiClient.post('/communications/messages/with-attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      antMessage.success('Nota de voz enviada');
      await loadConversations();
      await refreshActiveThread();
    } catch (error) {
      console.error('Error sending voice message:', error);
      antMessage.error('Error al enviar la nota de voz');
    } finally {
      setSending(false);
    }
  };

  // Enviar mensaje masivo con espaciado para Resend
  const sendBulkMessage = async (content: string) => {
    try {
      setSending(true);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < bulkRecipients.length; i++) {
        const recipientId = bulkRecipients[i];

        try {
          if (selectedFiles.length > 0) {
            const formData = new FormData();
            formData.append('type', 'direct');
            formData.append('priority', 'normal');
            formData.append('subject', 'Mensaje masivo');
            formData.append('content', content);
            formData.append('recipientId', recipientId);

            selectedFiles.forEach((file) => {
              formData.append('attachments', file);
            });

            await apiClient.post('/communications/messages/with-attachments', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
          } else {
            const messageData = {
              type: 'direct' as const,
              priority: 'normal' as const,
              subject: 'Mensaje masivo',
              content,
              recipientId,
            };

            await apiClient.post('/communications/messages', messageData);
          }

          successCount++;

          if (i < bulkRecipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          console.error(`Error sending to ${recipientId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        const filesMessage = selectedFiles.length > 0 ? ` con ${selectedFiles.length} archivo(s)` : '';
        antMessage.success(`Mensaje${filesMessage} enviado a ${successCount} destinatario${successCount > 1 ? 's' : ''}`);
      }

      if (errorCount > 0) {
        antMessage.warning(`Error enviando a ${errorCount} destinatario${errorCount > 1 ? 's' : ''}`);
      }

      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadConversations();

      if (showNewMessage) {
        setShowNewMessage(false);
        form.resetFields();
        setSendMethod('individual');
        setBulkRecipients([]);
        setNewMessageContent('');
        composeAutosave.clearDraft();
      }
    } catch (error) {
      console.error('Error in bulk messaging:', error);
      antMessage.error('Error en el envío masivo');
    } finally {
      setSending(false);
    }
  };

  // Guardar mensaje como borrador
  // ===== ENVÍOS PROGRAMADOS =====
  // Contexto del envío que se va a programar (sirve para el modal de nuevo mensaje y la respuesta)
  const [scheduleContent, setScheduleContent] = useState('');
  const [scheduleBaseTarget, setScheduleBaseTarget] = useState<any>(null);
  const [scheduleFromReply, setScheduleFromReply] = useState(false);

  // Programar desde el modal "Nuevo Mensaje"
  const openSchedule = () => {
    const content = form.getFieldValue('content') || newMessageContent;
    const plain = (content || '').replace(/<[^>]*>/g, '').trim();
    if (!plain) {
      antMessage.error('Escribe el mensaje antes de programar el envío');
      return;
    }
    let base: any;
    if (sendMethod === 'bulk' && selectedClassGroups.length > 0) {
      base = { targetType: 'groups', classGroupIds: selectedClassGroups };
    } else {
      const rid = form.getFieldValue('recipientId');
      base = rid ? { targetType: 'individual', recipientId: rid } : null;
    }
    setScheduleContent(content);
    setScheduleBaseTarget(base);
    setScheduleFromReply(false);
    setScheduleToAll(false);
    setScheduleWhen(dayjs().add(1, 'hour').startOf('minute'));
    setScheduleOpen(true);
  };

  // Programar desde la caja de respuesta de una conversación
  const openScheduleReply = () => {
    const plain = (currentEditorContent || '').replace(/<[^>]*>/g, '').trim();
    if (!plain) {
      antMessage.error('Escribe la respuesta antes de programar el envío');
      return;
    }
    if (!selectedConversation?.participantId) {
      antMessage.error('No hay conversación seleccionada');
      return;
    }
    setScheduleContent(currentEditorContent);
    setScheduleBaseTarget({ targetType: 'individual', recipientId: selectedConversation.participantId });
    setScheduleFromReply(true);
    setScheduleToAll(false);
    setScheduleWhen(dayjs().add(1, 'hour').startOf('minute'));
    setScheduleOpen(true);
  };

  const confirmSchedule = async () => {
    if (!scheduleWhen || scheduleWhen.isBefore(dayjs())) {
      antMessage.error('Elige una fecha y hora futuras');
      return;
    }
    let payload: any = {
      subject: 'Mensaje',
      content: scheduleContent,
      contentType: 'html',
      priority: 'normal',
      scheduledFor: scheduleWhen.toISOString(),
    };
    if (scheduleToAll) {
      payload.targetType = 'all';
    } else if (scheduleBaseTarget) {
      payload = { ...payload, ...scheduleBaseTarget };
    } else {
      antMessage.error('Selecciona un destinatario, un grupo o marca "todos los usuarios"');
      return;
    }

    try {
      setScheduling(true);
      await apiClient.post('/communications/scheduled-messages', payload);
      antMessage.success(`Envío programado para el ${scheduleWhen.format('DD/MM/YYYY [a las] HH:mm')}`);
      loadScheduled(true); // refrescar indicador en la lista
      setScheduleOpen(false);
      if (scheduleFromReply) {
        // Limpiar la caja de respuesta y su borrador
        const pid = scheduleBaseTarget?.recipientId;
        setCurrentEditorContent('');
        setReplyDraftStatus('idle');
        setReplyDraftSavedAt(null);
        if (pid) clearReplyDraft(pid);
      } else {
        setShowNewMessage(false);
        form.resetFields();
        setNewMessageContent('');
        setSelectedFiles([]);
        setSendMethod('individual');
        setSelectedClassGroups([]);
        composeAutosave.clearDraft();
      }
    } catch (e: any) {
      antMessage.error(e.response?.data?.message || 'No se pudo programar el envío');
    } finally {
      setScheduling(false);
    }
  };

  const loadScheduled = async (silent = false) => {
    // Los envíos programados son una función de profesores/admin; familias y
    // alumnos no tienen acceso al endpoint (403). Evita llamadas y errores en consola.
    if (user?.role !== 'admin' && user?.role !== 'teacher') return;
    try {
      if (!silent) setLoadingScheduled(true);
      const res = await apiClient.get('/communications/scheduled-messages');
      const list = res.data || [];
      setScheduledList(list);
      // Conjunto de participantes con programación pendiente individual (para la lista)
      const ids = new Set<string>(
        list
          .filter((s: any) => s.status === 'pending' && s.targetType === 'individual' && s.recipientId)
          .map((s: any) => s.recipientId),
      );
      setScheduledParticipantIds(ids);
    } catch (e) {
      if (!silent) antMessage.error('No se pudieron cargar los envíos programados');
    } finally {
      if (!silent) setLoadingScheduled(false);
    }
  };

  const cancelScheduled = async (id: string) => {
    try {
      await apiClient.delete(`/communications/scheduled-messages/${id}`);
      antMessage.success('Envío programado cancelado');
      loadScheduled();
    } catch (e: any) {
      antMessage.error(e.response?.data?.message || 'No se pudo cancelar');
    }
  };

  // Eliminar definitivamente un envío ya no pendiente (cancelado / enviado / error)
  const deleteScheduled = async (id: string) => {
    try {
      await apiClient.delete(`/communications/scheduled-messages/${id}/permanent`);
      antMessage.success('Envío eliminado');
      loadScheduled();
    } catch (e: any) {
      antMessage.error(e.response?.data?.message || 'No se pudo eliminar');
    }
  };

  // Descripción legible de los destinatarios de un envío programado (clave para masivos)
  const scheduledRecipients = (s: any): string => {
    if (s.targetType === 'all') return 'Todos los usuarios';
    if (s.targetType === 'groups') {
      const names = (s.classGroupIds || []).map(
        (id: string) => classGroups?.find((g: any) => g.id === id)?.name || id,
      );
      return names.length ? names.join(', ') : 'Sin grupos';
    }
    return 'Destinatario individual';
  };
  const isBulkScheduled = (s: any) => s.targetType === 'all' || s.targetType === 'groups';

  // Abrir edición de un envío programado
  const openEditScheduled = (s: any) => {
    setEditingScheduled(s);
    setEditSchedContent(s.content || '');
    setEditSchedSubject(s.subject || '');
    setEditSchedWhen(s.scheduledFor ? dayjs(s.scheduledFor) : null);
  };

  // Guardar la edición (se aplica a todos los destinatarios en el caso masivo)
  const saveScheduledEdit = async () => {
    if (!editingScheduled) return;
    const plain = (editSchedContent || '').replace(/<[^>]*>/g, '').trim();
    if (!plain) { antMessage.error('El mensaje no puede estar vacío'); return; }
    if (!editSchedWhen || editSchedWhen.isBefore(dayjs())) { antMessage.error('Elige una fecha y hora futuras'); return; }
    try {
      setSavingSchedEdit(true);
      await apiClient.patch(`/communications/scheduled-messages/${editingScheduled.id}`, {
        subject: editSchedSubject || 'Mensaje',
        content: editSchedContent,
        scheduledFor: editSchedWhen.toISOString(),
      });
      antMessage.success(isBulkScheduled(editingScheduled)
        ? 'Mensaje masivo actualizado para todos los destinatarios'
        : 'Envío programado actualizado');
      setEditingScheduled(null);
      loadScheduled();
    } catch (e: any) {
      antMessage.error(e.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingSchedEdit(false);
    }
  };

  const saveAsDraft = async () => {
    try {
      setSavingDraft(true);
      const values = form.getFieldsValue();

      const recipientId = sendMethod === 'individual'
        ? values.recipientId
        : bulkRecipients[0];

      if (!recipientId) {
        antMessage.error('Selecciona al menos un destinatario');
        return;
      }

      if (!values.content || values.content.trim() === '') {
        antMessage.error('Escribe algo en el mensaje');
        return;
      }

      const draftData = {
        type: 'direct' as const,
        priority: 'normal' as const,
        subject: 'Borrador',
        content: values.content,
        recipientId,
        isDraft: true,
      };

      await apiClient.post('/communications/messages', draftData);
      antMessage.success('Mensaje guardado como borrador. Ve a la pestaña "Borradores" para verlo.');

      setShowNewMessage(false);
      form.resetFields();
      setSendMethod('individual');
      setBulkRecipients([]);
      setSelectedFiles([]);
      setNewMessageContent('');
      composeAutosave.clearDraft();
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadDrafts();
      setMainActiveTab('drafts');
    } catch (error) {
      console.error('Error saving draft:', error);
      antMessage.error('Error al guardar el borrador');
    } finally {
      setSavingDraft(false);
    }
  };

  // Marcar mensajes como leídos
  const markAsRead = async (messageId: string) => {
    try {
      // Actualización optimista del badge antes de que llegue el WebSocket
      decrementMessagesBadge(1);
      await apiClient.patch(`/communications/messages/${messageId}`, {
        isRead: true,
      });
      await loadConversations();
      loadAdminUnreadCounts();
      // Refrescar el hilo en vista para reflejar el estado leído
      await refreshActiveThread();
    } catch (error) {
      console.error('Error marking message as read:', error);
      antMessage.error('Error al marcar como leído');
    }
  };

  // Mantener el conjunto de participantes con borrador a partir de los borradores cargados
  // (esto es lo que enciende el indicador "Borrador" en la lista de conversaciones)
  useEffect(() => {
    const ids = new Set<string>();
    (drafts || []).forEach((d: any) => {
      const id = d?.recipient?.id || d?.recipientId;
      if (id) ids.add(id);
    });
    setDraftParticipantIds(ids);
  }, [drafts]);

  // Efecto inicial
  useEffect(() => {
    loadConversations();
    loadAvailableUsers();
    loadAdminUnreadCounts();
    loadDrafts();
    loadScheduled(true); // para el indicador "Programado" en la lista
  }, []);

  // Recargar conversaciones cuando cambia el modo admin
  useEffect(() => {
    if (user?.role === 'admin' && adminMode) {
      loadConversations();
      loadAdminUnreadCounts();
    }
  }, [adminMode]);

  useEffect(() => {
    if (showNewMessage && availableUsers.length === 0) {
      loadAvailableUsers();
    }
  }, [showNewMessage]);

  // Ref para evitar loops infinitos de enriquecimiento
  const lastEnrichmentKey = React.useRef<string>('');

  useEffect(() => {
    if (availableUsers.length > 0 && conversations.length > 0) {
      const enrichmentKey = `${availableUsers.length}-${conversations.map(c => c.participantId).join(',')}`;

      if (lastEnrichmentKey.current !== enrichmentKey) {
        const needsEnrichment = conversations.some(conv =>
          conv.participant.role === 'family' && !conv.participant.familyInfo
        );

        if (needsEnrichment) {
          const enrichedConversations = enrichConversationsWithFamilyInfo(conversations);
          lastEnrichmentKey.current = enrichmentKey;
          setConversations(enrichedConversations);
        } else {
          lastEnrichmentKey.current = enrichmentKey;
        }
      }
    }
  }, [availableUsers, conversations]);

  // Marcar mensaje como no leído
  const markAsUnread = async (messageId: string) => {
    try {
      await apiClient.post(`/communications/messages/${messageId}/mark-unread`);
      antMessage.success('Mensaje marcado como no leído');
      await loadConversations();
      loadAdminUnreadCounts();
      await refreshActiveThread();
    } catch (error) {
      console.error('Error marking message as unread:', error);
      antMessage.error('Error al marcar como no leído');
    }
  };

  // Manejar selección de padres por grupos de clase
  const handleParentsByClassGroups = async () => {
    if (selectedClassGroups.length === 0) {
      antMessage.warning('Debe seleccionar al menos un grupo de clase');
      return;
    }

    try {
      setLoadingParentsByGroups(true);

      const { communicationsService } = await import('../../services/communications.service');
      const parents = await communicationsService.getParentsByClassGroups(selectedClassGroups);

      if (parents.length === 0) {
        antMessage.info('No se encontraron padres en los grupos seleccionados');
        return;
      }

      const parentIds = parents.map(p => p.id);

      setBulkRecipients(prevRecipients => {
        const combinedIds = [...prevRecipients, ...parentIds];
        return Array.from(new Set(combinedIds));
      });

      antMessage.success(
        `${parents.length} padre${parents.length !== 1 ? 's' : ''} de los grupos seleccionados añadido${parents.length !== 1 ? 's' : ''}`
      );

      setSelectedClassGroups([]);
    } catch (error) {
      console.error('Error obteniendo padres por grupos:', error);
      antMessage.error('Error al obtener padres de los grupos seleccionados');
    } finally {
      setLoadingParentsByGroups(false);
    }
  };

  // Manejar selección de archivos para nuevo mensaje
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);

      if (selectedFiles.length + fileArray.length > 10) {
        antMessage.error('Máximo 10 archivos permitidos');
        return;
      }

      const invalidFiles = fileArray.filter(file => file.size > 50 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        antMessage.error(`Archivos demasiado grandes (máximo 50MB): ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }

      setSelectedFiles([...selectedFiles, ...fileArray]);
      antMessage.success(`${fileArray.length} archivo(s) seleccionado(s)`);
    }
  };

  // Manejar selección de archivos para conversación
  const handleConversationFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);

      if (conversationFiles.length + fileArray.length > 10) {
        antMessage.error('Máximo 10 archivos permitidos');
        return;
      }

      const invalidFiles = fileArray.filter(file => file.size > 50 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        antMessage.error(`Archivos demasiado grandes (máximo 50MB): ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }

      setConversationFiles([...conversationFiles, ...fileArray]);
      antMessage.success(`${fileArray.length} archivo(s) seleccionado(s)`);
    }
  };

  const removeSelectedFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  const removeConversationFile = (index: number) => {
    const newFiles = [...conversationFiles];
    newFiles.splice(index, 1);
    setConversationFiles(newFiles);
  };

  // Descargar archivo adjunto
  const downloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/communications/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      antMessage.success('Archivo descargado correctamente');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      antMessage.error('Error al descargar el archivo');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Eliminar mensaje
  const deleteMessage = async (messageId: string) => {
    try {
      await apiClient.delete(`/communications/messages/${messageId}`);
      antMessage.success('Mensaje eliminado correctamente');

      await loadConversations();
      await refreshActiveThread();

      if (selectedConversation) {
        const updatedConversation = conversations.find(
          c => c.participantId === selectedConversation.participantId
        );
        if (updatedConversation) {
          setSelectedConversation(updatedConversation);
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      antMessage.error('Error al eliminar el mensaje');
    }
  };

  // Eliminar mensaje para todos
  const deleteMessageForAll = async (messageId: string, conversationId: string) => {
    try {
      await apiClient.delete(`/communications/conversations/${conversationId}/messages/${messageId}/for-all`);
      antMessage.success('Mensaje eliminado para todos');

      await loadConversations();
      await refreshActiveThread();

      if (selectedConversation) {
        const updatedConversation = conversations.find(
          c => c.participantId === selectedConversation.participantId
        );
        if (updatedConversation) {
          setSelectedConversation(updatedConversation);
        }
      }
    } catch (error: any) {
      console.error('Error deleting message for all:', error);
      const errorMsg = error?.response?.data?.message || 'Error al eliminar el mensaje para todos';
      antMessage.error(errorMsg);
    }
  };

  // Editar mensaje enviado
  const editMessage = async (messageId: string, conversationId: string, newContent: string) => {
    try {
      setSavingEdit(true);
      await apiClient.patch(`/communications/conversations/${conversationId}/messages/${messageId}/edit`, {
        content: newContent,
      });
      antMessage.success('Mensaje editado correctamente');

      setEditingMessage(null);
      setEditMessageContent('');

      await loadConversations();
      await refreshActiveThread();
    } catch (error: any) {
      console.error('Error editing message:', error);
      const errorMsg = error?.response?.data?.message || 'Error al editar el mensaje';
      antMessage.error(errorMsg);
    } finally {
      setSavingEdit(false);
    }
  };

  // Guardar borrador en conversación activa
  const saveConversationDraftToServer = async (conversationId: string, content: string) => {
    try {
      setSavingConversationDraft(true);
      await apiClient.post(`/communications/conversations/${conversationId}/draft`, {
        content,
        contentType: 'html',
      });
      antMessage.success('Borrador guardado');
      setConversationDraft(content);
    } catch (error) {
      console.error('Error saving conversation draft:', error);
      antMessage.error('Error al guardar el borrador');
    } finally {
      setSavingConversationDraft(false);
    }
  };

  // Cargar borrador de conversación Y restaurarlo automáticamente en el editor
  const loadConversationDraft = async (conversationId: string) => {
    try {
      setLoadingConversationDraft(true);
      const response = await apiClient.get(`/communications/conversations/${conversationId}/draft`);
      const content = response.data?.content || '';
      setConversationDraft(content);
      if (content) {
        // Auto-restaurar: el borrador aparece directamente en el editor al abrir la conversación
        setCurrentEditorContent(content);
        setReplyDraftStatus('saved');
        setReplyDraftSavedAt(new Date());
      } else {
        setReplyDraftStatus('idle');
        setReplyDraftSavedAt(null);
      }
    } catch (error) {
      setConversationDraft('');
      setReplyDraftStatus('idle');
    } finally {
      setLoadingConversationDraft(false);
    }
  };

  // Autoguardado silencioso (con debounce) del borrador de respuesta en el servidor.
  // Es lo que hace que el mensaje a medio escribir persista tras recargar la página.
  const autoSaveConversationDraft = (participantId: string, content: string) => {
    if (replySaveTimer.current) clearTimeout(replySaveTimer.current);
    const plain = (content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!plain) {
      // Si se vacía el editor, eliminamos el borrador guardado
      setReplyDraftStatus('idle');
      setReplyDraftSavedAt(null);
      clearReplyDraft(participantId);
      return;
    }
    setReplyDraftStatus('saving');
    replySaveTimer.current = setTimeout(async () => {
      try {
        await apiClient.post(`/communications/conversations/${participantId}/draft`, {
          content,
          contentType: 'html',
        });
        setReplyDraftStatus('saved');
        setReplyDraftSavedAt(new Date());
        setConversationDraft(content);
        setDraftParticipantIds((prev) => {
          const next = new Set(prev);
          next.add(participantId);
          return next;
        });
      } catch (e) {
        setReplyDraftStatus('idle');
      }
    }, 1200);
  };

  // Eliminar el borrador (al enviar o al vaciar el editor)
  const clearReplyDraft = async (participantId: string) => {
    if (replySaveTimer.current) clearTimeout(replySaveTimer.current);
    setDraftParticipantIds((prev) => {
      const next = new Set(prev);
      next.delete(participantId);
      return next;
    });
    try {
      await apiClient.delete(`/communications/conversations/${participantId}/draft`);
    } catch (e) {
      // silencioso
    }
  };

  // Enviar borrador de conversación guardado
  const sendConversationDraftFromServer = async (conversationId: string) => {
    try {
      setSending(true);
      await apiClient.post(`/communications/conversations/${conversationId}/draft/send`);
      antMessage.success('Mensaje enviado correctamente');
      setConversationDraft('');
      await loadConversations();
      await refreshActiveThread();
    } catch (error: any) {
      console.error('Error sending conversation draft:', error);
      const errorMsg = error?.response?.data?.message || 'Error al enviar el mensaje';
      antMessage.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  // Eliminar borrador de conversación
  const deleteConversationDraftFromServer = async (conversationId: string) => {
    try {
      await apiClient.delete(`/communications/conversations/${conversationId}/draft`);
      setConversationDraft('');
      antMessage.success('Borrador eliminado');
    } catch (error) {
      console.error('Error deleting conversation draft:', error);
    }
  };

  const canEditMessage = (message: Message): boolean => {
    const hoursLimit = 24;
    const timeSinceCreation = Date.now() - new Date(message.createdAt).getTime();
    const hoursElapsed = timeSinceCreation / (1000 * 60 * 60);
    return message.sender.id === user?.id && hoursElapsed <= hoursLimit && !message.isDraft;
  };

  const canDeleteForAll = (message: Message): boolean => {
    const hoursLimit = 1;
    const timeSinceCreation = Date.now() - new Date(message.createdAt).getTime();
    const hoursElapsed = timeSinceCreation / (1000 * 60 * 60);
    return message.sender.id === user?.id && hoursElapsed <= hoursLimit;
  };

  // Eliminar conversación completa
  const deleteConversation = async (participantId: string, participantName: string) => {
    try {
      setConversations(prevConversations =>
        prevConversations.filter(conv => conv.participantId !== participantId)
      );

      if (selectedConversation?.participantId === participantId) {
        setSelectedConversation(null);
      }

      await apiClient.delete(`/communications/conversations/${participantId}`);
      antMessage.success(`Conversación con ${participantName} eliminada`);

      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      antMessage.error('Error al eliminar la conversación');
      loadConversations();
    }
  };

  // Marcar conversación como no vista
  const markConversationAsUnread = async (conversation: ConversationThread) => {
    try {
      const lastMsg = conversation.lastMessage;
      if (lastMsg && lastMsg.sender.id !== user?.id && lastMsg.isRead) {
        await apiClient.post(`/communications/messages/${lastMsg.id}/mark-unread`);
        antMessage.success('Conversación marcada como no vista');
        loadConversations();
        loadAdminUnreadCounts();
      } else {
        antMessage.info('No hay mensajes para marcar como no vistos');
      }
    } catch (error) {
      console.error('Error marking conversation as unread:', error);
      antMessage.error('Error al marcar conversación como no vista');
    }
  };

  // Gallery media (images + videos) from all messages in the selected conversation
  const allGalleryMedia: GalleryMediaItem[] = React.useMemo(() => {
    const media: GalleryMediaItem[] = [];
    const msgs = selectedConversation?.messages || [];
    msgs.forEach((msg) => {
      const senderName = msg.sender?.profile ? `${msg.sender.profile.firstName} ${msg.sender.profile.lastName}` : 'Usuario';
      msg.attachments?.forEach((att) => {
        if (att.mimeType?.startsWith('image/')) {
          media.push({ id: att.id, filename: att.originalName || att.filename || 'imagen', sender: senderName, date: '', type: 'image' });
        } else if (att.mimeType?.startsWith('video/')) {
          media.push({ id: att.id, filename: att.originalName || att.filename || 'video', sender: senderName, date: '', type: 'video' });
        }
      });
    });
    return media;
  }, [selectedConversation?.messages]);

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

  // Renderizar mensaje individual - updated styling with purple own messages
  const renderMessage = (message: Message, showActions = true) => {
    const isMyMessage = message.sender.id === user?.id;
    const messageFullDate = formatDateTimeShort(message.createdAt);
    const canEdit = canEditMessage(message);
    const canDeleteAll = canDeleteForAll(message);

    return (
      <div
        key={message.id}
        className={`group flex mb-3 ${isMyMessage ? 'justify-end' : 'justify-start'} relative`}
      >
        {/* Action buttons for received messages - hover only */}
        {showActions && !isMyMessage && (
          <div className="flex flex-col gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip title="Marcar como no leído">
              <Button
                type="text"
                size="small"
                onClick={() => markAsUnread(message.id)}
                className="text-gray-400 hover:text-purple-600"
              >
                <ClockCircleOutlined style={{ fontSize: '14px' }} />
              </Button>
            </Tooltip>
            <Tooltip title="Eliminar mensaje">
              <Button
                type="text"
                size="small"
                onClick={() => {
                  Modal.confirm({
                    title: '¿Eliminar mensaje?',
                    content: '¿Estás seguro de que quieres eliminar este mensaje?',
                    onOk: () => deleteMessage(message.id),
                    okText: 'Eliminar',
                    cancelText: 'Cancelar',
                    okType: 'danger',
                  });
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <DeleteOutlined style={{ fontSize: '14px' }} />
              </Button>
            </Tooltip>
          </div>
        )}

        <div
          className={`max-w-[65%] px-4 py-2 rounded-2xl ${
            isMyMessage
              ? 'rounded-br-sm message-sender'
              : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm message-receiver'
          }`}
          style={isMyMessage ? { backgroundColor: '#579172', color: 'white' } : {}}
        >
          {!isMyMessage && (
            <div className="text-xs font-medium mb-1" style={{ color: '#579172' }}>
              {message.sender.profile.firstName} {message.sender.profile.lastName}
            </div>
          )}

          <div
            dangerouslySetInnerHTML={{ __html: message.content }}
            className={`${isMyMessage ? 'text-white' : 'text-gray-800'} message-content`}
          />

          {message.content && (() => {
            const urls = extractUrls(message.content);
            return urls.length > 0 ? (
              <div>
                {urls.map((u) => (
                  <LinkPreviewCard key={u} url={u} onYouTubeClick={openYoutube} />
                ))}
              </div>
            ) : null;
          })()}

          {/* Archivos adjuntos */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment) => {
                const isImage = attachment.mimeType?.startsWith('image/');
                const isAudio = attachment.mimeType?.startsWith('audio/');
                const isVideo = attachment.mimeType?.startsWith('video/');

                return (
                  <div key={attachment.id}>
                    {isAudio ? (
                      <div style={{ padding: '6px 4px 2px' }}>
                        <VoiceNotePlayer
                          src={`/api/communications/attachments/${attachment.id}/stream`}
                          isOwn={isMyMessage}
                        />
                      </div>
                    ) : isImage ? (
                      <div className="space-y-1">
                        <div className={`text-xs ${isMyMessage ? 'text-purple-200' : 'text-gray-500'}`}>
                          {attachment.originalName} ({formatFileSize(attachment.size)})
                        </div>
                        <ImageWithAuth
                          attachmentId={attachment.id}
                          alt={attachment.originalName}
                          className="rounded-lg cursor-pointer"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            border: isMyMessage ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e5e7eb',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openGallery(attachment.id);
                          }}
                        />
                      </div>
                    ) : isVideo ? (
                      <div className="space-y-1">
                        <div className={`text-xs ${isMyMessage ? 'text-purple-200' : 'text-gray-500'}`}>
                          {attachment.originalName} ({formatFileSize(attachment.size)})
                        </div>
                        <VideoWithAuth
                          attachmentId={attachment.id}
                          style={{
                            border: isMyMessage ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e5e7eb',
                          }}
                        />
                        <a
                          href={`/api/communications/attachments/${attachment.id}/download`}
                          download={attachment.originalName}
                          className={`inline-flex items-center gap-1 text-xs mt-1 no-underline ${isMyMessage ? 'text-purple-200' : 'text-gray-500'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DownloadOutlined /> Descargar vídeo
                        </a>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:opacity-80 transition-opacity`}
                        style={isMyMessage ? { backgroundColor: 'rgba(255,255,255,0.15)' } : { backgroundColor: '#f3f4f6' }}
                        onClick={() => downloadAttachment(attachment.id, attachment.originalName)}
                      >
                        <FileOutlined className={isMyMessage ? 'text-white' : 'text-gray-700'} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${isMyMessage ? 'text-white' : 'text-gray-900'}`}>
                            {attachment.originalName}
                          </div>
                          <div className={`text-xs ${isMyMessage ? 'text-purple-200' : 'text-gray-500'}`}>
                            {formatFileSize(attachment.size)}
                          </div>
                        </div>
                        <DownloadOutlined className={isMyMessage ? 'text-white' : 'text-gray-700'} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className={`flex items-center justify-between mt-1 text-xs ${
            isMyMessage ? 'text-purple-200' : 'text-gray-400'
          }`}>
            <Tooltip title="Fecha y hora del mensaje">
              <span>
                {messageFullDate}
                {message.isEdited && (
                  <span className="ml-1 italic">(editado)</span>
                )}
              </span>
            </Tooltip>
            <div className="flex items-center gap-1">
              {!message.isRead && !isMyMessage && (
                <div className="w-2 h-2 bg-red-400 rounded-full" />
              )}
              {isMyMessage && (
                <CheckOutlined className="ml-1" style={{ fontSize: '10px' }} />
              )}
            </div>
          </div>
        </div>

        {/* Action buttons for own messages - hover only */}
        {showActions && isMyMessage && (
          <div className="flex flex-col gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <Tooltip title="Editar mensaje (disponible 24h)">
                <Button
                  type="text"
                  size="small"
                  onClick={() => {
                    setEditingMessage(message);
                    setEditMessageContent(message.content);
                  }}
                  className="text-gray-400 hover:text-purple-600"
                >
                  <EditOutlined style={{ fontSize: '14px' }} />
                </Button>
              </Tooltip>
            )}
            {canDeleteAll && selectedConversation && (
              <Tooltip title="Eliminar para todos (disponible 1h)">
                <Button
                  type="text"
                  size="small"
                  onClick={() => {
                    Modal.confirm({
                      title: '¿Eliminar mensaje para todos?',
                      icon: <ExclamationCircleOutlined />,
                      content: (
                        <div>
                          <p>Este mensaje será eliminado para todos los participantes de la conversación.</p>
                          <p className="text-red-500 mt-2"><strong>Esta acción no se puede deshacer.</strong></p>
                        </div>
                      ),
                      onOk: () => deleteMessageForAll(message.id, selectedConversation.participantId),
                      okText: 'Eliminar para todos',
                      cancelText: 'Cancelar',
                      okType: 'danger',
                    });
                  }}
                  className="text-gray-400 hover:text-orange-500"
                >
                  <DeleteOutlined style={{ fontSize: '14px', color: '#f97316' }} />
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Eliminar solo para mí">
              <Button
                type="text"
                size="small"
                onClick={() => {
                  Modal.confirm({
                    title: '¿Eliminar mensaje?',
                    content: '¿Estás seguro de que quieres eliminar este mensaje? Solo se eliminará para ti.',
                    onOk: () => deleteMessage(message.id),
                    okText: 'Eliminar',
                    cancelText: 'Cancelar',
                    okType: 'danger',
                  });
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <DeleteOutlined style={{ fontSize: '14px' }} />
              </Button>
            </Tooltip>
          </div>
        )}
      </div>
    );
  };

  // Renderizar pestaña de borradores
  const renderDraftsTab = () => {
    if (loadingDrafts) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Spin size="large" tip="Cargando borradores..." />
        </div>
      );
    }

    if (drafts.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              No tienes borradores guardados.<br />
              <Text type="secondary">
                Usa el botón "Guardar como borrador" cuando redactes un mensaje para guardarlo aquí.
              </Text>
            </span>
          }
        />
      );
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={drafts}
        renderItem={(draft) => {
          const recipientName = draft.recipient?.profile
            ? `${draft.recipient.profile.firstName} ${draft.recipient.profile.lastName}`
            : 'Destinatario desconocido';

          return (
            <List.Item
              key={draft.id}
              style={{
                padding: '16px',
                background: '#fff',
                marginBottom: '8px',
                borderRadius: '8px',
                border: '1px solid #f0f0f0',
              }}
              actions={[
                <Tooltip title="Editar y enviar" key="edit">
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    style={{ backgroundColor: '#579172', borderColor: '#579172' }}
                    onClick={() => {
                      setSelectedDraft(draft);
                      setDraftEditContent(draft.content || '');
                      setEditingDraft(true);
                    }}
                  >
                    Editar y Enviar
                  </Button>
                </Tooltip>,
                <Tooltip title="Eliminar borrador" key="delete">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: '¿Eliminar borrador?',
                        content: 'Esta acción no se puede deshacer.',
                        okText: 'Eliminar',
                        cancelText: 'Cancelar',
                        okType: 'danger',
                        onOk: () => deleteDraft(draft.id),
                      });
                    }}
                  >
                    Eliminar
                  </Button>
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Badge dot color="orange">
                    <Avatar icon={<SaveOutlined />} style={{ backgroundColor: '#faad14' }} />
                  </Badge>
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Para: {recipientName}</span>
                    <Tag color="orange">Borrador</Tag>
                  </div>
                }
                description={
                  <div>
                    <div
                      style={{
                        maxHeight: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: '#666',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: draft.content?.substring(0, 200) + (draft.content?.length > 200 ? '...' : ''),
                      }}
                    />
                    <div style={{ marginTop: '8px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <ClockCircleOutlined style={{ marginRight: '4px' }} />
                        Guardado: {formatDateToMadrid(draft.createdAt)}
                      </Text>
                    </div>
                  </div>
                }
              />
            </List.Item>
          );
        }}
      />
    );
  };

  // Modal para editar borrador
  const renderEditDraftModal = () => {
    if (!selectedDraft) return null;

    const recipientName = selectedDraft.recipient?.profile
      ? `${selectedDraft.recipient.profile.firstName} ${selectedDraft.recipient.profile.lastName}`
      : 'Destinatario desconocido';

    const handleSaveOnly = async () => {
      if (!draftEditContent || draftEditContent.trim() === '') {
        antMessage.error('El mensaje no puede estar vacío');
        return;
      }
      if (draftEditContent !== selectedDraft.content) {
        await updateDraft(selectedDraft.id, draftEditContent);
      } else {
        antMessage.info('No hay cambios que guardar');
      }
      setEditingDraft(false);
      setSelectedDraft(null);
      setDraftEditContent('');
    };

    const handleSendDraft = async () => {
      if (!draftEditContent || draftEditContent.trim() === '') {
        antMessage.error('El mensaje no puede estar vacío');
        return;
      }
      await sendDraft(selectedDraft, draftEditContent);
    };

    return (
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SaveOutlined style={{ color: '#faad14' }} />
            <span>Editar Borrador</span>
            <Tag color="orange">Para: {recipientName}</Tag>
          </div>
        }
        open={editingDraft}
        onCancel={() => {
          setEditingDraft(false);
          setSelectedDraft(null);
          setDraftEditContent('');
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
          <Text type="secondary">
            <UserOutlined style={{ marginRight: '8px' }} />
            Destinatario: <strong>{recipientName}</strong>
          </Text>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <Text strong>Mensaje:</Text>
        </div>
        <MessagingEditor
          value={draftEditContent}
          onChange={(content) => setDraftEditContent(content)}
          placeholder="Escribe tu mensaje..."
          minHeight={200}
          hideSendButton
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button
            onClick={() => {
              setEditingDraft(false);
              setSelectedDraft(null);
              setDraftEditContent('');
            }}
          >
            Cancelar
          </Button>
          <Button
            type="default"
            icon={<SaveOutlined />}
            loading={savingDraft}
            onClick={handleSaveOnly}
          >
            Solo Guardar
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={sending}
            style={{ backgroundColor: '#579172', borderColor: '#579172' }}
            onClick={handleSendDraft}
          >
            Enviar Mensaje
          </Button>
        </div>
      </Modal>
    );
  };

  // Modal para editar mensajes enviados
  const renderEditMessageModal = () => {
    if (!editingMessage || !selectedConversation) return null;

    const handleSaveEdit = async () => {
      if (!editMessageContent || editMessageContent.trim() === '') {
        antMessage.error('El mensaje no puede estar vacío');
        return;
      }
      await editMessage(editingMessage.id, selectedConversation.participantId, editMessageContent);
    };

    return (
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EditOutlined style={{ color: '#579172' }} />
            <span>Editar Mensaje</span>
            <Tag color="purple">Enviado {formatRelativeTime(editingMessage.createdAt)}</Tag>
          </div>
        }
        open={!!editingMessage}
        onCancel={() => {
          setEditingMessage(null);
          setEditMessageContent('');
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
          <Text type="secondary">
            <ExclamationCircleOutlined style={{ marginRight: '8px', color: '#faad14' }} />
            Puedes editar este mensaje hasta 24 horas después de enviarlo. El destinatario verá que fue editado.
          </Text>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <Text strong>Mensaje:</Text>
        </div>
        <MessagingEditor
          value={editMessageContent}
          onChange={(content) => setEditMessageContent(content)}
          placeholder="Escribe tu mensaje..."
          minHeight={200}
          hideSendButton
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button
            onClick={() => {
              setEditingMessage(null);
              setEditMessageContent('');
            }}
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            loading={savingEdit}
            style={{ backgroundColor: '#579172', borderColor: '#579172' }}
            onClick={handleSaveEdit}
          >
            Guardar Cambios
          </Button>
        </div>
      </Modal>
    );
  };

  // Función para filtrar conversaciones por búsqueda
  const getFilteredConversations = (): ConversationThread[] => {
    if (!searchText.trim()) {
      return conversations;
    }

    const searchLower = searchText.toLowerCase().trim();

    return conversations.filter(conversation => {
      const participantName = `${conversation.participant?.profile?.firstName || ''} ${conversation.participant?.profile?.lastName || ''}`.toLowerCase();
      const childrenNames = (conversation.participant?.familyInfo?.children || '').toLowerCase();
      const lastMessageContent = conversation.lastMessage?.content?.toLowerCase() || '';

      return (
        participantName.includes(searchLower) ||
        childrenNames.includes(searchLower) ||
        lastMessageContent.includes(searchLower)
      );
    });
  };

  // Get initials for avatar
  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Render the left panel - conversation list
  const renderConversationList = () => {
    const filteredConversations = getFilteredConversations();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <Input
            placeholder="Buscar conversaciones..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ borderRadius: '8px' }}
          />
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '8px' }}>
              <Spin size="large" />
              <Text type="secondary" style={{ fontSize: '13px' }}>Cargando conversaciones...</Text>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={searchText ? "No se encontraron conversaciones" : "No hay conversaciones"}
              />
            </div>
          ) : (() => {
            const sortByDate = (arr: ConversationThread[]) =>
              [...arr].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
            const unreadConvs = sortByDate(filteredConversations.filter(c => c.unreadCount > 0));
            const readConvs = sortByDate(filteredConversations.filter(c => c.unreadCount === 0));
            const hasSections = unreadConvs.length > 0;

            const sectionLabelStyle: React.CSSProperties = {
              fontSize: '10px',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.7px',
              fontWeight: 600,
              padding: '8px 16px 4px',
            };

            const renderConversation = (conversation: ConversationThread) => {
              const isActive = selectedConversation?.participantId === conversation.participantId;
              const hasUnread = conversation.unreadCount > 0 && !isActive;
              const hasDraft = draftParticipantIds.has(conversation.participantId) && !isActive;
              const hasScheduled = scheduledParticipantIds.has(conversation.participantId);
              const participant = getUserWithFamilyInfo(conversation.participant, availableUsers);
              const firstName = participant.profile.firstName;
              const lastName = participant.profile.lastName;
              const initials = getInitials(firstName, lastName);

              return (
                <div
                  key={conversation.participantId}
                  className="conversation-list-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f5f5f5',
                    backgroundColor: isActive
                      ? '#EDF6F1'
                      : hasUnread
                        ? '#EDF6F1'
                        : '#ffffff',
                    borderLeft: isActive
                      ? '3px solid #579172'
                      : hasUnread
                        ? '3px solid #8EC0A4'
                        : '3px solid transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                  onClick={async () => {
                    setSelectedConversation(conversation);
                    setCurrentEditorContent('');
                    loadConversationDraft(conversation.participantId);
                    const unreadMsgs = conversation.messages
                      .filter(msg => !msg.isRead && msg.sender.id !== user?.id);
                    // Actualizar badge optimistamente antes de las llamadas API
                    if (unreadMsgs.length > 0) {
                      decrementMessagesBadge(unreadMsgs.length);
                    }
                    await Promise.all(unreadMsgs.map(async (msg) => {
                      try {
                        await apiClient.patch(`/communications/messages/${msg.id}`, { isRead: true });
                      } catch (e) {
                        // silenciar errores individuales
                      }
                    }));
                    if (unreadMsgs.length > 0) {
                      // Sincronizar con el servidor para corregir posibles desfases
                      fetchMessagesBadge();
                      loadConversations();
                      loadAdminUnreadCounts();
                    }
                  }}
                >
                  <Badge count={conversation.unreadCount} size="small" offset={[-4, 4]}>
                    <Avatar
                      style={{
                        backgroundColor: isActive ? '#579172' : '#6EA88A',
                        flexShrink: 0,
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                      size={40}
                    >
                      {initials}
                    </Avatar>
                  </Badge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: hasUnread ? 600 : 500,
                        color: '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        marginRight: '8px',
                      }}>
                        {formatUserName(participant)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>
                        {formatDateTimeShort(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {hasScheduled && (
                        <Tag color="blue" style={{ margin: 0, fontSize: '10px', lineHeight: '16px', padding: '0 5px', flexShrink: 0 }}>
                          <ClockCircleOutlined style={{ marginRight: 2 }} /> Programado
                        </Tag>
                      )}
                      {hasDraft && (
                        <Tag color="warning" style={{ margin: 0, fontSize: '10px', lineHeight: '16px', padding: '0 5px', flexShrink: 0 }}>
                          <EditOutlined style={{ marginRight: 2 }} /> Borrador
                        </Tag>
                      )}
                      <span style={{
                        fontSize: '12px',
                        color: hasDraft ? '#a16207' : hasUnread ? '#374151' : '#6b7280',
                        fontStyle: hasDraft ? 'italic' : 'normal',
                        fontWeight: hasUnread ? 500 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {hasDraft
                          ? 'Mensaje sin terminar…'
                          : `${conversation.lastMessage?.content?.replace(/<[^>]*>/g, '').substring(0, 50) || ''}${(conversation.lastMessage?.content?.length || 0) > 50 ? '...' : ''}`}
                      </span>
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'mark-unread',
                              label: 'Marcar como no vista',
                              icon: <EyeInvisibleOutlined />,
                              onClick: (e) => {
                                e.domEvent.stopPropagation();
                                markConversationAsUnread(conversation);
                              },
                            },
                            {
                              key: 'delete-conversation',
                              label: 'Eliminar conversación',
                              icon: <DeleteOutlined />,
                              danger: true,
                              onClick: (e) => {
                                e.domEvent.stopPropagation();
                                Modal.confirm({
                                  title: '¿Eliminar conversación?',
                                  content: `¿Estás seguro de que quieres eliminar toda la conversación con ${formatUserName(conversation.participant)}?`,
                                  onOk: () => deleteConversation(
                                    conversation.participantId,
                                    formatUserName(conversation.participant)
                                  ),
                                  okText: 'Eliminar',
                                  cancelText: 'Cancelar',
                                  okType: 'danger',
                                });
                              },
                            },
                          ],
                        }}
                        trigger={['click']}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined />}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flexShrink: 0, opacity: 0.6 }}
                          className="conversation-more-btn"
                        />
                      </Dropdown>
                    </div>
                    <FamilyChildrenTags user={participant} size="small" maxTags={2} />
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* Sección: Sin leer */}
                {hasSections && (
                  <>
                    <div style={sectionLabelStyle} role="heading" aria-level={3}>
                      Sin leer · {unreadConvs.length}
                    </div>
                    {unreadConvs.map(renderConversation)}
                  </>
                )}

                {/* Separador */}
                {hasSections && readConvs.length > 0 && (
                  <Divider style={{ margin: '4px 0', borderColor: '#f0f0f0' }} />
                )}

                {/* Sección: Todo lo demás */}
                {(readConvs.length > 0 || !hasSections) && (
                  <>
                    {hasSections && (
                      <div style={sectionLabelStyle} role="heading" aria-level={3}>
                        Todo lo demás
                      </div>
                    )}
                    {(hasSections ? readConvs : filteredConversations).map(renderConversation)}
                  </>
                )}

                {hasMoreMessages && (
                  <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
                    <Button
                      size="small"
                      onClick={loadOlderMessages}
                      loading={loadingMore}
                      block
                    >
                      Cargar mensajes anteriores
                    </Button>
                  </div>
                )}
              </>
            );
          })()
          }
        </div>
      </div>
    );
  };

  // Render the right panel - active conversation
  const renderConversationPanel = () => {
    if (!selectedConversation) {
      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          color: '#9ca3af',
        }}>
          <MessageOutlined style={{ fontSize: 64, color: '#d1d5db' }} />
          <div style={{ fontSize: '18px', fontWeight: 500, marginTop: '16px', color: '#6b7280' }}>
            Selecciona una conversación
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px', color: '#9ca3af' }}>
            Elige una conversación de la lista para empezar
          </div>
        </div>
      );
    }

    const participant = getUserWithFamilyInfo(selectedConversation.participant, availableUsers);
    const firstName = participant.profile.firstName;
    const lastName = participant.profile.lastName;
    const initials = getInitials(firstName, lastName);
    const participantName = `${firstName} ${lastName}`;
    const roleLabel = participant.role === 'teacher' ? 'Profesor'
      : participant.role === 'student' ? 'Estudiante'
        : participant.role === 'family' ? 'Familia'
          : participant.role === 'admin' ? 'Administrador'
            : participant.role || '';

    // ¿Hay un mensaje escrito en el editor pero todavía SIN ENVIAR?
    const draftPlain = (currentEditorContent || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const hasUnsentDraft = draftPlain.length > 0;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {/* Conversation header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#ffffff',
          flexShrink: 0,
        }}>
          {isMobile && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                setSelectedConversation(null);
                setConversationFiles([]);
                setConversationDraft('');
                setCurrentEditorContent('');
                if (conversationFileInputRef.current) conversationFileInputRef.current.value = '';
              }}
            />
          )}
          <Avatar
            style={{ backgroundColor: '#579172', flexShrink: 0, fontSize: '14px', fontWeight: 600 }}
            size={40}
          >
            {initials}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>{participantName}</div>
            {roleLabel && (
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{roleLabel}</div>
            )}
          </div>
          {/* Buscador dentro de la conversación */}
          <Input
            size="small"
            allowClear
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Buscar en esta conversación"
            value={threadSearchInput}
            onChange={(e) => {
              const v = e.target.value;
              setThreadSearchInput(v);
              if (v === '' && threadSearch !== '') {
                // Si limpia el input, recargar todos los mensajes del hilo
                setThreadSearch('');
                loadThreadMessages(selectedConversation.participantId, { page: 1, search: '' });
              }
            }}
            onPressEnter={() => {
              const term = threadSearchInput.trim();
              setThreadSearch(term);
              loadThreadMessages(selectedConversation.participantId, { page: 1, search: term });
            }}
            style={{ width: isMobile ? 140 : 220, marginRight: 8 }}
          />
          <div style={{ color: '#9ca3af', fontSize: '12px', whiteSpace: 'nowrap' }}>
            {threadMessages.length} mensaje{threadMessages.length !== 1 ? 's' : ''}
            {threadHasMore && '+'}
          </div>
        </div>

        {/* Indicador de búsqueda activa */}
        {threadSearch && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#fef9c3',
            borderBottom: '1px solid #fde047',
            fontSize: '12px',
            color: '#a16207',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>
              <SearchOutlined style={{ marginRight: 6 }} />
              Resultados para "<strong>{threadSearch}</strong>" — {threadMessages.length} mensaje{threadMessages.length !== 1 ? 's' : ''}
              {threadHasMore && ' (sigue habiendo más, sigue cargando)'}
            </span>
            <Button
              type="link"
              size="small"
              onClick={() => {
                setThreadSearch('');
                setThreadSearchInput('');
                loadThreadMessages(selectedConversation.participantId, { page: 1, search: '' });
              }}
              style={{ padding: 0, fontSize: '12px' }}
            >
              Limpiar búsqueda
            </Button>
          </div>
        )}

        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            backgroundColor: '#f9fafb',
          }}
        >
          {/* Loader / botón para mensajes anteriores */}
          {threadHasMore && (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              {threadLoadingMore ? (
                <Spin size="small" />
              ) : (
                <Button
                  size="small"
                  onClick={() => loadThreadMessages(selectedConversation.participantId, {
                    page: threadPage + 1,
                    append: true,
                    search: threadSearch,
                  })}
                >
                  Cargar mensajes anteriores
                </Button>
              )}
            </div>
          )}

          {threadLoading && threadMessages.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Spin />
            </div>
          ) : threadMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 16px', fontSize: '13px' }}>
              {threadSearch
                ? `No hay mensajes que coincidan con "${threadSearch}"`
                : 'No hay mensajes en esta conversación todavía'}
            </div>
          ) : (
            threadMessages.map(msg => renderMessage(msg))
          )}

          {/* Globos de MENSAJE PROGRAMADO (pendiente de envío) para este contacto */}
          {(scheduledList || [])
            .filter((s: any) => s.status === 'pending' && s.targetType === 'individual' && s.recipientId === selectedConversation?.participantId)
            .map((s: any) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <div style={{
                  maxWidth: '78%',
                  backgroundColor: '#e6f4ff',
                  border: '1px dashed #69b1ff',
                  borderRadius: '14px',
                  padding: '8px 12px',
                  color: '#0958d9',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <Tag color="blue" style={{ margin: 0, fontWeight: 600, fontSize: 10 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      Programado · {dayjs(s.scheduledFor).format('DD/MM HH:mm')}
                    </Tag>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => cancelScheduled(s.id)}
                      style={{ fontSize: '11px', padding: 0, height: 'auto' }}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <div style={{ fontSize: 13, color: '#333', wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: s.content }} />
                  <div style={{ fontSize: 10, color: '#0958d9', marginTop: 2, fontStyle: 'italic' }}>
                    Se enviará automáticamente. Aún no se ha enviado.
                  </div>
                </div>
              </div>
            ))}

          {/* Globo de BORRADOR (sin enviar): se muestra como un mensaje propio pero
              claramente distinto — gris, con borde discontinuo y etiqueta. */}
          {hasUnsentDraft && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <div style={{
                maxWidth: '78%',
                backgroundColor: '#f5f5f5',
                border: '1px dashed #b0b0b0',
                borderRadius: '14px',
                padding: '8px 12px',
                color: '#595959',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <Tag color="default" style={{ margin: 0, fontWeight: 600, fontSize: 10 }}>
                    <EditOutlined style={{ marginRight: 4 }} /> Borrador · sin enviar
                  </Tag>
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => {
                      setCurrentEditorContent('');
                      setConversationDraft('');
                      setReplyDraftStatus('idle');
                      setReplyDraftSavedAt(null);
                      if (selectedConversation?.participantId) clearReplyDraft(selectedConversation.participantId);
                    }}
                    style={{ fontSize: '11px', padding: 0, height: 'auto' }}
                  >
                    Descartar
                  </Button>
                </div>
                <div style={{ fontSize: 13, fontStyle: 'italic', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: currentEditorContent }} />
              </div>
            </div>
          )}
        </div>

        {/* Input area — más aire abajo (y respeta el área segura del móvil) para que
            los botones no queden pegados al borde inferior */}
        <div style={{
          borderTop: '1px solid #f0f0f0',
          backgroundColor: '#ffffff',
          padding: isMobile ? '12px 12px calc(20px + env(safe-area-inset-bottom))' : '14px 16px 20px',
          flexShrink: 0,
        }}>
          {/* Hidden file input */}
          <input
            type="file"
            ref={conversationFileInputRef}
            onChange={handleConversationFileSelect}
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
            style={{ display: 'none' }}
          />

          {/* Attached files list */}
          {conversationFiles.length > 0 && (
            <div style={{ marginBottom: '8px' }} className="space-y-1">
              {conversationFiles.map((file, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <FileOutlined style={{ color: '#6b7280' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{formatFileSize(file.size)}</div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => removeConversationFile(index)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Editor row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', width: '100%', minWidth: 0 }}>
            {/* Paperclip — hide during voice recording */}
            {!voiceRecordingActive && (
              <Tooltip title={`Adjuntar archivos (${conversationFiles.length}/10)`}>
                <Button
                  type="text"
                  icon={<PaperClipOutlined />}
                  onClick={() => conversationFileInputRef.current?.click()}
                  disabled={conversationFiles.length >= 10}
                  style={{ flexShrink: 0, color: '#6b7280' }}
                />
              </Tooltip>
            )}

            {/* Text editor — hide while voice recorder is in recording/locked state */}
            {!voiceRecordingActive && (
              <div id="conversation-editor-container" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <MessagingEditor
                  value={currentEditorContent}
                  onChange={(content) => {
                    setCurrentEditorContent(content);
                    // Autoguardado en el servidor (persiste tras recargar)
                    if (selectedConversation?.participantId) {
                      autoSaveConversationDraft(selectedConversation.participantId, content);
                    }
                  }}
                  onSend={(content) => {
                    const pid = selectedConversation?.participantId;
                    sendMessage(content);
                    setCurrentEditorContent('');
                    setReplyDraftStatus('idle');
                    setReplyDraftSavedAt(null);
                    if (pid) clearReplyDraft(pid);
                  }}
                  sending={sending}
                  placeholder="Escribe tu respuesta…"
                  minHeight={isMobile ? 88 : 72}
                  maxHeight={isMobile ? 200 : 280}
                />
              </div>
            )}

            {/* Voice recorder — only for teacher/admin */}
            {(user?.role === 'teacher' || user?.role === 'admin') && (
              <VoiceRecorderButton
                onSend={(file, _duration) => sendVoiceMessage(file)}
                onStateChange={setVoiceRecordingActive}
                disabled={sending}
              />
            )}
          </div>

          {/* Indicador de autoguardado + programar + guardar borrador */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column-reverse' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            marginTop: '6px',
            gap: isMobile ? 2 : 8,
          }}>
            <DraftSaveIndicator
              status={replyDraftStatus}
              lastSavedAt={replyDraftSavedAt}
              idleText={isMobile ? 'Autoguardado activado' : 'La respuesta se guarda automáticamente mientras escribes'}
            />
            <Space size={4}>
            <Tooltip title="Programar el envío de esta respuesta">
              <Button
                type="text"
                icon={<ClockCircleOutlined />}
                size="small"
                onClick={openScheduleReply}
                style={{ color: '#9ca3af', fontSize: '12px' }}
              >
                Programar
              </Button>
            </Tooltip>
            <Tooltip title="Guardar el mensaje actual como borrador">
              <Button
                type="text"
                icon={<SaveOutlined />}
                size="small"
                loading={savingConversationDraft}
                style={{ color: '#9ca3af', fontSize: '12px' }}
                onClick={async () => {
                  const editorContainer = document.getElementById('conversation-editor-container');
                  const editorElement = editorContainer?.querySelector('[contenteditable="true"]') as HTMLElement;
                  const editorContent = editorElement?.innerHTML || '';
                  const contentToSave = editorContent || currentEditorContent;

                  const isContentValid = contentToSave &&
                    contentToSave.trim() !== '' &&
                    contentToSave !== '<p></p>' &&
                    contentToSave !== '<br>' &&
                    contentToSave !== '<div><br></div>' &&
                    contentToSave !== '<p><br></p>';

                  if (isContentValid) {
                    await saveConversationDraftToServer(selectedConversation.participantId, contentToSave);
                  } else {
                    antMessage.info('Escribe algo para guardar como borrador');
                  }
                }}
              >
                Guardar borrador
              </Button>
            </Tooltip>
            </Space>
          </div>
        </div>
      </div>
    );
  };

  // Render the conversations tab content (split panel)
  const renderConversationsTabContent = () => {
    const listWidth = isMobile ? '100%' : 320;
    const showList = !isMobile || !selectedConversation;
    const showPanel = !isMobile || !!selectedConversation;

    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Left panel */}
        {showList && (
          <div style={{
            width: listWidth,
            borderRight: isMobile ? 'none' : '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {renderConversationList()}
          </div>
        )}

        {/* Right panel */}
        {showPanel && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {renderConversationPanel()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0,
      }}>
        <Title level={4} style={{ margin: 0, color: '#111827' }}>
          <MessageOutlined style={{ marginRight: '8px', color: '#579172' }} />
          Mensajes
        </Title>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Admin mode tabs */}
          {user?.role === 'admin' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button
                type={adminMode === 'direct' ? 'primary' : 'default'}
                size="small"
                icon={<MailOutlined />}
                onClick={() => setAdminMode('direct')}
                style={adminMode === 'direct' ? { backgroundColor: '#579172', borderColor: '#579172' } : {}}
              >
                <Badge count={directUnreadCount} size="small" offset={[6, -4]}>
                  Mis Mensajes
                </Badge>
              </Button>
              <Button
                type={adminMode === 'supervision' ? 'primary' : 'default'}
                size="small"
                icon={<ControlOutlined />}
                onClick={() => setAdminMode('supervision')}
                style={adminMode === 'supervision' ? { backgroundColor: '#579172', borderColor: '#579172' } : {}}
              >
                <Badge count={supervisionUnreadCount} size="small" offset={[6, -4]}>
                  Supervisión
                </Badge>
              </Button>
            </div>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setShowNewMessage(true);
              setSendMethod('individual');
              setBulkRecipients([]);
              form.resetFields();
              setNewMessageContent('');
              // Recuperar borrador autoguardado si existe
              const draft = composeAutosave.loadDraft();
              if (draft && (draft.content || draft.recipientId)) {
                if (draft.content) {
                  form.setFieldsValue({ content: draft.content });
                  setNewMessageContent(draft.content);
                }
                if (draft.recipientId) {
                  form.setFieldsValue({ recipientId: draft.recipientId });
                }
                antMessage.info('Se ha recuperado el mensaje que estabas escribiendo');
              }
            }}
            style={{ backgroundColor: '#579172', borderColor: '#579172' }}
          >
            {!isMobile && 'Nuevo Mensaje'}
          </Button>
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Button
              icon={<ClockCircleOutlined />}
              onClick={() => { setScheduledListOpen(true); loadScheduled(); }}
              title="Envíos programados"
            >
              {!isMobile && 'Programados'}
            </Button>
          )}
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          activeKey={mainActiveTab}
          onChange={(key) => {
            setMainActiveTab(key as 'conversations' | 'drafts');
            if (key === 'drafts') {
              loadDrafts();
            }
          }}
          style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          tabBarStyle={{ margin: '0', padding: '0 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}
          items={[
            {
              key: 'conversations',
              label: (
                <span>
                  <MessageOutlined style={{ marginRight: '6px' }} />
                  Conversaciones
                </span>
              ),
              children: (
                <div style={{ height: '100%', overflow: 'hidden' }}>
                  {renderConversationsTabContent()}
                </div>
              ),
            },
            {
              key: 'drafts',
              label: (
                <Badge
                  count={drafts.length}
                  size="small"
                  offset={[12, 0]}
                  style={{ backgroundColor: '#faad14' }}
                >
                  <span style={{ paddingRight: drafts.length > 0 ? 12 : 0 }}>
                    <SaveOutlined style={{ marginRight: '6px' }} />
                    Borradores
                  </span>
                </Badge>
              ),
              children: (
                <div style={{ height: '100%', overflowY: 'auto', padding: '16px', backgroundColor: '#f0f2f5' }}>
                  {renderDraftsTab()}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Modal para editar borrador */}
      {renderEditDraftModal()}

      {/* Modal para editar mensaje enviado */}
      {renderEditMessageModal()}

      {/* Modal para nuevo mensaje */}
      <Modal
        title="Nuevo Mensaje"
        open={showNewMessage}
        onCancel={() => {
          setShowNewMessage(false);
          setSendMethod('individual');
          setBulkRecipients([]);
          form.resetFields();
        }}
        footer={null}
        width={isMobile ? '100vw' : 1200}
        style={isMobile ? { top: 0, maxWidth: '100vw', margin: 0, paddingBottom: 0 } : undefined}
        styles={isMobile ? { body: { maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' } } : undefined}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => sendMessage(values.content, values.recipientId)}
          onValuesChange={(changedValues) => {
            if (changedValues.sendMethod) {
              setSendMethod(changedValues.sendMethod);
              if (changedValues.sendMethod === 'individual') {
                setBulkRecipients([]);
              }
            }
            // Si se elige/cambia el destinatario y ya hay texto, guardar el borrador para él en servidor
            if (changedValues.recipientId && sendMethod === 'individual' && newMessageContent) {
              autoSaveConversationDraft(changedValues.recipientId, newMessageContent);
            }
          }}
        >
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Form.Item
              label="Método de envío"
              name="sendMethod"
              initialValue="individual"
            >
              <Select placeholder="Seleccionar método de envío">
                <Option value="individual">Selección individual</Option>
                <Option value="bulk">Envío masivo</Option>
              </Select>
            </Form.Item>
          )}

          {sendMethod === 'bulk' && (user?.role === 'admin' || user?.role === 'teacher') && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Title level={5}>
                <TeamOutlined style={{ marginRight: 8 }} />
                Padres por Grupos de Clase
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Selecciona uno o más grupos de clase para añadir a los padres cuyos hijos pertenecen a esos grupos.
              </Text>
              <Row gutter={16} align="middle">
                <Col span={18}>
                  <Select
                    mode="multiple"
                    placeholder="Seleccionar grupos de clase"
                    value={selectedClassGroups}
                    onChange={setSelectedClassGroups}
                    style={{ width: '100%' }}
                    maxTagCount="responsive"
                    loading={!classGroups || classGroups.length === 0}
                  >
                    {classGroups?.map(group => (
                      <Option key={group.id} value={group.id}>
                        {group.name}
                        {group._count?.students ? ` (${group._count.students} estudiantes)` : ''}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={6}>
                  <Button
                    type="primary"
                    icon={<TeamOutlined />}
                    onClick={handleParentsByClassGroups}
                    loading={loadingParentsByGroups}
                    disabled={selectedClassGroups.length === 0}
                    block
                    style={{ backgroundColor: '#579172', borderColor: '#579172' }}
                  >
                    Añadir Padres
                  </Button>
                </Col>
              </Row>
            </Card>
          )}

          {sendMethod === 'individual' ? (
            <Form.Item
              name="recipientId"
              label="Destinatario"
              rules={[{ required: true, message: 'Selecciona un destinatario' }]}
            >
              <Select
                placeholder="Selecciona un destinatario"
                loading={loadingUsers}
                showSearch
                optionFilterProp="children"
                showArrow={true}
                filterOption={(input, option) => {
                  if (!input || !option?.value) return false;
                  const u = availableUsers.find(u => u.id === option.value);
                  if (!u) return false;

                  const safeString = (val: any) => {
                    if (val === null || val === undefined) return '';
                    return String(val);
                  };

                  const searchStr = [
                    safeString(formatUserName(u)),
                    safeString(u.role),
                    safeString(u.profile?.firstName),
                    safeString(u.profile?.lastName),
                    safeString(u.familyInfo?.children),
                  ]
                    .filter(text => text.trim().length > 0)
                    .join(' ')
                    .toLowerCase();

                  return searchStr.indexOf(input.toLowerCase()) >= 0;
                }}
              >
                {availableUsers.map((u) => {
                  const displayName = formatUserName(u);
                  const childrenInfo = u.familyInfo?.children ? ` - Hijos: ${u.familyInfo.children}` : '';
                  const fullDisplayName = displayName + childrenInfo;

                  return (
                    <Option key={u.id} value={u.id} title={fullDisplayName}>
                      <div className="flex items-center justify-between">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{displayName}</span>
                          <FamilyChildrenTags user={u} size="small" maxTags={2} />
                        </div>
                        <Tag size="small" color={
                          u.role === 'teacher' ? 'blue' :
                          u.role === 'student' ? 'green' :
                          u.role === 'family' ? 'orange' :
                          u.role === 'admin' ? 'red' : 'default'
                        }>
                          {u.role}
                        </Tag>
                      </div>
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          ) : (
            <Form.Item
              label="Destinatarios (Envío masivo)"
              required
            >
              <Select
                mode="multiple"
                placeholder="Selecciona múltiples destinatarios"
                loading={loadingUsers}
                showSearch
                optionFilterProp="children"
                value={bulkRecipients}
                onChange={(values) => setBulkRecipients(values)}
                filterOption={(input, option) => {
                  if (!input || !option?.value) return false;
                  const u = availableUsers.find(u => u.id === option.value);
                  if (!u) return false;

                  const safeString = (val: any) => {
                    if (val === null || val === undefined) return '';
                    return String(val);
                  };

                  const searchStr = [
                    safeString(formatUserName(u)),
                    safeString(u.role),
                    safeString(u.profile?.firstName),
                    safeString(u.profile?.lastName),
                  ]
                    .filter(text => text.trim().length > 0)
                    .join(' ')
                    .toLowerCase();

                  return searchStr.indexOf(input.toLowerCase()) >= 0;
                }}
              >
                {availableUsers.map((u) => {
                  const displayName = formatUserName(u);
                  const childrenInfo = u.familyInfo?.children ? ` - Hijos: ${u.familyInfo.children}` : '';
                  const fullDisplayName = displayName + childrenInfo;

                  return (
                    <Option key={u.id} value={u.id} title={fullDisplayName}>
                      <div className="flex items-center justify-between">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{displayName}</span>
                          <FamilyChildrenTags user={u} size="small" maxTags={2} />
                        </div>
                        <Tag size="small" color={
                          u.role === 'teacher' ? 'blue' :
                          u.role === 'student' ? 'green' :
                          u.role === 'family' ? 'orange' :
                          u.role === 'admin' ? 'red' : 'default'
                        }>
                          {u.role}
                        </Tag>
                      </div>
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
            style={{ display: 'none' }}
          />

          <Form.Item label="Archivos adjuntos">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Button
                type="default"
                icon={<PaperClipOutlined />}
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedFiles.length >= 10}
              >
                Adjuntar archivos ({selectedFiles.length}/10)
              </Button>
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <VoiceRecorderButton
                  onSend={(audioFile, _duration) => {
                    setSelectedFiles(prev => [...prev, audioFile]);
                    // Pre-fill message content if empty
                    const current = form.getFieldValue('content');
                    if (!current || current === '<p></p>' || current === '<p><br></p>') {
                      form.setFieldsValues({ content: '🎤 Nota de voz' });
                    }
                    antMessage.success('Nota de voz lista. Pulsa Enviar para mandarla.');
                  }}
                  onStateChange={setModalVoiceRecordingActive}
                  disabled={sending}
                />
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Máximo 10 archivos. Tamaño máximo por archivo: 50MB
            </div>
          </Form.Item>

          {selectedFiles.length > 0 && (
            <Form.Item>
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
                  >
                    <FileOutlined className="text-gray-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => removeSelectedFile(index)}
                    />
                  </div>
                ))}
              </div>
            </Form.Item>
          )}

          <Form.Item
            name="content"
            label="Mensaje"
            rules={[{ required: true, message: 'Escribe tu mensaje' }]}
            style={{ marginBottom: 4 }}
          >
            <MessagingEditor
              value={newMessageContent}
              onChange={(content) => {
                setNewMessageContent(content);
                form.setFieldsValue({ content });
                const rid = form.getFieldValue('recipientId');
                // Copia local (para restaurar el propio modal)
                composeAutosave.saveDraft({ content, recipientId: rid });
                // Autoguardado EN SERVIDOR si hay destinatario individual:
                // el borrador persiste, aparece en la lista y se restaura al abrir la conversación
                if (sendMethod === 'individual' && rid) {
                  autoSaveConversationDraft(rid, content);
                }
              }}
              onSend={(content) => form.setFieldsValue({ content })}
              sending={sending}
              placeholder="Escribe tu mensaje..."
              hideSendButton={true}
              minHeight={120}
              maxHeight={400}
            />
          </Form.Item>
          <Form.Item>
            <Space wrap={isMobile} size={isMobile ? 'small' : 'middle'}>
              <Button
                type="primary"
                htmlType="submit"
                loading={sending}
                style={{ backgroundColor: '#579172', borderColor: '#579172' }}
              >
                Enviar
                {selectedFiles.length > 0 && ` con ${selectedFiles.length} archivo(s)`}
              </Button>
              <Button
                icon={<ClockCircleOutlined />}
                onClick={openSchedule}
                disabled={sending}
              >
                Programar envío
              </Button>
              <Button
                icon={<SaveOutlined />}
                onClick={saveAsDraft}
                loading={savingDraft}
                disabled={sending}
              >
                Guardar borrador
              </Button>
              <Button onClick={() => {
                setShowNewMessage(false);
                setSelectedFiles([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
          {/* Indicador de autoguardado estilo Gmail — debajo de los botones */}
          <div style={{ marginBottom: 4, minHeight: 18 }}>
            {sendMethod === 'individual' && form.getFieldValue('recipientId') ? (
              <DraftSaveIndicator status={replyDraftStatus} lastSavedAt={replyDraftSavedAt} />
            ) : (
              <DraftSaveIndicator status={composeAutosave.status} lastSavedAt={composeAutosave.lastSavedAt} />
            )}
          </div>
        </Form>
      </Modal>

      {/* Sub-modal: elegir fecha/hora del envío programado */}
      <Modal
        title={<span><ClockCircleOutlined /> Programar envío</span>}
        open={scheduleOpen}
        onCancel={() => setScheduleOpen(false)}
        onOk={confirmSchedule}
        okText="Programar"
        confirmLoading={scheduling}
        width={isMobile ? '100vw' : 460}
      >
        <p style={{ color: '#6b7280', fontSize: 13 }}>
          El mensaje se enviará automáticamente (en la plataforma y por email) a la fecha y hora que elijas.
        </p>
        <Form layout="vertical">
          <Form.Item label="Fecha y hora de envío" required>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              value={scheduleWhen}
              onChange={(v) => setScheduleWhen(v)}
              disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
              style={{ width: '100%' }}
              placeholder="Selecciona fecha y hora"
            />
          </Form.Item>
          {user?.role === 'admin' && (
            <Form.Item label="Enviar a TODOS los usuarios">
              <Switch checked={scheduleToAll} onChange={setScheduleToAll} />
              <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>
                {scheduleToAll ? 'Se enviará a todos los usuarios activos' : 'Se usará el destinatario/grupo seleccionado arriba'}
              </span>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal: lista de envíos programados */}
      <Modal
        title={<span><ClockCircleOutlined /> Envíos programados</span>}
        open={scheduledListOpen}
        onCancel={() => setScheduledListOpen(false)}
        footer={<Button onClick={() => setScheduledListOpen(false)}>Cerrar</Button>}
        width={isMobile ? '100vw' : 640}
      >
        {loadingScheduled ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : scheduledList.length === 0 ? (
          <Empty description="No tienes envíos programados" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scheduledList.map((s) => {
              const bulk = isBulkScheduled(s);
              const statusColor = s.status === 'pending' ? 'processing' : s.status === 'sent' ? 'success' : s.status === 'cancelled' ? 'default' : 'error';
              const statusLabel = s.status === 'pending' ? 'Pendiente' : s.status === 'sent' ? 'Enviado' : s.status === 'cancelled' ? 'Cancelado' : 'Error';
              return (
                <div key={s.id} style={{ border: bulk ? '1px solid #d3adf7' : '1px solid #f0f0f0', background: bulk ? '#faf5ff' : '#fff', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {bulk && <Tag color="purple" style={{ margin: 0 }}><TeamOutlined /> Mensaje masivo</Tag>}
                      {s.subject || 'Mensaje'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {dayjs(s.scheduledFor).format('DD/MM/YYYY HH:mm')}
                    </div>
                    <div style={{ fontSize: 12, color: bulk ? '#722ed1' : '#9ca3af', maxWidth: 380, whiteSpace: 'normal' }}>
                      <strong>Destinatarios:</strong> {scheduledRecipients(s)}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}
                      dangerouslySetInnerHTML={{ __html: (s.content || '').replace(/<[^>]*>/g, ' ').slice(0, 80) }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Tag color={statusColor}>{statusLabel}</Tag>
                    {s.status === 'pending' ? (
                      <>
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEditScheduled(s)}>Editar</Button>
                        <Button size="small" danger onClick={() => cancelScheduled(s.id)}>Cancelar</Button>
                      </>
                    ) : (
                      <Popconfirm title="¿Eliminar este envío del listado?" okText="Eliminar" cancelText="No" onConfirm={() => deleteScheduled(s.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />}>Eliminar</Button>
                      </Popconfirm>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Modal: editar envío programado (incluye masivos) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EditOutlined style={{ color: '#579172' }} />
            <span>Editar envío programado</span>
            {editingScheduled && isBulkScheduled(editingScheduled) && (
              <Tag color="purple" style={{ margin: 0 }}><TeamOutlined /> Masivo</Tag>
            )}
          </div>
        }
        open={!!editingScheduled}
        onCancel={() => setEditingScheduled(null)}
        onOk={saveScheduledEdit}
        okText="Guardar cambios"
        confirmLoading={savingSchedEdit}
        width={isMobile ? '100vw' : 760}
        destroyOnClose
      >
        {editingScheduled && (
          <>
            <div style={{
              marginBottom: 16, padding: 12, borderRadius: 8,
              background: isBulkScheduled(editingScheduled) ? '#faf5ff' : '#fafafa',
              border: isBulkScheduled(editingScheduled) ? '1px solid #d3adf7' : '1px solid #f0f0f0',
            }}>
              {isBulkScheduled(editingScheduled) ? (
                <Text style={{ color: '#722ed1', fontSize: 13 }}>
                  <TeamOutlined style={{ marginRight: 6 }} />
                  <strong>Mensaje masivo.</strong> Los cambios se aplicarán a <strong>todos</strong> los destinatarios.
                  <br /><strong>Destinatarios:</strong> {scheduledRecipients(editingScheduled)}
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <strong>Destinatario:</strong> {scheduledRecipients(editingScheduled)}
                </Text>
              )}
            </div>

            <div style={{ marginBottom: 8 }}><Text strong>Asunto:</Text></div>
            <Input
              value={editSchedSubject}
              onChange={(e) => setEditSchedSubject(e.target.value)}
              placeholder="Asunto del mensaje"
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 8 }}><Text strong>Mensaje:</Text></div>
            <MessagingEditor
              value={editSchedContent}
              onChange={(content) => setEditSchedContent(content)}
              placeholder="Escribe tu mensaje..."
              minHeight={200}
              hideSendButton
            />

            <div style={{ marginTop: 16, marginBottom: 8 }}><Text strong>Fecha y hora de envío:</Text></div>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              value={editSchedWhen}
              onChange={(v) => setEditSchedWhen(v)}
              disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
              style={{ width: '100%' }}
              placeholder="Selecciona fecha y hora"
            />
          </>
        )}
      </Modal>

      {/* CSS styles */}
      <style jsx global>{`
        /* Own messages - white text on purple background */
        .message-sender .message-content,
        .message-sender .message-content *,
        .message-sender .message-content p,
        .message-sender .message-content span,
        .message-sender .message-content div,
        .message-sender .message-content strong,
        .message-sender .message-content em,
        .message-sender .message-content b,
        .message-sender .message-content i,
        .message-sender .message-content ul,
        .message-sender .message-content ol,
        .message-sender .message-content li {
          color: white !important;
        }

        .message-sender .message-content a {
          color: rgba(255, 255, 255, 0.9) !important;
          text-decoration: underline !important;
        }

        /* Received messages - dark text */
        .message-receiver .message-content,
        .message-receiver .message-content *,
        .message-receiver .message-content p,
        .message-receiver .message-content span,
        .message-receiver .message-content div,
        .message-receiver .message-content strong,
        .message-receiver .message-content em,
        .message-receiver .message-content b,
        .message-receiver .message-content i,
        .message-receiver .message-content ul,
        .message-receiver .message-content ol,
        .message-receiver .message-content li {
          color: #374151 !important;
        }

        .message-receiver .message-content a {
          color: #1f2937 !important;
          text-decoration: underline !important;
        }

        /* Hover effect for conversation list items */
        .conversation-list-item:hover {
          background-color: #f5f3ff !important;
        }

        /* Show more button on hover */
        .conversation-list-item:hover .conversation-more-btn {
          opacity: 1 !important;
        }

        /* Fix tabs height to fill container */
        .ant-tabs-content-holder {
          overflow: hidden !important;
        }

        .ant-tabs-content {
          height: 100% !important;
        }

        .ant-tabs-tabpane {
          height: 100% !important;
        }

        .ant-tabs.ant-tabs-top {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
      `}</style>

      <MediaGalleryModal
        visible={galleryVisible}
        media={allGalleryMedia}
        initialIndex={galleryIndex}
        onClose={() => setGalleryVisible(false)}
      />
      <YouTubePlayerModal
        visible={youtubeVisible}
        videoId={youtubeVideoId}
        title={youtubeTitle}
        onClose={() => setYoutubeVisible(false)}
      />
    </div>
  );
};

export default ConversationsPage;
