/**
 * @archivo: NotificationCenter.tsx
 * @módulo: Notifications (Centro de Notificaciones del Dashboard)
 * @función: Sistema de notificaciones en tiempo real con gestión multi-tipo
 * @crítico: SÍ - Comunicación central entre roles del sistema
 * @dependencias: apiClient, SafeBadge, Ant Design components
 * @no_modificar: Polling interval sin verificar rendimiento del servidor
 * @relacionado_con: DashboardLayout.tsx, communications API endpoints
 */

/**
 * COMPONENTE: NotificationCenter
 * UBICACIÓN: /frontend/src/components/NotificationCenter.tsx
 * FUNCIÓN: Dropdown de notificaciones con gestión completa multi-rol
 * NO USAR PARA: Mensajes directos entre usuarios (usar Messages components)
 * PROPS: Ninguna - componente standalone integrado en DashboardLayout
 * ESTADOS GESTIONADOS:
 *   - notifications: Lista de notificaciones del usuario
 *   - unreadCount: Contador badge para UI
 *   - dropdownVisible: Control de apertura/cierre
 *   - loading: Estado de carga durante fetch
 * 
 * TIPOS DE NOTIFICACIONES SOPORTADOS:
 * - evaluation: Nuevas evaluaciones competenciales (azul)
 * - message: Mensajes directos recibidos (verde)
 * - announcement: Comunicados oficiales (naranja)
 * - academic: Eventos académicos/calendario (morado)
 * - attendance: Alertas de asistencia (rojo)
 * - reminder: Recordatorios automáticos (dorado)
 * - system: Notificaciones del sistema (cyan)
 * 
 * FUNCIONALIDADES IMPLEMENTADAS:
 * - Polling automático cada 30 segundos
 * - Marcar individual como leída
 * - Marcar todas como leídas (bulk operation)
 * - Eliminar notificación individual
 * - Eliminar todas las notificaciones
 * - Badge count en tiempo real
 * - Navegación contextual (actionUrl)
 * - UI diferenciada por estado read/unread
 * 
 * INTEGRACIÓN CON BACKEND:
 * - GET /communications/notifications: Lista paginada
 * - GET /communications/notifications/unread-count: Contador badge
 * - PATCH /communications/notifications/:id: Marcar como leída
 * - POST /communications/notifications/mark-all-read: Bulk read
 * - DELETE /communications/notifications/:id: Eliminar individual
 * - DELETE /communications/notifications/bulk/delete-all: Bulk delete
 * 
 * DISEÑO Y UX:
 * - Dropdown customizado de 400px con scroll
 * - Indicador visual border izquierdo para no leídas
 * - Background color diferenciado unread vs read
 * - Iconos coloridos por tipo de notificación
 * - Tags coloridos para categorización
 * - Timestamps relativos (hace X horas/días)
 * - Acciones inline (marcar leída, eliminar)
 * 
 * INFORMACIÓN CONTEXTUAL MOSTRADA:
 * - triggeredBy: Usuario que generó la notificación
 * - relatedStudent: Estudiante relacionado (para familias)
 * - relatedGroup: Grupo de clase relacionado
 * - actionUrl: URL para navegación contextual
 * - Timestamps con formato relativo
 * 
 * OPTIMIZACIONES:
 * - Solo muestra 10 notificaciones más recientes en dropdown
 * - Polling controlado con cleanup en useEffect
 * - Badge count validation (siempre número, nunca objeto)
 * - Click handlers con stopPropagation para acciones
 * 
 * GESTIÓN DE ERRORES:
 * - Try/catch en todas las operaciones de API
 * - Fallback count=0 si falla unread count
 * - Message.error para feedback usuario
 * - Console.error para debugging
 * 
 * LIMITACIONES ACTUALES:
 * - actionUrl navigation no implementada (console.log placeholder)
 * - "Ver todas" button no conectado a página full notifications
 * - Sin sistema de preferences/filtros avanzados
 * 
 * ESTADO ACTUAL: ✅ SISTEMA FUNCIONAL
 * - Polling en tiempo real operativo
 * - Todas las operaciones CRUD funcionando
 * - UI responsiva y accesible
 * - Integración completa con communications API
 * - Badge count sincronizado con DashboardLayout
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dropdown,
  List,
  Avatar,
  Typography,
  Button,
  Space,
  Tag,
  Empty,
  Divider,
  message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import SafeBadge from './common/SafeBadge';
import {
  BellOutlined,
  MessageOutlined,
  BookOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  FileTextOutlined,
  TableOutlined,
  ProjectOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  BarChartOutlined,
  FolderOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import apiClient from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '@/types/user';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { usePendingAttendanceRequests } from '../hooks/usePendingAttendanceRequests';
import { useStudentNotifications } from '../hooks/useStudentNotifications';
import { useTeacherNotificationBadges } from '../hooks/useTeacherNotificationBadges';
import { useStaffTaskCounts } from '../hooks/useStaffTaskCounts';
import { useFamilyTaskBadges } from '../hooks/useFamilyTaskBadges';
import Loading from './common/Loading';

const { Text } = Typography;

interface MenuBadgeItem {
  id: string;
  type: 'menu-badge';
  title: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  module: string;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'evaluation' | 'message' | 'announcement' | 'academic' | 'attendance' | 'reminder' | 'system' | 
        'task_submission' | 'task_correction_ready' | 'evaluation_pending' | 'rubric_assessment_pending' | 
        'activity_assignment_pending' | 'meeting_scheduled' | 'activity_overdue' | 'family_message' | 
        'ai_correction_completed' | 'system' | 'shared_note' | 'moderation';
  status: 'unread' | 'read' | 'dismissed';
  triggeredBy?: {
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  } | null;
  relatedStudent?: {
    user?: {
      profile?: {
        firstName?: string;
        lastName?: string;
      };
    };
  } | null;
  relatedGroup?: {
    name?: string;
  } | null;
  actionUrl?: string;
  readAt?: string;
  createdAt: string;
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [menuBadges, setMenuBadges] = useState<MenuBadgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalBadgeCount, setTotalBadgeCount] = useState(0);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === 'function') {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn('Navigation error:', error, 'Path:', path);
      }
    } else {
      console.warn('Navigate function not available:', path);
    }
  }, [navigate]);

  // Hooks para badges del menú
  const { user } = useAuth();
  const { unreadCount: unreadMessages } = useUnreadMessages();
  const { pendingCount: pendingAttendance } = usePendingAttendanceRequests();
  const studentNotifications = useStudentNotifications();
  const teacherBadges = useTeacherNotificationBadges();
  const { counts: staffTaskCounts, hasUrgentTasks: staffHasUrgent } = useStaffTaskCounts();
  const familyTaskBadges = useFamilyTaskBadges();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Polling cada 30 segundos para actualizar notificaciones
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Ref para detectar cuando unreadMessages baja a 0 (mensajes leídos en la sección de mensajes)
  const prevUnreadMessagesRef = useRef(unreadMessages);
  useEffect(() => {
    const prev = prevUnreadMessagesRef.current;
    prevUnreadMessagesRef.current = unreadMessages;

    if (prev > 0 && unreadMessages === 0) {
      // Los mensajes acaban de marcarse como leídos → sincronizar notificaciones de tipo mensaje
      const messageTypes = ['message', 'family_message'];
      const unreadMsgNotifications = notifications.filter(
        n => n.status === 'unread' && messageTypes.includes(n.type)
      );
      if (unreadMsgNotifications.length > 0) {
        // Actualización optimista local
        setNotifications(prev =>
          prev.map(n =>
            messageTypes.includes(n.type) && n.status === 'unread'
              ? { ...n, status: 'read' as const }
              : n
          )
        );
        // Persistir en backend
        unreadMsgNotifications.forEach(n => {
          apiClient
            .patch(`/communications/notifications/${n.id}`, { status: 'read' })
            .catch(console.error);
        });
        fetchUnreadCount();
      }
    }
  }, [unreadMessages]);

  // Effect para generar badges del menú basados en el rol del usuario
  useEffect(() => {
    const newMenuBadges: MenuBadgeItem[] = [];

    if (!user) return;

    // Badges para PROFESORES
    if (user.role === UserRole.TEACHER) {
      // Mensajes no leídos
      if (unreadMessages > 0) {
        newMenuBadges.push({
          id: 'teacher-messages',
          type: 'menu-badge',
          title: 'Mensajes no leídos',
          description: `${unreadMessages} mensaje${unreadMessages > 1 ? 's' : ''} sin leer de familias`,
          count: unreadMessages,
          icon: <MessageOutlined style={{ color: '#52c41a' }} />,
          color: '#52c41a',
          priority: 'high',
          actionUrl: '/teacher/communications',
          module: 'messages',
        });
      }

      // Solicitudes de asistencia pendientes
      if (pendingAttendance > 0) {
        newMenuBadges.push({
          id: 'teacher-attendance',
          type: 'menu-badge',
          title: 'Solicitudes de asistencia',
          description: `${pendingAttendance} solicitud${pendingAttendance > 1 ? 'es' : ''} pendiente${pendingAttendance > 1 ? 's' : ''}`,
          count: pendingAttendance,
          icon: <UserOutlined style={{ color: '#faad14' }} />,
          color: '#faad14',
          priority: 'high',
          actionUrl: '/teacher/attendance',
          module: 'attendance',
        });
      }

      // Tareas pendientes de revisar
      const tasksCount = teacherBadges.getBadgeCount ? teacherBadges.getBadgeCount('tasks') : (teacherBadges.badges?.tasks || 0);
      if (tasksCount > 0) {
        newMenuBadges.push({
          id: 'teacher-tasks',
          type: 'menu-badge',
          title: 'Tareas por revisar',
          description: `${tasksCount} entrega${tasksCount > 1 ? 's' : ''} pendiente${tasksCount > 1 ? 's' : ''} de revisar`,
          count: tasksCount,
          icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
          color: '#1890ff',
          priority: 'high',
          actionUrl: '/teacher/tasks',
          module: 'tasks',
        });
      }

      // Actividades pendientes
      const activitiesCount = teacherBadges.getBadgeCount ? teacherBadges.getBadgeCount('activities') : (teacherBadges.badges?.activities || 0);
      if (activitiesCount > 0) {
        newMenuBadges.push({
          id: 'teacher-activities',
          type: 'menu-badge',
          title: 'Actividades pendientes',
          description: `${activitiesCount} actividad${activitiesCount > 1 ? 'es' : ''} sin confirmar`,
          count: activitiesCount,
          icon: <ProjectOutlined style={{ color: '#fa8c16' }} />,
          color: '#fa8c16',
          priority: 'medium',
          actionUrl: '/teacher/activities',
          module: 'activities',
        });
      }

      // Evaluaciones pendientes  
      const evaluationsCount = teacherBadges.getBadgeCount ? teacherBadges.getBadgeCount('evaluations') : (teacherBadges.badges?.evaluations || 0);
      if (evaluationsCount > 0) {
        newMenuBadges.push({
          id: 'teacher-evaluations',
          type: 'menu-badge',
          title: 'Evaluaciones pendientes',
          description: `${evaluationsCount} evaluación${evaluationsCount > 1 ? 'es' : ''} por completar`,
          count: evaluationsCount,
          icon: <BookOutlined style={{ color: '#722ed1' }} />,
          color: '#722ed1',
          priority: 'medium',
          actionUrl: '/teacher/evaluations',
          module: 'evaluations',
        });
      }

      // Rúbricas pendientes
      const rubricsCount = teacherBadges.getBadgeCount ? teacherBadges.getBadgeCount('rubrics') : (teacherBadges.badges?.rubrics || 0);
      if (rubricsCount > 0) {
        newMenuBadges.push({
          id: 'teacher-rubrics',
          type: 'menu-badge',
          title: 'Rúbricas por evaluar',
          description: `${rubricsCount} rúbrica${rubricsCount > 1 ? 's' : ''} pendiente${rubricsCount > 1 ? 's' : ''}`,
          count: rubricsCount,
          icon: <TableOutlined style={{ color: '#52c41a' }} />,
          color: '#52c41a',
          priority: 'medium',
          actionUrl: '/teacher/activities/rubrics',
          module: 'rubrics',
        });
      }

      // Reuniones programadas
      const meetingsCount = teacherBadges.getBadgeCount ? teacherBadges.getBadgeCount('meetings') : (teacherBadges.badges?.meetings || 0);
      if (meetingsCount > 0) {
        newMenuBadges.push({
          id: 'teacher-meetings',
          type: 'menu-badge',
          title: 'Reuniones programadas',
          description: `${meetingsCount} reunión${meetingsCount > 1 ? 'es' : ''} próxima${meetingsCount > 1 ? 's' : ''}`,
          count: meetingsCount,
          icon: <CalendarOutlined style={{ color: '#faad14' }} />,
          color: '#faad14',
          priority: 'low',
          actionUrl: '/teacher/calendar',
          module: 'meetings',
        });
      }

      // Tareas del Claustro pendientes
      if (staffTaskCounts.total > 0) {
        const isUrgent = staffTaskCounts.pendingAcceptance > 0 || staffTaskCounts.overdue > 0;
        const urgentCount = staffTaskCounts.pendingAcceptance + staffTaskCounts.overdue;
        newMenuBadges.push({
          id: 'teacher-staff-tasks',
          type: 'menu-badge',
          title: 'Tareas del Claustro',
          description: isUrgent
            ? `${urgentCount} tarea${urgentCount > 1 ? 's' : ''} urgente${urgentCount > 1 ? 's' : ''} (${staffTaskCounts.pendingAcceptance} sin aceptar, ${staffTaskCounts.overdue} vencida${staffTaskCounts.overdue > 1 ? 's' : ''})`
            : `${staffTaskCounts.inProgress} tarea${staffTaskCounts.inProgress > 1 ? 's' : ''} en progreso`,
          count: isUrgent ? urgentCount : staffTaskCounts.inProgress,
          icon: <TeamOutlined style={{ color: isUrgent ? '#ff4d4f' : '#722ed1' }} />,
          color: isUrgent ? '#ff4d4f' : '#722ed1',
          priority: isUrgent ? 'high' : 'medium',
          actionUrl: '/teacher/staff/tasks',
          module: 'staff-tasks',
        });
      }
    }

    // Badges para ESTUDIANTES
    if (user.role === UserRole.STUDENT && studentNotifications) {
      if (studentNotifications.tasks > 0) {
        newMenuBadges.push({
          id: 'student-tasks',
          type: 'menu-badge',
          title: 'Nuevas tareas',
          description: `${studentNotifications.tasks} tarea${studentNotifications.tasks > 1 ? 's' : ''} nueva${studentNotifications.tasks > 1 ? 's' : ''} asignada${studentNotifications.tasks > 1 ? 's' : ''}`,
          count: studentNotifications.tasks,
          icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
          color: '#1890ff',
          priority: 'high',
          actionUrl: '/student/tasks',
          module: 'tasks',
        });
      }

      if (studentNotifications.grades > 0) {
        newMenuBadges.push({
          id: 'student-grades',
          type: 'menu-badge',
          title: 'Nuevas calificaciones',
          description: `${studentNotifications.grades} calificación${studentNotifications.grades > 1 ? 'es' : ''} nueva${studentNotifications.grades > 1 ? 's' : ''}`,
          count: studentNotifications.grades,
          icon: <BarChartOutlined style={{ color: '#52c41a' }} />,
          color: '#52c41a',
          priority: 'high',
          actionUrl: '/student/grades',
          module: 'grades',
        });
      }

      if (studentNotifications.activities > 0) {
        newMenuBadges.push({
          id: 'student-activities',
          type: 'menu-badge',
          title: 'Nuevas actividades',
          description: `${studentNotifications.activities} actividad${studentNotifications.activities > 1 ? 'es' : ''} nueva${studentNotifications.activities > 1 ? 's' : ''}`,
          count: studentNotifications.activities,
          icon: <ProjectOutlined style={{ color: '#fa8c16' }} />,
          color: '#fa8c16',
          priority: 'medium',
          actionUrl: '/student/activities',
          module: 'activities',
        });
      }

      if (studentNotifications.calendar > 0) {
        newMenuBadges.push({
          id: 'student-calendar',
          type: 'menu-badge',
          title: 'Eventos de calendario',
          description: `${studentNotifications.calendar} evento${studentNotifications.calendar > 1 ? 's' : ''} nuevo${studentNotifications.calendar > 1 ? 's' : ''}`,
          count: studentNotifications.calendar,
          icon: <CalendarOutlined style={{ color: '#722ed1' }} />,
          color: '#722ed1',
          priority: 'low',
          actionUrl: '/student/calendar',
          module: 'calendar',
        });
      }

      if (studentNotifications.resources > 0) {
        newMenuBadges.push({
          id: 'student-resources',
          type: 'menu-badge',
          title: 'Recursos asignados',
          description: `${studentNotifications.resources} recurso${studentNotifications.resources > 1 ? 's' : ''} nuevo${studentNotifications.resources > 1 ? 's' : ''}`,
          count: studentNotifications.resources,
          icon: <FolderOutlined style={{ color: '#13c2c2' }} />,
          color: '#13c2c2',
          priority: 'low',
          actionUrl: '/student/resources',
          module: 'resources',
        });
      }
    }

    // Badges para ADMINISTRADORES
    if (user.role === UserRole.ADMIN) {
      if (unreadMessages > 0) {
        newMenuBadges.push({
          id: 'admin-messages',
          type: 'menu-badge',
          title: 'Mensajes del sistema',
          description: `${unreadMessages} mensaje${unreadMessages > 1 ? 's' : ''} administrativo${unreadMessages > 1 ? 's' : ''}`,
          count: unreadMessages,
          icon: <MessageOutlined style={{ color: '#52c41a' }} />,
          color: '#52c41a',
          priority: 'high',
          actionUrl: '/admin/communications',
          module: 'messages',
        });
      }

      // Tareas del Claustro pendientes (Admin)
      if (staffTaskCounts.total > 0) {
        const isUrgent = staffTaskCounts.pendingAcceptance > 0 || staffTaskCounts.overdue > 0;
        const urgentCount = staffTaskCounts.pendingAcceptance + staffTaskCounts.overdue;
        newMenuBadges.push({
          id: 'admin-staff-tasks',
          type: 'menu-badge',
          title: 'Tareas del Claustro',
          description: isUrgent
            ? `${urgentCount} tarea${urgentCount > 1 ? 's' : ''} urgente${urgentCount > 1 ? 's' : ''} (${staffTaskCounts.pendingAcceptance} sin aceptar, ${staffTaskCounts.overdue} vencida${staffTaskCounts.overdue > 1 ? 's' : ''})`
            : `${staffTaskCounts.inProgress} tarea${staffTaskCounts.inProgress > 1 ? 's' : ''} en progreso`,
          count: isUrgent ? urgentCount : staffTaskCounts.inProgress,
          icon: <TeamOutlined style={{ color: isUrgent ? '#ff4d4f' : '#722ed1' }} />,
          color: isUrgent ? '#ff4d4f' : '#722ed1',
          priority: isUrgent ? 'high' : 'medium',
          actionUrl: '/admin/staff/tasks',
          module: 'staff-tasks',
        });
      }
    }

    // Badges para FAMILIAS
    if (user.role === UserRole.FAMILY) {
      if (unreadMessages > 0) {
        newMenuBadges.push({
          id: 'family-messages',
          type: 'menu-badge',
          title: 'Mensajes de profesores',
          description: `${unreadMessages} mensaje${unreadMessages > 1 ? 's' : ''} de profesores sin leer`,
          count: unreadMessages,
          icon: <MessageOutlined style={{ color: '#52c41a' }} />,
          color: '#52c41a',
          priority: 'high',
          actionUrl: '/family/communications',
          module: 'messages',
        });
      }

      // Tareas vencidas sin entregar
      if (familyTaskBadges.overdueCount > 0) {
        newMenuBadges.push({
          id: 'family-tasks-overdue',
          type: 'menu-badge',
          title: 'Tareas sin entregar',
          description: `${familyTaskBadges.overdueCount} tarea${familyTaskBadges.overdueCount > 1 ? 's' : ''} vencida${familyTaskBadges.overdueCount > 1 ? 's' : ''} sin entregar`,
          count: familyTaskBadges.overdueCount,
          icon: <WarningOutlined style={{ color: '#fa8c16' }} />,
          color: '#fa8c16',
          priority: 'high',
          actionUrl: '/family/tasks',
          module: 'tasks',
        });
      }

      // Tareas devueltas para revisión
      if (familyTaskBadges.returnedCount > 0) {
        newMenuBadges.push({
          id: 'family-tasks-returned',
          type: 'menu-badge',
          title: 'Tareas para revisar',
          description: `${familyTaskBadges.returnedCount} tarea${familyTaskBadges.returnedCount > 1 ? 's' : ''} devuelta${familyTaskBadges.returnedCount > 1 ? 's' : ''} para revisar`,
          count: familyTaskBadges.returnedCount,
          icon: <ExclamationCircleOutlined style={{ color: '#ff7a00' }} />,
          color: '#ff7a00',
          priority: 'high',
          actionUrl: '/family/tasks',
          module: 'tasks',
        });
      }
    }

    // Ordenar por prioridad y actualizar estado
    const sortedMenuBadges = newMenuBadges.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    setMenuBadges(sortedMenuBadges);
    setTotalBadgeCount(sortedMenuBadges.reduce((sum, badge) => sum + badge.count, 0));
  }, [user, unreadMessages, pendingAttendance, studentNotifications, teacherBadges, staffTaskCounts, familyTaskBadges]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/communications/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await apiClient.get('/communications/notifications/unread-count');
      // Ensure we always get a number, not an object
      const count = response.data?.count ?? 0;
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  const handleMenuBadgeClick = (badge: MenuBadgeItem) => {
    if (badge.actionUrl) {
      safeNavigate(badge.actionUrl);
    }
    setDropdownVisible(false);
  };

  const handleDropdownOpenChange = (visible: boolean) => {
    setDropdownVisible(visible);
    if (visible) {
      // Refrescar datos al abrir para mostrar estado actualizado
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Actualización optimista: cambiar el estado local inmediatamente
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, status: 'read' as const } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Luego hacer la llamada a la API
      await apiClient.patch(`/communications/notifications/${notificationId}`, {
        status: 'read',
      });

      // Refrescar para asegurar consistencia con el servidor
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      message.error('Error al marcar como leída');
      // Si hay error, recargar para restaurar estado correcto
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Actualización optimista: marcar todas como leídas inmediatamente
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'read' as const }))
      );
      setUnreadCount(0);

      await apiClient.post('/communications/notifications/mark-all-read');
      message.success('Todas las notificaciones marcadas como leídas');

      // Refrescar para asegurar consistencia
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
      message.error('Error al marcar todas como leídas');
      // Si hay error, recargar para restaurar estado correcto
      fetchNotifications();
      fetchUnreadCount();
    }
  };


  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await apiClient.delete(`/communications/notifications/${notificationId}`);
      message.success('Notificación eliminada');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
      message.error('Error al eliminar la notificación');
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      const response = await apiClient.delete('/communications/notifications/bulk/delete-all');
      message.success(`${response.data.deletedCount} notificaciones eliminadas`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      message.error('Error al eliminar todas las notificaciones');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'evaluation': return <BookOutlined style={{ color: '#1890ff' }} />;
      case 'message': return <MessageOutlined style={{ color: '#52c41a' }} />;
      case 'announcement': return <BellOutlined style={{ color: '#faad14' }} />;
      case 'academic': return <CalendarOutlined style={{ color: '#722ed1' }} />;
      case 'attendance': return <UserOutlined style={{ color: '#f5222d' }} />;
      case 'reminder': return <BellOutlined style={{ color: '#fa8c16' }} />;
      case 'system': return <SettingOutlined style={{ color: '#13c2c2' }} />;
      // Nuevos tipos para profesores
      case 'task_submission': return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'task_correction_ready': return <CheckOutlined style={{ color: '#52c41a' }} />;
      case 'evaluation_pending': return <BookOutlined style={{ color: '#722ed1' }} />;
      case 'rubric_assessment_pending': return <TableOutlined style={{ color: '#fa8c16' }} />;
      case 'activity_assignment_pending': return <ProjectOutlined style={{ color: '#faad14' }} />;
      case 'meeting_scheduled': return <CalendarOutlined style={{ color: '#faad14' }} />;
      case 'activity_overdue': return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
      case 'family_message': return <MessageOutlined style={{ color: '#13c2c2' }} />;
      case 'ai_correction_completed': return <RobotOutlined style={{ color: '#722ed1' }} />;
      case 'shared_note': return <FileTextOutlined style={{ color: '#52c41a' }} />;
      case 'moderation': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'task_incomplete': return <WarningOutlined style={{ color: '#fa8c16' }} />;
      case 'task_returned': return <ExclamationCircleOutlined style={{ color: '#ff7a00' }} />;
      default: return <BellOutlined />;
    }
  };

  const getNotificationTypeTag = (type: string) => {
    const configs = {
      evaluation: { color: 'blue', text: 'Evaluación' },
      message: { color: 'green', text: 'Mensaje' },
      announcement: { color: 'orange', text: 'Comunicado' },
      academic: { color: 'purple', text: 'Académico' },
      attendance: { color: 'red', text: 'Asistencia' },
      reminder: { color: 'gold', text: 'Recordatorio' },
      system: { color: 'cyan', text: 'Sistema' },
      // Nuevos tipos para profesores
      task_submission: { color: 'blue', text: 'Entrega Tarea' },
      task_correction_ready: { color: 'green', text: 'Tarea Corregida' },
      evaluation_pending: { color: 'purple', text: 'Evaluación Pendiente' },
      rubric_assessment_pending: { color: 'orange', text: 'Rúbrica Pendiente' },
      activity_assignment_pending: { color: 'gold', text: 'Actividad Asignada' },
      meeting_scheduled: { color: 'gold', text: 'Reunión Programada' },
      activity_overdue: { color: 'red', text: 'Actividad Vencida' },
      family_message: { color: 'cyan', text: 'Mensaje Familia' },
      ai_correction_completed: { color: 'purple', text: 'IA Corrección' },
      shared_note: { color: 'green', text: 'Apunte Compartido' },
      moderation: { color: 'orange', text: 'Moderación' },
      task_incomplete: { color: 'orange', text: 'Tarea Sin Entregar' },
      task_returned: { color: 'volcano', text: 'Tarea Devuelta' },
    };

    const config = configs[type as keyof typeof configs] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como leída si no lo está
    if (notification.status === 'unread') {
      handleMarkAsRead(notification.id);
    }

    // Navegar a la URL de acción si existe
    if (notification.actionUrl) {
      let finalUrl = notification.actionUrl;
      
      // Transformar URLs globales a URLs específicas del rol
      if (finalUrl.startsWith('/messages/')) {
        // URL de mensaje individual: /messages/ID -> /ROLE/messages?messageId=ID
        const messageId = finalUrl.split('/messages/')[1];
        const roleBasePath = user?.role === 'admin' ? '/admin' : 
                           user?.role === 'teacher' ? '/teacher' : 
                           user?.role === 'student' ? '/student' : 
                           user?.role === 'family' ? '/family' : '/';
        finalUrl = `${roleBasePath}/messages?messageId=${messageId}`;
      } else if (finalUrl.startsWith('/') && !finalUrl.startsWith('/admin') && !finalUrl.startsWith('/teacher') && !finalUrl.startsWith('/student') && !finalUrl.startsWith('/family')) {
        // Otras URLs globales: agregar prefijo del rol
        const roleBasePath = user?.role === 'admin' ? '/admin' : 
                           user?.role === 'teacher' ? '/teacher' : 
                           user?.role === 'student' ? '/student' : 
                           user?.role === 'family' ? '/family' : '/';
        finalUrl = `${roleBasePath}${finalUrl}`;
      }
      
      console.log(`🔔 NOTIFICATION NAV: ${notification.actionUrl} → ${finalUrl}`);
      safeNavigate(finalUrl);
    }

    setDropdownVisible(false);
  };

  const notificationList = (
    <div style={{ width: 450, maxHeight: 600, overflow: 'auto', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text strong>
            Notificaciones {(unreadCount + totalBadgeCount) > 0 && `(${unreadCount + totalBadgeCount})`}
          </Text>
          <Space>
            {unreadCount > 0 && (
              <Button
                type="link"
                size="small"
                onClick={handleMarkAllAsRead}
                style={{ padding: 0 }}
              >
                Marcar todas como leídas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                type="link"
                size="small"
                onClick={handleDeleteAllNotifications}
                style={{ padding: 0, color: '#ff4d4f' }}
                danger
              >
                Eliminar todas
              </Button>
            )}
          </Space>
        </Space>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
          <Loading text="Cargando notificaciones..." />
        </div>
      ) : (
        <>
          {/* Sección de Badges del Menú */}
          {menuBadges.length > 0 && (
            <>
              <div style={{ 
                padding: '12px 16px', 
                backgroundColor: '#f0f9ff', 
                borderBottom: '1px solid #e2e8f0' 
              }}>
                <Text strong style={{ fontSize: '14px', color: '#1e40af' }}>
                  📋 Elementos pendientes del menú
                </Text>
              </div>
              <List
                itemLayout="horizontal"
                dataSource={menuBadges}
                style={{ backgroundColor: '#f0f9ff' }}
                renderItem={(badge) => (
                  <List.Item
                    key={badge.id}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #e0f2fe',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => handleMenuBadgeClick(badge)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#dbeafe';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ position: 'relative' }}>
                          <Avatar
                            icon={badge.icon}
                            style={{ 
                              backgroundColor: 'transparent',
                              border: `2px solid ${badge.color}`,
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            backgroundColor: badge.color,
                            color: 'white',
                            borderRadius: '10px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            minWidth: '16px',
                            textAlign: 'center',
                          }}>
                            {badge.count}
                          </div>
                        </div>
                      }
                      title={
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text strong style={{ color: '#1e40af' }}>
                            {badge.title}
                          </Text>
                          <Tag color={badge.priority === 'high' ? 'red' : badge.priority === 'medium' ? 'orange' : 'blue'} size="small">
                            {badge.priority === 'high' ? 'Urgente' : badge.priority === 'medium' ? 'Medio' : 'Bajo'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {badge.description}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
              {notifications.length > 0 && <Divider style={{ margin: 0 }} />}
            </>
          )}

          {/* Sección de Notificaciones del Sistema */}
          {notifications.length === 0 && menuBadges.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#f8fafc' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay notificaciones"
              />
            </div>
          ) : null}

          {menuBadges.length > 0 && notifications.length > 0 && (
            <div style={{ 
              padding: '12px 16px', 
              backgroundColor: '#f8fafc', 
              borderBottom: '1px solid #e2e8f0' 
            }}>
              <Text strong style={{ fontSize: '14px', color: '#64748b' }}>
                🔔 Notificaciones del sistema
              </Text>
            </div>
          )}
          
          {notifications.length > 0 && (
            <List
              itemLayout="vertical"
              dataSource={notifications.slice(0, 10)} // Mostrar solo las 10 más recientes
              renderItem={(notification) => (
                <List.Item
                  key={notification.id}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: notification.status === 'unread' ? '#f0f9ff' : '#f9fafb',
                    borderLeft: notification.status === 'unread' ? '3px solid #52c41a' : 'none',
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  actions={[
                    <Space key="actions">
                      {notification.status === 'unread' && (
                        <Button
                          type="text"
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          title="Marcar como leída"
                        />
                      )}
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        title="Eliminar permanentemente"
                        danger
                      />
                    </Space>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={getNotificationIcon(notification.type)}
                        style={{ backgroundColor: 'transparent' }}
                      />
                    }
                    title={
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong={notification.status === 'unread'}>
                          {notification.title}
                        </Text>
                        {getNotificationTypeTag(notification.type)}
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {notification.content}
                        </Text>
                        <div style={{ marginTop: 4 }}>
                          {notification.triggeredBy?.profile && (
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Por: {notification.triggeredBy.profile.firstName || 'N/A'} {notification.triggeredBy.profile.lastName || 'N/A'}
                            </Text>
                          )}
                          {notification.relatedStudent?.user?.profile && (
                            <Text type="secondary" style={{ fontSize: '11px', marginLeft: 8 }}>
                              Estudiante: {notification.relatedStudent.user.profile.firstName || 'N/A'} {notification.relatedStudent.user.profile.lastName || 'N/A'}
                            </Text>
                          )}
                          {notification.relatedGroup?.name && (
                            <Text type="secondary" style={{ fontSize: '11px', marginLeft: 8 }}>
                              Grupo: {notification.relatedGroup.name}
                            </Text>
                          )}
                          <div style={{ marginTop: 2 }}>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {formatTimeAgo(notification.createdAt)}
                            </Text>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </>
      )}
      
      {/* Footer */}
      {(notifications.length > 10 || menuBadges.length > 0) && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={{ 
            padding: '12px 16px', 
            textAlign: 'center',
            backgroundColor: '#f1f5f9',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          }}>
            {notifications.length > 10 && (
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  // Navegar a la página completa de notificaciones
                  setDropdownVisible(false);
                }}
                style={{ marginRight: '8px' }}
              >
                Ver todas las notificaciones
              </Button>
            )}
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Total: {unreadCount + totalBadgeCount} elemento{(unreadCount + totalBadgeCount) > 1 ? 's' : ''} pendiente{(unreadCount + totalBadgeCount) > 1 ? 's' : ''}
            </Text>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      menu={{ items: [] }}
      popupRender={() => notificationList}
      trigger={['click']}
      placement="bottomRight"
      open={dropdownVisible}
      onOpenChange={handleDropdownOpenChange}
    >
      <SafeBadge count={unreadCount + totalBadgeCount} size="small">
        <Button
          type="text"
          icon={
            <BellOutlined 
              style={{ 
                fontSize: '18px',
                color: (unreadCount + totalBadgeCount) > 0 ? '#ff4d4f' : '#64748b',
                transition: 'all 0.2s ease'
              }} 
            />
          }
          style={{ 
            border: 'none', 
            background: 'transparent',
            height: '40px',
            width: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </SafeBadge>
    </Dropdown>
  );
};

export default NotificationCenter;