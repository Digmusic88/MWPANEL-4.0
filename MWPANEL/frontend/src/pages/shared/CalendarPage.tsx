import React, { useState, useEffect } from 'react';
import {
  Card,
  Calendar,
  Badge,
  List,
  Avatar,
  Typography,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Tag,
  Row,
  Col,
  message,
  Tooltip,
  Drawer,
  Tabs,
  Transfer,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  BookOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import apiClient from '@services/apiClient';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/common/Loading';

// Ensure plugins are loaded
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to parse UTC dates from backend - NO CORRECTIONS
const parseBackendDate = (utcDateString: string): Dayjs => {
  // Simply parse the UTC string and dayjs will handle timezone conversion
  return dayjs(utcDateString);
};

const { Title, Text, Paragraph} = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
// TabPane is now deprecated, using items prop instead

interface CalendarEvent {
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
  tags: string[];
  priority: number;
  notifyBefore: number;
  autoNotify: boolean;
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
}

interface ClassGroup {
  id: string;
  name: string;
}

interface Subject {
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
  classGroup?: {
    id: string;
    name: string;
  };
}

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'list'>('month');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [editSelectedVisibility, setEditSelectedVisibility] = useState<string>('');
  const [editSelectedClasses, setEditSelectedClasses] = useState<string[]>([]);

  // Estados para selección de estudiantes específicos
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [editSelectedStudentIds, setEditSelectedStudentIds] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSelectorVisible, setStudentSelectorVisible] = useState(false);
  const [editStudentSelectorVisible, setEditStudentSelectorVisible] = useState(false);

  // Early safety check
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading text="Cargando perfil de usuario..." size="large" />
      </div>
    );
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const eventsForDate = events.filter(event => {
      const eventDate = parseBackendDate(event.startDate);
      return eventDate.isSame(selectedDate, 'day');
    });
    setSelectedEvents(eventsForDate);
  }, [selectedDate, events]);

  // Initialize form with selected date when modal opens
  useEffect(() => {
    if (modalVisible && selectedDate) {
      const startOfDay = selectedDate.startOf('day');
      const endOfDay = selectedDate.endOf('day');
      form.setFieldsValue({
        dateRange: [startOfDay, endOfDay],
        isAllDay: true,
        visibility: 'public',
        priority: 'medium'
      });
    }
  }, [modalVisible, selectedDate, form]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Different API calls based on user role
      let apiCalls = [
        apiClient.get('/calendar').catch(() => ({ data: [] }))
      ];
      
      if (user?.role === 'teacher') {
        // For teachers, get their specific class assignments
        apiCalls.push(
          apiClient.get('/activities/teacher/subject-assignments').catch(() => ({ data: [] }))
        );
      } else if (user?.role === 'admin') {
        // Only for admins, get all class groups
        apiCalls.push(
          apiClient.get('/class-groups').catch(() => ({ data: [] }))
        );
      } else if (user?.role === 'family') {
        // For families, get their children's class groups
        apiCalls.push(
          apiClient.get('/families/my-children').catch(() => ({ data: [] }))
        );
      }

      const responses = await Promise.all(apiCalls);
      
      // Safely set events with fallback to empty array
      const eventsData = responses[0]?.data;
      if (Array.isArray(eventsData)) {
        setEvents(eventsData);
      } else {
        setEvents([]);
      }
      
      if (user?.role === 'teacher' && responses[1]) {
        // Extract unique class groups from teacher's assignments
        const assignments = responses[1].data || [];
        if (Array.isArray(assignments)) {
          const uniqueClasses = assignments.reduce((acc: ClassGroup[], assignment: any) => {
            const existingClass = acc.find(c => c.id === assignment.classGroup?.id);
            if (!existingClass && assignment.classGroup) {
              acc.push({
                id: assignment.classGroup.id,
                name: assignment.classGroup.name,
              });
            }
            return acc;
          }, []);
          setClassGroups(uniqueClasses);
        }
      } else if (user?.role === 'family' && responses[1]) {
        // Extract class groups from family's children
        const children = responses[1].data || [];
        if (Array.isArray(children)) {
          const uniqueClasses = children.reduce((acc: ClassGroup[], child: any) => {
            if (child.classGroups && Array.isArray(child.classGroups)) {
              child.classGroups.forEach((classGroup: any) => {
                const existingClass = acc.find(c => c.id === classGroup.id);
                if (!existingClass) {
                  acc.push({
                    id: classGroup.id,
                    name: classGroup.name,
                  });
                }
              });
            }
            return acc;
          }, []);
          setClassGroups(uniqueClasses);
        }
      } else if (responses[1]) {
        const classGroupsData = responses[1].data || [];
        if (Array.isArray(classGroupsData)) {
          setClassGroups(classGroupsData);
        }
      }
    } catch (error: any) {
      console.error('Error fetching calendar data:', error);
      // Set safe defaults to prevent rendering errors
      setEvents([]);
      setClassGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventsByDateRange = async (startDate: Dayjs, endDate: Dayjs) => {
    try {
      const response = await apiClient.get('/calendar/date-range', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      setEvents(response.data);
    } catch (error: any) {
      console.error('Error fetching events by date range:', error);
      message.error('Error al cargar eventos');
    }
  };

  // Función para cargar estudiantes disponibles
  const fetchAvailableStudents = async () => {
    try {
      setLoadingStudents(true);
      let response;

      if (user?.role === 'admin') {
        // Admin puede ver todos los estudiantes
        response = await apiClient.get('/students');
      } else if (user?.role === 'teacher') {
        // RGPD: el profesor solo ve sus alumnos (tutoría + asignatura)
        response = await apiClient.get('/students/my-students');
      }

      if (response?.data) {
        setAvailableStudents(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
      message.error('Error al cargar estudiantes');
      setAvailableStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Abrir modal de selección de estudiantes
  const handleOpenStudentSelector = (isEdit: boolean = false) => {
    if (availableStudents.length === 0) {
      fetchAvailableStudents();
    }
    if (isEdit) {
      setEditStudentSelectorVisible(true);
    } else {
      setStudentSelectorVisible(true);
    }
  };

  // Manejar cambios en la selección de estudiantes
  const handleStudentSelectionChange = (targetKeys: string[], isEdit: boolean = false) => {
    if (isEdit) {
      setEditSelectedStudentIds(targetKeys);
    } else {
      setSelectedStudentIds(targetKeys);
    }
  };

  const handleCreateEvent = async (values: any) => {
    // Validación manual: verificar que se hayan seleccionado clases si la visibilidad es class_specific
    if (selectedVisibility === 'class_specific' && selectedClasses.length === 0) {
      message.error('Selecciona al menos una clase para la visibilidad "Clases Específicas"');
      return;
    }

    try {
      const eventData = {
        ...values,
        // Let dayjs handle timezone conversion automatically
        startDate: values.dateRange[0].toISOString(),
        endDate: values.dateRange[1].toISOString(),
        color: values.color || '#1890ff',
        priority: values.priority || 1,
        notifyBefore: values.notifyBefore || 60,
        autoNotify: values.autoNotify !== false,
        tags: values.tags || [],
        classGroupIds: selectedClasses,
        studentIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
        visibility: selectedVisibility || values.visibility || 'public',
      };

      // Auto-assign visibility based on selections
      if (selectedVisibility === 'class_specific' && selectedClasses.length > 0) {
        // When classes are selected, automatically notify families and students of those classes
        eventData.visibility = 'class_specific';
        // Note: Backend handles notifications automatically for class_specific events
      }

      console.log('Evento creado:', eventData);
      const response = await apiClient.post('/calendar', eventData);
      console.log('Respuesta del servidor:', response.data);

      setEvents(prev => [...prev, response.data]);
      setModalVisible(false);
      form.resetFields();
      setSelectedVisibility('');
      setSelectedClasses([]);
      setSelectedStudentIds([]);
      message.success('Evento creado exitosamente');
    } catch (error: any) {
      console.error('Error creating event:', error);
      message.error(error.response?.data?.message || 'Error al crear el evento');
    }
  };

  const handleUpdateEvent = async (eventId: string, values: any) => {
    try {
      const eventData = {
        ...values,
        // Let dayjs handle timezone conversion automatically
        startDate: values.dateRange ? values.dateRange[0].toISOString() : undefined,
        endDate: values.dateRange ? values.dateRange[1].toISOString() : undefined,
      };

      const response = await apiClient.patch(`/calendar/${eventId}`, eventData);
      
      setEvents(prev => prev.map(event => 
        event.id === eventId ? response.data : event
      ));
      setDrawerVisible(false);
      setSelectedEvent(null);
      message.success('Evento actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating event:', error);
      message.error(error.response?.data?.message || 'Error al actualizar el evento');
    }
  };

  const handleEditEvent = async (values: any) => {
    if (!selectedEvent) return;

    // Validación manual: verificar que se hayan seleccionado clases si la visibilidad es class_specific
    if (editSelectedVisibility === 'class_specific' && editSelectedClasses.length === 0) {
      message.error('Selecciona al menos una clase para la visibilidad "Clases Específicas"');
      return;
    }

    try {
      const eventData = {
        ...values,
        // Let dayjs handle timezone conversion automatically
        startDate: values.dateRange[0].toISOString(),
        endDate: values.dateRange[1].toISOString(),
        color: values.color || '#1890ff',
        priority: values.priority || 1,
        notifyBefore: values.notifyBefore || 60,
        autoNotify: values.autoNotify !== false,
        tags: values.tags || [],
        classGroupIds: editSelectedClasses,
        studentIds: editSelectedStudentIds.length > 0 ? editSelectedStudentIds : [],
      };

      // Auto-assign visibility based on selections
      if (editSelectedVisibility === 'class_specific' && editSelectedClasses.length > 0) {
        eventData.visibility = 'class_specific';
        // Note: Backend handles notifications automatically for class_specific events
      }

      const response = await apiClient.patch(`/calendar/${selectedEvent.id}`, eventData);

      setEvents(prev => prev.map(event =>
        event.id === selectedEvent.id ? response.data : event
      ));
      setEditModalVisible(false);
      setSelectedEvent(null);
      editForm.resetFields();
      setEditSelectedVisibility('');
      setEditSelectedClasses([]);
      setEditSelectedStudentIds([]);
      message.success('Evento actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating event:', error);
      message.error(error.response?.data?.message || 'Error al actualizar el evento');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await apiClient.delete(`/calendar/${eventId}`);
      
      setEvents(prev => prev.filter(event => event.id !== eventId));
      setDrawerVisible(false);
      setSelectedEvent(null);
      message.success('Evento eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting event:', error);
      message.error(error.response?.data?.message || 'Error al eliminar el evento');
    }
  };

  const getListData = (value: Dayjs) => {
    const dayEvents = events.filter(event => {
      const eventDate = parseBackendDate(event.startDate);
      return eventDate.isSame(value, 'day');
    });

    return dayEvents.map(event => ({
      type: getEventBadgeType(event.type),
      content: event.title,
      event,
    }));
  };

  const getEventBadgeType = (type: string) => {
    switch (type) {
      case 'evaluation': return 'error';
      case 'test_yourself': return 'warning';
      case 'activity': return 'success';
      case 'holiday': return 'default';
      case 'meeting': return 'processing';
      default: return 'default';
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
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

  // Función helper para obtener icono por tipo de evento
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'evaluation': return '📝';
      case 'test_yourself': return '🧪';
      case 'activity': return '📚';
      case 'meeting': return '👥';
      case 'excursion': return '🚌';
      case 'holiday': return '🎉';
      case 'deadline': return '⏰';
      case 'reminder': return '🔔';
      case 'general_event': return '📅';
      case 'festival': return '🎭';
      default: return '📅';
    }
  };

  const cellRender = (current: Dayjs, info: { type: string }) => {
    if (info.type === 'date') {
      const listData = getListData(current);
      return (
        <ul className="events" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {listData.slice(0, 3).map((item, index) => (
            <li key={index} style={{ marginBottom: '2px' }}>
              <div
                style={{
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  backgroundColor: item.event.color || '#1890ff',
                  border: item.event.priority > 2 ? '2px solid #ff4d4f' : '1px solid transparent',
                  fontSize: '10px',
                  lineHeight: '12px',
                  minHeight: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#fff',
                  textShadow: '0 1px 1px rgba(0,0,0,0.4)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEvent(item.event);
                  setDrawerVisible(true);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                }}
                title={`${item.event.title}${item.event.location ? ` - 📍 ${item.event.location}` : ''}${!item.event.isAllDay ? ` - ⏰ ${parseBackendDate(item.event.startDate).format('HH:mm')}` : ' - Todo el día'}${item.event.eventSubjects?.length > 0 ? ` - 📚 ${item.event.eventSubjects[0].subject.name}` : ''}`}
              >
                <div style={{ 
                  flex: 1, 
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1px'
                }}>
                  {/* Primera línea: Icono + Título */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <span style={{ marginRight: '3px', fontSize: '9px' }}>
                      {getEventIcon(item.event.type)}
                    </span>
                    <span style={{ fontWeight: '600' }}>
                      {item.content.length > 14 ? `${item.content.substring(0, 14)}...` : item.content}
                    </span>
                  </div>
                  
                  {/* Segunda línea: Hora y/o Asignatura */}
                  <div style={{
                    fontSize: '8px',
                    opacity: 0.9,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {/* Mostrar hora si no es todo el día */}
                    {!item.event.isAllDay && (
                      <span style={{ fontWeight: '500' }}>
                        ⏰ {parseBackendDate(item.event.startDate).format('HH:mm')}
                      </span>
                    )}
                    
                    {/* Mostrar asignatura si existe */}
                    {item.event.eventSubjects && item.event.eventSubjects.length > 0 && (
                      <span style={{ 
                        fontWeight: '500',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        padding: '1px 3px',
                        borderRadius: '2px'
                      }}>
                        📚 {item.event.eventSubjects[0].subject.name.substring(0, 8)}
                      </span>
                    )}
                    
                    {/* Mostrar ubicación si existe */}
                    {item.event.location && (
                      <span style={{ opacity: 0.8 }}>
                        📍 {item.event.location.substring(0, 6)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Indicadores laterales */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '1px',
                  fontSize: '8px',
                  minWidth: '12px'
                }}>
                  {/* Prioridad alta */}
                  {item.event.priority > 2 && (
                    <span style={{ color: '#ffeb3b', fontSize: '10px' }}>⚠️</span>
                  )}
                  
                  {/* Tarea relacionada */}
                  {item.event.relatedTask && (
                    <span style={{ color: '#ffc107', fontSize: '9px' }}>📋</span>
                  )}
                  
                  {/* Recordatorio activado */}
                  {item.event.autoNotify && (
                    <span style={{ opacity: 0.7, fontSize: '8px' }}>🔔</span>
                  )}
                  
                  {/* Evento recurrente */}
                  {item.event.isRecurrent && (
                    <span style={{ opacity: 0.7, fontSize: '8px' }}>🔄</span>
                  )}
                </div>
              </div>
            </li>
          ))}
          {listData.length > 3 && (
            <li style={{ marginTop: '2px' }}>
              <div
                style={{ 
                  fontSize: '9px', 
                  color: '#666',
                  textAlign: 'center',
                  padding: '2px 4px',
                  background: 'linear-gradient(135deg, #f5f5f5, #e8e8e8)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  border: '1px dashed #ccc',
                  transition: 'all 0.2s ease'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDate(current);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e8e8e8';
                  e.currentTarget.style.color = '#333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f5f5f5, #e8e8e8)';
                  e.currentTarget.style.color = '#666';
                }}
                title="Ver todos los eventos del día"
              >
                📋 +{listData.length - 3} eventos más
              </div>
            </li>
          )}
        </ul>
      );
    }
    // For other cell types (month/year view), return null to avoid rendering issues
    return null;
  };

  const canCreateEvents = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'student';

  const filteredEvents = events.filter(event => {
    if (filterType === 'all') return true;
    return event.type === filterType;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading text="Cargando calendario..." size="large" />
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div className="mb-6">
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2}>
                <CalendarOutlined className="mr-2" />
                Calendario Escolar
              </Title>
              <Text type="secondary">
                Gestión de eventos, actividades y fechas importantes
              </Text>
            </Col>
            <Col>
              <Space>
                <Select
                  value={filterType}
                  onChange={setFilterType}
                  style={{ width: 150 }}
                  placeholder="Filtrar por tipo"
                >
                  <Option value="all">Todos</Option>
                  <Option value="activity">Actividades</Option>
                  <Option value="evaluation">Evaluaciones</Option>
                  <Option value="test_yourself">Test Yourself</Option>
                  <Option value="holiday">Festivos</Option>
                  <Option value="meeting">Reuniones</Option>
                </Select>
                {canCreateEvents && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setModalVisible(true)}
                  >
                    Nuevo Evento
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        {/* Calendar - Full Width */}
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card>
              <Calendar
                cellRender={cellRender}
                onSelect={(date) => {
                  setSelectedDate(date);
                  // If user can create events, also open the modal for quick event creation
                  if (canCreateEvents) {
                    setModalVisible(true);
                  }
                }}
                onPanelChange={(date) => {
                  const startOfMonth = date.startOf('month');
                  const endOfMonth = date.endOf('month');
                  fetchEventsByDateRange(startOfMonth, endOfMonth);
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Events Sections - Below Calendar */}
        <Row gutter={[16, 16]} className="mt-6">
          {/* Events List */}
          <Col xs={24} lg={12}>
            <Card 
              title={`Eventos - ${selectedDate.format('DD/MM/YYYY')}`}
              extra={<Badge count={selectedEvents.length} showZero />}
              size="small"
            >
              <List
                size="small"
                dataSource={selectedEvents}
                renderItem={(event) => {
                  // Determinar si el usuario puede editar este evento específico
                  const canEditThisEvent =
                    user?.role === 'admin' ||
                    user?.role === 'teacher' ||
                    event.createdBy?.id === user?.id;

                  return (
                  <List.Item
                    actions={[
                      // El botón de ver siempre está disponible
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => {
                          setSelectedEvent(event);
                          setDrawerVisible(true);
                        }}
                        title="Ver detalles del evento"
                      />,
                      // El botón de editar solo si tiene permisos
                      ...(canEditThisEvent ? [
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setSelectedEvent(event);
                            setEditModalVisible(true);

                            // Populate edit form with selected event data
                            editForm.setFieldsValue({
                              title: event.title,
                              description: event.description,
                              type: event.type,
                              dateRange: [parseBackendDate(event.startDate), parseBackendDate(event.endDate)],
                              isAllDay: event.isAllDay,
                              visibility: event.visibility,
                              location: event.location,
                              color: event.color,
                              priority: event.priority,
                              notifyBefore: event.notifyBefore,
                              autoNotify: event.autoNotify,
                              tags: event.tags
                            });

                            // Set edit visibility state
                            setEditSelectedVisibility(event.visibility);

                            // Set edit classes if class_specific visibility
                            if (event.visibility === 'class_specific' && event.eventGroups) {
                              const classIds = event.eventGroups.map(eg => eg.classGroup.id);
                              setEditSelectedClasses(classIds);
                            } else {
                              setEditSelectedClasses([]);
                            }

                            // Set edit students if there are specific students assigned
                            if (event.eventStudents && event.eventStudents.length > 0) {
                              const studentIds = event.eventStudents.map(es => es.student.id);
                              setEditSelectedStudentIds(studentIds);
                            } else {
                              setEditSelectedStudentIds([]);
                            }
                          }}
                          title="Editar evento"
                        />
                      ] : [])
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="small"
                          style={{ backgroundColor: event.color }}
                          icon={<CalendarOutlined />}
                        />
                      }
                      title={
                        <Tooltip title={canCreateEvents ? "Haz clic para ver detalles y editar" : event.title}>
                          <span
                            style={{ 
                              cursor: canCreateEvents ? 'pointer' : 'default',
                              color: canCreateEvents ? '#1890ff' : 'inherit',
                              fontSize: '13px'
                            }}
                            onClick={() => {
                              if (canCreateEvents) {
                                setSelectedEvent(event);
                                setDrawerVisible(true);
                              }
                            }}
                          >
                            {event.title}
                          </span>
                        </Tooltip>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Tag color={event.color} size="small">
                            {getEventTypeLabel(event.type)}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {event.isAllDay
                              ? 'Todo el día'
                              : `${parseBackendDate(event.startDate).format('HH:mm')} - ${parseBackendDate(event.endDate).format('HH:mm')}`
                            }
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                  );
                }}
                locale={{ emptyText: 'No hay eventos este día' }}
              />
            </Card>
          </Col>

          {/* Upcoming Events */}
          <Col xs={24} lg={12}>
            <Card title="Próximos Eventos" size="small">
              <List
                size="small"
                dataSource={events
                  .filter(event => parseBackendDate(event.startDate).isAfter(dayjs()))
                  .sort((a, b) => parseBackendDate(a.startDate).diff(parseBackendDate(b.startDate)))
                  .slice(0, 5)
                }
                renderItem={(event) => {
                  // Determinar si el usuario puede editar este evento específico
                  const canEditThisEvent =
                    user?.role === 'admin' ||
                    user?.role === 'teacher' ||
                    event.createdBy?.id === user?.id;

                  return (
                  <List.Item
                    actions={[
                      // El botón de ver siempre está disponible
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => {
                          setSelectedEvent(event);
                          setDrawerVisible(true);
                        }}
                        title="Ver detalles del evento"
                      />
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size="small"
                          style={{ backgroundColor: event.color }}
                          icon={<CalendarOutlined />}
                        />
                      }
                      title={
                        <span
                          style={{
                            cursor: 'pointer',
                            color: '#1890ff',
                            fontSize: '13px'
                          }}
                          onClick={() => {
                            setSelectedEvent(event);
                            setDrawerVisible(true);
                          }}
                          title={canCreateEvents ? "Haz clic para ver detalles y editar" : event.title}
                        >
                          {event.title}
                        </span>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {parseBackendDate(event.startDate).format('DD/MM/YYYY HH:mm')}
                        </Text>
                      }
                    />
                  </List.Item>
                  );
                }}
                locale={{ emptyText: 'No hay eventos próximos' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Create Event Modal */}
        <Modal
          title="Crear Nuevo Evento"
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
            setSelectedVisibility('');
            setSelectedClasses([]);
            setSelectedStudentIds([]);
          }}
          footer={null}
          width={800}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateEvent}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="title"
                  label="Título"
                  rules={[{ required: true, message: 'El título es requerido' }]}
                >
                  <Input placeholder="Título del evento" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="Tipo de Evento"
                  rules={[{ required: true, message: 'El tipo es requerido' }]}
                >
                  <Select placeholder="Selecciona el tipo">
                    {/* Show different event types based on user role */}
                    {user?.role === 'student' ? (
                      // Students can create personal events
                      <>
                        <Option value="general_event">Evento Personal</Option>
                        <Option value="deadline">Fecha Límite</Option>
                        <Option value="reminder">Recordatorio</Option>
                        <Option value="activity">Actividad Personal</Option>
                      </>
                    ) : (
                      // Admin and teachers have full access
                      <>
                        <Option value="activity">Actividad</Option>
                        <Option value="evaluation">Evaluación</Option>
                        <Option value="test_yourself">Test Yourself</Option>
                        <Option value="general_event">Evento General</Option>
                        <Option value="holiday">Festivo</Option>
                        <Option value="meeting">Reunión</Option>
                        <Option value="excursion">Excursión</Option>
                        <Option value="festival">Festival</Option>
                        <Option value="deadline">Fecha Límite</Option>
                        <Option value="reminder">Recordatorio</Option>
                      </>
                    )}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Descripción"
            >
              <TextArea rows={3} placeholder="Descripción del evento" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="dateRange"
                  label="Fecha y Hora"
                  rules={[{ required: true, message: 'La fecha es requerida' }]}
                >
                  <RangePicker
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    style={{ width: '100%' }}
                    placeholder={['Fecha inicio', 'Fecha fin']}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="isAllDay"
                  label="Todo el día"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="visibility"
                  label="Visibilidad"
                  rules={[{ required: true, message: 'La visibilidad es requerida' }]}
                >
                  <Select 
                    placeholder="Selecciona la visibilidad"
                    onChange={(value) => {
                      setSelectedVisibility(value);
                      // Reset selections when visibility changes
                      if (value !== 'class_specific') setSelectedClasses([]);
                    }}
                  >
                    {/* Show different options based on user role */}
                    {user?.role === 'student' ? (
                      // Students can only create private events or events visible to other students
                      <>
                        <Option value="private">Privado</Option>
                        <Option value="students_only">Visible para otros estudiantes</Option>
                      </>
                    ) : (
                      // Admin and teachers have full access
                      <>
                        <Option value="public">Público</Option>
                        <Option value="teachers_only">Solo Profesores</Option>
                        <Option value="students_only">Solo Estudiantes</Option>
                        <Option value="families_only">Solo Familias</Option>
                        <Option value="admin_only">Solo Administradores</Option>
                        <Option value="class_specific">Clases Específicas</Option>
                        <Option value="private">Privado</Option>
                      </>
                    )}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="location"
                  label="Ubicación"
                >
                  <Input placeholder="Ubicación del evento" />
                </Form.Item>
              </Col>
            </Row>

            {/* Conditional Class Selection */}
            {selectedVisibility === 'class_specific' && (
              <Row gutter={16}>
                <Col span={24}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                      <span style={{ color: '#ff4d4f' }}>*</span> Clases
                    </label>
                    <Select
                      mode="multiple"
                      placeholder={classGroups.length === 0 ? "Cargando clases..." : "Selecciona las clases que verán este evento"}
                      value={selectedClasses}
                      onChange={setSelectedClasses}
                      style={{ width: '100%' }}
                      loading={classGroups.length === 0}
                      notFoundContent={classGroups.length === 0 ? "No hay clases disponibles" : "Sin resultados"}
                    >
                      {classGroups.map(classGroup => (
                        <Option key={classGroup.id} value={classGroup.id}>
                          {classGroup.name}
                        </Option>
                      ))}
                    </Select>
                    {selectedClasses.length === 0 && (
                      <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                        Selecciona al menos una clase
                      </div>
                    )}
                    <div className="mt-2">
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        ℹ️ Se notificará automáticamente a todas las familias y estudiantes de las clases seleccionadas
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
            )}

            {/* Student Selection - Available for admin and teachers */}
            {(user?.role === 'admin' || user?.role === 'teacher') && (
              <Row gutter={16}>
                <Col span={24}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                      <UsergroupAddOutlined style={{ marginRight: '8px' }} />
                      Estudiantes Específicos (Opcional)
                    </label>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button
                        type="dashed"
                        onClick={() => handleOpenStudentSelector(false)}
                        icon={<UsergroupAddOutlined />}
                        style={{ width: '100%' }}
                      >
                        {selectedStudentIds.length > 0
                          ? `${selectedStudentIds.length} estudiante(s) seleccionado(s)`
                          : 'Seleccionar estudiantes específicos'}
                      </Button>
                      {selectedStudentIds.length > 0 && (
                        <Alert
                          type="info"
                          showIcon
                          message={`Se notificará a ${selectedStudentIds.length} estudiante(s) específico(s)`}
                          action={
                            <Button
                              size="small"
                              type="link"
                              danger
                              onClick={() => setSelectedStudentIds([])}
                            >
                              Limpiar
                            </Button>
                          }
                        />
                      )}
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        ℹ️ Si no seleccionas estudiantes específicos, el evento será visible según la configuración de visibilidad
                      </Text>
                    </Space>
                  </div>
                </Col>
              </Row>
            )}

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Crear Evento
                </Button>
                <Button onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setSelectedVisibility('');
                  setSelectedClasses([]);
                  setSelectedStudentIds([]);
                }}>
                  Cancelar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Event Details Drawer */}
        <Drawer
          title="Detalles del Evento"
          placement="right"
          onClose={() => {
            setDrawerVisible(false);
            setSelectedEvent(null);
          }}
          open={drawerVisible}
          width={600}
          extra={
            // Mostrar botones de editar/eliminar solo si:
            // - Admin o Teacher: pueden editar/eliminar cualquier evento
            // - Student o Family: solo pueden editar/eliminar eventos que ellos mismos crearon
            selectedEvent && (
              (user?.role === 'admin' || user?.role === 'teacher') ||
              (selectedEvent.createdBy?.id === user?.id)
            ) && (
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditModalVisible(true);
                    setDrawerVisible(false);

                    // Populate edit form with selected event data
                    editForm.setFieldsValue({
                      title: selectedEvent.title,
                      description: selectedEvent.description,
                      type: selectedEvent.type,
                      dateRange: [parseBackendDate(selectedEvent.startDate), parseBackendDate(selectedEvent.endDate)],
                      isAllDay: selectedEvent.isAllDay,
                      visibility: selectedEvent.visibility,
                      location: selectedEvent.location,
                      color: selectedEvent.color,
                      priority: selectedEvent.priority,
                      notifyBefore: selectedEvent.notifyBefore,
                      autoNotify: selectedEvent.autoNotify,
                      tags: selectedEvent.tags
                    });

                    // Set edit visibility state
                    setEditSelectedVisibility(selectedEvent.visibility);

                    // Set edit classes if class_specific visibility
                    if (selectedEvent.visibility === 'class_specific' && selectedEvent.eventGroups) {
                      const classIds = selectedEvent.eventGroups.map(eg => eg.classGroup.id);
                      setEditSelectedClasses(classIds);
                    } else {
                      setEditSelectedClasses([]);
                    }

                    // Set edit students if there are specific students assigned
                    if (selectedEvent.eventStudents && selectedEvent.eventStudents.length > 0) {
                      const studentIds = selectedEvent.eventStudents.map(es => es.student.id);
                      setEditSelectedStudentIds(studentIds);
                    } else {
                      setEditSelectedStudentIds([]);
                    }
                  }}
                >
                  Editar
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: '¿Eliminar evento?',
                      content: '¿Estás seguro de que quieres eliminar este evento?',
                      onOk: () => selectedEvent && handleDeleteEvent(selectedEvent.id),
                    });
                  }}
                >
                  Eliminar
                </Button>
              </Space>
            )
          }
        >
          {selectedEvent && (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>{selectedEvent.title}</Title>
                <Tag color={selectedEvent.color}>
                  {getEventTypeLabel(selectedEvent.type)}
                </Tag>
              </div>

              {selectedEvent.description && (
                <div>
                  <Text strong>Descripción:</Text>
                  <Paragraph>{selectedEvent.description}</Paragraph>
                </div>
              )}

              <div>
                <Space direction="vertical" size="small">
                  <div>
                    <ClockCircleOutlined className="mr-2" />
                    <Text strong>Fecha y Hora:</Text>
                  </div>
                  <Text>
                    {selectedEvent.isAllDay
                      ? `${parseBackendDate(selectedEvent.startDate).format('DD/MM/YYYY')} - Todo el día`
                      : `${parseBackendDate(selectedEvent.startDate).format('DD/MM/YYYY HH:mm')} - ${parseBackendDate(selectedEvent.endDate).format('DD/MM/YYYY HH:mm')}`
                    }
                  </Text>
                </Space>
              </div>

              {selectedEvent.location && (
                <div>
                  <Space direction="vertical" size="small">
                    <div>
                      <EnvironmentOutlined className="mr-2" />
                      <Text strong>Ubicación:</Text>
                    </div>
                    <Text>{selectedEvent.location}</Text>
                  </Space>
                </div>
              )}

              <div>
                <Space direction="vertical" size="small">
                  <div>
                    <UserOutlined className="mr-2" />
                    <Text strong>Creado por:</Text>
                  </div>
                  <Text>
                    {selectedEvent.createdBy.profile.firstName} {selectedEvent.createdBy.profile.lastName}
                  </Text>
                </Space>
              </div>

              {selectedEvent.eventGroups && selectedEvent.eventGroups.length > 0 && (
                <div>
                  <Space direction="vertical" size="small">
                    <div>
                      <TeamOutlined className="mr-2" />
                      <Text strong>Grupos:</Text>
                    </div>
                    <Space wrap>
                      {selectedEvent.eventGroups.map(eg => (
                        <Tag key={eg.classGroup.id}>{eg.classGroup.name}</Tag>
                      ))}
                    </Space>
                  </Space>
                </div>
              )}

              {selectedEvent.eventSubjects && selectedEvent.eventSubjects.length > 0 && (
                <div>
                  <Space direction="vertical" size="small">
                    <div>
                      <BookOutlined className="mr-2" />
                      <Text strong>Asignaturas:</Text>
                    </div>
                    <Space wrap>
                      {selectedEvent.eventSubjects.map(es => (
                        <Tag key={es.subject.id}>{es.subject.name}</Tag>
                      ))}
                    </Space>
                  </Space>
                </div>
              )}

              {selectedEvent.eventStudents && selectedEvent.eventStudents.length > 0 && (
                <div>
                  <Space direction="vertical" size="small">
                    <div>
                      <UsergroupAddOutlined className="mr-2" />
                      <Text strong>Estudiantes Específicos:</Text>
                    </div>
                    <Space wrap>
                      {selectedEvent.eventStudents.map(es => (
                        <Tag key={es.student.id} color="blue">
                          <UserOutlined style={{ marginRight: '4px' }} />
                          {es.student.user?.profile?.firstName} {es.student.user?.profile?.lastName}
                        </Tag>
                      ))}
                    </Space>
                  </Space>
                </div>
              )}

              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div>
                  <Text strong>Tags:</Text>
                  <div className="mt-2">
                    <Space wrap>
                      {selectedEvent.tags.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                </div>
              )}
            </Space>
          )}
        </Drawer>

        {/* Edit Event Modal */}
        <Modal
          title="Editar Evento"
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            editForm.resetFields();
            setEditSelectedVisibility('');
            setEditSelectedClasses([]);
            setEditSelectedStudentIds([]);
            setSelectedEvent(null);
          }}
          footer={null}
          width={800}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleEditEvent}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="title"
                  label="Título"
                  rules={[{ required: true, message: 'El título es requerido' }]}
                >
                  <Input placeholder="Título del evento" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="Tipo de Evento"
                  rules={[{ required: true, message: 'El tipo es requerido' }]}
                >
                  <Select placeholder="Selecciona el tipo">
                    {/* Show different event types based on user role */}
                    {user?.role === 'student' ? (
                      // Students can create personal events
                      <>
                        <Option value="general_event">Evento Personal</Option>
                        <Option value="deadline">Fecha Límite</Option>
                        <Option value="reminder">Recordatorio</Option>
                        <Option value="activity">Actividad Personal</Option>
                      </>
                    ) : (
                      // Admin and teachers have full access
                      <>
                        <Option value="activity">Actividad</Option>
                        <Option value="evaluation">Evaluación</Option>
                        <Option value="test_yourself">Test Yourself</Option>
                        <Option value="general_event">Evento General</Option>
                        <Option value="holiday">Festivo</Option>
                        <Option value="meeting">Reunión</Option>
                        <Option value="excursion">Excursión</Option>
                        <Option value="festival">Festival</Option>
                        <Option value="deadline">Fecha Límite</Option>
                        <Option value="reminder">Recordatorio</Option>
                      </>
                    )}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Descripción"
            >
              <TextArea rows={3} placeholder="Descripción del evento" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="dateRange"
                  label="Fecha y Hora"
                  rules={[{ required: true, message: 'La fecha es requerida' }]}
                >
                  <RangePicker
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    style={{ width: '100%' }}
                    placeholder={['Fecha inicio', 'Fecha fin']}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="isAllDay"
                  label="Todo el día"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="visibility"
                  label="Visibilidad"
                  rules={[{ required: true, message: 'La visibilidad es requerida' }]}
                >
                  <Select 
                    placeholder="Selecciona la visibilidad"
                    onChange={(value) => {
                      setEditSelectedVisibility(value);
                      // Reset selections when visibility changes
                      if (value !== 'class_specific') setEditSelectedClasses([]);
                    }}
                  >
                    {/* Show different options based on user role */}
                    {user?.role === 'student' ? (
                      // Students can only create private events or events visible to other students
                      <>
                        <Option value="private">Privado</Option>
                        <Option value="students_only">Visible para otros estudiantes</Option>
                      </>
                    ) : (
                      // Admin and teachers have full access
                      <>
                        <Option value="public">Público</Option>
                        <Option value="teachers_only">Solo Profesores</Option>
                        <Option value="students_only">Solo Estudiantes</Option>
                        <Option value="families_only">Solo Familias</Option>
                        <Option value="admin_only">Solo Administradores</Option>
                        <Option value="class_specific">Clases Específicas</Option>
                        <Option value="private">Privado</Option>
                      </>
                    )}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="location"
                  label="Ubicación"
                >
                  <Input placeholder="Ubicación del evento" />
                </Form.Item>
              </Col>
            </Row>

            {/* Conditional Class Selection for Edit */}
            {editSelectedVisibility === 'class_specific' && (
              <Row gutter={16}>
                <Col span={24}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                      <span style={{ color: '#ff4d4f' }}>*</span> Clases
                    </label>
                    <Select
                      mode="multiple"
                      placeholder={classGroups.length === 0 ? "Cargando clases..." : "Selecciona las clases que verán este evento"}
                      value={editSelectedClasses}
                      onChange={setEditSelectedClasses}
                      style={{ width: '100%' }}
                      loading={classGroups.length === 0}
                      notFoundContent={classGroups.length === 0 ? "No hay clases disponibles" : "Sin resultados"}
                    >
                      {classGroups.map(classGroup => (
                        <Option key={classGroup.id} value={classGroup.id}>
                          {classGroup.name}
                        </Option>
                      ))}
                    </Select>
                    {editSelectedClasses.length === 0 && (
                      <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                        Selecciona al menos una clase
                      </div>
                    )}
                    <div className="mt-2">
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        ℹ️ Se notificará automáticamente a todas las familias y estudiantes de las clases seleccionadas
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
            )}

            {/* Student Selection for Edit - Available for admin and teachers */}
            {(user?.role === 'admin' || user?.role === 'teacher') && (
              <Row gutter={16}>
                <Col span={24}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                      <UsergroupAddOutlined style={{ marginRight: '8px' }} />
                      Estudiantes Específicos (Opcional)
                    </label>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button
                        type="dashed"
                        onClick={() => handleOpenStudentSelector(true)}
                        icon={<UsergroupAddOutlined />}
                        style={{ width: '100%' }}
                      >
                        {editSelectedStudentIds.length > 0
                          ? `${editSelectedStudentIds.length} estudiante(s) seleccionado(s)`
                          : 'Seleccionar estudiantes específicos'}
                      </Button>
                      {editSelectedStudentIds.length > 0 && (
                        <Alert
                          type="info"
                          showIcon
                          message={`Se notificará a ${editSelectedStudentIds.length} estudiante(s) específico(s)`}
                          action={
                            <Button
                              size="small"
                              type="link"
                              danger
                              onClick={() => setEditSelectedStudentIds([])}
                            >
                              Limpiar
                            </Button>
                          }
                        />
                      )}
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        ℹ️ Si no seleccionas estudiantes específicos, el evento será visible según la configuración de visibilidad
                      </Text>
                    </Space>
                  </div>
                </Col>
              </Row>
            )}

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Actualizar Evento
                </Button>
                <Button onClick={() => {
                  setEditModalVisible(false);
                  editForm.resetFields();
                  setEditSelectedVisibility('');
                  setEditSelectedClasses([]);
                  setEditSelectedStudentIds([]);
                  setSelectedEvent(null);
                }}>
                  Cancelar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Student Selector Modal for Create */}
        <Modal
          title={
            <Space>
              <UsergroupAddOutlined />
              <span>Seleccionar Estudiantes Específicos</span>
            </Space>
          }
          open={studentSelectorVisible}
          onCancel={() => setStudentSelectorVisible(false)}
          onOk={() => setStudentSelectorVisible(false)}
          width={800}
          okText="Confirmar"
          cancelText="Cancelar"
        >
          <div className="mb-4">
            <Text type="secondary">
              Selecciona los estudiantes que recibirán notificación de este evento.
              Si no seleccionas ninguno, el evento será visible según la configuración de visibilidad.
            </Text>
          </div>

          <Transfer
            dataSource={availableStudents.map(student => ({
              key: student.id,
              title: `${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`.trim() || 'Sin nombre',
              description: student.classGroup?.name || 'Sin grupo',
            }))}
            titles={['Disponibles', 'Seleccionados']}
            targetKeys={selectedStudentIds}
            onChange={(targetKeys) => handleStudentSelectionChange(targetKeys as string[], false)}
            render={item => (
              <span>
                {item.title}
                <span style={{ color: '#999', marginLeft: '8px', fontSize: '12px' }}>
                  ({item.description})
                </span>
              </span>
            )}
            showSearch
            filterOption={(inputValue, item) =>
              item.title.toLowerCase().includes(inputValue.toLowerCase()) ||
              (item.description || '').toLowerCase().includes(inputValue.toLowerCase())
            }
            listStyle={{
              width: 350,
              height: 400,
            }}
            loading={loadingStudents}
          />

          <div className="mt-4 p-3 bg-gray-50 rounded" style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginTop: '16px' }}>
            <Text strong>Resumen:</Text>
            <div className="mt-2" style={{ marginTop: '8px' }}>
              {selectedStudentIds.length === 0 ? (
                <Text type="secondary">
                  ℹ️ Ningún estudiante seleccionado - El evento se mostrará según la visibilidad configurada
                </Text>
              ) : (
                <Text type="success" style={{ color: '#52c41a' }}>
                  ✓ {selectedStudentIds.length} estudiante(s) seleccionado(s)
                </Text>
              )}
            </div>
          </div>
        </Modal>

        {/* Student Selector Modal for Edit */}
        <Modal
          title={
            <Space>
              <UsergroupAddOutlined />
              <span>Seleccionar Estudiantes Específicos</span>
            </Space>
          }
          open={editStudentSelectorVisible}
          onCancel={() => setEditStudentSelectorVisible(false)}
          onOk={() => setEditStudentSelectorVisible(false)}
          width={800}
          okText="Confirmar"
          cancelText="Cancelar"
        >
          <div className="mb-4">
            <Text type="secondary">
              Selecciona los estudiantes que recibirán notificación de este evento.
              Si no seleccionas ninguno, el evento será visible según la configuración de visibilidad.
            </Text>
          </div>

          <Transfer
            dataSource={availableStudents.map(student => ({
              key: student.id,
              title: `${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`.trim() || 'Sin nombre',
              description: student.classGroup?.name || 'Sin grupo',
            }))}
            titles={['Disponibles', 'Seleccionados']}
            targetKeys={editSelectedStudentIds}
            onChange={(targetKeys) => handleStudentSelectionChange(targetKeys as string[], true)}
            render={item => (
              <span>
                {item.title}
                <span style={{ color: '#999', marginLeft: '8px', fontSize: '12px' }}>
                  ({item.description})
                </span>
              </span>
            )}
            showSearch
            filterOption={(inputValue, item) =>
              item.title.toLowerCase().includes(inputValue.toLowerCase()) ||
              (item.description || '').toLowerCase().includes(inputValue.toLowerCase())
            }
            listStyle={{
              width: 350,
              height: 400,
            }}
            loading={loadingStudents}
          />

          <div className="mt-4 p-3 bg-gray-50 rounded" style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginTop: '16px' }}>
            <Text strong>Resumen:</Text>
            <div className="mt-2" style={{ marginTop: '8px' }}>
              {editSelectedStudentIds.length === 0 ? (
                <Text type="secondary">
                  ℹ️ Ningún estudiante seleccionado - El evento se mostrará según la visibilidad configurada
                </Text>
              ) : (
                <Text type="success" style={{ color: '#52c41a' }}>
                  ✓ {editSelectedStudentIds.length} estudiante(s) seleccionado(s)
                </Text>
              )}
            </div>
          </div>
        </Modal>

        {/* Floating Action Button for Quick Event Creation */}
        {canCreateEvents && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 1000,
            }}
          >
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
              style={{
                width: '56px',
                height: '56px',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                background: 'linear-gradient(135deg, #1890ff, #096dd9)',
                border: 'none',
              }}
              title="Crear nuevo evento rápidamente"
            />
          </div>
        )}
      </div>

      <style>{`
        .events {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .events .ant-badge-status {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
          text-overflow: ellipsis;
          font-size: 12px;
        }
        .ant-picker-calendar-date-content {
          height: 80px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default CalendarPage;