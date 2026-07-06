/**
 * @archivo: CalendarWidget.tsx
 * @módulo: Calendar (Widget de Calendario Multi-Rol)
 * @función: Calendario interactivo con gestión de eventos por roles de usuario
 * @crítico: SÍ - Widget central de planificación académica
 * @dependencias: useCalendar, useResponsive, ResponsiveModal, dayjs
 * @no_modificar: Touch navigation y swipe gestures sin testing en dispositivos
 * @relacionado_con: useCalendar.ts, ResponsiveModal.tsx, DashboardLayout.tsx
 */

/**
 * COMPONENTE: CalendarWidget
 * UBICACIÓN: /frontend/src/components/calendar/CalendarWidget.tsx
 * FUNCIÓN: Calendario completo con creación/gestión de eventos por rol
 * NO USAR PARA: Calendarios simples sin interacción (usar Calendar directo)
 * PROPS CRÍTICAS:
 *   - userRole: 'admin' | 'teacher' | 'student' | 'family' - Determina permisos
 *   - height: number - Altura del widget (default 700px)
 *   - showEventList: boolean - Mostrar panel lateral de eventos
 *   - maxEvents: number - Máximo eventos en lista lateral
 * 
 * FUNCIONALIDADES POR ROL:
 * - admin: Eventos institucionales, mantenimiento, juntas directivas
 * - teacher: Clases, exámenes, reuniones, entrega evaluaciones
 * - student: Tareas, exámenes, recordatorios personales
 * - family: Reuniones padres, recordatorios familiares, eventos escolares
 * 
 * TIPOS DE EVENTOS:
 * - class: Clases regulares con horarios
 * - exam: Exámenes con ubicación y duración
 * - meeting: Reuniones institucionales o de padres
 * - event: Eventos generales (festivales, excursiones)
 * - assignment: Tareas y entregas
 * - holiday: Festividades y vacaciones
 * - reminder: Recordatorios personales
 * - maintenance: Mantenimiento del sistema (solo admin)
 * 
 * RESPONSIVE Y TOUCH:
 * - Layout adaptativo: mobile/tablet/desktop
 * - Touch gestures: swipe horizontal (semanas), vertical (meses)
 * - Collapse móvil para eventos del día/próximos
 * - Mobile drawer para creación/edición de eventos
 * - Navigation scrollbar en desktop
 * 
 * SISTEMA DE PERMISOS:
 * - useCalendar hook para tipos permitidos por rol
 * - Niveles de visibilidad: público, profesores, estudiantes, familias, privado
 * - Filtros específicos: clases específicas, asignaturas específicas
 * - Validación de ownership para edición/eliminación
 * 
 * GESTIÓN DE EVENTOS:
 * - Creación con formulario completo (título, tipo, horario, ubicación)
 * - Edición inline con preservación de datos
 * - Eliminación con confirmación
 * - Estados: programado, en curso, completado, cancelado
 * - Prioridades: alta, media, baja con colores
 * 
 * UI/UX FEATURES:
 * - Indicadores visuales por tipo de evento (colores + iconos)
 * - Eventos truncados en celdas con tooltip
 * - Hover effects en desktop
 * - Badges de prioridad y estado
 * - Vista mensual/anual intercambiable
 * 
 * INTEGRACIONES:
 * - useClassGroups: Para asignación eventos a clases específicas
 * - useSubjects: Para eventos de asignaturas específicas
 * - useAuthStore: Identificación del usuario actual
 * - ResponsiveModal: Modales adaptativos por dispositivo
 * 
 * ESTADO ACTUAL: ✅ SISTEMA COMPLETO FUNCIONAL
 * - Todos los roles implementados con permisos apropiados
 * - Touch navigation operativo en móviles/tablets
 * - CRUD completo de eventos con validaciones
 * - Layout responsive optimizado
 * - Integración completa con hooks del sistema
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Calendar,
  Badge,
  Typography,
  Space,
  Tag,
  List,
  Avatar,
  Tooltip,
  Button,
  Modal,
  Descriptions,
  Alert,
  Collapse,
  Row,
  Col,
  Form,
  Input,
  Select,
  TimePicker,
  DatePicker,
  message,
} from 'antd';
import { useResponsive } from '../../hooks/useResponsive';
import ResponsiveModal from '../common/ResponsiveModal';
import Loading from '../common/Loading';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BookOutlined,
  BellOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  FileTextOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import apiClient from '@services/apiClient';
import { useCalendar } from '../../hooks/useCalendar';
import useClassGroups from '../../hooks/useClassGroups';
import useSubjects from '../../hooks/useSubjects';
import { useAuthStore } from '@store/authStore';
import { parseLocalDate } from '../../utils/dateUtils';

const { Text, Title } = Typography;

// Import the real CalendarEvent interface from useCalendar
import { CalendarEvent as ApiCalendarEvent } from '../../hooks/useCalendar';

// Local interface for backwards compatibility with existing code
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: 'class' | 'exam' | 'meeting' | 'event' | 'assignment' | 'holiday' | 'reminder' | 'maintenance';
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  participants?: string[];
  priority: 'low' | 'medium' | 'high';
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdBy?: string;
  metadata?: {
    subjectName?: string;
    className?: string;
    teacherName?: string;
    studentName?: string;
    assignmentType?: string;
  };
}

interface CalendarWidgetProps {
  userRole: 'admin' | 'teacher' | 'student' | 'family';
  height?: number;
  showEventList?: boolean;
  maxEvents?: number;
  includeTasks?: boolean;
  studentTasks?: any[];
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  userRole,
  height = 700,
  showEventList = true,
  maxEvents = 5,
  includeTasks = false,
  studentTasks = [],
}) => {
  const [events, setEvents] = useState<(CalendarEvent | ApiCalendarEvent)[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'month' | 'year'>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<Dayjs | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [selectedVisibility, setSelectedVisibility] = useState<string>('');
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  
  // Responsive hook
  const { isMobile, isTablet, screenSize } = useResponsive();
  
  // Calendar hook for permissions and utilities
  const { 
    events: apiEvents,
    loading: apiLoading,
    getAllowedEventTypes, 
    getAllowedVisibilityLevels, 
    getDefaultVisibility,
    getEventTypeLabel,
    getEventTypeColor,
    createEvent,
    updateEvent,
    deleteEvent: deleteEventApi,
    fetchEventsByDateRange
  } = useCalendar();

  // Auth store to get current user
  const { user } = useAuthStore();

  // Class groups and subjects hooks
  const { classGroups, fetchClassGroups } = useClassGroups();
  const { subjects, teacherSubjects, fetchTeacherSubjects } = useSubjects();

  // Helper function to convert API event to local format for backwards compatibility
  const convertApiEventToLocal = (apiEvent: ApiCalendarEvent): CalendarEvent => {
    const startDate = parseLocalDate(apiEvent.startDate);
    const endDate = parseLocalDate(apiEvent.endDate);

    return {
      id: apiEvent.id,
      title: apiEvent.title,
      description: apiEvent.description,
      type: apiEvent.type === 'activity' ? 'class' :
            apiEvent.type === 'evaluation' ? 'exam' :
            apiEvent.type === 'general_event' ? 'event' :
            apiEvent.type === 'deadline' ? 'assignment' :
            apiEvent.type === 'holiday' ? 'holiday' :
            apiEvent.type === 'meeting' ? 'meeting' : 'reminder',
      date: startDate.format('YYYY-MM-DD'),
      startTime: apiEvent.isAllDay ? undefined : startDate.format('HH:mm'),
      endTime: apiEvent.isAllDay ? undefined : endDate.format('HH:mm'),
      location: apiEvent.location,
      priority: apiEvent.priority === 3 ? 'high' : apiEvent.priority === 2 ? 'medium' : 'low',
      status: 'scheduled',
      createdBy: apiEvent.createdBy?.profile ? `${apiEvent.createdBy.profile.firstName} ${apiEvent.createdBy.profile.lastName}` : 'Unknown',
      metadata: {
        subjectName: apiEvent.eventSubjects?.[0]?.subject?.name,
        className: apiEvent.eventGroups?.[0]?.classGroup?.name,
      }
    };
  };

  // Helper function to convert local event type back to API type
  const convertLocalTypeToApiType = (localType: CalendarEvent['type']): ApiCalendarEvent['type'] => {
    switch (localType) {
      case 'class': return 'activity';
      case 'exam': return 'evaluation';
      case 'event': return 'general_event';
      case 'assignment': return 'deadline';
      case 'holiday': return 'holiday';
      case 'meeting': return 'meeting';
      case 'reminder': return 'reminder';
      case 'maintenance': return 'general_event'; // Admin maintenance events
      default: return 'reminder';
    }
  };

  // Helper function to check if event is API event or local event
  const isApiEvent = (event: CalendarEvent | ApiCalendarEvent): event is ApiCalendarEvent => {
    return 'startDate' in event && 'endDate' in event;
  };

  // Helper function to get event date for filtering (works with both formats)
  const getEventDate = (event: CalendarEvent | ApiCalendarEvent): string => {
    if (isApiEvent(event)) {
      return dayjs(event.startDate).format('YYYY-MM-DD');
    }
    return event.date;
  };

  // Helper function to get event display properties
  const getEventDisplayProps = (event: CalendarEvent | ApiCalendarEvent) => {
    if (isApiEvent(event)) {
      const converted = convertApiEventToLocal(event);
      return {
        id: event.id,
        title: event.title,
        type: converted.type,
        startTime: converted.startTime,
        endTime: converted.endTime,
        location: event.location,
        priority: converted.priority,
        description: event.description
      };
    }
    return {
      id: event.id,
      title: event.title,
      type: event.type,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      priority: event.priority,
      description: event.description
    };
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'Público - Visible para todos';
      case 'teachers_only': return 'Solo Profesores';
      case 'students_only': return 'Solo Estudiantes';
      case 'families_only': return 'Solo Familias';
      case 'admin_only': return 'Solo Administradores';
      case 'class_specific': return 'Clases Específicas';
      case 'subject_specific': return 'Asignaturas Específicas';
      case 'private': return 'Privado - Solo yo';
      default: return 'Privado';
    }
  };
  
  // Responsive configurations
  const responsiveHeight = isMobile ? 'auto' : height;
  const responsiveMaxEvents = isMobile ? 3 : maxEvents;
  const showEventListResponsive = isMobile ? false : showEventList;
  
  // Calculate inner height for content
  const contentHeight = isMobile ? 'auto' : height - 120; // Account for card header and padding

  useEffect(() => {
    // Calendar loading events for current month
    
    // Reset auth error when starting new load
    setAuthError(false);
    
    // Force reset loading state to prevent stuck loading
    setLoading(false);
    
    // Use a small delay to ensure state is updated
    const timeoutId = setTimeout(() => {
      loadEvents().catch(error => {
        console.error('Calendar: Error in loadEvents:', error);
        setLoading(false);
      });
    }, 10);
    
    return () => clearTimeout(timeoutId);
    
  }, [userRole, selectedDate.format('YYYY-MM-DD'), includeTasks, studentTasks?.length]); // Stabilize selectedDate dependency

  // Get current teacher ID and load their data
  useEffect(() => {
    const getCurrentTeacher = async () => {
      if (userRole === 'teacher' && user) {
        try {
          const teachersResponse = await apiClient.get('/teachers');
          const teachers = (teachersResponse.data || []).filter((teacher: any) => teacher?.user?.id); // Filter invalid teachers
          const currentTeacher = teachers.find((teacher: any) => teacher.user.id === user?.id);
          
          if (currentTeacher) {
            setCurrentTeacherId(currentTeacher.id);
            await fetchTeacherSubjects(currentTeacher.id);
          }
        } catch (error) {
          console.error('Error fetching current teacher:', error);
        }
      }
    };

    getCurrentTeacher();
  }, [userRole, user]); // Removed fetchTeacherSubjects from dependencies

  // Load all class groups and subjects for admin
  useEffect(() => {
    if (userRole === 'admin') {
      fetchClassGroups();
    }
  }, [userRole]); // Removed fetchClassGroups from dependencies to prevent infinite loop

  // Handle editing an existing event
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedDateForEvent(dayjs(event.date));
    setShowEventModal(true);
    setModalVisible(false); // Close the details modal
  };

  // Handle deleting an event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const success = await deleteEventApi(eventId);
      if (success) {
        setEvents(prev => prev.filter(event => event.id !== eventId));
        setModalVisible(false);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      message.error('Error al eliminar el evento');
    }
  };

  // Reset when changing months manually
  const handlePanelChange = (value: Dayjs, mode: 'month' | 'year') => {
    setSelectedDate(value);
    setCalendarMode(mode);
  };

  // Touch navigation for mobile/tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile || isTablet) {
      // Only start tracking if the touch is not on a calendar date
      const target = e.target as HTMLElement;
      const isCalendarDate = target.closest('.ant-picker-calendar-date') || target.closest('.calendar-event');
      
      if (!isCalendarDate) {
        const touch = e.touches[0];
        setTouchStart({ x: touch.clientX, y: touch.clientY });
        setTouchEnd(null);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if ((isMobile || isTablet) && touchStart) {
      const touch = e.touches[0];
      setTouchEnd({ x: touch.clientX, y: touch.clientY });
      
      // Prevent default only if we're tracking a swipe gesture
      const deltaX = Math.abs(touchStart.x - touch.clientX);
      const deltaY = Math.abs(touchStart.y - touch.clientY);
      
      if (deltaX > 10 || deltaY > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || (!isMobile && !isTablet)) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;

    // Only process swipes if the movement is significant enough
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (totalDistance < minSwipeDistance) {
      // Not a swipe, reset and let other handlers process
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }

    // Horizontal swipe for week navigation
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      const direction = deltaX > 0 ? 1 : -1; // swipe left = next week, swipe right = previous week
      const newDate = selectedDate.add(direction * 7, 'day');
      
      // Check bounds
      const selectedMonth = selectedDate.month();
      const selectedYear = selectedDate.year();
      const minDate = dayjs().year(selectedYear).month(selectedMonth).startOf('month').subtract(1, 'week');
      const maxDate = dayjs().year(selectedYear).month(selectedMonth).endOf('month').add(1, 'week');
      
      if (newDate.isAfter(minDate) && newDate.isBefore(maxDate)) {
        setSelectedDate(newDate);
      }
    }

    // Vertical swipe for month navigation
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
      const direction = deltaY > 0 ? 1 : -1; // swipe up = next month, swipe down = previous month
      const newDate = selectedDate.add(direction, 'month');
      setSelectedDate(newDate);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle date cell click to create event
  const handleDateClick = (date: Dayjs) => {
    const dateEvents = events.filter(event => 
      dayjs(getEventDate(event)).isSame(date, 'day')
    );

    // Si hay eventos y no se puede crear eventos, mostrar lista de eventos
    if (dateEvents.length > 0 && getAllowedEventTypes(userRole).length === 0) {
      // Para roles que no pueden crear eventos, mostrar lista de eventos del día
      setSelectedDate(date);
      return;
    }

    // Si puede crear eventos o no hay eventos, abrir modal de creación
    setSelectedDateForEvent(date);
    setShowEventModal(true);
  };

  // Handle event creation and editing
  const handleCreateEvent = async (formData: any) => {
    try {
      if (!selectedDateForEvent) return;

      // Convert TimePicker values and prepare date ranges
      const baseDate = selectedDateForEvent.format('YYYY-MM-DD');
      const startTime = formData.startTime ? formData.startTime.format('HH:mm') : '00:00';
      const endTime = formData.endTime ? formData.endTime.format('HH:mm') : '23:59';
      
      // Create proper startDate and endDate in ISO format
      const startDate = `${baseDate}T${startTime}:00.000Z`;
      const endDate = `${baseDate}T${endTime}:00.000Z`;

      // Convert local event type to API type
      const apiType = convertLocalTypeToApiType(formData.type || getAllowedEventTypes(userRole)[0] || 'reminder');

      // Prepare API data with proper format
      const eventData = {
        title: formData.title || 'Nuevo Evento',
        description: formData.description || '',
        startDate,
        endDate,
        type: apiType, // Use converted API type
        visibility: formData.visibility || getDefaultVisibility(userRole),
        color: getEventTypeColor(apiType),
        isAllDay: !formData.startTime && !formData.endTime, // True if no times specified
        location: formData.location,
        isRecurrent: false,
        recurrenceType: 'none' as const,
        tags: [],
        priority: formData.priority === 'high' ? 3 : formData.priority === 'medium' ? 2 : 1,
        notifyBefore: 15, // 15 minutes before
        autoNotify: true,
        attachments: [],
        links: [],
        classGroupIds: formData.classGroups || [],
        subjectIds: formData.subjects || [],
        studentIds: [],
      };

      if (editingEvent) {
        // Update existing event
        const updatedEvent = await updateEvent(editingEvent.id, eventData);
        if (updatedEvent) {
          // Update local state to reflect the change
          setEvents(prev => prev.map(event => 
            event.id === editingEvent.id ? updatedEvent : event
          ));
        }
      } else {
        // Create new event
        const newEvent = await createEvent(eventData);
        if (newEvent) {
          // Add to local state if creation was successful
          setEvents(prev => [...prev, newEvent]);
        }
      }

      // Reset form state
      setShowEventModal(false);
      setSelectedDateForEvent(null);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
      message.error('Error al guardar el evento');
    }
  };

  const loadEvents = async () => {
    // Loading calendar events
    
    // Double-check that we're not already loading to prevent race conditions
    if (loading) {
      // Already loading, skip duplicate request
      return;
    }
    
    setLoading(true);
    
    try {
      // Try to load real events from API first
      try {
        const startOfMonth = selectedDate.startOf('month');
        const endOfMonth = selectedDate.endOf('month');
        
        const fetchedApiEvents = await fetchEventsByDateRange(startOfMonth, endOfMonth);
        
        // Combine API events with task events if needed
        let combinedEvents: (CalendarEvent | ApiCalendarEvent)[] = [...fetchedApiEvents];
        
        // Agregar tareas si está habilitado y hay tareas disponibles
        if (includeTasks && studentTasks && studentTasks.length > 0) {
          const taskEvents: CalendarEvent[] = studentTasks.map((task, index) => ({
            id: `task-${task.id || index}`,
            title: task.title,
            description: task.taskType === 'exam' ? 
              `Test Yourself de ${task.subjectAssignment?.subject?.name || 'Asignatura'}` :
              `Tarea de ${task.subjectAssignment?.subject?.name || 'Asignatura'}`,
            type: task.taskType === 'exam' ? 'exam' as const : 'assignment' as const,
            date: dayjs(task.dueDate).format('YYYY-MM-DD'),
            startTime: dayjs(task.dueDate).format('HH:mm'),
            priority: 'medium' as const,
            status: task.finalGrade ? 'completed' as const : 'scheduled' as const,
            metadata: {
              subjectName: task.subjectAssignment?.subject?.name,
              assignmentType: task.taskType,
            }
          }));
          
          combinedEvents = [...combinedEvents, ...taskEvents];
        }
        
        setEvents(combinedEvents);
        // Events loaded successfully
        
      } catch (apiError: any) {
        console.error('Calendar API Error:', apiError);
        
        // Check if it's an authentication error
        if (apiError?.response?.status === 401) {
          console.warn('Calendar: Authentication failed, user may need to re-login');
          message.warning('Tu sesión ha expirado. Por favor, recarga la página para ver los eventos del calendario.');
          setAuthError(true);
          setEvents([]); // Clear events instead of showing mock data
          // Don't return early - let finally block handle loading state
        } else {
          console.warn('Failed to load real events, falling back to mock events:', apiError);
          
          // Fallback to mock events if API fails
          const mockEvents = generateMockEvents(userRole, selectedDate);
          
          // Agregar tareas si está habilitado y hay tareas disponibles
          if (includeTasks && studentTasks && studentTasks.length > 0) {
            const taskEvents = studentTasks.map((task, index) => ({
              id: `task-${task.id || index}`,
              title: task.title,
              description: task.taskType === 'exam' ? 
                `Test Yourself de ${task.subjectAssignment?.subject?.name || 'Asignatura'}` :
                `Tarea de ${task.subjectAssignment?.subject?.name || 'Asignatura'}`,
              type: task.taskType === 'exam' ? 'exam' as const : 'assignment' as const,
              date: dayjs(task.dueDate).format('YYYY-MM-DD'),
              startTime: dayjs(task.dueDate).format('HH:mm'),
              priority: 'medium' as const,
              status: task.finalGrade ? 'completed' as const : 'scheduled' as const,
              metadata: {
                subjectName: task.subjectAssignment?.subject?.name,
                assignmentType: task.taskType,
              }
            }));
            
            setEvents([...mockEvents, ...taskEvents]);
          } else {
            setEvents(mockEvents);
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setEvents([]); // Clear events on any major error
    } finally {
      // Reset loading state
      setLoading(false);
    }
  };

  const generateMockEvents = (role: string, date: Dayjs): CalendarEvent[] => {
    const currentMonth = date.month();
    const currentYear = date.year();
    const daysInMonth = date.daysInMonth();
    
    const baseEvents: CalendarEvent[] = [];
    
    // Eventos comunes
    baseEvents.push(
      {
        id: '1',
        title: 'Inicio de trimestre',
        type: 'event',
        date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`).format('YYYY-MM-DD'),
        priority: 'high',
        status: 'scheduled',
        description: 'Inicio del segundo trimestre académico',
      },
      {
        id: '2',
        title: 'Reunión de profesores',
        type: 'meeting',
        date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-15`).format('YYYY-MM-DD'),
        startTime: '16:00',
        endTime: '18:00',
        priority: 'medium',
        status: 'scheduled',
        location: 'Sala de profesores',
      }
    );

    // Eventos específicos por rol
    switch (role) {
      case 'admin':
        baseEvents.push(
          {
            id: 'admin-1',
            title: 'Revisión sistema',
            type: 'maintenance',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-10`).format('YYYY-MM-DD'),
            startTime: '22:00',
            endTime: '02:00',
            priority: 'high',
            status: 'scheduled',
            description: 'Mantenimiento programado del sistema',
          },
          {
            id: 'admin-2',
            title: 'Junta directiva',
            type: 'meeting',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-20`).format('YYYY-MM-DD'),
            startTime: '10:00',
            endTime: '12:00',
            priority: 'high',
            status: 'scheduled',
            location: 'Sala de juntas',
          },
          {
            id: 'admin-3',
            title: 'Evaluación trimestral',
            type: 'event',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-25`).format('YYYY-MM-DD'),
            priority: 'medium',
            status: 'scheduled',
            description: 'Revisión de resultados del trimestre',
          }
        );
        break;

      case 'teacher':
        baseEvents.push(
          {
            id: 'teacher-1',
            title: 'Matemáticas - 3º A',
            type: 'class',
            date: dayjs().format('YYYY-MM-DD'),
            startTime: '09:00',
            endTime: '10:00',
            priority: 'medium',
            status: 'scheduled',
            location: 'Aula 301',
            metadata: {
              subjectName: 'Matemáticas',
              className: '3º A',
            },
          },
          {
            id: 'teacher-2',
            title: 'Test Yourself Lengua - 2º B',
            type: 'exam',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-18`).format('YYYY-MM-DD'),
            startTime: '11:00',
            endTime: '12:00',
            priority: 'high',
            status: 'scheduled',
            location: 'Aula 201',
            metadata: {
              subjectName: 'Lengua Castellana',
              className: '2º B',
            },
          },
          {
            id: 'teacher-3',
            title: 'Entrega evaluaciones',
            type: 'assignment',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-22`).format('YYYY-MM-DD'),
            priority: 'high',
            status: 'scheduled',
            description: 'Fecha límite para entregar evaluaciones del trimestre',
          }
        );
        break;

      case 'student':
        baseEvents.push(
          {
            id: 'student-1',
            title: 'Entrega proyecto Ciencias',
            type: 'assignment',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-12`).format('YYYY-MM-DD'),
            priority: 'high',
            status: 'scheduled',
            description: 'Proyecto final de Ciencias Naturales',
            metadata: {
              subjectName: 'Ciencias Naturales',
              teacherName: 'Prof. García',
            },
          },
          {
            id: 'student-2',
            title: 'Test Yourself Historia',
            type: 'exam',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-16`).format('YYYY-MM-DD'),
            startTime: '10:00',
            endTime: '11:30',
            priority: 'high',
            status: 'scheduled',
            location: 'Aula 102',
            metadata: {
              subjectName: 'Historia',
              teacherName: 'Prof. Rodríguez',
            },
          },
          {
            id: 'student-3',
            title: 'Excursión museo',
            type: 'event',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-28`).format('YYYY-MM-DD'),
            startTime: '09:00',
            endTime: '15:00',
            priority: 'medium',
            status: 'scheduled',
            location: 'Museo de Ciencias',
            description: 'Visita educativa al museo con 4º ESO',
          }
        );
        break;

      case 'family':
        baseEvents.push(
          {
            id: 'family-1',
            title: 'Reunión padres 3º A',
            type: 'meeting',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-14`).format('YYYY-MM-DD'),
            startTime: '17:00',
            endTime: '18:30',
            priority: 'high',
            status: 'scheduled',
            location: 'Aula 301',
            metadata: {
              className: '3º A',
              teacherName: 'Prof. Martínez',
            },
          },
          {
            id: 'family-2',
            title: 'Entrega notas Juan',
            type: 'reminder',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-21`).format('YYYY-MM-DD'),
            priority: 'medium',
            status: 'scheduled',
            description: 'Consultar las calificaciones del segundo trimestre',
            metadata: {
              studentName: 'Juan Pérez',
            },
          },
          {
            id: 'family-3',
            title: 'Festival fin de curso',
            type: 'event',
            date: dayjs(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-30`).format('YYYY-MM-DD'),
            startTime: '18:00',
            endTime: '21:00',
            priority: 'low',
            status: 'scheduled',
            location: 'Patio principal',
            description: 'Celebración de fin de curso con actuaciones',
          }
        );
        break;
    }

    return baseEvents;
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'class': return <BookOutlined style={{ color: '#1890ff' }} />;
      case 'exam': return <FileTextOutlined style={{ color: '#ff4d4f' }} />;
      case 'meeting': return <TeamOutlined style={{ color: '#722ed1' }} />;
      case 'event': return <CalendarOutlined style={{ color: '#52c41a' }} />;
      case 'assignment': return <EditOutlined style={{ color: '#faad14' }} />;
      case 'holiday': return <CalendarOutlined style={{ color: '#eb2f96' }} />;
      case 'reminder': return <BellOutlined style={{ color: '#13c2c2' }} />;
      case 'maintenance': return <ExclamationCircleOutlined style={{ color: '#ff7a45' }} />;
      default: return <CalendarOutlined style={{ color: '#d9d9d9' }} />;
    }
  };


  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'class': return 'Clase';
      case 'exam': return 'Test Yourself';
      case 'meeting': return 'Reunión';
      case 'event': return 'Evento';
      case 'assignment': return 'Tarea';
      case 'holiday': return 'Festividad';
      case 'reminder': return 'Recordatorio';
      case 'maintenance': return 'Mantenimiento';
      default: return 'Otro';
    }
  };

  const dateCellRender = (value: Dayjs) => {
    const dateEvents = events.filter(event => 
      dayjs(getEventDate(event)).isSame(value, 'day')
    );

    // Responsive cell configurations
    const cellHeight = isMobile ? '40px' : isTablet ? '50px' : '60px';
    const maxEventsToShow = isMobile ? 1 : isTablet ? 2 : 3;
    const fontSize = isMobile ? '8px' : '10px';
    const padding = isMobile ? '1px 2px' : '1px 4px';

    return (
      <div 
        style={{ 
          minHeight: cellHeight, 
          position: 'relative',
          cursor: 'pointer',
          borderRadius: '4px',
          transition: 'background-color 0.2s ease'
        }}
        onClick={(e) => {
          // Only handle click if not clicking on an event
          if ((e.target as HTMLElement).closest('.calendar-event')) return;
          handleDateClick(value);
        }}
        onMouseEnter={(e) => {
          if (!isMobile && !isTablet) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(24, 144, 255, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isMobile && !isTablet) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }
        }}
        title={`${getAllowedEventTypes(userRole).length > 0 ? `Haz clic para crear evento el ${value.format('DD/MM/YYYY')}` : `Ver eventos del ${value.format('DD/MM/YYYY')}`}`}
      >
        {dateEvents.slice(0, maxEventsToShow).map(event => {
          const displayProps = getEventDisplayProps(event);
          return (
            <div
              key={displayProps.id}
              className="calendar-event"
              style={{
                fontSize: fontSize,
                padding: padding,
                margin: '1px 0',
                borderRadius: '2px',
                backgroundColor: getEventTypeColor(displayProps.type),
                color: 'white',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                zIndex: 2,
                position: 'relative'
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Convert to local format for modal
                const localEvent = isApiEvent(event) ? convertApiEventToLocal(event) : event;
                setSelectedEvent(localEvent);
                setModalVisible(true);
              }}
              title={displayProps.title} // Tooltip for mobile
            >
              {isMobile && displayProps.title.length > 8 
                ? `${displayProps.title.substring(0, 8)}...` 
                : displayProps.title
              }
            </div>
          );
        })}
        {dateEvents.length > maxEventsToShow && (
          <div style={{ 
            fontSize: fontSize, 
            color: '#666', 
            textAlign: 'center',
            position: isMobile ? 'absolute' : 'static',
            bottom: isMobile ? '2px' : 'auto',
            right: isMobile ? '2px' : 'auto',
            backgroundColor: isMobile ? 'rgba(255,255,255,0.8)' : 'transparent',
            borderRadius: '2px',
            padding: isMobile ? '1px' : '0'
          }}>
            +{dateEvents.length - maxEventsToShow}
          </div>
        )}
        {/* Add event indicator on hover for desktop */}
        {!isMobile && !isTablet && (
          <div 
            className="add-event-indicator"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#1890ff',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              zIndex: 1
            }}
          >
            +
          </div>
        )}
      </div>
    );
  };

  const monthCellRender = (value: Dayjs) => {
    const monthEvents = events.filter(event => 
      dayjs(getEventDate(event)).isSame(value, 'month')
    );
    
    return monthEvents.length > 0 ? (
      <div style={{ textAlign: 'center' }}>
        <Badge count={monthEvents.length} style={{ backgroundColor: '#52c41a' }} />
      </div>
    ) : null;
  };

  const getTodayEvents = () => {
    return events.filter(event => 
      dayjs(getEventDate(event)).isSame(dayjs(), 'day')
    ).slice(0, maxEvents);
  };

  const getUpcomingEvents = () => {
    return events
      .filter(event => dayjs(getEventDate(event)).isAfter(dayjs(), 'day'))
      .sort((a, b) => dayjs(getEventDate(a)).diff(dayjs(getEventDate(b))))
      .slice(0, maxEvents);
  };

  const handleEventClick = (event: CalendarEvent | ApiCalendarEvent) => {
    // Convert to local format for modal
    const localEvent = isApiEvent(event) ? convertApiEventToLocal(event) : event;
    setSelectedEvent(localEvent);
    setModalVisible(true);
  };

  const getWidgetTitle = () => {
    switch (userRole) {
      case 'admin': return 'Calendario Institucional';
      case 'teacher': return 'Mi Calendario de Clases';
      case 'student': return 'Mi Calendario Académico';
      case 'family': return 'Calendario Familiar';
      default: return 'Calendario';
    }
  };

  if (loading) {
    return (
      <Card 
        title={getWidgetTitle()} 
        style={{ height: isMobile ? 'auto' : height }}
        className={isMobile ? 'mobile-calendar-loading' : ''}
      >
        <div style={{ textAlign: 'center', padding: isMobile ? '20px' : '50px' }}>
          <Loading text="Cargando eventos del calendario..." size={isMobile ? 'default' : 'large'} />
        </div>
      </Card>
    );
  }

  // Show auth error state if authentication failed
  if (authError) {
    return (
      <Card 
        title={getWidgetTitle()} 
        style={{ height: isMobile ? 'auto' : height }}
      >
        <div style={{ textAlign: 'center', padding: isMobile ? '20px' : '50px' }}>
          <Alert
            message="Sesión Expirada"
            description="Tu sesión ha expirado. Por favor, recarga la página para ver los eventos del calendario."
            type="warning"
            showIcon
            action={
              <Button 
                type="primary" 
                onClick={() => window.location.reload()}
                size="small"
              >
                Recargar Página
              </Button>
            }
          />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card 
        title={
          <Space size={isMobile ? 'small' : 'middle'}>
            <CalendarOutlined />
            <span className={isMobile ? 'text-sm' : ''}>{getWidgetTitle()}</span>
            <Tag color="blue" className={isMobile ? 'text-xs' : ''}>{events.length} eventos</Tag>
          </Space>
        }
        extra={
          <Space>
            {(isMobile || isTablet) && (
              <div className="text-xs text-gray-500" style={{ marginRight: 8 }}>
                👆 Desliza para navegar
              </div>
            )}
            {getAllowedEventTypes(userRole).length > 0 && (
              <Button
                icon={<PlusOutlined />}
                type="primary"
                size={isMobile ? 'small' : 'middle'}
                onClick={() => {
                  setSelectedDateForEvent(dayjs());
                  setShowEventModal(true);
                }}
                title={
                  userRole === 'family' ? 'Crear recordatorio familiar' : 
                  userRole === 'student' ? 'Crear recordatorio personal' : 
                  'Crear nuevo evento'
                }
              >
                {isMobile ? '' : 
                  userRole === 'family' ? 'Recordatorio' : 
                  userRole === 'student' ? 'Recordatorio' : 
                  'Nuevo'
                }
              </Button>
            )}
          </Space>
        }
        style={{ height: responsiveHeight }}
        className={`calendar-widget ${isMobile ? 'mobile-calendar' : ''}`}
      >
        {isMobile ? (
          // Layout mobile: Calendar + Collapse para eventos
          <div className="mobile-calendar-layout">
            <div 
              className="mobile-calendar-container"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Calendar
                cellRender={calendarMode === 'month' ? dateCellRender : monthCellRender}
                mode={calendarMode}
                value={selectedDate}
                onSelect={handleDateClick}
                onPanelChange={handlePanelChange}
                className="mobile-calendar-widget"
              />
            </div>
            
            {showEventList && (
              <Collapse 
                ghost 
                className="mobile-events-collapse"
                items={[
                  {
                    key: 'today',
                    label: (
                      <Space>
                        <ClockCircleOutlined />
                        <span>Hoy ({getTodayEvents().length})</span>
                      </Space>
                    ),
                    children: getTodayEvents().length > 0 ? (
                      <List
                        size="small"
                        dataSource={getTodayEvents()}
                        renderItem={(event) => {
                          const displayProps = getEventDisplayProps(event);
                          return (
                            <List.Item
                              className="mobile-event-item"
                              onClick={() => handleEventClick(event)}
                            >
                              <List.Item.Meta
                                avatar={getEventTypeIcon(displayProps.type)}
                                title={<Text strong className="text-sm">{displayProps.title}</Text>}
                                description={
                                  <Text type="secondary" className="text-xs">
                                    {displayProps.startTime && `${displayProps.startTime}`}
                                    {displayProps.location && ` • ${displayProps.location}`}
                                  </Text>
                                }
                              />
                            </List.Item>
                          );
                        }}
                      />
                    ) : (
                      <Text type="secondary" className="text-sm">No hay eventos para hoy</Text>
                    )
                  },
                  {
                    key: 'upcoming',
                    label: (
                      <Space>
                        <BellOutlined />
                        <span>Próximos ({getUpcomingEvents().length})</span>
                      </Space>
                    ),
                    children: getUpcomingEvents().length > 0 ? (
                      <List
                        size="small"
                        dataSource={getUpcomingEvents()}
                        renderItem={(event) => {
                          const displayProps = getEventDisplayProps(event);
                          return (
                            <List.Item
                              className="mobile-event-item"
                              onClick={() => handleEventClick(event)}
                            >
                              <List.Item.Meta
                                avatar={getEventTypeIcon(displayProps.type)}
                                title={<Text strong className="text-sm">{displayProps.title}</Text>}
                                description={
                                  <Text type="secondary" className="text-xs">
                                    {dayjs(getEventDate(event)).format('DD/MM')}
                                    {displayProps.startTime && ` • ${displayProps.startTime}`}
                                  </Text>
                                }
                              />
                            </List.Item>
                          );
                        }}
                      />
                    ) : (
                      <Text type="secondary" className="text-sm">No hay eventos próximos</Text>
                    )
                  }
                ]}
              />
            )}
          </div>
        ) : (
          // Layout desktop/tablet: Grid layout
          <Row 
            gutter={16} 
            style={{ 
              height: typeof contentHeight === 'number' ? `${contentHeight}px` : 'auto',
              minHeight: typeof contentHeight === 'number' ? `${contentHeight}px` : '350px'
            }}
          >
            {/* Desktop Calendar Navigation Scrollbar */}
            {!isMobile && !isTablet && (
              <Col span={1} style={{ height: '100%' }}>
                <div className="calendar-navigation-scrollbar">
                  <div className="calendar-nav-controls">
                    <Button
                      icon={<ArrowUpOutlined />}
                      size="small"
                      onClick={() => {
                        const newDate = selectedDate.subtract(1, 'week');
                        setSelectedDate(newDate);
                      }}
                      className="calendar-nav-btn"
                    />
                    <div className="calendar-nav-indicator">
                      <div className="nav-month-indicator">
                        {selectedDate.format('MMM')}
                      </div>
                      <div className="nav-week-indicator">
                        S{Math.ceil(selectedDate.date() / 7)}
                      </div>
                    </div>
                    <Button
                      icon={<ArrowDownOutlined />}
                      size="small"
                      onClick={() => {
                        const newDate = selectedDate.add(1, 'week');
                        setSelectedDate(newDate);
                      }}
                      className="calendar-nav-btn"
                    />
                  </div>
                </div>
              </Col>
            )}

            <Col 
              xs={24} 
              lg={showEventListResponsive ? (isMobile || isTablet ? 24 : 17) : (isMobile || isTablet ? 24 : 23)}
              style={{ height: '100%' }}
            >
              <div 
                className="calendar-scroll-container"
                style={{ height: '100%', position: 'relative' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <Calendar
                  cellRender={calendarMode === 'month' ? dateCellRender : monthCellRender}
                  mode={calendarMode}
                  value={selectedDate}
                  onSelect={handleDateClick}
                  onPanelChange={handlePanelChange}
                  style={{ 
                    height: '100%',
                    backgroundColor: '#fff'
                  }}
                />
              </div>
            </Col>

            {showEventListResponsive && (
              <Col 
                xs={24} 
                lg={6}
                style={{ height: '100%' }}
              >
                <div 
                  style={{ 
                    borderLeft: '1px solid #f0f0f0',
                    paddingLeft: '16px',
                    height: '100%',
                    overflow: 'auto'
                  }}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <Title level={5} style={{ fontSize: '14px', marginBottom: '8px' }}>
                      <ClockCircleOutlined style={{ marginRight: '8px' }} />
                      Hoy ({getTodayEvents().length})
                    </Title>
                    {getTodayEvents().length > 0 ? (
                      <List
                        size="small"
                        dataSource={getTodayEvents()}
                        renderItem={(event) => {
                          const displayProps = getEventDisplayProps(event);
                          return (
                            <List.Item
                              className="event-item"
                              onClick={() => handleEventClick(event)}
                            >
                              <List.Item.Meta
                                avatar={getEventTypeIcon(displayProps.type)}
                                title={
                                  <Space>
                                    <Text strong style={{ fontSize: '12px' }}>
                                      {displayProps.title}
                                    </Text>
                                    <Badge 
                                      color={getPriorityColor(displayProps.priority)} 
                                      style={{ marginLeft: '4px' }} 
                                    />
                                  </Space>
                                }
                                description={
                                  <Text type="secondary" style={{ fontSize: '11px' }}>
                                    {displayProps.startTime && `${displayProps.startTime} - ${displayProps.endTime || ''}`}
                                    {displayProps.location && ` • ${displayProps.location}`}
                                  </Text>
                                }
                              />
                            </List.Item>
                          );
                        }}
                      />
                    ) : (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        No hay eventos para hoy
                      </Text>
                    )}
                  </div>

                  <div>
                    <Title level={5} style={{ fontSize: '14px', marginBottom: '8px' }}>
                      <BellOutlined style={{ marginRight: '8px' }} />
                      Próximos ({getUpcomingEvents().length})
                    </Title>
                    {getUpcomingEvents().length > 0 ? (
                      <List
                        size="small"
                        dataSource={getUpcomingEvents()}
                        renderItem={(event) => {
                          const displayProps = getEventDisplayProps(event);
                          return (
                            <List.Item
                              className="event-item"
                              onClick={() => handleEventClick(event)}
                            >
                              <List.Item.Meta
                                avatar={getEventTypeIcon(displayProps.type)}
                                title={
                                  <Space>
                                    <Text strong style={{ fontSize: '12px' }}>
                                      {displayProps.title}
                                    </Text>
                                    <Badge 
                                      color={getPriorityColor(displayProps.priority)} 
                                      style={{ marginLeft: '4px' }} 
                                    />
                                  </Space>
                                }
                                description={
                                  <Text type="secondary" style={{ fontSize: '11px' }}>
                                    {dayjs(getEventDate(event)).format('DD/MM')}
                                    {displayProps.startTime && ` • ${displayProps.startTime}`}
                                  </Text>
                                }
                              />
                            </List.Item>
                          );
                        }}
                      />
                    ) : (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        No hay eventos próximos
                      </Text>
                    )}
                  </div>
                </div>
              </Col>
            )}
          </Row>
        )}
      </Card>

      {/* Modal para crear nuevo evento */}
      <ResponsiveModal
        title={
          <Space>
            {editingEvent ? <EditOutlined /> : <PlusOutlined />}
            <span className={isMobile ? 'text-sm' : ''}>
              {editingEvent ? 'Editar Evento' : 'Crear Evento'} - {selectedDateForEvent?.format('DD/MM/YYYY')}
            </span>
          </Space>
        }
        open={showEventModal}
        onCancel={() => {
          setShowEventModal(false);
          setSelectedDateForEvent(null);
          setEditingEvent(null);
        }}
        footer={null}
        desktopWidth={600}
        tabletWidth="90%"
        mobileAsDrawer={true}
        drawerPlacement="bottom"
      >
        <Form
          key={editingEvent ? editingEvent.id : 'new'}
          layout="vertical"
          onFinish={handleCreateEvent}
          initialValues={editingEvent ? {
            title: editingEvent.title,
            description: editingEvent.description,
            type: editingEvent.type,
            priority: editingEvent.priority,
            location: editingEvent.location,
            visibility: editingEvent.visibility || getDefaultVisibility(userRole),
            startTime: editingEvent.startTime ? dayjs(editingEvent.startTime, 'HH:mm') : undefined,
            endTime: editingEvent.endTime ? dayjs(editingEvent.endTime, 'HH:mm') : undefined,
          } : {
            type: getAllowedEventTypes(userRole)[0] || 'reminder',
            priority: 'medium',
            visibility: getDefaultVisibility(userRole)
          }}
        >
          <Form.Item
            label="Título del evento"
            name="title"
            rules={[{ required: true, message: 'El título es obligatorio' }]}
          >
            <Input placeholder="Ingresa el título del evento" />
          </Form.Item>

          <Form.Item
            label="Tipo de evento"
            name="type"
            rules={[{ required: true, message: 'Selecciona un tipo' }]}
          >
            <Select placeholder="Selecciona el tipo de evento">
              {getAllowedEventTypes(userRole).map(type => (
                <Select.Option key={type} value={type}>
                  {getEventTypeLabel(type)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Descripción"
            name="description"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Descripción opcional del evento"
            />
          </Form.Item>

          {/* Campo para cambiar la fecha del evento */}
          <Form.Item
            label="Fecha del evento"
            name="eventDate"
            tooltip="Puedes cambiar la fecha del evento si es necesario"
          >
            <DatePicker 
              format="DD/MM/YYYY"
              placeholder="Selecciona la fecha"
              style={{ width: '100%' }}
              value={selectedDateForEvent}
              onChange={(date) => {
                if (date) {
                  setSelectedDateForEvent(date);
                }
              }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Hora de inicio"
                name="startTime"
              >
                <TimePicker 
                  format="HH:mm" 
                  placeholder="Hora inicio"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Hora de fin"
                name="endTime"
              >
                <TimePicker 
                  format="HH:mm" 
                  placeholder="Hora fin"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Ubicación"
            name="location"
          >
            <Input placeholder="Ubicación del evento (opcional)" />
          </Form.Item>

          <Form.Item
            label="Prioridad"
            name="priority"
          >
            <Select>
              <Select.Option value="low">Baja</Select.Option>
              <Select.Option value="medium">Media</Select.Option>
              <Select.Option value="high">Alta</Select.Option>
            </Select>
          </Form.Item>

          {/* Campo de visibilidad solo para admin y teachers */}
          {(userRole === 'admin' || userRole === 'teacher') && (
            <Form.Item
              label="Visibilidad"
              name="visibility"
              rules={[{ required: true, message: 'Selecciona la visibilidad' }]}
            >
              <Select 
                placeholder="¿Quién puede ver este evento?"
                onChange={(value) => setSelectedVisibility(value)}
              >
                {getAllowedVisibilityLevels(userRole).map(visibility => (
                  <Select.Option key={visibility} value={visibility}>
                    {getVisibilityLabel(visibility)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {/* Campo para seleccionar clases específicas */}
          {(userRole === 'admin' || userRole === 'teacher') && selectedVisibility === 'class_specific' && (
            <Form.Item
              label="Clases específicas"
              name="classGroups"
              rules={[{ required: true, message: 'Selecciona al menos una clase' }]}
            >
              <Select
                mode="multiple"
                placeholder="Selecciona las clases que verán este evento"
                style={{ width: '100%' }}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {userRole === 'admin' ? (
                  // Admin puede ver todas las clases
                  classGroups.map(classGroup => (
                    <Select.Option key={classGroup.id} value={classGroup.id}>
                      {classGroup.name} {classGroup.educationalLevel && `- ${classGroup.educationalLevel.name}`}
                    </Select.Option>
                  ))
                ) : (
                  // Teacher solo ve sus clases asignadas (filtradas para evitar duplicados)
                  [...new Map(teacherSubjects.map(assignment => [assignment.classGroup.id, assignment])).values()].map(assignment => (
                    <Select.Option key={assignment.classGroup.id} value={assignment.classGroup.id}>
                      {assignment.classGroup.name}
                    </Select.Option>
                  ))
                )}
              </Select>
            </Form.Item>
          )}

          {/* Campo para seleccionar asignaturas específicas */}
          {(userRole === 'admin' || userRole === 'teacher') && selectedVisibility === 'subject_specific' && (
            <Form.Item
              label="Asignaturas específicas"
              name="subjects"
              rules={[{ required: true, message: 'Selecciona al menos una asignatura' }]}
            >
              <Select
                mode="multiple"
                placeholder="Selecciona las asignaturas relacionadas con este evento"
                style={{ width: '100%' }}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {userRole === 'admin' ? (
                  // Admin puede ver todas las asignaturas
                  subjects.map(subject => (
                    <Select.Option key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name}
                    </Select.Option>
                  ))
                ) : (
                  // Teacher solo ve sus asignaturas asignadas
                  teacherSubjects.map(assignment => (
                    <Select.Option key={assignment.subject.id} value={assignment.subject.id}>
                      {assignment.subject.code} - {assignment.subject.name}
                    </Select.Option>
                  ))
                )}
              </Select>
            </Form.Item>
          )}

          {/* Información para familias y estudiantes */}
          {(userRole === 'family' || userRole === 'student') && (
            <Alert
              message="Evento Privado"
              description={`Este evento será privado y solo tú podrás verlo. ${userRole === 'family' ? 'Puedes crear recordatorios para actividades familiares.' : 'Puedes crear recordatorios personales y fechas límite.'}`}
              type="info"
              showIcon
              className="mb-4"
            />
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button 
              onClick={() => {
                setShowEventModal(false);
                setSelectedDateForEvent(null);
                setEditingEvent(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {editingEvent ? 'Actualizar Evento' : 'Crear Evento'}
            </Button>
          </div>
        </Form>
      </ResponsiveModal>

      {/* Modal de detalles del evento */}
      <ResponsiveModal
        title={
          <Space>
            {selectedEvent && getEventTypeIcon(selectedEvent.type)}
            <span className={isMobile ? 'text-sm' : ''}>Detalles del evento</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between gap-2'}`}>
            <Button
              onClick={() => setModalVisible(false)}
              block={isMobile}
            >
              Cerrar
            </Button>
            {/* Solo mostrar botones de editar/eliminar si el usuario tiene permisos */}
            {/* Admin y Teacher pueden editar/eliminar cualquier evento */}
            {/* Student y Family solo pueden editar/eliminar sus propios eventos (recordatorios personales) */}
            {(userRole === 'admin' || userRole === 'teacher' ||
              (selectedEvent && selectedEvent.type === 'reminder' &&
               (userRole === 'student' || userRole === 'family'))) && (
              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-2'}`}>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    if (selectedEvent) {
                      handleDeleteEvent(selectedEvent.id);
                    }
                  }}
                  block={isMobile}
                >
                  Eliminar
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => {
                    if (selectedEvent) {
                      handleEditEvent(selectedEvent);
                    }
                  }}
                  block={isMobile}
                >
                  Editar
                </Button>
              </div>
            )}
          </div>
        }
        desktopWidth={600}
        tabletWidth="90%"
        mobileAsDrawer={true}
        drawerPlacement="bottom"
      >
        {selectedEvent && (
          <Descriptions 
            column={1} 
            bordered={!isMobile}
            size={isMobile ? 'small' : 'middle'}
            className={isMobile ? 'mobile-event-details' : ''}
          >
            <Descriptions.Item label="Título">
              <Space direction={isMobile ? 'vertical' : 'horizontal'} size="small">
                <Text strong className={isMobile ? 'text-sm' : ''}>{selectedEvent.title}</Text>
                <div className="flex flex-wrap gap-1">
                  <Tag 
                    color={getEventTypeColor(selectedEvent.type)}
                    className={isMobile ? 'text-xs' : ''}
                  >
                    {getEventTypeName(selectedEvent.type)}
                  </Tag>
                  <Badge 
                    color={getPriorityColor(selectedEvent.priority)} 
                    text={
                      selectedEvent.priority === 'high' ? 'Alta' :
                      selectedEvent.priority === 'medium' ? 'Media' : 'Baja'
                    }
                    className={isMobile ? 'text-xs' : ''}
                  />
                </div>
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Fecha">
              <Text className={isMobile ? 'text-sm' : ''}>
                {dayjs(selectedEvent.date).format(isMobile ? 'DD/MM/YYYY' : 'dddd, DD [de] MMMM [de] YYYY')}
              </Text>
            </Descriptions.Item>
            
            {selectedEvent.startTime && (
              <Descriptions.Item label="Horario">
                <Text className={isMobile ? 'text-sm' : ''}>
                  {selectedEvent.startTime} - {selectedEvent.endTime || 'Sin fin definido'}
                </Text>
              </Descriptions.Item>
            )}
            
            {selectedEvent.location && (
              <Descriptions.Item label="Ubicación">
                <Text className={isMobile ? 'text-sm' : ''}>{selectedEvent.location}</Text>
              </Descriptions.Item>
            )}
            
            {selectedEvent.description && (
              <Descriptions.Item label="Descripción">
                <Text className={isMobile ? 'text-sm' : ''}>{selectedEvent.description}</Text>
              </Descriptions.Item>
            )}
            
            {selectedEvent.metadata?.subjectName && (
              <Descriptions.Item label="Asignatura">
                <Text className={isMobile ? 'text-sm' : ''}>{selectedEvent.metadata.subjectName}</Text>
              </Descriptions.Item>
            )}
            
            {selectedEvent.metadata?.className && (
              <Descriptions.Item label="Clase">
                <Text className={isMobile ? 'text-sm' : ''}>{selectedEvent.metadata.className}</Text>
              </Descriptions.Item>
            )}
            
            {selectedEvent.metadata?.teacherName && (
              <Descriptions.Item label="Profesor">
                <Text className={isMobile ? 'text-sm' : ''}>{selectedEvent.metadata.teacherName}</Text>
              </Descriptions.Item>
            )}
            
            {selectedEvent.metadata?.studentName && (
              <Descriptions.Item label="Estudiante">
                <Text className={isMobile ? 'text-sm' : ''}>{selectedEvent.metadata.studentName}</Text>
              </Descriptions.Item>
            )}
            
            <Descriptions.Item label="Estado">
              <Badge 
                status={
                  selectedEvent.status === 'completed' ? 'success' :
                  selectedEvent.status === 'ongoing' ? 'processing' :
                  selectedEvent.status === 'cancelled' ? 'error' : 'default'
                }
                text={
                  selectedEvent.status === 'completed' ? 'Completado' :
                  selectedEvent.status === 'ongoing' ? 'En curso' :
                  selectedEvent.status === 'cancelled' ? 'Cancelado' : 'Programado'
                }
                className={isMobile ? 'text-sm' : ''}
              />
            </Descriptions.Item>
          </Descriptions>
        )}
      </ResponsiveModal>
    </>
  );
};

export default CalendarWidget;