/**
 * @archivo: DashboardLayout.tsx
 * @módulo: Layout (Sistema de Layout Principal)
 * @función: Layout base del dashboard con navegación y autenticación
 * @crítico: SÍ - Layout principal usado en TODAS las páginas del sistema
 * @dependencias: useAuthStore, Navigation routing, Ant Design
 * @no_modificar: Estructura de menús sin revisar rutas en App.tsx
 * @relacionado_con: App.tsx, authStore.ts, Navigation components
 */

/**
 * COMPONENTE: DashboardLayout
 * UBICACIÓN: /frontend/src/components/layout/DashboardLayout.tsx
 * FUNCIÓN: Layout base con navegación lateral, header y contenido
 * NO USAR PARA: Layouts específicos de TypeQuest o páginas públicas
 * PROPS CRÍTICAS: 
 *   - children: Contenido de las páginas
 *   - role-based menu: Menús específicos según UserRole
 * SERVICIOS QUE USA: useAuthStore, React Router
 * COMPONENTES HIJOS: Sidebar navigation, User dropdown, Content area
 * 
 * NAVEGACIÓN POR ROLES:
 * - ADMIN: Acceso completo (usuarios, configuración, recursos)
 * - TEACHER: Dashboard, estudiantes, evaluaciones, recursos
 * - STUDENT: Dashboard personal, tareas, TypeQuest
 * - FAMILY: Dashboard familiar, progreso hijos
 * 
 * INTEGRACIÓN CON TYPEQUEST:
 * - Menú específico para estudiantes de Primaria/Secundaria
 * - Redirects automáticos según edad y nivel educativo
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, Button, Space, Drawer, Badge, Alert as AntAlert, ConfigProvider } from 'antd'
import { useModuleSettings } from '../../hooks/useModuleSettings'
import { useClosureStatus } from '../../hooks/useClosureStatus'
import { filterMenuByAllowedSections, isPathClosed } from '../../config/closureSections'
import apiClient from '../../services/apiClient'
// TimeBasedWelcome removed - using DynamicGreeting in individual dashboards only
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  DashboardOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
  BarChartOutlined,
  MessageOutlined,
  CalendarOutlined,
  ProjectOutlined,
  QuestionCircleOutlined,
  TableOutlined,
  ShareAltOutlined,
  FolderOutlined,
  CopyOutlined,
  CloudServerOutlined,
  RobotOutlined,
  CameraOutlined,
  EditOutlined,
  SecurityScanOutlined,
  MonitorOutlined,
  DatabaseOutlined,
  SafetyOutlined,
  HomeOutlined,
  FormOutlined,
  ScheduleOutlined,
  ReadOutlined,
  AuditOutlined,
  SolutionOutlined,
  ClockCircleOutlined,
  CheckSquareOutlined,
  InboxOutlined,
  ApartmentOutlined,
  HeartOutlined,
  MailOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@store/authStore'
import { UserRole } from '@/types/user'
import { useLocation, useNavigate } from 'react-router-dom'
import NotificationCenter from '../NotificationCenter'
import { useUnreadMessages } from '../../hooks/useUnreadMessages'
import { usePendingAttendanceRequests } from '../../hooks/usePendingAttendanceRequests'
import { useTeacherNotificationBadges } from '../../hooks/useTeacherNotificationBadges'
import { useUnreadBlogPosts } from '../../hooks/useUnreadBlogPosts'
import { useUnreadGroupMessages } from '../../hooks/useUnreadGroupMessages'
import { useResponsive } from '../../hooks/useResponsive'
import ObjectDetector from '../debug/ObjectDetector'
import BirthdayBanner from '../common/BirthdayBanner'
import ActivityCenter from '../communications/ActivityCenter'
import { useProfilePhoto } from '../../hooks/useProfilePhoto'
import { useIdleTimer } from '../../hooks/useIdleTimer'
import { useStaffTaskCounts } from '../../hooks/useStaffTaskCounts'
import { useFamilyTaskBadges } from '../../hooks/useFamilyTaskBadges'
import AutoLogoutWarning from '../common/AutoLogoutWarning'
import SystemBanner from '../common/SystemBanner'
import ImpersonationBanner from '../common/ImpersonationBanner'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface DashboardLayoutProps {
  children: React.ReactNode
}

import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { HeaderMobilePanel } from './HeaderMobilePanel';
import { BellOutlined } from '@ant-design/icons';

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const [showLogoutWarning, setShowLogoutWarning] = useState(false)
  
  // State for the new mobile panel
  const [mobilePanelVisible, setMobilePanelVisible] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'messages' | 'notifications'>('messages');
  
  const {
    user,
    logout,
    autoLogoutEnabled,
    autoLogoutTimeout,
    updateActivity,
    autoLogout,
    isImpersonating,
  } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  // Academia (Tarde): flag para mostrar el grupo de menú solo si el profesor tiene grupos de academia asignados
  const [hasAcademia, setHasAcademia] = useState(false);
  useEffect(() => {
    if (user?.role === 'teacher') {
      apiClient.get('/teacher/academia/my-groups')
        .then(r => setHasAcademia(!!r.data?.hasAcademia))
        .catch(() => setHasAcademia(false));
    }
  }, [user?.role]);
  // Using robust navigation utility - now uses window.location for reliable navigation
  const { unreadCount } = useUnreadMessages()
  const { pendingCount } = usePendingAttendanceRequests()
  const { unreadCount: unreadBlogCount } = useUnreadBlogPosts()
  const { unreadCount: unreadGroupCount } = useUnreadGroupMessages(60000)
  
  // Unread notifications count for the mobile badge
  const { unreadCount: unreadNotifications } = useUnreadNotifications(user);

  // Teacher-specific notification badges (including pending meetings)
  const { getBadgeCount } = useTeacherNotificationBadges()
  const pendingMeetingsCount = user?.role === UserRole.TEACHER ? getBadgeCount('meetings') : 0

  // Staff (Claustro) task counts for badges
  const { counts: staffTaskCounts, urgentBadgeCount: staffUrgentCount, badgeCount: staffTotalCount } = useStaffTaskCounts()

  // Family task pending badges (overdue + returned tasks for children)
  const familyTaskBadges = useFamilyTaskBadges()
  const safeFamilyTasksCount = typeof familyTaskBadges.totalCount === 'number' ? familyTaskBadges.totalCount : 0

  const { isModuleEnabled, isLoading: moduleSettingsLoading, moduleSettings, isModuleEnabledForRole } = useModuleSettings();

  // Closure status for end-of-year mode
  const closure = useClosureStatus();
  const isAffectedRole = ['teacher', 'student', 'family'].includes(user?.role || '');
  const closureActive = closure.enabled && isAffectedRole && !closure.loading;

  // Module settings loaded

  // Ensure counts are always numbers to prevent React rendering errors
  const safeUnreadCount = typeof unreadCount === 'number' ? unreadCount : 0
  const safePendingCount = typeof pendingCount === 'number' ? pendingCount : 0
  const safePendingMeetingsCount = typeof pendingMeetingsCount === 'number' ? pendingMeetingsCount : 0
  const safeUnreadBlogCount = typeof unreadBlogCount === 'number' ? unreadBlogCount : 0
  // Staff task counts - urgent (pending acceptance + overdue) and total active tasks
  const safeStaffUrgentCount = typeof staffUrgentCount === 'number' ? staffUrgentCount : 0
  const safeStaffTotalCount = typeof staffTotalCount === 'number' ? staffTotalCount : 0
  const { isMobile, isTablet, screenSize } = useResponsive()

  // Get user profile photo
  const { photoUrl, hasPhoto } = useProfilePhoto(user?.profile?.avatarUrl)

  // Calcular tiempo de advertencia proporcional al timeout (25% del tiempo, mín 10s, máx 5min)
  const warningTimeMs = Math.min(
    5 * 60 * 1000, // máximo 5 minutos
    Math.max(
      10 * 1000, // mínimo 10 segundos
      Math.floor(autoLogoutTimeout * 0.25) // 25% del timeout
    )
  );

  // Configure auto-logout with idle timer
  const {
    isWarning,
    remainingTime,
    restart: restartIdleTimer
  } = useIdleTimer({
    timeout: autoLogoutTimeout, // tiempo dinámico del store
    warningTime: warningTimeMs, // tiempo de advertencia proporcional
    enabled: autoLogoutEnabled && !!user,
    onWarning: () => {
      console.log('⚠️ Auto-logout warning triggered')
      setShowLogoutWarning(true)
    },
    onIdle: () => {
      console.log('⏰ Auto-logout triggered by inactivity')
      setShowLogoutWarning(false)
      autoLogout()
    },
    onActive: () => {
      updateActivity()
    }
  })

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true)
      setMobileMenuVisible(false)
    } else if (isTablet) {
      setCollapsed(true)
    } else {
      setCollapsed(false)
    }
  }, [isMobile, isTablet])
  

  // Close mobile menu on navigation
  useEffect(() => {
    if (isMobile) {
      setMobileMenuVisible(false)
    }
  }, [location.pathname, isMobile])

  // Set open keys based on current route
  useEffect(() => {
    const pathSegments = location.pathname.split('/')
    const currentPage = pathSegments[2] // /admin/users -> 'users'
    
    // Determine which submenu should be open based on current page
    const determineOpenKeys = () => {
      switch (user?.role) {
        case UserRole.ADMIN:
          if (['enrollment', 'teachers', 'students', 'families'].includes(currentPage)) {
            return ['users']
          }
          if (['academic-years', 'class-groups', 'educational-levels', 'subjects', 'schedules', 'class-schedules', 'calendar'].includes(currentPage)) {
            return ['academic']
          }
          if (['evaluations', 'competencies', 'rubrics', 'shared-rubrics', 'grades', 'evaluation-periods', 'criterion-assessment', 'criterion-knowledge', 'curriculum-generation'].includes(currentPage)) {
            return ['evaluation-system']
          }
          if (['messages', 'notifications', 'email-notifications', 'email-automation', 'communication-config', 'system-announcements'].includes(currentPage)) {
            return ['communications']
          }
          if (['settings', 'backup-management', 'reports', 'facial-recognition'].includes(currentPage)) {
            return ['system-config']
          }
          if (['dua', 'dua-accommodations', 'dua-dashboard'].includes(currentPage)) {
            return ['dua-system']
          }
          if (['educational-resources', 'student-notes', 'lessons', 'coordination', 'blog', 'blog-view', 'blog-management'].includes(currentPage)) {
            return ['resources']
          }
          if (['staff'].includes(currentPage) || location.pathname.includes('/staff/')) {
            return ['staff']
          }
          break
        case UserRole.TEACHER:
          // Keys for the new menu structure
          const planningPages = ['classes', 'schedule', 'calendar', 'lessons'];
          const cuadernoPages = ['cuaderno', 'grades', 'centralized-grades', 'attendance', 'criterion-assessment', 'shared-rubrics', 'rubrics', 'evaluations', 'competencies', 'academia'];
          const studentPages = ['students', 'subject-students', 'activities', 'tasks', 'tasks-dashboard', 'dua', 'dua-accommodations', 'assignments', 'test-yourself', 'todo', 'daily-homework'];
          const communicationPages = ['messages', 'group-chats', 'meetings', 'coordination', 'blog', 'report-requests', 'tutor-reports', 'staff', 'auto-report'];
          const resourcesPages = ['educational-resources', 'shared-notes'];

          if (planningPages.includes(currentPage)) {
            return ['planning-teaching'];
          }
          if (cuadernoPages.includes(currentPage)) {
            return ['cuaderno-hub'];
          }
          if (studentPages.includes(currentPage)) {
            // Gestión de Aula es un submenú anidado
            const classroomSubPages = ['activities', 'tasks', 'tasks-dashboard', 'assignments', 'test-yourself', 'todo', 'daily-homework'];
            if (classroomSubPages.includes(currentPage)) {
              return ['students-evaluation', 'classroom-management'];
            }
            return ['students-evaluation'];
          }
          if (communicationPages.includes(currentPage) || location.pathname.includes('/staff/')) {
            return ['communication-reports'];
          }
          if (resourcesPages.includes(currentPage)) {
            return ['resources-section'];
          }
          break;
        default:
          break
      }
      return []
    }

    setOpenKeys(determineOpenKeys())
  }, [location.pathname, user?.role])

  // Helper para crear item de menú con badge
  const createMessageMenuItem = (key: string, label: string, path: string) => ({
    key,
    icon: <MessageOutlined />,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{ 
            backgroundColor: safeUnreadCount > 0 ? '#ff4d4f' : 'transparent',
            color: 'white',
            fontSize: '11px',
            height: '18px',
            minWidth: safeUnreadCount > 0 ? '18px' : '0px',
            lineHeight: '18px',
            borderRadius: '9px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: safeUnreadCount > 0 ? '0 6px' : '0',
            maxWidth: (!collapsed && safeUnreadCount > 0) ? '50px' : '0px',
            opacity: (!collapsed && safeUnreadCount > 0) ? '1' : '0'
          }}
        >
          {safeUnreadCount > 0 && safeUnreadCount}
        </span>
      </div>
    ),
    onClick: () => safeNavigate(path, label),
  })

  // Helper para crear item de menú de asistencia con badge
  const createAttendanceMenuItem = (key: string, label: string, path: string) => ({
    key,
    icon: <CalendarOutlined />,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            backgroundColor: safePendingCount > 0 ? '#faad14' : 'transparent',
            color: 'white',
            fontSize: '11px',
            height: '18px',
            minWidth: safePendingCount > 0 ? '18px' : '0px',
            lineHeight: '18px',
            borderRadius: '9px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: safePendingCount > 0 ? '0 6px' : '0',
            maxWidth: (!collapsed && safePendingCount > 0) ? '50px' : '0px',
            opacity: (!collapsed && safePendingCount > 0) ? '1' : '0'
          }}
        >
          {safePendingCount > 0 && safePendingCount}
        </span>
      </div>
    ),
    onClick: () => safeNavigate(path, label),
  });

  // Helper para crear item de menú de reuniones con familias con badge
  const createMeetingMenuItem = (key: string, label: string, path: string) => ({
    key,
    icon: <CalendarOutlined />,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            backgroundColor: safePendingMeetingsCount > 0 ? '#52c41a' : 'transparent',
            color: 'white',
            fontSize: '11px',
            height: '18px',
            minWidth: safePendingMeetingsCount > 0 ? '18px' : '0px',
            lineHeight: '18px',
            borderRadius: '9px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: safePendingMeetingsCount > 0 ? '0 6px' : '0',
            maxWidth: (!collapsed && safePendingMeetingsCount > 0) ? '50px' : '0px',
            opacity: (!collapsed && safePendingMeetingsCount > 0) ? '1' : '0'
          }}
        >
          {safePendingMeetingsCount > 0 && safePendingMeetingsCount}
        </span>
      </div>
    ),
    onClick: () => safeNavigate(path, label),
  });

  // Helper para crear item de menú del blog con badge de posts no leídos
  const createBlogMenuItem = (key: string, label: string, path: string) => ({
    key,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            backgroundColor: safeUnreadBlogCount > 0 ? '#1890ff' : 'transparent',
            color: 'white',
            fontSize: '11px',
            height: '18px',
            minWidth: safeUnreadBlogCount > 0 ? '18px' : '0px',
            lineHeight: '18px',
            borderRadius: '9px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: safeUnreadBlogCount > 0 ? '0 6px' : '0',
            maxWidth: (!collapsed && safeUnreadBlogCount > 0) ? '50px' : '0px',
            opacity: (!collapsed && safeUnreadBlogCount > 0) ? '1' : '0'
          }}
        >
          {safeUnreadBlogCount > 0 && safeUnreadBlogCount}
        </span>
      </div>
    ),
    onClick: () => safeNavigate(path, label),
  });

  // Helper para crear item de menú de Tareas del Claustro con badge
  const createStaffTaskMenuItem = (key: string, label: string, path: string) => ({
    key,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {/* Badge rojo para tareas urgentes (pendientes de aceptar + vencidas) */}
        <span
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            backgroundColor: safeStaffUrgentCount > 0 ? '#ff4d4f' : (safeStaffTotalCount > 0 ? '#faad14' : 'transparent'),
            color: 'white',
            fontSize: '11px',
            height: '18px',
            minWidth: safeStaffTotalCount > 0 ? '18px' : '0px',
            lineHeight: '18px',
            borderRadius: '9px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: safeStaffTotalCount > 0 ? '0 6px' : '0',
            maxWidth: (!collapsed && safeStaffTotalCount > 0) ? '50px' : '0px',
            opacity: (!collapsed && safeStaffTotalCount > 0) ? '1' : '0'
          }}
        >
          {safeStaffTotalCount > 0 && safeStaffTotalCount}
        </span>
      </div>
    ),
    onClick: () => safeNavigate(path, label),
  });

  // Helper para crear submenu Claustro con badge en el label del submenú
  const createStaffSubmenuLabel = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <span>Claustro</span>
      <span
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          backgroundColor: safeStaffUrgentCount > 0 ? '#ff4d4f' : (safeStaffTotalCount > 0 ? '#faad14' : 'transparent'),
          color: 'white',
          fontSize: '11px',
          height: '18px',
          minWidth: safeStaffTotalCount > 0 ? '18px' : '0px',
          lineHeight: '18px',
          borderRadius: '9px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: safeStaffTotalCount > 0 ? '0 6px' : '0',
          maxWidth: (!collapsed && safeStaffTotalCount > 0) ? '50px' : '0px',
          opacity: (!collapsed && safeStaffTotalCount > 0) ? '1' : '0'
        }}
      >
        {safeStaffTotalCount > 0 && safeStaffTotalCount}
      </span>
    </div>
  );

  // Helper function to filter menu items based on module configuration
  const filterMenuByModules = (menuItems: any[]) => {
    if (moduleSettingsLoading) return menuItems; // Si está cargando, mostrar todo por defecto
    
    // Get current user role
    const currentUserRole = user?.role || 'guest';
    
    // DashboardLayout module filtering ready
    
    return menuItems.filter(item => {
      // Items that don't require module checking (always visible core modules)
      if (['dashboard', 'users', 'academic', 'teaching', 'classroom-management', 'tasks', 'grades', 'test-yourself', 'resources-communication'].includes(item.key)) {
        return true;
      }
      
      // Check module-specific items at top level
      switch (item.key) {
        case 'calendar':
          return isModuleEnabled('calendario') && isModuleEnabledForRole('calendario', currentUserRole);
        case 'educational-resources':
          return isModuleEnabled('recursos') && isModuleEnabledForRole('recursos', currentUserRole);
        case 'blog':
          return isModuleEnabled('blog') && isModuleEnabledForRole('blog', currentUserRole);
        case 'blog-view':
          return isModuleEnabled('blog') && isModuleEnabledForRole('blog', currentUserRole);
        case 'reports':
          return isModuleEnabled('analytics') && isModuleEnabledForRole('analytics', currentUserRole);
        case 'coordination':
          return isModuleEnabled('coordination') && isModuleEnabledForRole('coordination', currentUserRole);
        case 'resources':
          return isModuleEnabled('recursos') && isModuleEnabledForRole('recursos', currentUserRole);
        case 'communications':
          return isModuleEnabled('comunicaciones') && isModuleEnabledForRole('comunicaciones', currentUserRole);
        case 'resources-communication':
          return (isModuleEnabled('recursos') && isModuleEnabledForRole('recursos', currentUserRole)) ||
                 (isModuleEnabled('comunicaciones') && isModuleEnabledForRole('comunicaciones', currentUserRole)) ||
                 (isModuleEnabled('coordination') && isModuleEnabledForRole('coordination', currentUserRole));
        case 'evaluation-system':
          return isModuleEnabled('evaluaciones') && isModuleEnabledForRole('evaluaciones', currentUserRole);
        case 'mis-apuntes':
          return isModuleEnabled('student_notes') && isModuleEnabledForRole('student_notes', currentUserRole);
        case 'apuntes-compartidos':
          // Same module requirements as mis-apuntes (student_notes)
          return isModuleEnabled('student_notes') && isModuleEnabledForRole('student_notes', currentUserRole);
        case 'student-notes':
          // Family access to children's student notes
          return isModuleEnabled('student_notes') && isModuleEnabledForRole('student_notes', currentUserRole);
        case 'system-config':
          return true; // Settings always visible for admin
        case 'dua-system':
        case 'dua-support':
          return isModuleEnabled('dua') && isModuleEnabledForRole('dua', currentUserRole);
        case 'tasks':
          return isModuleEnabled('tareas') && isModuleEnabledForRole('tareas', currentUserRole);
        case 'grades':
          return isModuleEnabled('notas') && isModuleEnabledForRole('notas', currentUserRole);
        case 'expediente':
          return isModuleEnabled('expedientes') && isModuleEnabledForRole('expedientes', currentUserRole);
        case 'competencies':
          return isModuleEnabled('competencias') && isModuleEnabledForRole('competencias', currentUserRole);
        case 'attendance':
          return isModuleEnabled('asistencia') && isModuleEnabledForRole('asistencia', currentUserRole);
        case 'activities':
          return isModuleEnabled('actividades') && isModuleEnabledForRole('actividades', currentUserRole);
        case 'children':
        case 'schedule':
          return true; // Core functionality for respective roles
        default:
          return true; // Items without module restriction
      }
    }).map(item => {
      // Filter children if they exist - this is crucial for academic submenu
      if (item.children) {
        const filteredChildren = item.children.filter((child: any) => {
          switch (child.key) {
            case 'calendar':
              return isModuleEnabled('calendario') && isModuleEnabledForRole('calendario', currentUserRole);
            case 'educational-resources':
              return isModuleEnabled('recursos') && isModuleEnabledForRole('recursos', currentUserRole);
            case 'blog':
              return isModuleEnabled('blog') && isModuleEnabledForRole('blog', currentUserRole);
            case 'blog-view':
              return isModuleEnabled('blog') && isModuleEnabledForRole('blog', currentUserRole);
            case 'coordination':
              return isModuleEnabled('meetings') && isModuleEnabledForRole('meetings', currentUserRole);
            case 'reports':
              return isModuleEnabled('analytics') && isModuleEnabledForRole('analytics', currentUserRole);
            case 'messages':
              return isModuleEnabled('chat') && isModuleEnabledForRole('chat', currentUserRole);
            case 'attendance':
              return isModuleEnabled('asistencia') && isModuleEnabledForRole('asistencia', currentUserRole);
            case 'activities':
              return isModuleEnabled('actividades') && isModuleEnabledForRole('actividades', currentUserRole);
            case 'tasks':
            case 'tasks-dashboard':
            case 'task-attachments':
              return isModuleEnabled('tareas') && isModuleEnabledForRole('tareas', currentUserRole);
            case 'evaluations':
              return isModuleEnabled('evaluaciones') && isModuleEnabledForRole('evaluaciones', currentUserRole);
            case 'competencies':
              return isModuleEnabled('competencias') && isModuleEnabledForRole('competencias', currentUserRole);
            case 'rubrics':
            case 'shared-rubrics':
              return isModuleEnabled('evaluaciones') && isModuleEnabledForRole('evaluaciones', currentUserRole);
            case 'grades':
            case 'auto-evaluator':
              return isModuleEnabled('notas') && isModuleEnabledForRole('notas', currentUserRole);
            case 'dua':
            case 'dua-dashboard':
            case 'dua-accommodations':
              return isModuleEnabled('dua') && isModuleEnabledForRole('dua', currentUserRole);
            case 'students':
              return true; // Always visible for teachers
            // All other academic items are always visible
            case 'academic-years':
            case 'class-groups':
            case 'educational-levels':
            case 'subjects':
            case 'schedules':
            case 'class-schedules':
              return true;
            default:
              return true;
          }
        });
        return { ...item, children: filteredChildren };
      }
      return item;
    });
  };

  // Filter menu items based on closure status (hides closed sections for teacher/student/family)
  const filterMenuByClosure = (menuItems: any[]): any[] => {
    if (!closureActive) return menuItems;
    return filterMenuByAllowedSections(menuItems, closure.allowedSections);
  };

  // Using React Router navigation for SPA routing
  const safeNavigate = (path: string, _label: string = '') => {
    try {
      navigate(path);
    } catch {
      window.location.href = path;
    }
  };

  // Helper function to create navigation onClick that handles React Router desync
  const createNavigation = (path: string, label: string = '') => {
    return () => safeNavigate(path, label);
  };

  // Get menu items based on user role
  const getMenuItems = () => {
    const baseItems = [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        onClick: createNavigation(`/${user?.role}`, 'Dashboard'),
      },
    ]

    switch (user?.role) {
      case UserRole.ADMIN:

        // Apply module filtering for ADMIN role
        return filterMenuByModules([
          ...baseItems,
          {
            key: 'users',
            icon: <TeamOutlined />,
            label: 'Gestión de Usuarios',
            children: [
              {
                key: 'enrollment',
                icon: <FormOutlined />,
                label: 'Inscripción',
                onClick: () => safeNavigate('/admin/enrollment', 'Inscripción'),
              },
              {
                key: 'teachers',
                icon: <UserOutlined />,
                label: 'Profesores',
                onClick: () => safeNavigate('/admin/teachers', 'Profesores'),
              },
              {
                key: 'students',
                icon: <TeamOutlined />,
                label: 'Estudiantes',
                onClick: createNavigation('/admin/students', 'Estudiantes'),
              },
              {
                key: 'families',
                icon: <HomeOutlined />,
                label: 'Familias',
                onClick: () => safeNavigate('/admin/families', 'Familias'),
              },
            ],
          },
          {
            key: 'academic',
            icon: <BookOutlined />,
            label: 'Organización Académica',
            children: [
              {
                key: 'academic-years',
                icon: <CalendarOutlined />,
                label: 'Años Académicos',
                onClick: () => safeNavigate('/admin/academic-years', 'Años Académicos'),
              },
              {
                key: 'class-groups',
                icon: <ApartmentOutlined />,
                label: 'Grupos de Clase',
                onClick: createNavigation('/admin/class-groups', 'Grupos de Clase'),
              },
              {
                key: 'educational-levels',
                icon: <ReadOutlined />,
                label: 'Niveles Educativos',
                onClick: createNavigation('/admin/educational-levels', 'Niveles Educativos'),
              },
              {
                key: 'subjects',
                icon: <BookOutlined />,
                label: 'Asignaturas',
                onClick: createNavigation('/admin/subjects', 'Asignaturas'),
              },
              {
                key: 'schedules',
                icon: <ScheduleOutlined />,
                label: 'Horarios',
                onClick: () => safeNavigate('/admin/schedules', 'Horarios'),
              },
              {
                key: 'class-schedules',
                icon: <ScheduleOutlined />,
                label: 'Horarios por Grupo',
                onClick: () => safeNavigate('/admin/class-schedules', 'Horarios por Grupo'),
              },
              {
                key: 'calendar',
                icon: <CalendarOutlined />,
                label: 'Calendario Escolar',
                onClick: () => safeNavigate('/admin/calendar', 'Calendario Escolar'),
              },
            ],
          },
          {
            key: 'evaluation-system',
            icon: <FileTextOutlined />,
            label: 'Sistema de Evaluación',
            children: [
              {
                key: 'evaluations',
                icon: <SolutionOutlined />,
                label: 'Evaluación Competencial',
                onClick: () => safeNavigate('/admin/evaluations', 'Evaluación Competencial'),
              },
              {
                key: 'competencies',
                icon: <BarChartOutlined />,
                label: 'Competencias',
                onClick: () => safeNavigate('/admin/competencies', 'Competencias'),
              },
              {
                key: 'rubrics',
                icon: <TableOutlined />,
                label: 'Rúbricas',
                onClick: () => safeNavigate('/admin/rubrics', 'Rúbricas'),
              },
              {
                key: 'shared-rubrics',
                icon: <ShareAltOutlined />,
                label: 'Rúbricas Compartidas',
                onClick: () => safeNavigate('/admin/shared-rubrics', 'Rúbricas Compartidas'),
              },
              {
                key: 'grades',
                icon: <EditOutlined />,
                label: 'Panel de Calificaciones',
                onClick: () => safeNavigate('/admin/grades', 'Panel de Calificaciones'),
              },
              {
                key: 'evaluation-periods',
                icon: <ClockCircleOutlined />,
                label: 'Periodos de Evaluación',
                onClick: () => safeNavigate('/admin/evaluation-periods', 'Periodos de Evaluación'),
              },
              {
                key: 'criterion-assessment',
                icon: <CheckSquareOutlined />,
                label: 'Evaluación por Criterios',
                onClick: () => safeNavigate('/admin/criterion-assessment', 'Evaluación por Criterios'),
              },
              {
                key: 'criterion-knowledge',
                icon: <ReadOutlined />,
                label: 'Criterios ↔ Saberes',
                onClick: () => safeNavigate('/admin/criterion-knowledge', 'Criterios ↔ Saberes'),
              },
              {
                key: 'curriculum-generation',
                icon: <RobotOutlined />,
                label: 'Generar currículo (IA)',
                onClick: () => safeNavigate('/admin/curriculum-generation', 'Generar currículo (IA)'),
              },
            ],
          },
          {
            key: 'communications',
            icon: <MessageOutlined />,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Comunicaciones</span>
                <span
                  className="transition-all duration-300 ease-in-out overflow-hidden"
                  style={{ 
                    backgroundColor: safeUnreadCount > 0 ? '#ff4d4f' : 'transparent',
                    color: 'white',
                    fontSize: '11px',
                    height: '18px',
                    minWidth: safeUnreadCount > 0 ? '18px' : '0px',
                    lineHeight: '18px',
                    borderRadius: '9px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: safeUnreadCount > 0 ? '0 6px' : '0',
                    maxWidth: (!collapsed && safeUnreadCount > 0) ? '50px' : '0px',
                    opacity: (!collapsed && safeUnreadCount > 0) ? '1' : '0'
                  }}
                >
                  {safeUnreadCount > 0 && safeUnreadCount}
                </span>
              </div>
            ),
            children: [
              {
                key: 'messages',
                icon: <MessageOutlined />,
                label: 'Mensajes',
                onClick: () => safeNavigate('/admin/messages', 'Mensajes'),
              },
              {
                key: 'group-chats',
                icon: <TeamOutlined />,
                label: unreadGroupCount > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    Grupos de Chat
                    <Badge count={unreadGroupCount} size="small" style={{ backgroundColor: '#722ed1' }} />
                  </span>
                ) : 'Grupos de Chat',
                onClick: () => safeNavigate('/admin/group-chats', 'Grupos de Chat'),
              },
              {
                key: 'notifications',
                icon: <InboxOutlined />,
                label: 'Notificaciones',
                onClick: () => safeNavigate('/admin/notifications', 'Notificaciones'),
              },
              {
                key: 'email-notifications',
                icon: <MailOutlined />,
                label: 'Sistema de Email',
                onClick: () => safeNavigate('/admin/email-notifications', 'Sistema de Email'),
              },
              {
                key: 'email-automation',
                icon: <RobotOutlined />,
                label: 'Automatización',
                onClick: () => safeNavigate('/admin/email-automation', 'Automatización'),
              },
              {
                key: 'communication-config',
                icon: <SettingOutlined />,
                label: 'Configuración Comunicaciones',
                onClick: () => safeNavigate('/admin/communication-config', 'Configuración Comunicaciones'),
              },
              {
                key: 'system-announcements',
                icon: <MonitorOutlined />,
                label: 'Anuncios del Sistema',
                onClick: () => safeNavigate('/admin/system-announcements', 'Anuncios del Sistema'),
              },
            ],
          },
          {
            key: 'system-config',
            icon: <SettingOutlined />,
            label: 'Configuración del Sistema',
            children: [
              {
                key: 'settings',
                icon: <SettingOutlined />,
                label: 'Configuración General',
                onClick: () => safeNavigate('/admin/settings', 'Configuración'),
              },
              {
                key: 'backup-management',
                icon: <DatabaseOutlined />,
                label: 'Gestión de Backups',
                onClick: () => safeNavigate('/admin/backup-management', 'Gestión de Backups'),
              },
              {
                key: 'reports',
                icon: <BarChartOutlined />,
                label: 'Informes',
                onClick: () => safeNavigate('/admin/reports', 'Informes'),
              },
              {
                key: 'facial-recognition',
                label: 'Reconocimiento Facial',
                icon: <CameraOutlined />,
                onClick: () => safeNavigate('/admin/facial-recognition', 'Reconocimiento Facial'),
              },
            ],
          },
          {
            key: 'expediente-admin',
            icon: <FileTextOutlined />,
            label: 'Expediente',
            onClick: () => safeNavigate('/admin/expediente', 'Expediente'),
          },
          {
            key: 'tutoring-management',
            icon: <TeamOutlined />,
            label: 'Gestión de Tutorías',
            onClick: () => safeNavigate('/admin/tutoring', 'Gestión de Tutorías'),
          },
          {
            key: 'teacher-access-management',
            icon: <SafetyOutlined />,
            label: 'Accesos de Profesores',
            onClick: () => safeNavigate('/admin/teacher-access', 'Gestión de Accesos'),
          },
          {
            key: 'report-access-management',
            icon: <FileTextOutlined />,
            label: 'Permisos de Informes',
            onClick: () => safeNavigate('/admin/report-access', 'Permisos de Informes'),
          },
          {
            key: 'dua-system',
            icon: <UserOutlined />,
            label: 'Accesibilidad (DUA)',
            children: [
              {
                key: 'dua-dashboard',
                icon: <DashboardOutlined />,
                label: 'Dashboard DUA',
                onClick: () => safeNavigate('/admin/dua', 'Dashboard DUA'),
              },
              {
                key: 'dua-accommodations',
                icon: <HeartOutlined />,
                label: 'Acomodaciones',
                onClick: () => safeNavigate('/admin/dua/accommodations', 'Acomodaciones DUA'),
              },
              {
                key: 'dua-adaptations',
                icon: <ToolOutlined />,
                label: 'Adaptaciones curriculares',
                onClick: () => safeNavigate('/admin/dua/adaptations', 'Adaptaciones curriculares'),
              },
            ],
          },
          {
            key: 'resources',
            icon: <FolderOutlined />,
            label: 'Recursos',
            children: [
              {
                key: 'educational-resources',
                icon: <FolderOutlined />,
                label: 'Recursos Educativos',
                onClick: createNavigation('/admin/educational-resources', 'Recursos Educativos'),
              },
              createBlogMenuItem('blog', 'Blog del Centro', '/blog'),
              {
                key: 'blog-management',
                icon: <EditOutlined />,
                label: 'Gestión de Blog',
                onClick: () => safeNavigate('/admin/blog-management', 'Gestión de Blog'),
              },
              {
                key: 'blog-permissions',
                icon: <SafetyOutlined />,
                label: 'Permisos de Blog',
                onClick: () => safeNavigate('/admin/blog-permissions', 'Permisos de Blog'),
              },
              {
                key: 'student-notes',
                icon: <FileTextOutlined />,
                label: 'Apuntes de Estudiantes',
                onClick: createNavigation('/admin/student-notes', 'Administrar Apuntes'),
              },
              {
                key: 'meetings',
                icon: <CalendarOutlined />,
                label: 'Gestión de Reuniones',
                onClick: () => safeNavigate('/admin/meetings', 'Gestión de Reuniones'),
              },
            ],
          },
          {
            key: 'staff',
            icon: <TeamOutlined />,
            label: createStaffSubmenuLabel(),
            children: [
              {
                key: 'staff-dashboard',
                icon: <DashboardOutlined />,
                label: 'Dashboard Claustro',
                onClick: () => safeNavigate('/admin/staff', 'Dashboard Claustro'),
              },
              createStaffTaskMenuItem('staff-tasks', 'Tareas del Claustro', '/admin/staff/tasks'),
              {
                key: 'staff-meetings',
                icon: <CalendarOutlined />,
                label: 'Reuniones del Claustro',
                onClick: () => safeNavigate('/admin/staff/meetings', 'Reuniones del Claustro'),
              },
            ],
          },
          {
            key: 'attendance-analytics',
            icon: <BarChartOutlined />,
            label: 'Análisis de Asistencia',
            onClick: () => safeNavigate('/admin/attendance-analytics', 'Análisis de Asistencia'),
          },
        ])

      case UserRole.TEACHER:
        // Apply module filtering for TEACHER role
        return filterMenuByModules([
          ...baseItems,
          {
            key: 'planning-teaching',
            icon: <BookOutlined />,
            label: 'Docencia',
            children: [
              {
                key: 'classes',
                icon: <ScheduleOutlined />,
                label: 'Mis Clases y Horario',
                onClick: () => safeNavigate('/teacher/classes', 'Mis Clases y Horario'),
              },
              {
                key: 'calendar',
                icon: <CalendarOutlined />,
                label: 'Calendario Académico',
                onClick: () => safeNavigate('/teacher/calendar', 'Calendario Académico'),
              },
              {
                key: 'lessons',
                icon: <ReadOutlined />,
                label: 'Recursos y Lecciones',
                onClick: () => safeNavigate('/teacher/lessons', 'Recursos y Lecciones'),
              },
            ],
          },
          {
            key: 'cuaderno-hub',
            icon: <FormOutlined />,
            label: '📓 Cuaderno',
            children: [
              {
                key: 'gradebook',
                icon: <EditOutlined />,
                label: 'Notas y Evaluación',
                onClick: () => safeNavigate('/teacher/cuaderno', 'Cuaderno del Profesor'),
              },
              createAttendanceMenuItem('attendance', 'Control de Asistencia', '/teacher/attendance'),
              ...(hasAcademia ? [{
                key: 'academia-tareas',
                icon: <ClockCircleOutlined />,
                label: 'Tareas de tarde',
                onClick: () => safeNavigate('/teacher/academia/tareas', 'Tareas (Tarde)'),
              }] : []),
              {
                key: 't-criterion-assessment',
                icon: <SolutionOutlined />,
                label: 'Evaluación por Criterios',
                onClick: () => safeNavigate('/teacher/criterion-assessment', 'Evaluación por Criterios'),
              },
              {
                key: 't-shared-rubrics',
                icon: <TableOutlined />,
                label: 'Rúbricas Compartidas',
                onClick: () => safeNavigate('/teacher/shared-rubrics', 'Rúbricas Compartidas'),
              },
            ],
          },
          {
            key: 'students-evaluation',
            icon: <TeamOutlined />,
            label: 'Estudiantes',
            children: [
              {
                key: 'students',
                icon: <UserOutlined />,
                label: 'Mis Estudiantes',
                onClick: () => safeNavigate('/teacher/students', 'Mis Estudiantes'),
              },
              {
                key: 't-subject-students',
                icon: <SolutionOutlined />,
                label: 'Alumnos por Asignatura',
                onClick: () => safeNavigate('/teacher/subject-students', 'Alumnos por Asignatura'),
              },
              {
                key: 'classroom-management',
                icon: <ApartmentOutlined />,
                label: 'Gestión de Aula',
                children: [
                  { key: 'daily-homework', icon: <FormOutlined />, label: 'Deberes', onClick: () => safeNavigate('/teacher/daily-homework', 'Deberes') },
                  { key: 't-assignments', icon: <ShareAltOutlined />, label: 'Reparto de Recursos', onClick: () => safeNavigate('/teacher/assignments', 'Reparto de Recursos') },
                  { key: 't-todo', icon: <InboxOutlined />, label: 'Bandeja de Corrección', onClick: () => safeNavigate('/teacher/todo', 'Bandeja de Corrección') },
                ]
              },
              {
                key: 'dua-support',
                icon: <HeartOutlined />,
                label: 'Apoyo Educativo (DUA)',
                onClick: () => safeNavigate('/teacher/dua', 'Apoyo Educativo (DUA)'),
              },
            ],
          },
          {
            key: 'communication-reports',
            icon: <MessageOutlined />,
            label: 'Comunicación e Informes',
            children: [
              createMessageMenuItem('messages', 'Mensajería', '/teacher/messages'),
              {
                key: 'group-chats',
                icon: <TeamOutlined />,
                label: unreadGroupCount > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    Grupos de Chat
                    <Badge count={unreadGroupCount} size="small" style={{ backgroundColor: '#722ed1' }} />
                  </span>
                ) : 'Grupos de Chat',
                onClick: () => safeNavigate('/teacher/group-chats', 'Grupos de Chat'),
              },
              createMeetingMenuItem('meetings', 'Reuniones con Familias', '/teacher/meetings'),
              createBlogMenuItem('blog', 'Blog del Centro', '/blog'),
              {
                key: 'reports',
                icon: <BarChartOutlined />,
                label: 'Informes',
                onClick: () => safeNavigate('/teacher/report-requests', 'Informes'),
              },
              {
                key: 'auto-report',
                icon: <RobotOutlined />,
                label: 'Informe automático',
                onClick: () => safeNavigate('/teacher/auto-report', 'Informe automático'),
              },
              {
                key: 't-tutor-reports',
                icon: <SolutionOutlined />,
                label: 'Panel de Informes del Tutor',
                onClick: () => safeNavigate('/teacher/tutor-reports', 'Panel de Informes del Tutor'),
              },
            ],
          },
          {
            key: 'resources-section',
            icon: <FolderOutlined />,
            label: 'Recursos',
            children: [
              {
                key: 'educational-resources',
                icon: <FolderOutlined />,
                label: 'Recursos Educativos',
                onClick: () => safeNavigate('/teacher/educational-resources', 'Recursos Educativos'),
              },
              {
                key: 't-shared-notes',
                icon: <FileTextOutlined />,
                label: 'Apuntes Compartidos',
                onClick: () => safeNavigate('/teacher/shared-notes', 'Apuntes Compartidos'),
              },
            ],
          },
          {
            key: 'staff-section',
            icon: <TeamOutlined />,
            label: createStaffSubmenuLabel(),
            children: [
              createStaffTaskMenuItem('staff-tasks', 'Tareas del Claustro', '/teacher/staff/tasks'),
              {
                key: 'staff-meetings',
                icon: <CalendarOutlined />,
                label: 'Reuniones del Claustro',
                onClick: () => safeNavigate('/teacher/staff/meetings', 'Reuniones del Claustro'),
              },
              {
                key: 'coordination',
                icon: <ShareAltOutlined />,
                label: 'Hojas de Coordinación',
                onClick: () => safeNavigate('/teacher/coordination', 'Hojas de Coordinación'),
              },
            ],
          },
        ])

      case UserRole.STUDENT:
        // Apply module filtering for STUDENT role
        const studentMenuItems = [
          ...baseItems,
          {
            key: 'tasks',
            icon: <ProjectOutlined />,
            label: 'Mis Tareas',
            onClick: () => safeNavigate('/student/tasks', 'Mis Tareas'),
          },
          {
            key: 'grades',
            icon: <FileTextOutlined />,
            label: 'Mis Calificaciones',
            onClick: () => safeNavigate('/student/grades', 'Mis Calificaciones'),
          },
          {
            key: 'expediente',
            icon: <FileTextOutlined />,
            label: 'Mi Expediente',
            onClick: () => safeNavigate('/student/expediente', 'Mi Expediente'),
          },
          {
            key: 'test-yourself',
            icon: <RobotOutlined />,
            label: 'Mis Test Yourself',
            onClick: () => safeNavigate('/student/test-yourself', 'Mis Test Yourself'),
          },
          {
            key: 'competencies',
            icon: <BarChartOutlined />,
            label: 'Competencias',
            onClick: () => safeNavigate('/student/competencies', 'Competencias'),
          },
          {
            key: 'schedule',
            icon: <BookOutlined />,
            label: 'Horario',
            onClick: () => safeNavigate('/student/schedule', 'Horario'),
          },
          {
            key: 'calendar',
            icon: <CalendarOutlined />,
            label: 'Calendario',
            onClick: () => safeNavigate('/student/calendar', 'Calendario'),
          },
          {
            key: 'educational-resources',
            icon: <FolderOutlined />,
            label: 'Recursos Educativos',
            onClick: () => safeNavigate('/student/educational-resources', 'Recursos Educativos'),
          },
          {
            ...createBlogMenuItem('blog', 'Blog del Centro', '/blog'),
            icon: <FileTextOutlined />,
          },
          {
            key: 'mis-apuntes',
            icon: <EditOutlined />,
            label: 'Mis Apuntes',
            onClick: () => safeNavigate('/student/mis-apuntes', 'Mis Apuntes'),
          },
          {
            key: 'apuntes-compartidos',
            icon: <ShareAltOutlined />,
            label: 'Apuntes Compartidos',
            onClick: () => safeNavigate('/student/apuntes-compartidos', 'Apuntes Compartidos'),
          },
          createMessageMenuItem('messages', 'Mensajes', '/student/messages'),
          {
            key: 'group-chats',
            icon: <TeamOutlined />,
            label: unreadGroupCount > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                Grupos de Chat
                <Badge count={unreadGroupCount} size="small" style={{ backgroundColor: '#722ed1' }} />
              </span>
            ) : 'Grupos de Chat',
            onClick: () => safeNavigate('/student/group-chats', 'Grupos de Chat'),
          },
        ];

        const filteredStudentMenuItems = filterMenuByModules(studentMenuItems);
        
        return filteredStudentMenuItems;

      case UserRole.FAMILY:
        // Apply module filtering for FAMILY role
        return filterMenuByModules([
          ...baseItems,
          {
            key: 'children',
            icon: <TeamOutlined />,
            label: 'Mis Hijos',
            onClick: () => safeNavigate('/family/my-children', 'Mis Hijos'),
          },
          {
            key: 'grades',
            icon: <FileTextOutlined />,
            label: 'Calificaciones',
            onClick: () => safeNavigate('/family/grades', 'Calificaciones'),
          },
          {
            key: 'expediente',
            icon: <FileTextOutlined />,
            label: 'Expediente',
            onClick: () => safeNavigate('/family/expediente', 'Expediente'),
          },
          {
            key: 'attendance',
            icon: <CalendarOutlined />,
            label: 'Asistencia',
            onClick: () => safeNavigate('/family/attendance', 'Asistencia'),
          },
          {
            key: 'daily-homework',
            icon: <CalendarOutlined />,
            label: 'Seguimiento Diario',
            onClick: () => safeNavigate('/family/daily-homework', 'Seguimiento Diario'),
          },
          {
            key: 'activities',
            icon: <BookOutlined />,
            label: 'Actividades (Evaluación)',
            onClick: () => safeNavigate('/family/activities', 'Actividades'),
          },
          {
            key: 'tasks',
            icon: <ProjectOutlined />,
            label: safeFamilyTasksCount > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Tareas/Deberes</span>
                <Badge
                  count={safeFamilyTasksCount}
                  size="small"
                  style={{ backgroundColor: '#fa8c16', boxShadow: '0 0 0 1px #fff', flexShrink: 0 }}
                />
              </span>
            ) : 'Tareas/Deberes',
            onClick: () => safeNavigate('/family/tasks', 'Tareas/Deberes'),
          },
          {
            key: 'student-notes',
            icon: <EditOutlined />,
            label: 'Apuntes de mis Hijos',
            onClick: () => safeNavigate('/family/student-notes', 'Apuntes de mis Hijos'),
          },
          {
            ...createBlogMenuItem('blog', 'Blog del Centro', '/blog'),
            icon: <FileTextOutlined />,
          },
          {
            key: 'calendar',
            icon: <CalendarOutlined />,
            label: 'Calendario',
            onClick: () => safeNavigate('/family/calendar', 'Calendario'),
          },
          createMessageMenuItem('messages', 'Mensajes', '/family/messages'),
          {
            key: 'group-chats',
            icon: <TeamOutlined />,
            label: unreadGroupCount > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                Grupos de Chat
                <Badge count={unreadGroupCount} size="small" style={{ backgroundColor: '#722ed1' }} />
              </span>
            ) : 'Grupos de Chat',
            onClick: () => safeNavigate('/family/group-chats', 'Grupos de Chat'),
          },
          {
            key: 'meetings',
            icon: <CalendarOutlined />,
            label: 'Reuniones con Profesores',
            onClick: () => safeNavigate('/family/meetings', 'Reuniones con Profesores'),
          },
        ])

      default:
        return baseItems
    }
  }

  // Helper to get role-specific paths
  const getRoleBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin'
      case UserRole.TEACHER:
        return '/teacher'
      case UserRole.STUDENT:
        return '/student'
      case UserRole.FAMILY:
        return '/family'
      default:
        return ''
    }
  }

  // User dropdown menu
  const userMenuItems = [
    // Only show profile for non-student roles
    ...(user?.role !== UserRole.STUDENT ? [{
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Mi Perfil',
      onClick: () => safeNavigate(`${getRoleBasePath()}/profile`, 'Mi Perfil'),
    }] : []),
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Configuración',
      onClick: () => safeNavigate(`${getRoleBasePath()}/settings`, 'Configuración'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesión',
      onClick: logout,
    },
  ]

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrador'
      case UserRole.TEACHER:
        return 'Profesor'
      case UserRole.STUDENT:
        return 'Estudiante'
      case UserRole.FAMILY:
        return 'Familia'
      default:
        return role
    }
  }

  // Toggle sidebar/mobile menu
  const toggleMenu = () => {
    if (isMobile) {
      setMobileMenuVisible(!mobileMenuVisible)
    } else {
      setCollapsed(!collapsed)
    }
  }

  // Mobile bottom navigation items per role
  const getMobileNavItems = () => {
    const path = location.pathname
    switch (user?.role) {
      case UserRole.STUDENT:
        return [
          { key: '/student', icon: <HomeOutlined />, label: 'Inicio', active: path === '/student' },
          { key: '/student/tasks', icon: <FormOutlined />, label: 'Tareas', active: path.startsWith('/student/tasks'), badge: 0 },
          { key: '/student/grades', icon: <BarChartOutlined />, label: 'Notas', active: path.startsWith('/student/grades') },
          { key: '/student/messages', icon: <MessageOutlined />, label: 'Mensajes', active: path.startsWith('/student/messages'), badge: safeUnreadCount },
          { key: '/student/calendar', icon: <CalendarOutlined />, label: 'Calendario', active: path.startsWith('/student/calendar') },
        ]
      case UserRole.FAMILY:
        return [
          { key: '/family', icon: <HomeOutlined />, label: 'Inicio', active: path === '/family' },
          { key: '/family/attendance', icon: <SolutionOutlined />, label: 'Asistencia', active: path.startsWith('/family/attendance') },
          { key: '/family/messages', icon: <MessageOutlined />, label: 'Mensajes', active: path.startsWith('/family/messages'), badge: safeUnreadCount },
        ]
      case UserRole.TEACHER:
        return [
          { key: '/teacher', icon: <HomeOutlined />, label: 'Inicio', active: path === '/teacher' },
          { key: '/teacher/attendance', icon: <AuditOutlined />, label: 'Asistencia', active: path.startsWith('/teacher/attendance'), badge: safePendingCount },
          { key: '/teacher/messages', icon: <MessageOutlined />, label: 'Mensajes', active: path.startsWith('/teacher/messages'), badge: safeUnreadCount },
        ]
      default:
        return []
    }
  }

  const mobileNavItems = getMobileNavItems()
  const showMobileBottomNav = isMobile && mobileNavItems.length > 0

  // Handle auto-logout warning actions
  const handleExtendSession = () => {
    setShowLogoutWarning(false)
    restartIdleTimer()
    updateActivity()
  }

  const handleLogoutNow = () => {
    setShowLogoutWarning(false)
    logout('manual')
  }

  // Sidebar content component
  const SidebarContent = () => (
    <>
      <div className={`${isMobile ? 'p-3 border-b border-gray-200' : 'p-4 border-b border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <img
              src="/logo.svg"
              alt="Mundo World School"
              className="w-full h-full object-contain"
              style={{ transition: 'none' }}
            />
          </div>
          <div 
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ 
              width: (!collapsed || isMobile) ? 'auto' : '0px',
              opacity: (!collapsed || isMobile) ? '1' : '0'
            }}
          >
            <div className="whitespace-nowrap">
              <Text strong className={`${isMobile ? 'text-sm' : 'text-base'}`}>Mundo World School</Text>
              <div className="text-xs text-gray-500">
                {getRoleLabel(user?.role!)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Menu — estilo visual de Secretaría (submenús más claros) */}
      <div className="flex-1 overflow-y-auto">
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                itemBg: 'transparent',
                itemSelectedBg: '#EEF5FA',
                itemHoverBg: '#F2EEE9',
                itemSelectedColor: '#2C5F8A',
                itemColor: '#6B6B7B',
                itemHoverColor: '#1E1E30',
                itemHeight: 38,
                itemMarginInline: 8,
                itemPaddingInline: 12,
                groupTitleColor: '#9B9BAB',
                groupTitleFontSize: 10.5,
                fontSize: 13,
                subMenuItemBg: 'transparent',
                iconSize: 15,
              },
            },
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            style={{ border: 'none', height: '100%' }}
            items={filterMenuByClosure(getMenuItems())}
          />
        </ConfigProvider>
      </div>

      {/* User Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {/* FIXED: Use div with flex instead of Space to avoid React.Children.only errors */}
          <div className="flex items-center gap-3">
            {/* User info with simple styling to avoid Dropdown React.Children.only error */}
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-gray-100 cursor-pointer"
                 onClick={() => user?.role === UserRole.STUDENT
                   ? safeNavigate(`${getRoleBasePath()}/settings`, 'Configuración')
                   : safeNavigate(`${getRoleBasePath()}/profile`, 'Mi Perfil')
                 }>
              {hasPhoto ? (
                <img
                  src={photoUrl!}
                  alt="Foto de perfil"
                  style={{
                    width: isMobile ? '24px' : '32px',
                    height: isMobile ? '24px' : '32px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    // Fallback en caso de error al cargar la imagen
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling!.style.display = 'flex';
                  }}
                />
              ) : null}
              <div style={{
                width: isMobile ? '24px' : '32px',
                height: isMobile ? '24px' : '32px',
                borderRadius: '50%',
                backgroundColor: '#1890ff',
                display: hasPhoto ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px'
              }}>
                👤
              </div>
              <div 
                className="flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
                style={{ 
                  width: !collapsed ? 'auto' : '0px',
                  opacity: !collapsed ? '1' : '0'
                }}
              >
                <div className="whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user?.profile?.firstName} {user?.profile?.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getRoleLabel(user?.role!)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Logout Button */}
        <div className="mt-3">
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={logout}
            className="w-full flex items-center justify-start text-red-600 hover:bg-red-50 overflow-hidden"
          >
            <span 
              className="transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap"
              style={{ 
                maxWidth: !collapsed ? '200px' : '0px',
                opacity: !collapsed ? '1' : '0',
                marginLeft: !collapsed ? '8px' : '0px'
              }}
            >
              Cerrar Sesión
            </span>
          </Button>
        </div>
      </div>
    </>
  )


  return (
    <>
      {/* Banner de impersonación - aparece cuando un admin está viendo otro panel */}
      <ImpersonationBanner />

      {/* Debug detectors */}
      <ObjectDetector data={unreadCount} context="DashboardLayout-unreadCount" />
      <ObjectDetector data={pendingCount} context="DashboardLayout-pendingCount" />

      <Layout style={{ minHeight: '100vh', marginTop: isImpersonating ? 40 : 0 }}>
        {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="light"
          width={280}
          collapsedWidth={80}
          breakpoint="lg"
          style={{
            overflow: 'auto',
            height: isImpersonating ? 'calc(100vh - 40px)' : '100vh',
            position: 'fixed',
            left: 0,
            top: isImpersonating ? 40 : 0,
            bottom: 0,
            zIndex: 100,
            transition: 'width 0.2s ease-in-out, top 0.2s ease-in-out',
            willChange: 'width'
          }}
        >
          <SidebarContent />
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          onClose={() => setMobileMenuVisible(false)}
          open={mobileMenuVisible}
          closable={false}
          width={280}
          styles={{ body: { padding: 0 }, header: { display: 'none' } }}
          style={{ zIndex: 1000 }}
        >
          <SidebarContent />
        </Drawer>
      )}

      <Layout style={{ 
        marginLeft: isMobile ? 0 : collapsed ? 80 : 280,
        transition: 'margin-left 0.2s ease-in-out',
        willChange: 'margin-left'
      }}>
        <Header className={`bg-white shadow-sm ${isMobile ? 'px-3' : 'px-4'} flex items-center justify-between`}
          style={{ borderBottom: '1px solid var(--mw-border-light)', boxShadow: 'none' }}
        >
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={toggleMenu}
              className="flex items-center justify-center"
              style={{ width: 36, height: 36 }}
            />
            {/* Section title in header (mobile only) */}
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/logo.svg" alt="MW" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--mw-text)', letterSpacing: '-0.01em' }}>
                  Mundo World
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isMobile ? (
              <>
                <ActivityCenter size="default" />
              </>
            ) : (
              <>
                <ActivityCenter size="default" />
              </>
            )}
            
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  // Only show profile for non-student roles
                  ...(user?.role !== UserRole.STUDENT ? [{
                    key: 'profile',
                    icon: <UserOutlined />,
                    label: 'Mi Perfil',
                    onClick: () => safeNavigate(`${getRoleBasePath()}/profile`, 'Mi Perfil'),
                  }] : []),
                  {
                    key: 'settings',
                    icon: <SettingOutlined />,
                    label: 'Configuración',
                    onClick: () => safeNavigate(`${getRoleBasePath()}/settings`, 'Configuración'),
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: 'Cerrar Sesión',
                    onClick: logout,
                    danger: true,
                  },
                ],
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                {hasPhoto ? (
                  <img
                    src={photoUrl!}
                    alt="Foto de perfil"
                    style={{
                      width: isMobile ? 24 : 32,
                      height: isMobile ? 24 : 32,
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      // Fallback en caso de error al cargar la imagen
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling!.style.display = 'inline-flex';
                    }}
                  />
                ) : null}
                <Avatar
                  size={isMobile ? 24 : 32}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: '#1890ff',
                    display: hasPhoto ? 'none' : 'inline-flex'
                  }}
                />
                {!isMobile && (
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.profile?.firstName && user?.profile?.lastName 
                        ? `${user.profile.firstName} ${user.profile.lastName}`
                        : user?.profile?.fullName || user?.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getRoleLabel(user?.role!)}
                    </div>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Anuncios del sistema - Mensajes de administración */}
        <SystemBanner />

        {/* Banner de cumpleaños - Sistema de Cumpleaños MW Panel 2.0 */}
        <BirthdayBanner />

        <Content
          className={`${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-6'} bg-gray-50`}
          style={{ paddingBottom: showMobileBottomNav ? 'calc(60px + env(safe-area-inset-bottom, 0px))' : undefined }}
        >
          <div className="fade-in">
            {/* Dynamic greetings now handled by individual dashboard components */}
            {closureActive && (
              <AntAlert
                type="warning"
                showIcon
                banner
                style={{ marginBottom: 12 }}
                message="Plataforma en cierre de curso"
                description={closure.message || 'Algunas secciones están temporalmente no disponibles.'}
              />
            )}
            {closureActive && isPathClosed(location.pathname, closure.allowedSections) ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <AntAlert
                  type="info"
                  showIcon
                  message="Sección no disponible durante el cierre de curso"
                  description={closure.message || 'Esta sección está cerrada temporalmente. Usa el menú para acceder a las secciones disponibles.'}
                />
              </div>
            ) : (
              children
            )}
          </div>
        </Content>
      </Layout>

      {/* Mobile Panel for Messages and Notifications */}
      <HeaderMobilePanel
        visible={mobilePanelVisible}
        onClose={() => setMobilePanelVisible(false)}
        initialTab={activeMobileTab}
      />

      {/* Mobile Bottom Navigation Bar */}
      {showMobileBottomNav && (
        <nav className="mw-mobile-bottom-nav">
          {mobileNavItems.map((item) => (
            <div
              key={item.key}
              className={`mw-mobile-bottom-nav__item${item.active ? ' active' : ''}`}
              onClick={() => safeNavigate(item.key)}
            >
              {(item.badge !== undefined && item.badge > 0) && (
                <span className="mw-mobile-bottom-nav__badge">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              <span className="mw-mobile-bottom-nav__icon">{item.icon}</span>
              <span className="mw-mobile-bottom-nav__label">{item.label}</span>
            </div>
          ))}
        </nav>
      )}

    </Layout>

    {/* Auto-logout warning modal */}
    <AutoLogoutWarning
      visible={showLogoutWarning}
      remainingTime={remainingTime}
      warningDuration={warningTimeMs}
      onExtendSession={handleExtendSession}
      onLogoutNow={handleLogoutNow}
    />
    </>
  )
}

export default DashboardLayout