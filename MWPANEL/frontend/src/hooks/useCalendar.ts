import { useState, useEffect } from 'react';
import { message } from 'antd';
import apiClient from '@services/apiClient';
import dayjs, { Dayjs } from 'dayjs';

// Interfaces para el sistema de calendario
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: 'activity' | 'evaluation' | 'test_yourself' | 'general_event' | 'holiday' | 'meeting' | 'excursion' | 'festival' | 'deadline' | 'reminder';
  visibility: 'public' | 'teachers_only' | 'students_only' | 'families_only' | 'admin_only' | 'class_specific' | 'subject_specific' | 'private';
  color: string;
  isAllDay: boolean;
  location?: string;
  isRecurrent: boolean;
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceEnd?: string;
  tags: string[];
  priority: number;
  notifyBefore: number;
  autoNotify: boolean;
  attachments: string[];
  links: string[];
  createdBy: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  eventGroups?: Array<{
    classGroup: {
      id: string;
      name: string;
    };
  }>;
  eventSubjects?: Array<{
    subject: {
      id: string;
      name: string;
    };
  }>;
  eventStudents?: Array<{
    student: {
      id: string;
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    };
  }>;
  relatedTask?: {
    id: string;
    title: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventData {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: CalendarEvent['type'];
  visibility: CalendarEvent['visibility'];
  color?: string;
  isAllDay?: boolean;
  location?: string;
  isRecurrent?: boolean;
  recurrenceType?: CalendarEvent['recurrenceType'];
  recurrenceEnd?: string;
  tags?: string[];
  priority?: number;
  notifyBefore?: number;
  autoNotify?: boolean;
  attachments?: string[];
  links?: string[];
  classGroupIds?: string[];
  subjectIds?: string[];
  studentIds?: string[];
  relatedTaskId?: string;
  relatedEvaluationId?: string;
}

export interface CalendarEventFilters {
  startDate?: string;
  endDate?: string;
  type?: CalendarEvent['type'];
  visibility?: CalendarEvent['visibility'];
  search?: string;
  tags?: string[];
  studentId?: string;
  classGroupId?: string;
  subjectId?: string;
  onlyActive?: boolean;
}

export const useCalendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener todos los eventos
  const fetchEvents = async (filters?: CalendarEventFilters) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()));
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      const response = await apiClient.get(`/calendar?${params.toString()}`);
      setEvents(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar eventos del calendario';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Obtener eventos por rango de fechas
  const fetchEventsByDateRange = async (startDate: Dayjs, endDate: Dayjs): Promise<CalendarEvent[]> => {
    try {
      setLoading(true);
      const response = await apiClient.get('/calendar/date-range', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      const fetchedEvents = response.data || [];
      setEvents(fetchedEvents); // Update internal state
      setError(null); // Clear any previous errors
      // Events fetched successfully
      return fetchedEvents; // Return events directly
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar eventos por fecha';
      setError(errorMessage);
      console.error('useCalendar fetchEventsByDateRange error:', err);
      // Don't show automatic error message - let component handle it
      throw err; // Re-throw so CalendarWidget can catch and handle it
    } finally {
      setLoading(false);
    }
  };

  // Obtener eventos próximos
  const fetchUpcomingEvents = async (days: number = 7): Promise<CalendarEvent[]> => {
    try {
      const response = await apiClient.get('/calendar/upcoming', {
        params: { days },
      });
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar eventos próximos';
      message.error(errorMessage);
      return [];
    }
  };

  // Obtener eventos por tipo
  const fetchEventsByType = async (type: CalendarEvent['type']) => {
    try {
      const response = await apiClient.get(`/calendar/by-type/${type}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar eventos por tipo';
      message.error(errorMessage);
      return [];
    }
  };

  // Obtener eventos por estudiante
  const fetchEventsByStudent = async (studentId: string) => {
    try {
      const response = await apiClient.get(`/calendar/by-student/${studentId}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar eventos del estudiante';
      message.error(errorMessage);
      return [];
    }
  };

  // Obtener un evento específico
  const fetchEvent = async (id: string): Promise<CalendarEvent | null> => {
    try {
      const response = await apiClient.get(`/calendar/${id}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar evento';
      message.error(errorMessage);
      return null;
    }
  };

  // Crear un nuevo evento
  const createEvent = async (data: CreateCalendarEventData): Promise<CalendarEvent | null> => {
    try {
      setLoading(true);
      const response = await apiClient.post('/calendar', data);
      const newEvent = response.data;
      setEvents(prev => [newEvent, ...prev]);
      message.success('Evento creado exitosamente');
      return newEvent;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al crear evento';
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar un evento
  const updateEvent = async (id: string, data: Partial<CreateCalendarEventData>): Promise<CalendarEvent | null> => {
    try {
      setLoading(true);
      const response = await apiClient.patch(`/calendar/${id}`, data);
      const updatedEvent = response.data;
      setEvents(prev => prev.map(event => event.id === id ? updatedEvent : event));
      message.success('Evento actualizado exitosamente');
      return updatedEvent;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al actualizar evento';
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Eliminar un evento
  const deleteEvent = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      await apiClient.delete(`/calendar/${id}`);
      setEvents(prev => prev.filter(event => event.id !== id));
      message.success('Evento eliminado exitosamente');
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al eliminar evento';
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Obtener eventos para una fecha específica
  const getEventsForDate = (date: Dayjs): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = dayjs(event.startDate);
      return eventDate.isSame(date, 'day');
    });
  };

  // Filtrar eventos por tipo
  const filterEventsByType = (type: CalendarEvent['type']): CalendarEvent[] => {
    return events.filter(event => event.type === type);
  };

  // Obtener próximos eventos (desde los eventos cargados)
  const getUpcomingEventsFromLoaded = (days: number = 7): CalendarEvent[] => {
    const today = dayjs();
    const endDate = today.add(days, 'day');
    
    return events
      .filter(event => {
        const eventDate = dayjs(event.startDate);
        return eventDate.isAfter(today) && eventDate.isBefore(endDate);
      })
      .sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));
  };

  // Obtener colores por tipo de evento
  const getEventTypeColor = (type: CalendarEvent['type']): string => {
    const colors: Record<CalendarEvent['type'], string> = {
      'activity': '#52c41a',           // Verde
      'evaluation': '#f5222d',         // Rojo
      'test_yourself': '#faad14',      // Amarillo
      'general_event': '#1890ff',      // Azul
      'holiday': '#722ed1',            // Púrpura
      'meeting': '#13c2c2',            // Cian
      'excursion': '#eb2f96',          // Magenta
      'festival': '#fa8c16',           // Naranja
      'deadline': '#ff4d4f',           // Rojo claro
      'reminder': '#096dd9',           // Azul oscuro
    };
    return colors[type] || '#1890ff';
  };

  // Obtener etiqueta del tipo de evento
  const getEventTypeLabel = (type: CalendarEvent['type']): string => {
    const labels: Record<CalendarEvent['type'], string> = {
      'activity': 'Actividad',
      'evaluation': 'Evaluación',
      'test_yourself': 'Test Yourself',
      'general_event': 'Evento General',
      'holiday': 'Festivo',
      'meeting': 'Reunión',
      'excursion': 'Excursión',
      'festival': 'Festival',
      'deadline': 'Fecha Límite',
      'reminder': 'Recordatorio',
    };
    return labels[type] || type;
  };

  // Validar permisos de usuario para crear/editar eventos
  const canUserModifyEvents = (userRole: string): boolean => {
    return ['admin', 'teacher', 'family', 'student'].includes(userRole);
  };

  // Obtener tipos de eventos permitidos por rol
  const getAllowedEventTypes = (userRole: string): CalendarEvent['type'][] => {
    switch (userRole) {
      case 'admin':
        return ['activity', 'evaluation', 'test_yourself', 'general_event', 'holiday', 'meeting', 'excursion', 'festival', 'deadline', 'reminder'];
      case 'teacher':
        return ['activity', 'evaluation', 'test_yourself', 'general_event', 'meeting', 'deadline', 'reminder'];
      case 'family':
        return ['reminder', 'general_event'];
      case 'student':
        return ['reminder', 'deadline'];
      default:
        return [];
    }
  };

  // Obtener niveles de visibilidad permitidos por rol
  const getAllowedVisibilityLevels = (userRole: string): CalendarEvent['visibility'][] => {
    switch (userRole) {
      case 'admin':
        return ['public', 'teachers_only', 'students_only', 'families_only', 'admin_only', 'class_specific', 'subject_specific', 'private'];
      case 'teacher':
        return ['public', 'teachers_only', 'students_only', 'families_only', 'class_specific', 'subject_specific', 'private'];
      case 'family':
        return ['private']; // Solo eventos privados
      case 'student':
        return ['private']; // Solo eventos privados
      default:
        return ['private'];
    }
  };

  // Determinar la visibilidad por defecto según el rol
  const getDefaultVisibility = (userRole: string): CalendarEvent['visibility'] => {
    switch (userRole) {
      case 'admin':
      case 'teacher':
        return 'class_specific';
      case 'family':
      case 'student':
        return 'private';
      default:
        return 'private';
    }
  };

  // Validar si un evento es visible para el usuario
  const isEventVisibleForUser = (event: CalendarEvent, userRole: string, userId?: string): boolean => {
    switch (event.visibility) {
      case 'public':
        return true;
      case 'admin_only':
        return userRole === 'admin';
      case 'teachers_only':
        return ['admin', 'teacher'].includes(userRole);
      case 'students_only':
        return ['admin', 'teacher', 'student'].includes(userRole);
      case 'families_only':
        return ['admin', 'teacher', 'family'].includes(userRole);
      case 'private':
        return event.createdBy.id === userId || userRole === 'admin';
      default:
        return true;
    }
  };

  return {
    events,
    loading,
    error,
    fetchEvents,
    fetchEventsByDateRange,
    fetchUpcomingEvents,
    fetchEventsByType,
    fetchEventsByStudent,
    fetchEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    filterEventsByType,
    getUpcomingEventsFromLoaded,
    getEventTypeColor,
    getEventTypeLabel,
    canUserModifyEvents,
    isEventVisibleForUser,
    getAllowedEventTypes,
    getAllowedVisibilityLevels,
    getDefaultVisibility,
  };
};

export default useCalendar;