import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Drawer,
  Typography,
  Badge,
  Tooltip,
  Avatar,
  Divider,
  Row,
  Col,
  Statistic,
  Tabs,
} from 'antd';
import {
  MessageOutlined,
  SendOutlined,
  EyeOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  TeamOutlined,
  ReloadOutlined,
  CheckOutlined,
  ClearOutlined,
  ArrowLeftOutlined,
  MailOutlined,
  InboxOutlined,
  DownloadOutlined,
  FileOutlined,
  SearchOutlined,
  SaveOutlined,
  EditOutlined,
} from '@ant-design/icons';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useCommunications } from '../../hooks/useCommunications';
import { useNotificationStore } from '../../store/notificationStore';
import { useResponsive } from '../../hooks/useResponsive';
import { MessageGroup } from '../../services/communications.service';
import { formatDateToMadrid, formatDateOnlyToMadrid, formatRelativeTime, formatDateToMadridAlternative, getTimezoneConfig, formatDateTimeShort } from '../../utils/dateUtils';
import RichTextEditor from '../../components/common/RichTextEditor';
import AIReplyAssistant from '../../components/communications/AIReplyAssistant';
import AIMessageComposer from '../../components/communications/AIMessageComposer';
import GroupManagementModal from '../../components/communications/GroupManagementModal';
import ImageWithAuth from '../../components/communications/ImageWithAuth';
import VideoWithAuth from '../../components/communications/VideoWithAuth';
import MediaGalleryModal from '../../components/communications/MediaGalleryModal';
import type { GalleryMediaItem } from '../../components/communications/MediaGalleryModal';
import LinkPreviewCard, { extractUrls } from '../../components/communications/LinkPreviewCard';
import YouTubePlayerModal from '../../components/communications/YouTubePlayerModal';
import useDraftAutosave from '../../hooks/useDraftAutosave';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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
  subject: string;
  content: string;
  type: 'direct' | 'group' | 'announcement' | 'notification';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'sent' | 'delivered' | 'read';
  isDraft?: boolean;
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
}

interface User {
  id: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
  };
  familyInfo?: {
    children: string;
    childrenCount: number;
  };
}

interface ClassGroup {
  id: string;
  name: string;
}

interface Student {
  id: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

const MessagesPage: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pageSize: number; total: number }>({
    page: 1,
    pageSize: 25,
    total: 0,
  });
  const [availableRecipients, setAvailableRecipients] = useState<User[]>([]);
  const [availableGroups, setAvailableGroups] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Acciones del store de notificaciones para actualización inmediata de badges
  const decrementMessagesBadge = useNotificationStore((state) => state.decrementMessagesBadge);
  const incrementMessagesBadge = useNotificationStore((state) => state.incrementMessagesBadge);
  const setMessagesBadge = useNotificationStore((state) => state.setMessagesBadge);
  const fetchMessagesBadge = useNotificationStore((state) => state.fetchMessagesBadge);

  // Message groups hook
  const {
    messageGroups,
    getMessageGroups,
    createMessageGroup,
    sendMessageToGroup
  } = useCommunications();
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [conversationModalVisible, setConversationModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();
  // Autoguardado local: lo escrito se conserva aunque se cierre el modal sin querer
  const composeAutosave = useDraftAutosave('messages-compose');
  const replyAutosave = useDraftAutosave('messages-reply');
  const [stats, setStats] = useState<any>({});
  const [userRole, setUserRole] = useState<string>('');
  const [aiContent, setAiContent] = useState<string>('');
  const [composeAiContent, setComposeAiContent] = useState<string>('');
  const [activeInbox, setActiveInbox] = useState<'received' | 'sent' | 'drafts'>('received');
  const [groupManagementVisible, setGroupManagementVisible] = useState(false);

  // Estado para borradores
  const [drafts, setDrafts] = useState<Message[]>([]);
  const [draftsCount, setDraftsCount] = useState<number>(0);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendMethod, setSendMethod] = useState<'individual' | 'group'>('individual');
  const [fileList, setFileList] = useState<Array<{uid: string; name: string; status: string; originFileObj: File}>>([]);
  const [replyFileList, setReplyFileList] = useState<Array<{uid: string; name: string; status: string; originFileObj: File}>>([]);

  // Media gallery (images + videos) & YouTube modal state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [youtubeVisible, setYoutubeVisible] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');

  // Ref para scroll automático al final del contenedor de mensajes
  const replyButtonRef = useRef<HTMLDivElement>(null);

  // Responsive state & visual viewport (keyboard-aware height for mobile)
  const { isMobile, isTablet } = useResponsive();
  const [visualViewportHeight, setVisualViewportHeight] = useState<number>(
    () => (typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 600)
  );
  const subjectInputRef = useRef<any>(null);

  // Helper para determinar si un mensaje debe mostrarse como leído
  const isMessageReadForUser = (message: Message): boolean => {
    // Los mensajes enviados por el usuario actual siempre se muestran como leídos
    if (message.sender.id === user?.id) {
      return true;
    }
    // Para mensajes recibidos, usar el estado isRead normal
    return message.isRead;
  };

  // Collect all gallery media (images + videos) from the selected conversation (main message + replies)
  const allGalleryMedia: GalleryMediaItem[] = React.useMemo(() => {
    const media: GalleryMediaItem[] = [];
    const msgList = selectedMessage ? [selectedMessage, ...(selectedMessage.replies || [])] : [];
    msgList.forEach((msg) => {
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
  }, [selectedMessage]);

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

  // Función para filtrar mensajes por bandeja y búsqueda
  const getFilteredMessages = (): Message[] => {
    return messages.filter(message => {
      // Filtro por bandeja (recibidos/enviados)
      let matchesInbox = false;
      if (activeInbox === 'received') {
        matchesInbox = message.sender.id !== user?.id;
      } else {
        matchesInbox = message.sender.id === user?.id;
      }

      if (!matchesInbox) return false;

      // Filtro por búsqueda
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase().trim();

        // Buscar en nombre del remitente
        const senderName = `${message.sender?.profile?.firstName || ''} ${message.sender?.profile?.lastName || ''}`.toLowerCase();

        // Buscar en nombre del destinatario
        const recipientName = message.recipient
          ? `${message.recipient?.profile?.firstName || ''} ${message.recipient?.profile?.lastName || ''}`.toLowerCase()
          : '';

        // Buscar en nombre del estudiante relacionado
        const studentName = message.relatedStudent
          ? `${message.relatedStudent?.user?.profile?.firstName || ''} ${message.relatedStudent?.user?.profile?.lastName || ''}`.toLowerCase()
          : '';

        // Buscar en asunto del mensaje
        const subject = message.subject?.toLowerCase() || '';

        // Retornar true si coincide con alguno de los criterios
        const matchesSearch =
          senderName.includes(searchLower) ||
          recipientName.includes(searchLower) ||
          studentName.includes(searchLower) ||
          subject.includes(searchLower);

        if (!matchesSearch) return false;
      }

      return true;
    });
  };

  // Filtros
  const [filters, setFilters] = useState<{
    type?: string;
    priority?: string;
    isRead?: boolean;
  }>({
    type: undefined,
    priority: undefined,
    isRead: undefined,
  });

  // Estado para búsqueda de mensajes
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    fetchMessages(1);
    fetchAvailableRecipients();
    fetchAvailableGroups();
    fetchStudents();
    fetchStats();
    fetchUserRole();
    getMessageGroups(); // Cargar grupos de mensajes
    fetchDrafts(); // Cargar borradores
    fetchDraftsCount(); // Cargar contador de borradores

    // Cargar configuración de timezone para formateo correcto de fechas
    getTimezoneConfig().then(config => {
      console.log('🌍 Configuración de timezone cargada para mensajes:', config);
    }).catch(err => {
      console.warn('⚠️ Error cargando configuración de timezone, usando defaults:', err);
    });
  }, [filters]);

  // Efecto para actualizar el rol cuando cambie el usuario
  useEffect(() => {
    if (user?.role) {
      console.log('🔍 User role from store:', user.role);
      console.log('🔍 User object:', user);
      setUserRole(user.role);
      console.log('🔍 UserRole state after setting:', user.role);
    }
  }, [user]);

  // Debug effect
  useEffect(() => {
    console.log('Current userRole state:', userRole);
  }, [userRole]);

  // Handle messageId from URL (notifications)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const messageId = urlParams.get('messageId');

    if (messageId && messages.length > 0) {
      const targetMessage = messages.find(msg => msg.id === messageId);
      if (targetMessage) {
        console.log('🔔 NOTIFICATION NAV: Opening message from notification:', messageId);
        handleViewMessage(targetMessage);
        // Mark as read when opened from notification
        if (!isMessageReadForUser(targetMessage)) {
          handleMarkAsRead(messageId);
        }
        // Clear the messageId from URL after handling
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('messageId');
        window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
      } else {
        console.warn('🔔 NOTIFICATION NAV: Message not found in current messages list:', messageId);
        // Try to fetch the specific message if not found in current list
        fetchSpecificMessage(messageId);
      }
    }
  }, [location.search, messages]);

  // Track visual viewport height for all modals on mobile
  // (handles soft keyboard on iOS Safari and Android Chrome)
  useEffect(() => {
    const anyModalOpen = modalVisible || conversationModalVisible || replyModalVisible;
    if (!anyModalOpen || !isMobile) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => setVisualViewportHeight(vv.height);
    vv.addEventListener('resize', handler);
    handler();
    return () => vv.removeEventListener('resize', handler);
  }, [modalVisible, conversationModalVisible, replyModalVisible, isMobile]);

  // Scroll automático al final del contenedor cuando se abre el modal de conversación
  useEffect(() => {
    if (conversationModalVisible && replyButtonRef.current) {
      // Delay para asegurar que el contenido se ha renderizado
      setTimeout(() => {
        // Buscar el contenedor de mensajes dentro del ref y hacer scroll
        const messagesContainer = replyButtonRef.current?.querySelector('[data-messages-container]');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 150);
    }
  }, [conversationModalVisible, selectedMessage]);

  const fetchUserRole = async () => {
    try {
      // Obtener el rol del usuario del store de autenticación
      if (user?.role) {
        setUserRole(user.role);
      } else {
        // Fallback: obtener del token si no está en el store
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserRole(payload.role || '');
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchMessages = async (overridePage?: number, overridePageSize?: number) => {
    try {
      setLoading(true);
      const page = overridePage ?? pagination.page;
      const pageSize = overridePageSize ?? pagination.pageSize;
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.isRead !== undefined) params.append('isRead', filters.isRead.toString());
      params.append('page', String(page));
      params.append('limit', String(pageSize));

      const response = await apiClient.get(`/communications/messages?${params.toString()}`);
      if (Array.isArray(response.data)) {
        // Compat: array response (shouldn't happen with explicit page, but safe)
        setMessages(response.data);
        setPagination((p) => ({ ...p, page, pageSize, total: response.data.length }));
      } else {
        setMessages(response.data.data || []);
        setPagination({
          page: response.data.page ?? page,
          pageSize: response.data.limit ?? pageSize,
          total: response.data.total ?? 0,
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      message.error('Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRecipients = async () => {
    try {
      const response = await apiClient.get('/communications/available-recipients');
      console.log('📩 MessagesPage DEBUG: API response for available-recipients:', response.data);
      console.log('📩 MessagesPage DEBUG: Family users in response:', 
        response.data.filter((user: any) => user.role === 'family')
          .map((user: any) => ({ 
            id: user.id, 
            role: user.role, 
            name: `${user.profile?.firstName} ${user.profile?.lastName}`,
            familyInfo: user.familyInfo 
          }))
      );
      setAvailableRecipients(response.data);
    } catch (error) {
      console.error('Error fetching available recipients:', error);
    }
  };

  const fetchAvailableGroups = async () => {
    try {
      // Solo cargar grupos si el usuario no es familia
      if (user?.role !== 'family') {
        const response = await apiClient.get('/communications/available-groups');
        setAvailableGroups(response.data);
      } else {
        setAvailableGroups([]);
      }
    } catch (error) {
      console.error('Error fetching available groups:', error);
      // Si hay error (ej: usuario sin permisos), establecer array vacío
      setAvailableGroups([]);
    }
  };

  const fetchStudents = async () => {
    try {
      // Familias usan un endpoint diferente para obtener sus hijos
      if (user?.role === 'family') {
        const response = await apiClient.get('/families/my-children');
        setStudents(response.data || []);
      } else if (user?.role === 'teacher') {
        // RGPD: el profesor solo ve sus alumnos (tutoría + asignatura)
        const response = await apiClient.get('/students/my-students');
        setStudents(response.data);
      } else if (user?.role === 'admin') {
        const response = await apiClient.get('/students');
        setStudents(response.data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/communications/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ======= FUNCIONES DE BORRADORES =======
  const fetchDrafts = async () => {
    try {
      const response = await apiClient.get('/communications/drafts');
      setDrafts(response.data);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    }
  };

  const fetchDraftsCount = async () => {
    try {
      const response = await apiClient.get('/communications/drafts/count');
      setDraftsCount(response.data.count);
    } catch (error) {
      console.error('Error fetching drafts count:', error);
    }
  };

  const handleSaveAsDraft = async () => {
    try {
      setSavingDraft(true);
      const values = form.getFieldsValue();

      // Preparar datos del borrador
      const draftData: any = {
        subject: values.subject || '',
        content: values.content || '',
        type: values.type || 'direct',
        priority: values.priority || 'normal',
        isDraft: true,
      };

      // Agregar destinatario si existe
      if (values.recipientIds && values.recipientIds.length > 0) {
        draftData.recipientId = values.recipientIds[0];
        if (values.recipientIds.length > 1) {
          draftData.recipientIds = values.recipientIds;
        }
      }
      if (values.targetGroupId) {
        draftData.targetGroupId = values.targetGroupId;
      }
      if (values.messageGroupId) {
        draftData.messageGroupId = values.messageGroupId;
      }

      let response;
      if (editingDraftId) {
        // Actualizar borrador existente
        response = await apiClient.patch(`/communications/drafts/${editingDraftId}`, draftData);
        message.success('Borrador actualizado correctamente');
      } else {
        // Crear nuevo borrador
        response = await apiClient.post('/communications/messages', draftData);
        message.success('Mensaje guardado como borrador');
      }

      composeAutosave.clearDraft();
      setModalVisible(false);
      form.resetFields();
      setComposeAiContent('');
      setFileList([]);
      setSendMethod('individual');
      setEditingDraftId(null);
      fetchDrafts();
      fetchDraftsCount();
    } catch (error) {
      console.error('Error saving draft:', error);
      message.error('Error al guardar el borrador');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleEditDraft = (draft: Message) => {
    setEditingDraftId(draft.id);
    form.setFieldsValue({
      subject: draft.subject,
      content: draft.content,
      type: draft.type,
      priority: draft.priority,
      recipientIds: draft.recipient ? [draft.recipient.id] : [],
      targetGroupId: draft.targetGroup?.id,
    });
    setComposeAiContent(draft.content);
    setModalVisible(true);
  };

  const handleSendDraft = async (draftId: string) => {
    try {
      await apiClient.post(`/communications/drafts/${draftId}/send`);
      message.success('Borrador enviado exitosamente');
      fetchDrafts();
      fetchDraftsCount();
      fetchMessages();
      fetchStats();
    } catch (error: any) {
      console.error('Error sending draft:', error);
      message.error(error.response?.data?.message || 'Error al enviar el borrador');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await apiClient.delete(`/communications/drafts/${draftId}`);
      message.success('Borrador eliminado');
      fetchDrafts();
      fetchDraftsCount();
    } catch (error) {
      console.error('Error deleting draft:', error);
      message.error('Error al eliminar el borrador');
    }
  };
  // ======= FIN FUNCIONES DE BORRADORES =======

  // Helper: reset all compose modal state and close
  const resetAndCloseModal = () => {
    setModalVisible(false);
    form.resetFields();
    setComposeAiContent('');
    setSendMethod('individual');
    setEditingDraftId(null);
    setFileList([]);
  };

  // Cancel with confirmation if content exists
  const handleCancelModal = () => {
    const content = form.getFieldValue('content');
    const subject = form.getFieldValue('subject');
    const hasContent =
      (content && content !== '<br>' && content !== '<div><br></div>' && content.trim() !== '') ||
      (subject && subject.trim() !== '');
    if (hasContent) {
      Modal.confirm({
        title: '¿Salir sin enviar?',
        content: 'Tu mensaje se ha guardado automáticamente como borrador. Podrás continuar escribiéndolo al volver a abrir "Nuevo Mensaje".',
        okText: 'Salir',
        cancelText: 'Seguir escribiendo',
        onOk: resetAndCloseModal,
      });
    } else {
      resetAndCloseModal();
    }
  };

  const fetchSpecificMessage = async (messageId: string) => {
    try {
      console.log('🔔 NOTIFICATION NAV: Fetching specific message:', messageId);
      const response = await apiClient.get(`/communications/messages/${messageId}`);
      const specificMessage = response.data;
      
      if (specificMessage) {
        console.log('🔔 NOTIFICATION NAV: Found specific message, opening modal');
        setSelectedMessage(specificMessage);
        setConversationModalVisible(true);
        
        // Mark as read when opened from notification
        if (!isMessageReadForUser(specificMessage)) {
          handleMarkAsRead(messageId);
        }
        
        // Clear the messageId from URL after handling
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('messageId');
        window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
        
        // Refresh the messages list to include this message
        fetchMessages();
      }
    } catch (error) {
      console.error('🔔 NOTIFICATION NAV: Error fetching specific message:', error);
      message.error('No se pudo encontrar el mensaje solicitado');
      
      // Clear the messageId from URL even if there's an error
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('messageId');
      window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
    }
  };

  const handleCreateMessage = async (values: any) => {
    try {
      console.log('📤 Enviando mensaje con valores:', values);

      // Si se seleccionó un grupo de mensajes, usar el método de envío por grupo
      if (values.messageGroupId) {
        console.log('📤 Enviando mensaje a grupo:', values.messageGroupId);
        const group = messageGroups.find(g => g.id === values.messageGroupId);
        await sendMessageToGroup(values.messageGroupId, {
          subject: values.subject,
          content: values.content,
          type: values.type,
          priority: values.priority,
          recipientIds: [] // No necesario para grupos
        });
        message.success(`Mensaje enviado exitosamente al grupo "${group?.name}"`);
        composeAutosave.clearDraft();
        setModalVisible(false);
        form.resetFields();
        setFileList([]);
        setSendMethod('individual');
        fetchMessages();
        fetchStats();
        return;
      }

      // Lógica para mensajes individuales y bulk
      let endpoint = '/communications/messages';
      let successMessage = 'Mensaje enviado exitosamente';
      let hasAttachments = fileList.length > 0;

      if (values.recipientIds && values.recipientIds.length > 1) {
        endpoint = '/communications/messages/bulk';
        successMessage = `Mensaje enviado exitosamente a ${values.recipientIds.length} destinatarios`;
        console.log(`📤 Usando endpoint bulk para ${values.recipientIds.length} destinatarios`);
      } else if (values.recipientIds && values.recipientIds.length === 1) {
        // Convertir recipientIds a recipientId para un solo destinatario
        values.recipientId = values.recipientIds[0];
        delete values.recipientIds;
        console.log('📤 Usando endpoint normal para un solo destinatario');
      }

      // Si hay archivos adjuntos, usar el endpoint especial con FormData
      if (hasAttachments) {
        endpoint = '/communications/messages/with-attachments';
        const formData = new FormData();

        // Agregar campos del formulario
        Object.keys(values).forEach(key => {
          if (values[key] !== undefined && values[key] !== null) {
            if (Array.isArray(values[key])) {
              // Para arrays como recipientIds, agregar cada valor
              values[key].forEach((item: any) => {
                formData.append(`${key}[]`, item);
              });
            } else {
              formData.append(key, values[key]);
            }
          }
        });

        // Agregar archivos adjuntos
        fileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append('attachments', file.originFileObj);
          }
        });

        const response = await apiClient.post(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('📤 Respuesta del servidor (con archivos):', response.data);
      } else {
        // Sin archivos, usar el endpoint normal
        const response = await apiClient.post(endpoint, values);
        console.log('📤 Respuesta del servidor:', response.data);
      }

      message.success(successMessage + (hasAttachments ? ` con ${fileList.length} archivo(s) adjunto(s)` : ''));
      composeAutosave.clearDraft();
      setModalVisible(false);
      form.resetFields();
      setFileList([]);
      setSendMethod('individual');
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Error creating message:', error);
      message.error('Error al enviar el mensaje');
    }
  };

  const handleReplyMessage = async (values: any) => {
    try {
      const replyData = {
        ...values,
        parentMessageId: replyMessage?.id,
        type: 'direct',
        recipientId: replyMessage?.sender.id,
      };

      const hasAttachments = replyFileList.length > 0;
      let endpoint = '/communications/messages';

      if (hasAttachments) {
        endpoint = '/communications/messages/with-attachments';
        const formData = new FormData();

        // Agregar campos del formulario
        Object.keys(replyData).forEach(key => {
          if (replyData[key] !== undefined && replyData[key] !== null) {
            formData.append(key, replyData[key]);
          }
        });

        // Agregar archivos adjuntos
        replyFileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append('attachments', file.originFileObj);
          }
        });

        await apiClient.post(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await apiClient.post(endpoint, replyData);
      }

      message.success('Respuesta enviada exitosamente' + (hasAttachments ? ` con ${replyFileList.length} archivo(s) adjunto(s)` : ''));
      replyAutosave.clearDraft();
      setReplyModalVisible(false);
      setReplyMessage(null);
      replyForm.resetFields();
      setReplyFileList([]);
      fetchMessages();
      fetchStats();
      
      // Actualizar el drawer si está abierto
      if (selectedMessage) {
        const response = await apiClient.get(`/communications/messages/${selectedMessage.id}`);
        setSelectedMessage(response.data);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      message.error('Error al enviar la respuesta');
    }
  };

  const handleOpenReply = (messageToReply: Message) => {
    setReplyMessage(messageToReply);
    setReplyModalVisible(true);
    replyForm.setFieldsValue({
      subject: `Re: ${messageToReply.subject}`,
      priority: 'normal'
    });
    // Recuperar borrador autoguardado de respuesta si pertenece a este mensaje
    const draft = replyAutosave.loadDraft();
    if (draft && draft.__replyTo === messageToReply.id) {
      const { __replyTo, ...values } = draft;
      replyForm.setFieldsValue(values);
      if (values.content) setAiContent(values.content);
      message.info('Se ha recuperado el borrador de respuesta guardado automáticamente');
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await apiClient.patch(`/communications/messages/${messageId}`, {
        isRead: true,
      });
      // Actualización inmediata del badge de mensajes no leídos
      decrementMessagesBadge(1);
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Error marking message as read:', error);
      message.error('Error al marcar como leído');
      // Recargar badge desde servidor en caso de error
      fetchMessagesBadge();
    }
  };

  const handleMarkAsUnread = async (messageId: string) => {
    try {
      console.log(`🔄 Marking message ${messageId} as unread...`);
      const response = await apiClient.post(`/communications/messages/${messageId}/mark-unread`);
      console.log(`✅ Mark as unread response:`, response.data);
      // Actualización inmediata del badge de mensajes no leídos
      incrementMessagesBadge(1);
      message.success('Mensaje marcado como no leído');
      console.log(`🔄 Refreshing messages and stats...`);
      await fetchMessages();
      await fetchStats();
      console.log(`✅ Messages and stats refreshed`);
    } catch (error) {
      console.error('Error marking message as unread:', error);
      message.error('Error al marcar como no leído');
      // Recargar badge desde servidor en caso de error
      fetchMessagesBadge();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Buscar si el mensaje era no leído antes de eliminarlo
      const deletedMessage = messages.find(m => m.id === messageId);
      const wasUnread = deletedMessage && !isMessageReadForUser(deletedMessage);

      await apiClient.delete(`/communications/messages/${messageId}`);

      // Si el mensaje era no leído, decrementar el badge inmediatamente
      if (wasUnread) {
        decrementMessagesBadge(1);
      }

      message.success('Mensaje eliminado exitosamente');
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Error deleting message:', error);
      message.error('Error al eliminar el mensaje');
      // Recargar badge desde servidor en caso de error
      fetchMessagesBadge();
    }
  };

  const handleMarkAllAsRead = async () => {
    Modal.confirm({
      title: '¿Marcar todos los mensajes como leídos?',
      content: 'Esta acción marcará todos los mensajes no leídos como leídos. ¿Está seguro?',
      onOk: async () => {
        try {
          await apiClient.post('/communications/messages/mark-all-read');
          // Actualización inmediata del badge a 0
          setMessagesBadge(0);
          message.success('Todos los mensajes han sido marcados como leídos');
          fetchMessages();
          fetchStats();
        } catch (error) {
          console.error('Error marking all messages as read:', error);
          message.error('Error al marcar todos los mensajes como leídos');
          // Recargar badge desde servidor en caso de error
          fetchMessagesBadge();
        }
      },
    });
  };

  const handleDeleteAllMessages = async () => {
    Modal.confirm({
      title: '¿Eliminar todos los mensajes?',
      content: 'Esta acción eliminará todos los mensajes de forma permanente. ¿Está seguro?',
      okText: 'Sí, eliminar todos',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const response = await apiClient.delete('/communications/messages/bulk/delete-all');
          message.success(`${response.data.deletedCount} mensajes eliminados exitosamente`);
          fetchMessages();
          fetchStats();
        } catch (error) {
          console.error('Error deleting all messages:', error);
          message.error('Error al eliminar todos los mensajes');
        }
      },
    });
  };

  const handleViewMessage = async (messageRecord: Message) => {
    try {
      const response = await apiClient.get(`/communications/messages/${messageRecord.id}`);

      // 🔍 DEBUG: Ver qué devuelve la API COMPLETO
      console.log('🚨 API RESPONSE COMPLETO:', response.data);
      console.log('🚨 ATTACHMENTS EN API?', response.data.attachments);
      console.log('🚨 ATTACHMENTS ES ARRAY?', Array.isArray(response.data.attachments));
      console.log('🚨 ATTACHMENTS LENGTH:', response.data.attachments?.length);
      console.log('🚨 PRIMER ATTACHMENT:', response.data.attachments?.[0]);

      setSelectedMessage(response.data);
      setConversationModalVisible(true);

      // Marcar como leído si no lo está
      if (!messageRecord.isRead) {
        handleMarkAsRead(messageRecord.id);
      }
    } catch (error) {
      console.error('Error fetching message details:', error);
      message.error('Error al cargar los detalles del mensaje');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'direct': return <UserOutlined />;
      case 'group': return <TeamOutlined />;
      case 'announcement': return <FlagOutlined />;
      case 'notification': return <MessageOutlined />;
      default: return <MessageOutlined />;
    }
  };

  // Columnas dinámicas basadas en la bandeja activa
  const getColumns = () => {
    const baseColumns = [
      {
        title: 'Estado',
        dataIndex: 'isRead',
        key: 'isRead',
        width: 80,
        render: (_: boolean, record: Message) => {
          const messageRead = isMessageReadForUser(record);
          return (
            <Badge
              status={messageRead ? 'default' : 'processing'}
              title={messageRead ? 'Leído' : 'No leído'}
            />
          );
        },
      },
    ];

    if (activeInbox === 'received') {
      // Para mensajes recibidos, mostrar remitente
      baseColumns.push({
        title: 'De',
        dataIndex: 'sender',
        key: 'sender',
        render: (sender: any, record: Message) => {
          const isUnread = !isMessageReadForUser(record);
          return (
            <Space>
              <Avatar icon={<UserOutlined />} />
              <span style={{ fontWeight: isUnread ? 600 : 400 }}>
                {sender?.profile?.firstName || 'N/A'} {sender?.profile?.lastName || ''}
              </span>
            </Space>
          );
        },
      });
    } else {
      // Para mensajes enviados, mostrar destinatario
      baseColumns.push({
        title: 'Para',
        key: 'recipient',
        render: (record: Message) => {
          const isUnread = !isMessageReadForUser(record);
          if (record.recipient) {
            return (
              <Space>
                <Avatar icon={<UserOutlined />} />
                <span style={{ fontWeight: isUnread ? 600 : 400 }}>
                  {record.recipient?.profile?.firstName || 'N/A'} {record.recipient?.profile?.lastName || ''}
                </span>
              </Space>
            );
          } else if (record.targetGroup) {
            return (
              <Space>
                <Avatar icon={<TeamOutlined />} />
                <span style={{ fontWeight: isUnread ? 600 : 400 }}>{record.targetGroup.name}</span>
              </Space>
            );
          }
          return '-';
        },
      });
    }

    // Columnas comunes para ambas bandejas
    baseColumns.push(
      {
        title: 'Tipo',
        dataIndex: 'type',
        key: 'type',
        width: 240,
        render: (type: string) => (
          <Tag color={getPriorityColor(type)}>
            {getTypeIcon(type)} {type}
          </Tag>
        ),
      },
      {
        title: 'Asunto',
        dataIndex: 'subject',
        key: 'subject',
        ellipsis: true,
        render: (subject: string, record: Message) => {
          const isUnread = !isMessageReadForUser(record);
          return (
            <div>
              <span style={{ fontWeight: isUnread ? 600 : 400 }}>{subject}</span>
              {record.relatedStudent && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Sobre: {record.relatedStudent?.user?.profile?.firstName || 'N/A'} {record.relatedStudent?.user?.profile?.lastName || ''}
                  </Text>
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: 'Fecha',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 140,
        render: (date: string, record: Message) => {
          const isUnread = !isMessageReadForUser(record);
          return (
            <Space>
              <ClockCircleOutlined />
              <span style={{ fontWeight: isUnread ? 600 : 400 }}>
                {formatDateTimeShort(date)}
              </span>
            </Space>
          );
        },
      },
      {
        title: 'Acciones',
        key: 'actions',
        width: 150,
        render: (record: Message) => (
          <Space>
            <Tooltip title="Ver mensaje">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewMessage(record)}
              />
            </Tooltip>
            {activeInbox === 'received' && (
              <Tooltip title="Responder">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => handleOpenReply(record)}
                  disabled={record.sender.id === user?.id}
                />
              </Tooltip>
            )}
            {!isMessageReadForUser(record) && (
              <Tooltip title="Marcar como leído">
                <Button
                  type="text"
                  icon={<MessageOutlined />}
                  onClick={() => handleMarkAsRead(record.id)}
                />
              </Tooltip>
            )}
            {isMessageReadForUser(record) && activeInbox === 'received' && (
              <Tooltip title="Marcar como no leído">
                <Button
                  type="text"
                  icon={<MailOutlined />}
                  onClick={() => handleMarkAsUnread(record.id)}
                />
              </Tooltip>
            )}
            <Tooltip title="Eliminar">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteMessage(record.id)}
              />
            </Tooltip>
          </Space>
        ),
      }
    );

    return baseColumns;
  };

  const columns = getColumns();

  return (
    <div style={{ padding: '24px', maxWidth: 'none', width: '100%' }}>
      <Title level={2}>
        <MessageOutlined /> Sistema de Comunicaciones
      </Title>

      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Mensajes"
              value={stats.totalMessages || 0}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Enviados"
              value={stats.totalSent || 0}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Recibidos"
              value={stats.totalReceived || 0}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="No Leídos"
              value={stats.unreadMessages || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtros y acciones */}
      <Card style={{ marginBottom: 24 }}>
        {/* Barra de búsqueda - Primera fila */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input
              placeholder="Buscar por nombre del padre/familia, estudiante relacionado o asunto del mensaje..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        {/* Filtros y botones de acción - Segunda fila */}
        <Row gutter={16} align="middle">
          <Col>
            <Select
              placeholder="Filtrar por tipo"
              allowClear
              style={{ width: 150 }}
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
            >
              <Select.Option value="direct">Directo</Select.Option>
              <Select.Option value="group">Grupal</Select.Option>
              <Select.Option value="announcement">Comunicado</Select.Option>
              <Select.Option value="notification">Notificación</Select.Option>
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Filtrar por prioridad"
              allowClear
              style={{ width: 150 }}
              value={filters.priority}
              onChange={(value) => setFilters({ ...filters, priority: value })}
            >
              <Select.Option value="urgent">Urgente</Select.Option>
              <Select.Option value="high">Alta</Select.Option>
              <Select.Option value="normal">Normal</Select.Option>
              <Select.Option value="low">Baja</Select.Option>
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Estado de lectura"
              allowClear
              style={{ width: 150 }}
              value={filters.isRead}
              onChange={(value) => setFilters({ ...filters, isRead: value })}
            >
              <Select.Option value={true}>Leídos</Select.Option>
              <Select.Option value={false}>No leídos</Select.Option>
            </Select>
          </Col>
          <Col flex="auto">
            <Space style={{ float: 'right' }}>
              <Button icon={<ReloadOutlined />} onClick={fetchMessages}>
                Actualizar
              </Button>
              <Button 
                icon={<CheckOutlined />} 
                onClick={handleMarkAllAsRead}
                title="Marcar todos como leídos"
              >
                Marcar Todo Leído
              </Button>
              <Button 
                danger
                icon={<ClearOutlined />} 
                onClick={handleDeleteAllMessages}
                title="Eliminar todos los mensajes"
              >
                Eliminar Todo
              </Button>
              {(userRole === 'admin' || userRole === 'teacher') && (
                <Button
                  icon={<TeamOutlined />}
                  onClick={() => setGroupManagementVisible(true)}
                >
                  Gestionar Grupos
                </Button>
              )}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setModalVisible(true);
                  setSendMethod('individual');
                  form.resetFields();
                  // Recuperar borrador autoguardado si existe
                  const draft = composeAutosave.loadDraft();
                  if (draft) {
                    form.setFieldsValue(draft);
                    if (draft.sendMethod) setSendMethod(draft.sendMethod);
                    if (draft.content) setComposeAiContent(draft.content);
                    message.info('Se ha recuperado el borrador guardado automáticamente');
                  }
                }}
              >
                Nuevo Mensaje
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Bandejas de mensajes */}
      <Card style={{ width: '100%' }}>
        <Tabs
          activeKey={activeInbox}
          onChange={(key) => setActiveInbox(key as 'received' | 'sent' | 'drafts')}
          items={[
            {
              key: 'received',
              label: (
                <Space>
                  <InboxOutlined />
                  Bandeja de Entrada
                  <Badge 
                    count={messages.filter(m => m.sender.id !== user?.id && !isMessageReadForUser(m)).length}
                    size="small"
                  />
                </Space>
              ),
              children: (() => {
                const filtered = getFilteredMessages();
                const sortByDate = (arr: Message[]) =>
                  [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const unread = sortByDate(filtered.filter(m => !isMessageReadForUser(m)));
                const read = sortByDate(filtered.filter(m => isMessageReadForUser(m)));
                const hasUnread = unread.length > 0;

                const sectionHeaderStyle: React.CSSProperties = {
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 4px',
                  marginBottom: '4px',
                };
                const sectionLabelStyle: React.CSSProperties = {
                  fontSize: '11px',
                  color: '#8c8c8c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  fontWeight: 600,
                };

                return (
                  <>
                    {/* Sección: Sin leer */}
                    {hasUnread && (
                      <>
                        <div style={sectionHeaderStyle} role="heading" aria-level={3}>
                          <Space size={6}>
                            <span
                              style={{ width: 8, height: 8, borderRadius: '50%', background: '#faad14', display: 'inline-block' }}
                              aria-label={`${unread.length} mensajes no leídos`}
                            />
                            <span style={sectionLabelStyle}>Sin leer</span>
                            <span style={{ ...sectionLabelStyle, fontWeight: 400 }}>· {unread.length}</span>
                          </Space>
                        </div>
                        <Table
                          columns={getColumns()}
                          dataSource={unread}
                          rowKey="id"
                          loading={loading}
                          size="small"
                          scroll={{ x: 'max-content' }}
                          pagination={unread.length > 10 ? {
                            pageSize: 10,
                            showSizeChanger: false,
                            showTotal: (total) => `${total} mensajes no leídos`,
                          } : false}
                          rowClassName={() => 'unread-message-row'}
                          locale={{ emptyText: '' }}
                        />
                      </>
                    )}

                    {/* Separador entre secciones */}
                    {hasUnread && read.length > 0 && (
                      <Divider style={{ margin: '12px 0' }} />
                    )}

                    {/* Sección: Todo lo demás */}
                    {(read.length > 0 || !hasUnread) && (
                      <>
                        {hasUnread && (
                          <div style={sectionHeaderStyle} role="heading" aria-level={3}>
                            <span style={sectionLabelStyle}>Todo lo demás</span>
                          </div>
                        )}
                        <Table
                          columns={getColumns()}
                          dataSource={hasUnread ? read : filtered}
                          rowKey="id"
                          loading={loading}
                          size="small"
                          scroll={{ x: 'max-content' }}
                          pagination={{
                            current: pagination.page,
                            pageSize: pagination.pageSize,
                            total: pagination.total,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '25', '50', '100'],
                            showQuickJumper: true,
                            showTotal: (total) => `Total ${total} mensajes`,
                            onChange: (page, pageSize) => {
                              setPagination((p) => ({ ...p, page, pageSize }));
                              fetchMessages(page, pageSize);
                            },
                            onShowSizeChange: (_current, size) => {
                              setPagination((p) => ({ ...p, page: 1, pageSize: size }));
                              fetchMessages(1, size);
                            },
                          }}
                          rowClassName={(record) =>
                            !isMessageReadForUser(record)
                              ? 'unread-message-row'
                              : 'read-message-row'
                          }
                          locale={{ emptyText: hasUnread ? 'No hay más mensajes' : 'No hay mensajes recibidos' }}
                        />
                      </>
                    )}
                  </>
                );
              })(),
            },
            {
              key: 'sent',
              label: (
                <Space>
                  <SendOutlined />
                  Mensajes Enviados
                </Space>
              ),
              children: (
                <Table
                  columns={getColumns()}
                  dataSource={getFilteredMessages()}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '25', '50', '100'],
                    showQuickJumper: true,
                    showTotal: (total) => `Total ${total} mensajes`,
                    onChange: (page, pageSize) => {
                      setPagination((p) => ({ ...p, page, pageSize }));
                      fetchMessages(page, pageSize);
                    },
                    onShowSizeChange: (_current, size) => {
                      setPagination((p) => ({ ...p, page: 1, pageSize: size }));
                      fetchMessages(1, size);
                    },
                  }}
                  rowClassName={(record) =>
                    !isMessageReadForUser(record)
                      ? 'unread-message-row'
                      : 'read-message-row'
                  }
                />
              ),
            },
            {
              key: 'drafts',
              label: (
                <Space>
                  <EditOutlined />
                  Borradores
                  <Badge count={draftsCount} size="small" />
                </Space>
              ),
              children: (
                <Table
                  columns={[
                    {
                      title: 'Asunto',
                      dataIndex: 'subject',
                      key: 'subject',
                      render: (text: string) => text || <Text type="secondary">(Sin asunto)</Text>,
                    },
                    {
                      title: 'Destinatario',
                      key: 'recipient',
                      render: (_: any, record: Message) => {
                        if (record.recipient) {
                          return `${record.recipient.profile?.firstName || ''} ${record.recipient.profile?.lastName || ''}`;
                        }
                        if (record.targetGroup) {
                          return <Tag color="blue">{record.targetGroup.name}</Tag>;
                        }
                        return <Text type="secondary">(Sin destinatario)</Text>;
                      },
                    },
                    {
                      title: 'Tipo',
                      dataIndex: 'type',
                      key: 'type',
                      render: (type: string) => {
                        const typeLabels: Record<string, { label: string; color: string }> = {
                          direct: { label: 'Directo', color: 'blue' },
                          group: { label: 'Grupal', color: 'green' },
                          announcement: { label: 'Comunicado', color: 'purple' },
                          notification: { label: 'Notificación', color: 'orange' },
                        };
                        const typeInfo = typeLabels[type] || { label: type, color: 'default' };
                        return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>;
                      },
                    },
                    {
                      title: 'Última modificación',
                      dataIndex: 'updatedAt',
                      key: 'updatedAt',
                      render: (date: string) => formatRelativeTime(date),
                    },
                    {
                      title: 'Acciones',
                      key: 'actions',
                      render: (_: any, record: Message) => (
                        <Space>
                          <Tooltip title="Editar borrador">
                            <Button
                              type="link"
                              icon={<EditOutlined />}
                              onClick={() => handleEditDraft(record)}
                            />
                          </Tooltip>
                          <Tooltip title="Enviar ahora">
                            <Button
                              type="link"
                              icon={<SendOutlined />}
                              onClick={() => handleSendDraft(record.id)}
                            />
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <Button
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                Modal.confirm({
                                  title: '¿Eliminar borrador?',
                                  content: 'Esta acción no se puede deshacer.',
                                  okText: 'Eliminar',
                                  okType: 'danger',
                                  cancelText: 'Cancelar',
                                  onOk: () => handleDeleteDraft(record.id),
                                });
                              }}
                            />
                          </Tooltip>
                        </Space>
                      ),
                    },
                  ]}
                  dataSource={drafts}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    total: drafts.length,
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Total ${total} borradores`,
                  }}
                  locale={{
                    emptyText: 'No tienes borradores guardados',
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Modal para crear mensaje */}
      <Modal
        title={editingDraftId ? "📝 Editar Borrador" : "✉️ Nuevo Mensaje"}
        open={modalVisible}
        onCancel={handleCancelModal}
        afterOpenChange={(open) => {
          if (open && subjectInputRef.current) {
            // Autofocus on subject input when modal opens (delay for animation)
            setTimeout(() => subjectInputRef.current?.focus?.(), 150);
          }
        }}
        width={isMobile ? '100vw' : isTablet ? '90vw' : 1100}
        style={isMobile ? {
          top: 0,
          margin: 0,
          padding: 0,
          maxWidth: '100vw',
        } : undefined}
        styles={{
          content: isMobile ? {
            height: `${visualViewportHeight}px`,
            maxHeight: `${visualViewportHeight}px`,
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
          } : undefined,
          body: isMobile ? {
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '12px 16px',
            WebkitOverflowScrolling: 'touch' as any,
          } : { overflowY: 'auto', maxHeight: '75vh' },
          footer: isMobile ? {
            padding: '10px 16px',
            borderTop: '1px solid #f0f0f0',
            backgroundColor: '#fff',
            flexShrink: 0,
          } : undefined,
        }}
        footer={
          isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                key="send"
                type="primary"
                icon={<SendOutlined />}
                onClick={() => form.submit()}
                block
                size="large"
                style={{ minHeight: 48 }}
              >
                Enviar mensaje
              </Button>
              <Button
                key="draft"
                icon={<SaveOutlined />}
                onClick={handleSaveAsDraft}
                loading={savingDraft}
                block
                size="large"
                style={{ minHeight: 48 }}
              >
                {editingDraftId ? 'Guardar cambios' : 'Guardar como borrador'}
              </Button>
              <Button
                key="cancel"
                onClick={handleCancelModal}
                block
                style={{ minHeight: 44 }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            [
              <Button key="cancel" onClick={handleCancelModal}>
                Cancelar
              </Button>,
              <Button
                key="draft"
                icon={<SaveOutlined />}
                onClick={handleSaveAsDraft}
                loading={savingDraft}
              >
                {editingDraftId ? 'Guardar cambios' : 'Guardar como borrador'}
              </Button>,
              <Button
                key="send"
                type="primary"
                icon={<SendOutlined />}
                onClick={() => form.submit()}
              >
                Enviar mensaje
              </Button>,
            ]
          )
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateMessage}
          onValuesChange={(changedValues, allValues) => {
            if (changedValues.sendMethod) {
              setSendMethod(changedValues.sendMethod);
            }
            // Autoguardado local del borrador mientras se escribe
            composeAutosave.saveDraft(allValues);
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Tipo de mensaje"
                name="type"
                rules={[{ required: true, message: 'Seleccione el tipo de mensaje' }]}
              >
                <Select placeholder="Seleccionar tipo">
                  <Select.Option value="direct">Mensaje directo</Select.Option>
                  {(userRole === 'admin' || userRole === 'teacher') && (
                    <Select.Option value="group">Mensaje grupal</Select.Option>
                  )}
                  {userRole === 'admin' && (
                    <Select.Option value="announcement">Comunicado oficial</Select.Option>
                  )}
                  {(userRole === 'admin' || userRole === 'teacher') && (
                    <Select.Option value="notification">Notificación</Select.Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Prioridad"
                name="priority"
                initialValue="normal"
              >
                <Select>
                  <Select.Option value="low">Baja</Select.Option>
                  <Select.Option value="normal">Normal</Select.Option>
                  <Select.Option value="high">Alta</Select.Option>
                  <Select.Option value="urgent">Urgente</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Opción de envío por grupo - para admins y profesores */}
          {(() => {
            console.log('🔍 Rendering bulk messaging condition check:', { userRole, isAdmin: userRole === 'admin', isTeacher: userRole === 'teacher' });
            return (userRole === 'admin' || userRole === 'teacher');
          })() && (
            <Form.Item
              label="Método de envío"
              name="sendMethod"
              initialValue="individual"
            >
              <Select placeholder="Seleccionar método de envío">
                <Select.Option value="individual">Selección individual</Select.Option>
                <Select.Option value="group">Envío por grupo</Select.Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.type !== currentValues.type ||
              prevValues.sendMethod !== currentValues.sendMethod
            }
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              const sendMethod = getFieldValue('sendMethod');

              // Debug logs para verificar funcionamiento
              if (type) {
                console.log('🐛 DEBUG FormItem - Tipo seleccionado:', type, {
                  userRole,
                  availableRecipientsCount: availableRecipients.length,
                  isDirectType: type === 'direct',
                  sendMethod
                });
              }

              // Si se seleccionó envío por grupo, mostrar selección de grupo
              if (sendMethod === 'group' && (userRole === 'admin' || userRole === 'teacher')) {
                return (
                  <div>
                    <Form.Item
                      label="Grupo de destinatarios"
                      name="messageGroupId"
                      rules={[{ required: true, message: 'Seleccione un grupo' }]}
                    >
                      <Select
                        placeholder={messageGroups.length > 0 ? "Seleccionar grupo" : "No hay grupos disponibles"}
                        disabled={messageGroups.length === 0}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) => {
                          if (!input || !option?.value) return false;
                          const group = messageGroups.find(g => g.id === option.value);
                          return group?.name?.toLowerCase().includes(input.toLowerCase()) || false;
                        }}
                      >
                        {messageGroups.map(group => (
                          <Select.Option key={group.id} value={group.id}>
                            {group.name} ({group.memberCount} miembros)
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    {/* Información del grupo seleccionado */}
                    <Form.Item shouldUpdate>
                      {() => {
                        const selectedGroupId = form.getFieldValue('messageGroupId');
                        if (!selectedGroupId) return null;

                        const selectedGroup = messageGroups.find(g => g.id === selectedGroupId);
                        if (!selectedGroup) return null;

                        return (
                          <div style={{
                            marginTop: '8px',
                            padding: '12px',
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '6px'
                          }}>
                            <Text strong style={{ color: '#0369a1' }}>
                              📧 Grupo: {selectedGroup.name}
                            </Text>
                            <div style={{ marginTop: '4px' }}>
                              <Text style={{ fontSize: '12px', color: '#64748b' }}>
                                {selectedGroup.memberCount} miembros • Tipo: {selectedGroup.type}
                              </Text>
                              {selectedGroup.description && (
                                <div style={{ marginTop: '4px' }}>
                                  <Text style={{ fontSize: '12px', color: '#64748b' }}>
                                    {selectedGroup.description}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    </Form.Item>
                  </div>
                );
              }

              if (type === 'direct' && sendMethod !== 'group') {
                return (
                  <Row gutter={16}>
                    <Col span={(userRole === 'admin' || userRole === 'teacher') ? 12 : 24}>
                      <Form.Item
                        label={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Destinatario(s)</span>
                            {availableRecipients.length > 0 && (
                              <Space size="small">
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => {
                                    const allFamilyIds = availableRecipients
                                      .filter(user => user.role === 'family')
                                      .map(user => user.id);
                                    form.setFieldValue('recipientIds', allFamilyIds);
                                  }}
                                  style={{ padding: 0, height: 'auto' }}
                                >
                                  Todas las familias
                                </Button>
                                {(userRole === 'admin') && (
                                  <Button
                                    type="link"
                                    size="small"
                                    onClick={() => {
                                      const allTeacherIds = availableRecipients
                                        .filter(user => user.role === 'teacher')
                                        .map(user => user.id);
                                      form.setFieldValue('recipientIds', allTeacherIds);
                                    }}
                                    style={{ padding: 0, height: 'auto' }}
                                  >
                                    Todos los profesores
                                  </Button>
                                )}
                              </Space>
                            )}
                          </div>
                        }
                        name="recipientIds"
                        rules={[{ required: true, message: 'Seleccione al menos un destinatario' }]}
                      >
                        <Select
                          mode="multiple"
                          showSearch
                          placeholder={availableRecipients.length > 0 ? "Buscar y seleccionar usuarios (múltiples)" : "No hay usuarios disponibles"}
                          disabled={availableRecipients.length === 0}
                          maxTagCount="responsive"
                          optionFilterProp="children"
                          showArrow={true}
                          allowClear={true}
                          filterOption={(input, option) => {
                            // Si no hay input, mostrar todas las opciones
                            if (!input) return true;
                            if (!option?.value) return false;

                            // Buscar en los datos del usuario en lugar del contenido JSX
                            const user = availableRecipients.find(u => u.id === option.value);
                            if (!user) return false;

                            // Crear texto de búsqueda más robusto y defensivo
                            const searchText = [
                              user.profile?.firstName || '',
                              user.profile?.lastName || '',
                              user.role || '',
                              (user as any).displayName || '',
                              // Incluir información de hijos para familias
                              String(user.familyInfo?.children || ''),
                              String((user as any).teacherType || ''),
                              String((user as any).additionalInfo || ''),
                              // Añadir email si está disponible
                              (user as any).email || ''
                            ]
                              .filter(Boolean) // Eliminar valores falsy
                              .map(val => String(val || '')) // Asegurar que todo sea string
                              .join(' ')
                              .toLowerCase();

                            const matches = searchText.indexOf(input.toLowerCase()) >= 0;

                            // Debug logging para troubleshooting (temporal)
                            console.log(`🔍 Filter debug: "${input}" in "${searchText}" = ${matches}`);
                            console.log(`🔍 User data:`, {
                              id: user.id,
                              firstName: user.profile?.firstName,
                              lastName: user.profile?.lastName,
                              role: user.role,
                              email: (user as any).email
                            });

                            return matches;
                          }}
                        >
                          {availableRecipients.map(user => {
                            const displayName = (user as any).displayName || `${user.profile?.firstName || 'N/A'} ${user.profile?.lastName || ''} (${user.role})`;
                            const childrenInfo = user.familyInfo?.children ? ` - Hijos: ${user.familyInfo.children}` : '';
                            const fullDisplayName = displayName + childrenInfo;

                            return (
                              <Select.Option
                                key={user.id}
                                value={user.id}
                                title={fullDisplayName}
                              >
                                {fullDisplayName}
                              </Select.Option>
                            );
                          })}
                        </Select>
                      </Form.Item>

                      {/* Información de destinatarios seleccionados */}
                      <Form.Item shouldUpdate>
                        {() => {
                          const selectedRecipientIds = form.getFieldValue('recipientIds') || [];
                          if (selectedRecipientIds.length === 0) return null;

                          const selectedUsers = availableRecipients.filter(user =>
                            selectedRecipientIds.includes(user.id)
                          );

                          const roleCount = selectedUsers.reduce((acc, user) => {
                            acc[user.role] = (acc[user.role] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);

                          const roleLabels = {
                            'admin': 'Administradores',
                            'teacher': 'Profesores',
                            'family': 'Familias',
                            'student': 'Estudiantes'
                          };

                          return (
                            <div style={{
                              marginTop: '8px',
                              padding: '12px',
                              backgroundColor: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              borderRadius: '6px'
                            }}>
                              <Text strong style={{ color: '#0369a1' }}>
                                📧 {selectedRecipientIds.length} destinatario{selectedRecipientIds.length > 1 ? 's' : ''} seleccionado{selectedRecipientIds.length > 1 ? 's' : ''}
                              </Text>
                              {Object.entries(roleCount).length > 0 && (
                                <div style={{ marginTop: '4px' }}>
                                  {Object.entries(roleCount).map(([role, count]) => (
                                    <Tag key={role} color="blue" style={{ marginRight: '4px' }}>
                                      {roleLabels[role as keyof typeof roleLabels] || role}: {count}
                                    </Tag>
                                  ))}
                                </div>
                              )}
                              {selectedRecipientIds.length > 1 && (
                                <Text style={{ fontSize: '12px', color: '#64748b' }}>
                                  Se creará un mensaje individual para cada destinatario
                                </Text>
                              )}
                            </div>
                          );
                        }}
                      </Form.Item>
                    </Col>
                    {/* Solo mostrar campo de estudiante relacionado para teachers y admins */}
                    {(userRole === 'admin' || userRole === 'teacher') && (
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="Estudiante relacionado (opcional)"
                          name="relatedStudentId"
                        >
                          <Select
                            showSearch
                            placeholder="Seleccionar estudiante"
                            allowClear
                            filterOption={(input, option) => {
                              if (!input || !option?.value) return false;
                              // Buscar en los datos del estudiante en lugar del contenido JSX
                              const student = students.find(s => s.id === option.value);
                              if (!student) return false;

                              const searchText = [
                                student.user?.profile?.firstName || '',
                                student.user?.profile?.lastName || ''
                              ]
                                .filter(Boolean)
                                .map(val => String(val || ''))
                                .join(' ')
                                .toLowerCase();

                              return searchText.indexOf(input.toLowerCase()) >= 0;
                            }}
                          >
                            {students.map(student => (
                              <Select.Option key={student.id} value={student.id}>
                                {student.user?.profile?.firstName || 'N/A'} {student.user?.profile?.lastName || ''}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    )}
                  </Row>
                );
              } else if (type === 'group' && sendMethod !== 'group') {
                return (
                  <Form.Item
                    label="Grupo destinatario"
                    name="targetGroupId"
                    rules={[{ required: true, message: 'Seleccione un grupo' }]}
                  >
                    <Select 
                      placeholder={availableGroups.length > 0 ? "Seleccionar grupo" : "No tienes grupos disponibles"}
                      disabled={availableGroups.length === 0}
                    >
                      {availableGroups.map(group => (
                        <Select.Option key={group.id} value={group.id}>
                          {(group as any).displayName || group.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              } else if (type === 'notification' && sendMethod !== 'group') {
                return (
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        label="Destinatario(s) (opcional)"
                        name="recipientIds"
                      >
                        <Select
                          mode="multiple"
                          showSearch
                          placeholder="Todos los usuarios (dejar vacío) o seleccionar específicos"
                          allowClear
                          maxTagCount="responsive"
                          optionFilterProp="children"
                          showArrow={true}
                          filterOption={(input, option) => {
                            if (!input || !option?.value) return false;
                            // Buscar en los datos del usuario en lugar del contenido JSX
                            const user = availableRecipients.find(u => u.id === option.value);
                            if (!user) return false;

                            const searchText = [
                              user.profile?.firstName || '',
                              user.profile?.lastName || '',
                              user.role || '',
                              (user as any).displayName || '',
                              // Incluir información de hijos para familias
                              String(user.familyInfo?.children || ''),
                              String(user.teacherType || ''),
                              String(user.additionalInfo || '')
                            ]
                              .filter(Boolean)
                              .map(val => String(val || ''))
                              .join(' ')
                              .toLowerCase();

                            const matches = searchText.indexOf(input.toLowerCase()) >= 0;

                            // Debug logging para troubleshooting (temporal)
                            console.log(`🔍 Filter debug SEGUNDO: "${input}" in "${searchText}" = ${matches}`);
                            console.log(`🔍 User data SEGUNDO:`, {
                              id: user.id,
                              firstName: user.profile?.firstName,
                              lastName: user.profile?.lastName,
                              role: user.role,
                              email: (user as any).email
                            });

                            return matches;
                          }}
                        >
                          {availableRecipients.map(user => {
                            const displayName = (user as any).displayName || `${user.profile?.firstName || 'N/A'} ${user.profile?.lastName || ''} (${user.role})`;
                            const childrenInfo = user.familyInfo?.children ? ` - Hijos: ${user.familyInfo.children}` : '';
                            const fullDisplayName = displayName + childrenInfo;

                            return (
                              <Select.Option
                                key={user.id}
                                value={user.id}
                                title={fullDisplayName}
                              >
                                {fullDisplayName}
                              </Select.Option>
                            );
                          })}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        label="Grupo destinatario (opcional)"
                        name="targetGroupId"
                      >
                        <Select
                          placeholder="Seleccionar grupo específico (opcional)"
                          allowClear
                          disabled={availableGroups.length === 0}
                        >
                          {availableGroups.map(group => (
                            <Select.Option key={group.id} value={group.id}>
                              {(group as any).displayName || group.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                );
              } else if (type === 'announcement' && sendMethod !== 'group') {
                return (
                  <Form.Item
                    label="Alcance del comunicado"
                    name="targetGroupId"
                  >
                    <Select 
                      placeholder="Todo el centro (dejar vacío) o grupo específico"
                      allowClear
                      disabled={availableGroups.length === 0}
                    >
                      {availableGroups.map(group => (
                        <Select.Option key={group.id} value={group.id}>
                          {(group as any).displayName || group.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            label="Asunto"
            name="subject"
            rules={[{ required: true, message: 'Ingrese el asunto del mensaje' }]}
          >
            <Input ref={subjectInputRef} placeholder="Asunto del mensaje" style={{ fontSize: 16 }} />
          </Form.Item>

          {/* Asistente IA para composición de mensajes */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.type !== currentValues.type || 
              prevValues.recipientId !== currentValues.recipientId
            }
          >
            {({ getFieldValue }) => {
              const messageType = getFieldValue('type');
              const recipientId = getFieldValue('recipientId');
              
              return (
                <AIMessageComposer
                  messageType={messageType === 'announcement' ? 'announcement' : 
                              messageType === 'notification' ? 'question' : 'direct'}
                  recipientId={recipientId}
                  recipients={availableRecipients}
                  students={students}
                  onMessageGenerated={(content) => {
                    setComposeAiContent(content);
                    form.setFieldsValue({ content });
                  }}
                />
              );
            }}
          </Form.Item>

          <Form.Item
            label="Contenido"
            name="content"
            rules={[{ required: true, message: 'Ingrese el contenido del mensaje' }]}
          >
            <RichTextEditor
              content={composeAiContent}
              placeholder="Escriba su mensaje aquí o use el compositor IA..."
              height="150px"
              showEmojis={true}
              onChange={(content) => {
                form.setFieldsValue({ content });
                // setFieldsValue no dispara onValuesChange: autoguardar aquí también
                composeAutosave.saveDraft({ ...form.getFieldsValue(), content });
              }}
            />
          </Form.Item>

          {/* ADJUNTOS - Componente visible siempre */}
          <div style={{ marginTop: '24px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
              📎 Archivos Adjuntos
            </div>
            <div style={{ padding: '20px', border: '2px dashed #1890ff', borderRadius: '8px', backgroundColor: '#f0f5ff' }}>
              <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                <input
                  type="file"
                  multiple
                  accept="*/*"
                  style={{ display: 'none' }}
                  id="file-upload-input"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const validFiles = files.filter(file => {
                      if (file.size > 50 * 1024 * 1024) {
                        message.error(`${file.name} excede 50MB`);
                        return false;
                      }
                      return true;
                    });
                    const newFileList = validFiles.map((file, index) => ({
                      uid: `${Date.now()}-${index}`,
                      name: file.name,
                      status: 'done' as const,
                      originFileObj: file,
                    }));
                    setFileList([...fileList, ...newFileList].slice(0, 10));
                  }}
                />
                <Button
                  type="primary"
                  icon={<FileOutlined />}
                  size="large"
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  Seleccionar Archivos
                </Button>
              </div>
              {fileList.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {fileList.map(file => (
                    <div key={file.uid} style={{ display: 'flex', alignItems: 'center', padding: '8px', backgroundColor: 'white', marginBottom: '8px', borderRadius: '4px' }}>
                      <FileOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                      <span style={{ flex: 1 }}>{file.name}</span>
                      <Button
                        type="link"
                        danger
                        onClick={() => setFileList(fileList.filter(f => f.uid !== file.uid))}
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                Máx. 10 archivos, 50MB cada uno. Tipos: PDF, Word, Excel, imágenes, audio, video, ZIP
              </div>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Modal para ver conversación */}
      <Modal
        title={isMobile ? undefined : (selectedMessage?.subject || "Conversación")}
        open={conversationModalVisible}
        onCancel={() => {
          setConversationModalVisible(false);
          setSelectedMessage(null);
        }}
        footer={null}
        width={isMobile ? '100vw' : isTablet ? '90vw' : 1000}
        style={isMobile ? { top: 0, margin: 0, padding: 0, maxWidth: '100vw' } : { top: 20 }}
        styles={{
          content: isMobile ? {
            height: `${visualViewportHeight}px`,
            maxHeight: `${visualViewportHeight}px`,
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
          } : undefined,
          body: {
            padding: 0,
            overflow: 'hidden',
            ...(isMobile ? {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'hidden',
            } : {
              maxHeight: 'calc(100vh - 200px)',
            })
          }
        }}
      >
        {selectedMessage && (
          <div
            ref={replyButtonRef}
            style={{
              height: isMobile ? '100%' : 'calc(100vh - 250px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              ...(isMobile && { flex: 1 }),
            }}
          >
            {/* Header móvil con título y botón cerrar */}
            {isMobile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: '#fff',
                flexShrink: 0,
                gap: 12,
              }}>
                <button
                  onClick={() => { setConversationModalVisible(false); setSelectedMessage(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 44,
                    minHeight: 44,
                    borderRadius: 8,
                    color: '#1E1E30',
                  }}
                >
                  <ArrowLeftOutlined style={{ fontSize: 20 }} />
                </button>
                <span style={{
                  fontWeight: 600,
                  fontSize: 15,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {selectedMessage?.subject || "Conversación"}
                </span>
              </div>
            )}
            {/* Contenedor de mensajes con scroll */}
            <div
              data-messages-container
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: isMobile ? '12px' : '16px',
                backgroundColor: '#f5f5f5',
                WebkitOverflowScrolling: 'touch' as any,
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Header del mensaje */}
                <Card size="small">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>De:</Text>
                      <div>
                        <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                        {selectedMessage.sender?.profile?.firstName || 'N/A'} {selectedMessage.sender?.profile?.lastName || ''}
                      </div>
                    </Col>
                    <Col span={12}>
                      <Text strong>Para:</Text>
                      <div>
                        {selectedMessage.recipient ? (
                          <>
                            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                            {selectedMessage.recipient?.profile?.firstName || 'N/A'} {selectedMessage.recipient?.profile?.lastName || ''}
                          </>
                        ) : selectedMessage.targetGroup ? (
                          <>
                            <Avatar icon={<TeamOutlined />} style={{ marginRight: 8 }} />
                            {selectedMessage.targetGroup.name}
                          </>
                        ) : '-'}
                      </div>
                    </Col>
                  </Row>
                  <Divider />
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text strong>Tipo:</Text>
                      <div>
                        <Tag color={getPriorityColor(selectedMessage.type)}>
                          {getTypeIcon(selectedMessage.type)} {selectedMessage.type}
                        </Tag>
                      </div>
                    </Col>
                    <Col span={8}>
                      <Text strong>Prioridad:</Text>
                      <div>
                        <Tag color={getPriorityColor(selectedMessage.priority)}>
                          {selectedMessage.priority.toUpperCase()}
                        </Tag>
                      </div>
                    </Col>
                    <Col span={8}>
                      <Text strong>Fecha:</Text>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1890ff' }}>
                          <ClockCircleOutlined style={{ marginRight: 6 }} />
                          {formatDateToMadrid(selectedMessage.createdAt)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>
                          {formatRelativeTime(selectedMessage.createdAt)}
                        </div>
                      </div>
                    </Col>
                  </Row>
                  {selectedMessage.relatedStudent && (
                    <>
                      <Divider />
                      <Text strong>Estudiante relacionado:</Text>
                      <div>
                        <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                        {selectedMessage.relatedStudent?.user?.profile?.firstName || 'N/A'} {selectedMessage.relatedStudent?.user?.profile?.lastName || ''}
                      </div>
                    </>
                  )}
                </Card>

                {/* Asunto */}
                <Card size="small">
                  <Title level={4}>{selectedMessage.subject}</Title>
                </Card>

                {/* Contenido */}
                <Card size="small">
                  <div
                    className="prose prose-sm max-w-none message-content"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.content }}
                  />

                  {/* Link previews & YouTube embeds */}
                  {selectedMessage.content && extractUrls(selectedMessage.content).map((url, i) => (
                    <LinkPreviewCard key={`lp-main-${i}`} url={url} onYouTubeClick={openYoutube} />
                  ))}

                  {/* 🔍 DEBUG: Ver selectedMessage antes del condicional */}
                  {console.log('🎯 RENDERING MODAL - selectedMessage:', selectedMessage)}
                  {console.log('🎯 selectedMessage.attachments EXISTE?', selectedMessage.attachments)}
                  {console.log('🎯 selectedMessage.attachments ES ARRAY?', Array.isArray(selectedMessage.attachments))}
                  {console.log('🎯 selectedMessage.attachments.length:', selectedMessage.attachments?.length)}
                  {console.log('🎯 CONDICION COMPLETA:', selectedMessage.attachments && selectedMessage.attachments.length > 0)}

                  {/* Archivos Adjuntos */}
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                      <Text strong>
                        <FileOutlined /> Archivos Adjuntos ({selectedMessage.attachments.length}) - v2.0 INLINE
                      </Text>
                      <div style={{ marginTop: '8px' }}>
                        {selectedMessage.attachments.map((attachment) => {
                          // DEBUG: Ver qué datos tiene el attachment
                          console.log('🔍 ATTACHMENT DATA:', {
                            id: attachment.id,
                            originalName: attachment.originalName,
                            mimeType: attachment.mimeType,
                            hasMimeType: !!attachment.mimeType,
                            mimeTypeType: typeof attachment.mimeType,
                            allFields: Object.keys(attachment)
                          });

                          // Detectar tipo de archivo por el mimeType
                          const isImage = attachment.mimeType?.startsWith('image/');
                          const isVideo = attachment.mimeType?.startsWith('video/');

                          return (
                            <div
                              key={attachment.id}
                              style={{
                                marginBottom: '12px',
                              }}
                            >
                              {isImage ? (
                                // Renderizar imagen inline (estilo WhatsApp)
                                <div>
                                  <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>
                                    {attachment.originalName} ({(attachment.size / 1024).toFixed(2)} KB)
                                  </div>
                                  <ImageWithAuth
                                    attachmentId={attachment.id}
                                    alt={attachment.originalName}
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: '400px',
                                      borderRadius: '8px',
                                      border: '1px solid #e8e8e8',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => openGallery(attachment.id)}
                                  />
                                </div>
                              ) : isVideo ? (
                                // Renderizar vídeo inline con controles
                                <div>
                                  <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>
                                    {attachment.originalName} ({(attachment.size / 1024).toFixed(2)} KB)
                                  </div>
                                  <VideoWithAuth
                                    attachmentId={attachment.id}
                                    style={{
                                      maxHeight: '400px',
                                      border: '1px solid #e8e8e8',
                                    }}
                                    onClick={() => openGallery(attachment.id)}
                                  />
                                  <a
                                    href={`/api/communications/attachments/${attachment.id}/download`}
                                    download={attachment.originalName}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      marginTop: 4,
                                      fontSize: 12,
                                      color: '#8c8c8c',
                                      textDecoration: 'none',
                                    }}
                                  >
                                    <DownloadOutlined /> Descargar vídeo
                                  </a>
                                </div>
                              ) : (
                                // Renderizar archivo descargable (otros tipos)
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    backgroundColor: '#fafafa',
                                    borderRadius: '4px',
                                    border: '1px solid #e8e8e8',
                                  }}
                                >
                                  <FileOutlined style={{ fontSize: '18px', color: '#1890ff', marginRight: '12px' }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {attachment.originalName}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                      {(attachment.size / 1024).toFixed(2)} KB
                                    </div>
                                  </div>
                                  <Button
                                    type="link"
                                    icon={<DownloadOutlined />}
                                    onClick={() => {
                                      window.open(
                                        `/api/communications/attachments/${attachment.id}/download`,
                                        '_blank'
                                      );
                                    }}
                                  >
                                    Descargar
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Respuestas (si las hay) */}
                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <Card title={`Respuestas (${selectedMessage.replies.length})`}>
                    {selectedMessage.replies.map((reply) => (
                      <Card key={reply.id} style={{ marginBottom: 16 }}>
                        <div>
                          <Text strong>
                            {reply.sender?.profile?.firstName || 'N/A'} {reply.sender?.profile?.lastName || ''}
                          </Text>
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            {formatDateToMadrid(reply.createdAt)}
                          </Text>
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                        <Text strong>Asunto:</Text> {reply.subject}
                        <div
                          className="prose prose-sm max-w-none mt-2 message-content"
                          dangerouslySetInnerHTML={{ __html: reply.content }}
                        />

                        {/* Link previews & YouTube embeds for replies */}
                        {reply.content && extractUrls(reply.content).map((url, i) => (
                          <LinkPreviewCard key={`lp-reply-${reply.id}-${i}`} url={url} onYouTubeClick={openYoutube} />
                        ))}

                        {/* Archivos Adjuntos de la respuesta */}
                        {reply.attachments && reply.attachments.length > 0 && (
                          <div style={{ marginTop: '12px', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                            <Text strong style={{ fontSize: '12px' }}>
                              <FileOutlined /> Adjuntos ({reply.attachments.length}):
                            </Text>
                            <div style={{ marginTop: '8px' }}>
                              {reply.attachments.map((attachment) => {
                                // Detectar tipo de archivo por el mimeType
                                const isImage = attachment.mimeType?.startsWith('image/');
                                const isVideo = attachment.mimeType?.startsWith('video/');

                                return (
                                  <div
                                    key={attachment.id}
                                    style={{
                                      marginBottom: '10px',
                                    }}
                                  >
                                    {isImage ? (
                                      // Renderizar imagen inline (estilo WhatsApp)
                                      <div>
                                        <div style={{ marginBottom: '4px', fontSize: '11px', color: '#8c8c8c' }}>
                                          {attachment.originalName} ({(attachment.size / 1024).toFixed(2)} KB)
                                        </div>
                                        <ImageWithAuth
                                          attachmentId={attachment.id}
                                          alt={attachment.originalName}
                                          style={{
                                            maxWidth: '100%',
                                            maxHeight: '300px',
                                            borderRadius: '6px',
                                            border: '1px solid #e8e8e8',
                                            cursor: 'pointer',
                                          }}
                                          onClick={() => openGallery(attachment.id)}
                                        />
                                      </div>
                                    ) : isVideo ? (
                                      // Renderizar vídeo inline con controles
                                      <div>
                                        <div style={{ marginBottom: '4px', fontSize: '11px', color: '#8c8c8c' }}>
                                          {attachment.originalName} ({(attachment.size / 1024).toFixed(2)} KB)
                                        </div>
                                        <VideoWithAuth
                                          attachmentId={attachment.id}
                                          style={{
                                            maxHeight: '300px',
                                            borderRadius: '6px',
                                            border: '1px solid #e8e8e8',
                                          }}
                                          onClick={() => openGallery(attachment.id)}
                                        />
                                        <a
                                          href={`/api/communications/attachments/${attachment.id}/download`}
                                          download={attachment.originalName}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            marginTop: 4,
                                            fontSize: 11,
                                            color: '#8c8c8c',
                                            textDecoration: 'none',
                                          }}
                                        >
                                          <DownloadOutlined /> Descargar vídeo
                                        </a>
                                      </div>
                                    ) : (
                                      // Renderizar archivo descargable (otros tipos)
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          padding: '6px 8px',
                                          backgroundColor: '#fafafa',
                                          borderRadius: '4px',
                                          border: '1px solid #e8e8e8',
                                        }}
                                      >
                                        <FileOutlined style={{ fontSize: '16px', color: '#1890ff', marginRight: '8px' }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {attachment.originalName}
                                          </div>
                                          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
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
                                        >
                                          Descargar
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </Card>
                )}
              </Space>
            </div>

            {/* Botón para responder - Fijo al final */}
            {selectedMessage.sender.id !== user?.id && (
              <div
                style={{
                  flexShrink: 0,
                  padding: '16px',
                  borderTop: '1px solid #d9d9d9',
                  backgroundColor: 'white'
                }}
              >
                <Button
                  type="primary"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => handleOpenReply(selectedMessage)}
                  block
                  size="large"
                >
                  Responder a este mensaje
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal para responder mensaje */}
      <Modal
        title={`Responder a: ${replyMessage?.subject || ''}`}
        open={replyModalVisible}
        onCancel={() => {
          setReplyModalVisible(false);
          setReplyMessage(null);
          replyForm.resetFields();
          setAiContent('');
        }}
        onOk={() => replyForm.submit()}
        width={isMobile ? '100vw' : isTablet ? '90vw' : 700}
        style={isMobile ? { top: 0, margin: 0, padding: 0, maxWidth: '100vw' } : undefined}
        styles={{
          content: isMobile ? {
            height: `${visualViewportHeight}px`,
            maxHeight: `${visualViewportHeight}px`,
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
          } : undefined,
          body: isMobile ? {
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '12px 16px',
            WebkitOverflowScrolling: 'touch' as any,
          } : { overflowY: 'auto', maxHeight: '80vh' },
          footer: isMobile ? {
            padding: '10px 16px',
            borderTop: '1px solid #f0f0f0',
            backgroundColor: '#fff',
            flexShrink: 0,
          } : undefined,
        }}
      >
        {replyMessage && (
          <div style={isMobile ? { minHeight: 0 } : undefined}>
            {/* Mensaje original */}
            <Card style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}>
              <Text type="secondary">Mensaje original de:</Text>
              <div style={{ marginTop: 4 }}>
                <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                <Text strong>
                  {replyMessage.sender?.profile?.firstName || 'N/A'} {replyMessage.sender?.profile?.lastName || ''}
                </Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {formatDateToMadrid(replyMessage.createdAt)}
                </Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <Text strong>Asunto:</Text> {replyMessage.subject}
              <div style={{ marginTop: 8, maxHeight: '100px', overflow: 'auto' }}>
                <Text>{replyMessage.content.substring(0, 200)}{replyMessage.content.length > 200 ? '...' : ''}</Text>
              </div>
            </Card>

            {/* Asistente IA para respuestas */}
            {(user?.role === 'teacher' || user?.role === 'admin') && (
              <AIReplyAssistant
                message={replyMessage}
                previousMessages={selectedMessage?.replies || []}
                onResponseGenerated={(content) => {
                  setAiContent(content);
                  replyForm.setFieldsValue({ content });
                }}
              />
            )}

            {/* Formulario de respuesta */}
            <Form
              form={replyForm}
              layout="vertical"
              onFinish={handleReplyMessage}
              onValuesChange={(_, allValues) => {
                // Autoguardado local de la respuesta mientras se escribe
                replyAutosave.saveDraft({ __replyTo: replyMessage?.id, ...allValues });
              }}
            >
              <Form.Item
                label="Asunto"
                name="subject"
                rules={[{ required: true, message: 'Ingrese el asunto de la respuesta' }]}
              >
                <Input placeholder="Asunto de la respuesta" />
              </Form.Item>

              <Form.Item
                label="Prioridad"
                name="priority"
                initialValue="normal"
              >
                <Select>
                  <Select.Option value="low">Baja</Select.Option>
                  <Select.Option value="normal">Normal</Select.Option>
                  <Select.Option value="high">Alta</Select.Option>
                  <Select.Option value="urgent">Urgente</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Respuesta"
                name="content"
                rules={[{ required: true, message: 'Ingrese el contenido de la respuesta' }]}
              >
                <RichTextEditor
                  content={aiContent}
                  placeholder={user?.role === 'teacher' || user?.role === 'admin'
                    ? "Escriba su respuesta aquí o use el asistente IA..."
                    : "Escriba su respuesta aquí..."}
                  height={isMobile ? "100px" : "150px"}
                  showEmojis={true}
                  onChange={(content) => {
                    replyForm.setFieldsValue({ content });
                    // setFieldsValue no dispara onValuesChange: autoguardar aquí también
                    replyAutosave.saveDraft({ __replyTo: replyMessage?.id, ...replyForm.getFieldsValue(), content });
                  }}
                />
              </Form.Item>

              {/* ADJUNTOS - Componente visible siempre */}
              <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  📎 Archivos Adjuntos
                </div>
                <div style={{ padding: '20px', border: '2px dashed #1890ff', borderRadius: '8px', backgroundColor: '#f0f5ff' }}>
                  <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                    <input
                      type="file"
                      multiple
                      accept="*/*"
                      style={{ display: 'none' }}
                      id="file-upload-reply-input"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const validFiles = files.filter(file => {
                          if (file.size > 50 * 1024 * 1024) {
                            message.error(`${file.name} excede 50MB`);
                            return false;
                          }
                          return true;
                        });
                        const newFileList = validFiles.map((file, index) => ({
                          uid: `${Date.now()}-${index}`,
                          name: file.name,
                          status: 'done' as const,
                          originFileObj: file,
                        }));
                        setReplyFileList([...replyFileList, ...newFileList].slice(0, 10));
                      }}
                    />
                    <Button
                      type="primary"
                      icon={<FileOutlined />}
                      size="large"
                      onClick={() => document.getElementById('file-upload-reply-input')?.click()}
                    >
                      Seleccionar Archivos
                    </Button>
                  </div>
                  {replyFileList.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      {replyFileList.map(file => (
                        <div key={file.uid} style={{ display: 'flex', alignItems: 'center', padding: '8px', backgroundColor: 'white', marginBottom: '8px', borderRadius: '4px' }}>
                          <FileOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                          <span style={{ flex: 1 }}>{file.name}</span>
                          <Button
                            type="link"
                            danger
                            onClick={() => setReplyFileList(replyFileList.filter(f => f.uid !== file.uid))}
                          >
                            Eliminar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    Máx. 10 archivos, 50MB cada uno. Tipos: PDF, Word, Excel, imágenes, audio, video, ZIP
                  </div>
                </div>
              </div>
            </Form>
          </div>
        )}
      </Modal>

      {/* Modal para gestión de grupos */}
      <GroupManagementModal
        visible={groupManagementVisible}
        onClose={() => setGroupManagementVisible(false)}
        availableRecipients={availableRecipients}
      />

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

      <style>{`
        /* Estilos para filas de mensajes no leídos - amarillo pastel */
        .unread-message-row {
          background-color: #fffbe6 !important;
          border-left: 4px solid #faad14 !important;
          transition: background-color 0.25s ease, opacity 0.25s ease;
        }

        .unread-message-row:hover {
          background-color: #fff7cc !important;
        }

        .unread-message-row td {
          background-color: transparent !important;
          font-weight: 600 !important;
        }

        /* Estilos para filas de mensajes leídos */
        .read-message-row {
          background-color: #ffffff;
        }

        .read-message-row:hover {
          background-color: #fafafa !important;
        }

        .read-message-row td {
          font-weight: 400;
        }

        /* Estilo antiguo mantenido por compatibilidad */
        .unread-message {
          background-color: #f6ffed;
          border-left: 3px solid #52c41a;
        }

        .message-content {
          line-height: 1.6;
          font-size: 14px;
          color: #333;
        }
        
        .message-content p {
          margin-bottom: 12px;
          line-height: 1.6;
        }
        
        .message-content h1, .message-content h2, .message-content h3, 
        .message-content h4, .message-content h5, .message-content h6 {
          margin-top: 16px;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .message-content ul, .message-content ol {
          margin-left: 16px;
          margin-bottom: 12px;
        }
        
        .message-content li {
          margin-bottom: 4px;
        }
        
        .message-content strong, .message-content b {
          font-weight: 600;
        }
        
        .message-content em, .message-content i {
          font-style: italic;
        }
        
        .message-content blockquote {
          border-left: 4px solid #d9d9d9;
          padding-left: 16px;
          margin: 12px 0;
          color: #666;
        }
        
        .message-content code {
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        }
        
        .message-content pre {
          background-color: #f5f5f5;
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 12px 0;
        }
        
        .message-content a {
          color: #1677ff;
          text-decoration: none;
        }
        
        .message-content a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default MessagesPage;