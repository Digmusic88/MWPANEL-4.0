import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Select,
  Input,
  message,
  Space,
  Tag,
  Tabs,
  Row,
  Col,
  Calendar,
  Badge,
  Tooltip,
  Typography,
  Alert,
  List,
  Empty,
  Divider,
  Popconfirm,
  Steps,
  Statistic,
  Avatar,
  Checkbox,
  Drawer,
} from 'antd';
import { useResponsive } from '../../hooks/useResponsive';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  BookOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { familyMeetingsService, meetingsService } from '../../services/meetingsService';
import { apiClient } from '../../services/apiClient';
import {
  MeetingPeriod,
  MeetingSlotForFamily,
  MeetingBooking,
  BookMeetingSlot,
  CancelBooking,
  StudentWithTutors,
  MeetingFilters,
  BookingStatus,
} from '../../types/meetings';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const FamilyMeetingsPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  // Estado para períodos y slots
  const [periods, setPeriods] = useState<MeetingPeriod[]>([]);
  const [availableSlots, setAvailableSlots] = useState<MeetingSlotForFamily[]>([]);
  const [myBookings, setMyBookings] = useState<MeetingBooking[]>([]);
  const [myStudents, setMyStudents] = useState<StudentWithTutors[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estado para modales
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MeetingSlotForFamily | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<MeetingBooking | null>(null);
  const [bookingStep, setBookingStep] = useState(0);
  
  // Formularios
  const [bookingForm] = Form.useForm();
  const [cancelForm] = Form.useForm();

  // Cargar datos al montar el componente
  useEffect(() => {
    loadPeriods();
    loadMyStudents();
    loadMyBookings();
  }, []);

  // Cargar slots cuando se selecciona período o estudiante
  useEffect(() => {
    if (selectedPeriod && selectedStudentFilter) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedPeriod, selectedStudentFilter]);

  // Cargar períodos activos
  const loadPeriods = async () => {
    try {
      const response = await familyMeetingsService.getActivePeriods();
      setPeriods(response.periods);
      if (response.periods.length > 0 && !selectedPeriod) {
        setSelectedPeriod(response.periods[0].id);
      }
    } catch (error) {
      console.error('Error loading periods:', error);
      message.error('Error al cargar los períodos');
    }
  };

  // Cargar slots disponibles
  const loadAvailableSlots = async () => {
    if (!selectedPeriod || !selectedStudentFilter) return;

    try {
      setLoading(true);
      const filters: MeetingFilters = {
        periodId: selectedPeriod,
        studentId: selectedStudentFilter, // Filtrar por estudiante seleccionado
      };
      const response = await familyMeetingsService.getAvailableSlots(filters);
      setAvailableSlots(response.slots);
    } catch (error) {
      console.error('Error loading slots:', error);
      message.error('Error al cargar los slots disponibles');
    } finally {
      setLoading(false);
    }
  };

  // Cargar mis reservas
  const loadMyBookings = async () => {
    try {
      console.log('📅 Loading family bookings...');
      const response = await familyMeetingsService.getMyBookings();
      console.log('📊 Bookings response:', response);
      
      if (response?.bookings) {
        setMyBookings(response.bookings);
        console.log('✅ Bookings loaded:', response.bookings.length);
      } else {
        console.log('📝 No bookings found in response');
        setMyBookings([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading bookings:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      // Solo mostrar error si no es un problema de permisos/conexión
      if (error.response?.status !== 403 && error.response?.status !== 404) {
        setMyBookings([]);
      } else {
        setMyBookings([]);
      }
    }
  };

  // Cargar mis estudiantes
  const loadMyStudents = async () => {
    try {
      console.log('🔍 Loading family students...');
      
      // Intentar el endpoint específico de meetings
      try {
        const response = await familyMeetingsService.getMyStudents();
        console.log('📊 Meetings service response:', response);
        
        if (response.students && response.students.length > 0) {
          console.log('✅ Students found via meetings service:', response.students.length);
          setMyStudents(response.students);
          return;
        } else {
          console.log('📝 No students found in meetings service response');
        }
      } catch (error: any) {
        console.warn('⚠️ Meeting students endpoint failed:', error.response?.status, error.message);
        
        // Si es error 403 o 404, continuar con alternativas
        if (error.response?.status === 403 || error.response?.status === 404) {
          console.log('🔄 Trying alternative endpoint due to permission/not found error...');
        } else {
          console.error('❌ Unexpected error from meetings service:', error);
        }
      }

      // Si no funciona, usar el endpoint general de dashboard familiar
      try {
        console.log('🔄 Trying family dashboard endpoint...');
        const dashboardResponse = await apiClient.get('/families/dashboard/my-family');
        console.log('📊 Dashboard response:', dashboardResponse.data);
        
        if (dashboardResponse.data?.students && dashboardResponse.data.students.length > 0) {
          const formattedStudents = dashboardResponse.data.students.map((student: any) => ({
            id: student.id,
            enrollmentNumber: student.enrollmentNumber,
            user: {
              id: student.user.id,
              email: student.user.email,
              profile: student.user.profile
            },
            tutors: [] // Simplificado por ahora
          }));
          
          console.log('✅ Students found via dashboard:', formattedStudents.length);
          setMyStudents(formattedStudents);
          return;
        } else {
          console.log('📝 No students found in dashboard response');
        }
      } catch (error: any) {
        console.warn('⚠️ Dashboard endpoint also failed:', error.response?.status, error.message);
      }

      // Si todo falla, dejar vacío pero no mostrar error (el sistema puede funcionar sin estudiantes)
      console.log('📝 No students found for this family - will work as family-only meetings');
      setMyStudents([]);
      
    } catch (error: any) {
      console.error('❌ Error loading students:', error);
      // No mostrar mensaje de error ya que el sistema puede funcionar sin estudiantes específicos
    }
  };

  // Iniciar proceso de reserva
  const startBookingProcess = (slot: MeetingSlotForFamily) => {
    setSelectedSlot(slot);
    setBookingStep(0);
    setIsBookingModalVisible(true);
    bookingForm.resetFields();

    // Pre-seleccionar el estudiante si ya hay uno seleccionado en el filtro
    if (selectedStudentFilter) {
      bookingForm.setFieldValue('selectedStudents', [selectedStudentFilter]);
    }
  };

  // Confirmar reserva
  const handleBookSlot = async (values: any) => {
    if (!selectedSlot) return;

    try {
      console.log('📝 Form values received:', values);
      console.log('👥 Available students:', myStudents);

      // Normalizar selectedStudents para que sea siempre un array
      let selectedStudents = values.selectedStudents || [];

      // Si es un string (un solo estudiante), convertirlo a array
      if (typeof selectedStudents === 'string') {
        selectedStudents = [selectedStudents];
      }

      console.log('📋 Normalized selectedStudents:', selectedStudents);

      // Si no hay estudiantes disponibles, usar enfoque de familia sin estudiante específico
      if (myStudents.length === 0) {
        const bookingData: BookMeetingSlot = {
          slotId: selectedSlot.id,
          studentId: undefined, // Permitir reunión familiar sin estudiante específico
          notes: values.meetingDetails || values.notes || 'Reunión familiar general',
        };

        console.log('🏠 Family booking without specific student:', bookingData);
        const response = await familyMeetingsService.bookSlot(bookingData);
        message.success('Reunión reservada exitosamente para la familia');
        
        setIsBookingModalVisible(false);
        bookingForm.resetFields();
        setSelectedSlot(null);
        setBookingStep(0);
        
        loadAvailableSlots();
        loadMyBookings();
        return;
      }
      
      // Si hay estudiantes disponibles, validar selección
      if (selectedStudents.length === 0) {
        message.error('Debes seleccionar al menos un estudiante para la reunión');
        return;
      }

      // Validar que el estudiante seleccionado existe en la lista
      const primaryStudentId = selectedStudents[0];
      const selectedStudent = myStudents.find(s => s.id === primaryStudentId);
      
      if (!selectedStudent) {
        message.error('El estudiante seleccionado no es válido');
        return;
      }
      
      const bookingData: BookMeetingSlot = {
        slotId: selectedSlot.id,
        studentId: primaryStudentId,
        notes: values.meetingDetails || values.notes,
      };

      console.log('👦 Student-specific booking:', bookingData);
      const response = await familyMeetingsService.bookSlot(bookingData);
      
      // Mensaje personalizado según número de estudiantes
      const studentNames = selectedStudents.map((studentId: string) => {
        const student = myStudents.find(s => s.id === studentId);
        return student?.user.profile 
          ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
          : student?.user.email || 'Estudiante';
      });
      
      const successMessage = selectedStudents.length === 1 
        ? `Reunión reservada exitosamente para ${studentNames[0]}`
        : `Reunión reservada exitosamente para ${studentNames.join(', ')}`;
      
      message.success(successMessage);
      
      setIsBookingModalVisible(false);
      bookingForm.resetFields();
      setSelectedSlot(null);
      setBookingStep(0);
      
      // Recargar datos
      loadAvailableSlots();
      loadMyBookings();
    } catch (error: any) {
      console.error('Error booking slot:', error);
      const errorMessage = error.response?.data?.message || 'Error al reservar la reunión';
      message.error(errorMessage);
      
      // Si el error es de validación, mostrar más detalles
      if (error.response?.status === 400) {
        console.error('Validation error details:', error.response?.data);
      }
    }
  };

  // Cancelar reserva
  const handleCancelBooking = async (values: any) => {
    if (!selectedBooking) return;

    try {
      const cancelData: CancelBooking = {
        reason: values.reason,
      };

      const response = await familyMeetingsService.cancelBooking(selectedBooking.id, cancelData);
      message.success(response.message);
      
      setIsCancelModalVisible(false);
      cancelForm.resetFields();
      setSelectedBooking(null);
      
      // Recargar datos
      loadMyBookings();
      loadAvailableSlots();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      message.error(error.response?.data?.message || 'Error al cancelar la reserva');
    }
  };

  // Iniciar cancelación
  const startCancelProcess = (booking: MeetingBooking) => {
    setSelectedBooking(booking);
    setIsCancelModalVisible(true);
  };

  // Verificar si ya hay reserva para el período seleccionado con un estudiante específico
  const hasBookingForPeriodAndStudent = (periodId: string, studentId?: string): boolean => {
    return myBookings.some(booking =>
      booking.slot.period.id === periodId &&
      booking.status === BookingStatus.CONFIRMED &&
      booking.student?.id === studentId
    );
  };

  // Verificar si ya hay alguna reserva para el período (para mostrar advertencias)
  const hasAnyBookingForPeriod = (periodId: string): boolean => {
    return myBookings.some(booking =>
      booking.slot.period.id === periodId &&
      booking.status === BookingStatus.CONFIRMED
    );
  };

  // Verificar si el estudiante seleccionado ya tiene una reserva con el profesor de este slot
  const studentHasBookingWithTeacher = (slot: MeetingSlotForFamily): boolean => {
    if (!selectedStudentFilter || !slot.teacher) return false;

    return myBookings.some(booking =>
      booking.student?.id === selectedStudentFilter &&
      booking.slot.teacher.id === slot.teacher.id &&
      booking.slot.period.id === selectedPeriod &&
      (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PENDING)
    );
  };

  // Columnas móviles para slots disponibles
  const mobileSlotColumns = [
    {
      title: 'Slot',
      key: 'mobile',
      render: (record: MeetingSlotForFamily) => {
        const alreadyBooked = studentHasBookingWithTeacher(record);
        const teacherName = record.teacher?.user?.profile
          ? `${record.teacher.user.profile.firstName} ${record.teacher.user.profile.lastName}`
          : 'Profesor'; // RGPD: no mostrar email del profesor

        return (
          <div className="py-2">
            {/* Fecha y estado */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarOutlined className="text-blue-500" />
                <Text strong style={{ fontSize: '13px' }}>
                  {meetingsService.formatDateTime(record.startDatetime)}
                </Text>
              </div>
              <Tag color={record.isBookable ? 'green' : 'orange'} style={{ fontSize: '10px' }}>
                {record.isBookable ? 'Disponible' : 'No Disp.'}
              </Tag>
            </div>

            {/* Profesor */}
            <div className="mb-2 text-xs text-gray-600">
              <UserOutlined className="mr-1" style={{ color: '#1890ff' }} />
              {teacherName}
            </div>

            {/* Duración y acción */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Text type="secondary" style={{ fontSize: '11px' }}>
                <ClockCircleOutlined className="mr-1" />
                {record.durationMinutes} min
              </Text>
              <Button
                type="primary"
                size="small"
                icon={<BookOutlined />}
                onClick={() => startBookingProcess(record)}
                disabled={!record.isBookable || alreadyBooked}
                style={{ fontSize: '11px' }}
              >
                {alreadyBooked ? 'Reservado' : 'Reservar'}
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  // Columnas móviles para mis reservas
  const mobileBookingsColumns = [
    {
      title: 'Reserva',
      key: 'mobile',
      render: (record: MeetingBooking) => {
        const isUpcoming = dayjs(record.slot.startDatetime).isAfter(dayjs());
        const teacherName = record.slot.teacher?.user?.profile
          ? `${record.slot.teacher.user.profile.firstName} ${record.slot.teacher.user.profile.lastName}`
          : 'Profesor'; // RGPD: no mostrar email del profesor
        const studentName = record.student?.user?.profile
          ? `${record.student.user.profile.firstName}`
          : 'Familia';

        const statusConfig = {
          [BookingStatus.CONFIRMED]: { color: 'green', text: 'Confirmada' },
          [BookingStatus.CANCELLED]: { color: 'red', text: 'Cancelada' },
          [BookingStatus.PENDING]: { color: 'orange', text: 'Pendiente' },
        };

        return (
          <div className="py-2">
            {/* Fecha y estado */}
            <div className="flex items-center justify-between mb-2">
              <Text strong style={{ fontSize: '12px' }}>
                {dayjs(record.slot.startDatetime).format('DD/MM/YY HH:mm')}
              </Text>
              <Tag color={statusConfig[record.status].color} style={{ fontSize: '10px' }}>
                {statusConfig[record.status].text}
              </Tag>
            </div>

            {/* Profesor y estudiante */}
            <div className="text-xs text-gray-600 mb-2">
              <div><UserOutlined className="mr-1" style={{ color: '#1890ff' }} />{teacherName}</div>
              <div><TeamOutlined className="mr-1" style={{ color: '#52c41a' }} />{studentName}</div>
            </div>

            {/* Período y acción */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Tag color="blue" style={{ fontSize: '9px' }}>{record.slot.period.name}</Tag>
              {record.isCancellable && (
                <Popconfirm
                  title="¿Cancelar reserva?"
                  onConfirm={() => startCancelProcess(record)}
                  okText="Sí"
                  cancelText="No"
                  okType="danger"
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} style={{ fontSize: '10px' }}>
                    Cancelar
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  // Columnas de la tabla de slots disponibles (desktop)
  const slotsColumns = [
    {
      title: 'Fecha y Hora',
      key: 'datetime',
      render: (record: MeetingSlotForFamily) => (
        <div>
          <Text strong>{meetingsService.formatDateTime(record.startDatetime)}</Text>
          <br />
          <Text type="secondary">
            Duración: {record.durationMinutes} min
          </Text>
        </div>
      ),
    },
    {
      title: 'Profesor',
      key: 'teacher',
      render: (record: MeetingSlotForFamily) => {
        // Validación defensiva para evitar errores si teacher no existe
        if (!record.teacher || !record.teacher.user) {
          return <Text type="secondary">No disponible</Text>;
        }

        const teacherName = record.teacher.user.profile
          ? `${record.teacher.user.profile.firstName} ${record.teacher.user.profile.lastName}`
          : 'Profesor'; // RGPD: no mostrar email del profesor

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserOutlined style={{ color: '#1890ff' }} />
              <Text strong>{teacherName}</Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Estado',
      key: 'status',
      render: (record: MeetingSlotForFamily) => (
        <Tag color={record.isBookable ? 'green' : 'orange'}>
          {record.isBookable ? 'Disponible' : 'No Disponible'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: MeetingSlotForFamily) => {
        // Verificar si el estudiante seleccionado ya tiene una reserva con este profesor
        const alreadyBooked = studentHasBookingWithTeacher(record);

        return (
          <Button
            type="primary"
            size="small"
            icon={<BookOutlined />}
            onClick={() => startBookingProcess(record)}
            disabled={!record.isBookable || alreadyBooked}
          >
            {alreadyBooked ? 'Ya reservado' : 'Reservar'}
          </Button>
        );
      },
    },
  ];

  // Columnas mejoradas de la tabla de mis reservas
  const bookingsColumns = [
    {
      title: 'Reunión',
      key: 'meeting',
      render: (record: MeetingBooking) => (
        <div>
          <Text strong>{meetingsService.formatDateTime(record.slot.startDatetime)}</Text>
          <br />
          <Tag color="blue" size="small">{record.slot.period.name}</Tag>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Duración: {record.slot.durationMinutes} min
          </Text>
        </div>
      ),
    },
    {
      title: 'Profesor',
      key: 'teacher',
      render: (record: MeetingBooking) => {
        const teacher = record.slot.teacher;
        const profile = teacher.user.profile;
        const teacherName = profile
          ? `${profile.firstName} ${profile.lastName}`
          : 'Profesor'; // RGPD: no mostrar email del profesor
        
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserOutlined style={{ color: '#1890ff' }} />
              <Text strong>{teacherName}</Text>
            </div>
            {teacher.specialization && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {teacher.specialization}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Estudiante',
      key: 'student',
      render: (record: MeetingBooking) => {
        if (!record.student) {
          return (
            <div>
              <TeamOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
              <Text type="secondary">Reunión familiar</Text>
            </div>
          );
        }
        
        const profile = record.student.user.profile;
        const studentName = profile 
          ? `${profile.firstName} ${profile.lastName}`
          : record.student.user.email;
          
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserOutlined style={{ color: '#52c41a' }} />
              <Text strong>{studentName}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Matrícula: {record.student.enrollmentNumber}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Detalles',
      key: 'details',
      render: (record: MeetingBooking) => (
        <div>
          {record.notes && (
            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <strong>Notas:</strong> {record.notes}
              </Text>
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#666' }}>
            <div>Reservado: {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}</div>
            {record.updatedAt !== record.createdAt && (
              <div>Modificado: {dayjs(record.updatedAt).format('DD/MM/YYYY HH:mm')}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: BookingStatus, record: MeetingBooking) => {
        const config = {
          [BookingStatus.CONFIRMED]: { color: 'green', text: 'Confirmada', icon: <CheckCircleOutlined /> },
          [BookingStatus.CANCELLED]: { color: 'red', text: 'Cancelada', icon: <ExclamationCircleOutlined /> },
          [BookingStatus.PENDING]: { color: 'orange', text: 'Pendiente', icon: <ClockCircleOutlined /> },
        };
        
        const statusConfig = config[status];
        const isUpcoming = dayjs(record.slot.startDatetime).isAfter(dayjs());
        
        return (
          <div>
            <Tag color={statusConfig.color} icon={statusConfig.icon}>
              {statusConfig.text}
            </Tag>
            {status === BookingStatus.CONFIRMED && (
              <div style={{ marginTop: '4px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {isUpcoming ? '⏰ Próxima' : '✅ Pasada'}
                </Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: MeetingBooking) => {
        const isUpcoming = dayjs(record.slot.startDatetime).isAfter(dayjs());
        
        return (
          <Space direction="vertical" size="small">
            {record.isCancellable && (
              <Popconfirm
                title="¿Cancelar reserva?"
                description="Solo se puede cancelar hasta 24 horas antes de la reunión."
                onConfirm={() => startCancelProcess(record)}
                okText="Sí, cancelar"
                cancelText="No"
                okType="danger"
              >
                <Button 
                  type="text" 
                  danger 
                  size="small"
                  icon={<DeleteOutlined />}
                  style={{ fontSize: '12px' }}
                >
                  Cancelar
                </Button>
              </Popconfirm>
            )}
            
            {isUpcoming && record.status === BookingStatus.CONFIRMED && (
              <Button
                type="link"
                size="small"
                icon={<CalendarOutlined />}
                style={{ fontSize: '12px', padding: 0 }}
                onClick={() => {
                  const eventDate = dayjs(record.slot.startDatetime);
                  message.info(`Reunión programada para ${eventDate.format('DD/MM/YYYY')} a las ${eventDate.format('HH:mm')}`);
                }}
              >
                Ver en calendario
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // Renderizar calendario con slots
  const renderCalendarCell = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const daySlots = availableSlots.filter(slot => 
      slot.startDatetime.startsWith(dateStr)
    );
    const dayBookings = myBookings.filter(booking => 
      booking.slot.startDatetime.startsWith(dateStr) &&
      booking.status === BookingStatus.CONFIRMED
    );

    return (
      <div>
        {daySlots.map(slot => (
          <Badge
            key={slot.id}
            status="processing"
            text={meetingsService.formatTime(slot.startDatetime)}
            style={{ 
              fontSize: '10px', 
              display: 'block',
              cursor: slot.isBookable ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (slot.isBookable) {
                startBookingProcess(slot);
              }
            }}
          />
        ))}
        {dayBookings.map(booking => (
          <Badge
            key={booking.id}
            status="success"
            text={`${meetingsService.formatTime(booking.slot.startDatetime)} (Reservado)`}
            style={{ fontSize: '10px', display: 'block', fontWeight: 'bold' }}
          />
        ))}
      </div>
    );
  };

  // Manejar click en fecha del calendario
  const handleCalendarSelect = (date: Dayjs) => {
    if (!selectedPeriod) {
      return;
    }

    const dateStr = date.format('YYYY-MM-DD');
    const availableSlotsForDate = availableSlots.filter(slot =>
      slot.startDatetime.startsWith(dateStr) && slot.isBookable
    );

    if (availableSlotsForDate.length === 0) {
      message.info('No hay slots disponibles para esta fecha');
      return;
    }

    // Si solo hay un slot disponible, abrirlo directamente
    if (availableSlotsForDate.length === 1) {
      startBookingProcess(availableSlotsForDate[0]);
      return;
    }

    // Si hay múltiples slots, mostrar un modal de selección
    Modal.info({
      title: `Slots disponibles para ${date.format('DD/MM/YYYY')}`,
      width: 500,
      content: (
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
            Selecciona un horario para la reunión:
          </Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            {availableSlotsForDate.map(slot => (
              <Button
                key={slot.id}
                type="default"
                block
                icon={<ClockCircleOutlined />}
                onClick={() => {
                  Modal.destroyAll(); // Cerrar el modal de selección
                  startBookingProcess(slot);
                }}
                style={{
                  textAlign: 'left',
                  height: 'auto',
                  padding: '12px 16px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {meetingsService.formatTime(slot.startDatetime)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Duración: {slot.durationMinutes} minutos
                  </div>
                </div>
              </Button>
            ))}
          </Space>
        </div>
      ),
      okText: 'Cerrar',
      onOk: () => Modal.destroyAll()
    });
  };

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <Title level={isMobile ? 3 : 2}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          {isMobile ? 'Reuniones' : 'Reuniones con Profesores'}
        </Title>
        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
          {isMobile ? 'Reserva reuniones' : 'Reserva reuniones con los profesores de tus hijos'}
        </Text>
      </div>

      {/* Selectores de período y estudiante */}
      <Card
        style={{ marginBottom: isMobile ? '16px' : '24px' }}
        bodyStyle={{ padding: isMobile ? '12px' : '24px' }}
      >
        <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} align="top">
          <Col xs={24} md={12}>
            <div style={{ marginBottom: isMobile ? '8px' : '16px' }}>
              <Text strong style={{ fontSize: isMobile ? '12px' : '14px' }}>
                {isMobile ? '1. Período:' : '1. Selecciona el período:'}
              </Text>
              <br />
              <Select
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Selecciona un período"
                size={isMobile ? 'middle' : 'large'}
              >
                {periods.map(period => (
                  <Option key={period.id} value={period.id}>
                    {period.name}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: isMobile ? '8px' : '16px' }}>
              <Text strong style={{ fontSize: isMobile ? '12px' : '14px' }}>
                {isMobile ? '2. Hijo:' : '2. Selecciona el hijo:'}
              </Text>
              <br />
              <Select
                value={selectedStudentFilter}
                onChange={(value) => {
                  setSelectedStudentFilter(value);
                  setAvailableSlots([]); // Limpiar slots al cambiar de estudiante
                }}
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Selecciona un estudiante"
                disabled={!selectedPeriod || myStudents.length === 0}
                size={isMobile ? 'middle' : 'large'}
              >
                {myStudents.map(student => (
                  <Option key={student.id} value={student.id}>
                    {student.user.profile
                      ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
                      : student.user.email
                    }
                  </Option>
                ))}
              </Select>
              {myStudents.length === 0 && (
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  No hay estudiantes disponibles
                </Text>
              )}
            </div>
          </Col>
        </Row>

        {selectedPeriod && hasAnyBookingForPeriod(selectedPeriod) && (
          <Alert
            message="Tienes reuniones reservadas para este período"
            description={
              <div>
                {myBookings
                  .filter(b =>
                    b.slot.period.id === selectedPeriod &&
                    b.status === BookingStatus.CONFIRMED
                  )
                  .map((booking, idx) => {
                    // Validación defensiva para profesor
                    const teacherName = booking.slot?.teacher?.user?.profile
                      ? `${booking.slot.teacher.user.profile.firstName} ${booking.slot.teacher.user.profile.lastName}`
                      : 'Profesor'; // RGPD: no mostrar email del profesor

                    return (
                      <div key={idx}>
                        • {booking.student ? `${booking.student.user.profile?.firstName || 'Estudiante'}` : 'Familia'}
                        {' '}con{' '}
                        {teacherName}
                      </div>
                    );
                  })
                }
                <div style={{ marginTop: '8px' }}>
                  Puedes reservar reuniones adicionales para tus otros hijos.
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}

        {!selectedStudentFilter && selectedPeriod && myStudents.length > 0 && (
          <Alert
            message="Selecciona un estudiante"
            description="Debes seleccionar primero para qué hijo quieres ver y reservar las reuniones. Solo aparecerán los horarios del tutor de ese estudiante."
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}

        {selectedStudentFilter && selectedPeriod && (
          <Alert
            message={`Reuniones para ${myStudents.find(s => s.id === selectedStudentFilter)?.user.profile?.firstName || 'el estudiante'}`}
            description="Verás únicamente los horarios disponibles del tutor de este estudiante. Puedes cambiar de estudiante para ver los horarios de otros profesores."
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </Card>

      {selectedPeriod && selectedStudentFilter && (
        <Tabs
          defaultActiveKey="available"
          size={isMobile ? 'small' : 'middle'}
          tabBarStyle={{ marginBottom: isMobile ? 12 : 16 }}
          items={[
            {
              key: 'available',
              label: isMobile ? 'Slots' : 'Slots Disponibles',
              icon: <ClockCircleOutlined />,
              children: (
                <Card bodyStyle={{ padding: isMobile ? '8px' : '24px' }}>
                  <Table
                    columns={isMobile ? mobileSlotColumns : slotsColumns}
                    dataSource={availableSlots}
                    loading={loading}
                    rowKey="id"
                    size={isMobile ? 'small' : 'middle'}
                    scroll={isMobile ? undefined : { x: 600 }}
                    pagination={{
                      pageSize: isMobile ? 5 : 10,
                      showSizeChanger: !isMobile,
                      showTotal: isMobile ? undefined : (total) => `Total: ${total} slots disponibles`,
                      simple: isMobile,
                    }}
                    locale={{
                      emptyText: 'No hay slots disponibles para las selecciones actuales'
                    }}
                  />
                </Card>
              ),
            },
            {
              key: 'calendar',
              label: isMobile ? 'Calendario' : 'Vista de Calendario',
              icon: <CalendarOutlined />,
              children: (
                <Card bodyStyle={{ padding: isMobile ? '8px' : '24px' }}>
                  {!isMobile && (
                    <Alert
                      message="Cómo usar el calendario"
                      description="Haz clic en una fecha para ver los horarios disponibles y reservar directamente."
                      type="info"
                      showIcon
                      style={{ marginBottom: '16px' }}
                    />
                  )}
                  <Calendar
                    cellRender={renderCalendarCell}
                    onSelect={handleCalendarSelect}
                    mode="month"
                    fullscreen={!isMobile}
                  />
                </Card>
              ),
            },
            {
              key: 'bookings',
              label: isMobile ? 'Reservas' : 'Mis Reservas',
              icon: <BookOutlined />,
              children: (
                <Card bodyStyle={{ padding: isMobile ? '8px' : '24px' }}>
                  <div style={{ marginBottom: isMobile ? '8px' : '16px' }}>
                    <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
                      <Col xs={12} sm={6}>
                        <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '16px', textAlign: 'center' }}>
                          <Statistic
                            title={<span style={{ fontSize: isMobile ? '10px' : '14px' }}>Total</span>}
                            value={myBookings.length}
                            prefix={<BookOutlined />}
                            valueStyle={{ color: '#1890ff', fontSize: isMobile ? '16px' : '20px' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '16px', textAlign: 'center' }}>
                          <Statistic
                            title={<span style={{ fontSize: isMobile ? '10px' : '14px' }}>Confirmadas</span>}
                            value={myBookings.filter(b => b.status === BookingStatus.CONFIRMED).length}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a', fontSize: isMobile ? '16px' : '20px' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '16px', textAlign: 'center' }}>
                          <Statistic
                            title={<span style={{ fontSize: isMobile ? '10px' : '14px' }}>Próximas</span>}
                            value={myBookings.filter(b =>
                              dayjs(b.slot.startDatetime).isAfter(dayjs()) &&
                              b.status === BookingStatus.CONFIRMED
                            ).length}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#faad14', fontSize: isMobile ? '16px' : '20px' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '16px', textAlign: 'center' }}>
                          <Statistic
                            title={<span style={{ fontSize: isMobile ? '10px' : '14px' }}>Canceladas</span>}
                            value={myBookings.filter(b => b.status === BookingStatus.CANCELLED).length}
                            prefix={<ExclamationCircleOutlined />}
                            valueStyle={{ color: '#ff4d4f', fontSize: isMobile ? '16px' : '20px' }}
                          />
                        </Card>
                      </Col>
                    </Row>
                  </div>

                  {myBookings.length === 0 ? (
                    <Empty
                      description="No tienes reservas de reuniones"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                      <Button
                        type="primary"
                        icon={<CalendarOutlined />}
                        size={isMobile ? 'middle' : 'large'}
                      >
                        Reservar Reunión
                      </Button>
                    </Empty>
                  ) : (
                    <div>
                      {!isMobile && (
                        <div style={{ marginBottom: '16px' }}>
                          <Alert
                            message="Gestión de Reservas"
                            description="Puedes cancelar hasta 24 horas antes de la reunión."
                            type="info"
                            showIcon
                            closable
                          />
                        </div>
                      )}

                      <Table
                        columns={isMobile ? mobileBookingsColumns : bookingsColumns}
                        dataSource={myBookings}
                        rowKey="id"
                        size={isMobile ? 'small' : 'middle'}
                        scroll={isMobile ? undefined : { x: 800 }}
                        pagination={{
                          pageSize: isMobile ? 5 : 10,
                          showSizeChanger: !isMobile,
                          showQuickJumper: !isMobile,
                          showTotal: isMobile ? undefined : (total, range) =>
                            `${range[0]}-${range[1]} de ${total} reservas`,
                          simple: isMobile,
                        }}
                        locale={{
                          emptyText: 'No tienes reservas aún'
                        }}
                        rowClassName={(record) => {
                          const isUpcoming = dayjs(record.slot.startDatetime).isAfter(dayjs());
                          const isToday = dayjs(record.slot.startDatetime).isSame(dayjs(), 'day');

                          if (isToday && record.status === BookingStatus.CONFIRMED) {
                            return 'table-row-today';
                          }
                          if (isUpcoming && record.status === BookingStatus.CONFIRMED) {
                            return 'table-row-upcoming';
                          }
                          if (record.status === BookingStatus.CANCELLED) {
                            return 'table-row-cancelled';
                          }
                          return '';
                        }}
                      />

                      <style>
                        {`
                          .table-row-today {
                            background-color: #fff7e6 !important;
                            border-left: 4px solid #faad14;
                          }
                          .table-row-upcoming {
                            background-color: #f6ffed !important;
                            border-left: 4px solid #52c41a;
                          }
                          .table-row-cancelled {
                            background-color: #fff2f0 !important;
                            border-left: 4px solid #ff4d4f;
                            opacity: 0.7;
                          }
                          .table-row-today:hover,
                          .table-row-upcoming:hover,
                          .table-row-cancelled:hover {
                            background-color: #e6f7ff !important;
                          }
                        `}
                      </style>
                    </div>
                  )}
                </Card>
              ),
            },
            {
              key: 'students',
              label: isMobile ? 'Hijos' : 'Mis Hijos',
              icon: <TeamOutlined />,
              children: (
                <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: isMobile ? '12px' : '16px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                      {isMobile ? 'Estudiantes' : 'Mis Estudiantes'}
                    </Title>
                    <Tag color="blue">{myStudents.length} hijo(s)</Tag>
                  </div>

                  {myStudents.length === 0 ? (
                    <Empty
                      description="No hay estudiantes asignados"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                      <Alert
                        message="Sin estudiantes asociados"
                        description={isMobile
                          ? "Contacta con el centro educativo para asociar estudiantes."
                          : "No tienes estudiantes asociados. Las reuniones se programarán como reuniones familiares."
                        }
                        type="info"
                        showIcon
                      />
                    </Empty>
                  ) : (
                    <div>
                      {!isMobile && (
                        <Alert
                          message="Información sobre reuniones"
                          description="Puedes programar reuniones específicas para cada uno de tus hijos."
                          type="info"
                          showIcon
                          style={{ marginBottom: '16px' }}
                        />
                      )}

                      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
                        {myStudents.map((student) => {
                          const studentBookings = myBookings.filter(booking =>
                            booking.student?.id === student.id
                          );
                          const upcomingBookings = studentBookings.filter(booking =>
                            dayjs(booking.slot.startDatetime).isAfter(dayjs()) &&
                            booking.status === BookingStatus.CONFIRMED
                          );
                          const pastBookings = studentBookings.filter(booking =>
                            dayjs(booking.slot.startDatetime).isBefore(dayjs())
                          );

                          return (
                            <Col xs={24} sm={12} lg={8} key={student.id}>
                              <Card
                                size="small"
                                style={{ height: '100%' }}
                                bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
                              >
                                <div style={{ textAlign: 'center', marginBottom: isMobile ? '8px' : '16px' }}>
                                  <Avatar
                                    size={isMobile ? 48 : 64}
                                    icon={<UserOutlined />}
                                    style={{ backgroundColor: '#1890ff', marginBottom: '8px' }}
                                  />
                                  <div>
                                    <Text strong style={{ fontSize: isMobile ? '14px' : '16px' }}>
                                      {student.user.profile
                                        ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
                                        : student.user.email
                                      }
                                    </Text>
                                  </div>
                                  <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>
                                    Matrícula: {student.enrollmentNumber}
                                  </Text>
                                </div>

                                <Divider style={{ margin: isMobile ? '8px 0' : '12px 0' }} />

                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '12px' : '14px' }}>
                                    <Text type="secondary">Próximas:</Text>
                                    <Tag color={upcomingBookings.length > 0 ? 'green' : 'default'} style={{ fontSize: isMobile ? '10px' : '12px' }}>
                                      {upcomingBookings.length}
                                    </Tag>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '12px' : '14px' }}>
                                    <Text type="secondary">Pasadas:</Text>
                                    <Tag color="blue" style={{ fontSize: isMobile ? '10px' : '12px' }}>{pastBookings.length}</Tag>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '12px' : '14px' }}>
                                    <Text type="secondary">Total:</Text>
                                    <Tag color="purple" style={{ fontSize: isMobile ? '10px' : '12px' }}>{studentBookings.length}</Tag>
                                  </div>
                                </Space>

                                <div style={{ marginTop: isMobile ? '8px' : '16px', textAlign: 'center' }}>
                                  <Button
                                    type="primary"
                                    size={isMobile ? 'small' : 'middle'}
                                    icon={<CalendarOutlined />}
                                    onClick={() => {
                                      setSelectedSlot(null);
                                      bookingForm.setFieldValue('selectedStudents', [student.id]);
                                      message.info(`Listo para programar reunión`);
                                    }}
                                    style={{ width: '100%' }}
                                  >
                                    {isMobile ? 'Programar' : 'Programar Reunión'}
                                  </Button>
                                </div>

                                {upcomingBookings.length > 0 && (
                                  <div style={{ marginTop: isMobile ? '8px' : '12px' }}>
                                    <Text strong style={{ fontSize: isMobile ? '10px' : '12px', color: '#52c41a' }}>
                                      PRÓXIMA REUNIÓN:
                                    </Text>
                                    <div style={{
                                      backgroundColor: '#f6ffed',
                                      border: '1px solid #b7eb8f',
                                      borderRadius: '4px',
                                      padding: isMobile ? '6px' : '8px',
                                      marginTop: '4px'
                                    }}>
                                      <div style={{ fontSize: isMobile ? '10px' : '12px' }}>
                                        <strong>{meetingsService.formatDateTime(upcomingBookings[0].slot.startDatetime)}</strong>
                                      </div>
                                      <div style={{ fontSize: isMobile ? '9px' : '11px', color: '#666' }}>
                                        {upcomingBookings[0].slot.teacher.user.profile
                                          ? `${upcomingBookings[0].slot.teacher.user.profile.firstName} ${upcomingBookings[0].slot.teacher.user.profile.lastName}`
                                          : 'Profesor' /* RGPD: no mostrar email del profesor */
                                        }
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  )}
                </Card>
              ),
            },
          ]}
        />
      )}

      {/* Modal/Drawer de reserva - Drawer en móvil, Modal en desktop */}
      {isMobile ? (
        <Drawer
          title="Reservar Reunión"
          open={isBookingModalVisible}
          onClose={() => {
            setIsBookingModalVisible(false);
            bookingForm.resetFields();
            setSelectedSlot(null);
            setBookingStep(0);
          }}
          placement="bottom"
          height="85vh"
          styles={{ body: { padding: '12px', paddingBottom: '24px' } }}
        >
          <Steps
            current={bookingStep}
            size="small"
            style={{ marginBottom: '16px' }}
            items={[
              { title: 'Confirmar', icon: <CheckCircleOutlined /> },
              { title: 'Reservar', icon: <BookOutlined /> },
            ]}
          />

          {selectedSlot && (
            <div>
              {bookingStep === 0 && (
                <div>
                  <Alert
                    message="Datos de la reunión"
                    description={
                      <div style={{ fontSize: '13px' }}>
                        <p><strong>Fecha:</strong> {meetingsService.formatDateTime(selectedSlot.startDatetime)}</p>
                        <p><strong>Duración:</strong> {selectedSlot.durationMinutes} min</p>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                  <Button type="primary" onClick={() => setBookingStep(1)} block>
                    Continuar
                  </Button>
                </div>
              )}

              {bookingStep === 1 && (
                <Form form={bookingForm} layout="vertical" onFinish={handleBookSlot}>
                  <Form.Item
                    name="selectedStudents"
                    label={<span style={{ fontSize: '13px' }}>Selecciona estudiante(s)</span>}
                    rules={myStudents.length > 0 ? [{ required: true, message: 'Selecciona al menos un estudiante' }] : []}
                  >
                    <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '12px', backgroundColor: '#fafafa' }}>
                      {myStudents.length > 0 ? (
                        myStudents.map((student) => {
                          const hasBooking = selectedPeriod && hasBookingForPeriodAndStudent(selectedPeriod, student.id);
                          return (
                            <div key={student.id} style={{ marginBottom: '8px' }}>
                              <Checkbox
                                value={student.id}
                                disabled={hasBooking}
                                onChange={(e) => {
                                  const current = bookingForm.getFieldValue('selectedStudents') || [];
                                  if (e.target.checked) {
                                    bookingForm.setFieldValue('selectedStudents', [...current, student.id]);
                                  } else {
                                    bookingForm.setFieldValue('selectedStudents', current.filter((id: string) => id !== student.id));
                                  }
                                }}
                                style={{ opacity: hasBooking ? 0.6 : 1 }}
                              >
                                <div style={{ marginLeft: '4px' }}>
                                  <div style={{ fontWeight: 'bold', color: hasBooking ? '#999' : '#1890ff', fontSize: '13px' }}>
                                    {student.user.profile ? `${student.user.profile.firstName} ${student.user.profile.lastName}` : student.user.email}
                                    {hasBooking && <Tag color="green" style={{ marginLeft: '4px', fontSize: '10px' }}>Ya reservado</Tag>}
                                  </div>
                                </div>
                              </Checkbox>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ textAlign: 'center', color: '#666', padding: '12px' }}>
                          <TeamOutlined style={{ fontSize: '24px', marginBottom: '4px', display: 'block', color: '#1890ff' }} />
                          <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Reunión Familiar</div>
                        </div>
                      )}
                    </div>
                  </Form.Item>

                  <Form.Item name="meetingDetails" label={<span style={{ fontSize: '13px' }}>Detalles (opcional)</span>}>
                    <TextArea rows={3} placeholder="Temas a tratar..." maxLength={500} showCount style={{ fontSize: '13px' }} />
                  </Form.Item>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <Button onClick={() => setBookingStep(0)} style={{ flex: 1 }}>Atrás</Button>
                    <Button onClick={() => { setIsBookingModalVisible(false); bookingForm.resetFields(); setSelectedSlot(null); setBookingStep(0); }} style={{ flex: 1 }}>
                      Cancelar
                    </Button>
                    <Button type="primary" htmlType="submit" style={{ flex: 1 }}>Confirmar</Button>
                  </div>
                </Form>
              )}
            </div>
          )}
        </Drawer>
      ) : (
        <Modal
          title="Reservar Reunión"
          open={isBookingModalVisible}
          onCancel={() => {
            setIsBookingModalVisible(false);
            bookingForm.resetFields();
            setSelectedSlot(null);
            setBookingStep(0);
          }}
          footer={null}
          width={600}
        >
          <Steps
            current={bookingStep}
            style={{ marginBottom: '24px' }}
            items={[
              { title: 'Confirmar Datos', icon: <CheckCircleOutlined /> },
              { title: 'Completar Reserva', icon: <BookOutlined /> },
            ]}
          />

          {selectedSlot && (
            <div>
              {bookingStep === 0 && (
                <div>
                  <Alert
                    message="Datos de la reunión"
                    description={
                      <div>
                        <p><strong>Fecha y hora:</strong> {meetingsService.formatDateTime(selectedSlot.startDatetime)}</p>
                        <p><strong>Duración:</strong> {selectedSlot.durationMinutes} minutos</p>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                  <div style={{ textAlign: 'right' }}>
                    <Button type="primary" onClick={() => setBookingStep(1)}>Continuar</Button>
                  </div>
                </div>
              )}

              {bookingStep === 1 && (
                <Form form={bookingForm} layout="vertical" onFinish={handleBookSlot}>
                  <Form.Item
                    name="selectedStudents"
                    label="Selecciona los estudiantes para la reunión"
                    rules={myStudents.length > 0 ? [{ required: true, message: 'Debes seleccionar al menos un estudiante' }] : []}
                    help={myStudents.length > 0 ? "Puedes seleccionar uno o varios hijos" : "Reunión familiar"}
                  >
                    <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', backgroundColor: '#fafafa' }}>
                      {myStudents.length > 0 ? (
                        myStudents.map((student) => {
                          const hasBooking = selectedPeriod && hasBookingForPeriodAndStudent(selectedPeriod, student.id);
                          return (
                            <div key={student.id} style={{ marginBottom: '8px' }}>
                              <Checkbox
                                value={student.id}
                                disabled={hasBooking}
                                onChange={(e) => {
                                  const current = bookingForm.getFieldValue('selectedStudents') || [];
                                  if (e.target.checked) {
                                    bookingForm.setFieldValue('selectedStudents', [...current, student.id]);
                                  } else {
                                    bookingForm.setFieldValue('selectedStudents', current.filter((id: string) => id !== student.id));
                                  }
                                }}
                                style={{ padding: '8px', borderRadius: '4px', opacity: hasBooking ? 0.6 : 1 }}
                              >
                                <div style={{ marginLeft: '8px' }}>
                                  <div style={{ fontWeight: 'bold', color: hasBooking ? '#999' : '#1890ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {student.user.profile ? `${student.user.profile.firstName} ${student.user.profile.lastName}` : student.user.email}
                                    {hasBooking && <Tag color="green" size="small">Ya tiene reunión</Tag>}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666' }}>Matrícula: {student.enrollmentNumber}</div>
                                </div>
                              </Checkbox>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                          <TeamOutlined style={{ fontSize: '32px', marginBottom: '8px', display: 'block', color: '#1890ff' }} />
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Reunión Familiar</div>
                          <div style={{ fontSize: '14px' }}>Esta reunión será para toda la familia.</div>
                        </div>
                      )}
                    </div>
                  </Form.Item>

                  <Form.Item
                    name="meetingDetails"
                    label="Detalles y motivos de la reunión (opcional)"
                    help="Describe qué temas quieres tratar"
                  >
                    <TextArea rows={4} placeholder="Ej: Progreso en matemáticas, comportamiento..." maxLength={500} showCount />
                  </Form.Item>

                  <Alert
                    message="Importante"
                    description="Puedes tener una reunión por cada hijo. Podrás cancelar hasta 24h antes."
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />

                  <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                    <Space>
                      <Button onClick={() => setBookingStep(0)}>Atrás</Button>
                      <Button onClick={() => { setIsBookingModalVisible(false); bookingForm.resetFields(); setSelectedSlot(null); setBookingStep(0); }}>
                        Cancelar
                      </Button>
                      <Button type="primary" htmlType="submit">Confirmar Reserva</Button>
                    </Space>
                  </Form.Item>
                </Form>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Modal/Drawer de cancelación */}
      {isMobile ? (
        <Drawer
          title="Cancelar Reserva"
          open={isCancelModalVisible}
          onClose={() => {
            setIsCancelModalVisible(false);
            cancelForm.resetFields();
            setSelectedBooking(null);
          }}
          placement="bottom"
          height="auto"
          styles={{ body: { padding: '12px', paddingBottom: '24px' } }}
        >
          {selectedBooking && (
            <div>
              <Alert
                message="Reserva a cancelar"
                description={
                  <div style={{ fontSize: '13px' }}>
                    <p><strong>Fecha:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</p>
                    <p><strong>Estudiante:</strong> {
                      selectedBooking.student?.user?.profile
                        ? `${selectedBooking.student.user.profile.firstName} ${selectedBooking.student.user.profile.lastName}`
                        : selectedBooking.student?.user?.email || 'Reunión familiar'
                    }</p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: '12px' }}
              />

              <Form form={cancelForm} layout="vertical" onFinish={handleCancelBooking}>
                <Form.Item
                  name="reason"
                  label={<span style={{ fontSize: '13px' }}>Motivo de cancelación</span>}
                  rules={[{ required: true, message: 'Introduce el motivo' }]}
                >
                  <TextArea rows={2} placeholder="Motivo..." style={{ fontSize: '13px' }} />
                </Form.Item>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button onClick={() => { setIsCancelModalVisible(false); cancelForm.resetFields(); setSelectedBooking(null); }} style={{ flex: 1 }}>
                    Cerrar
                  </Button>
                  <Button type="primary" danger htmlType="submit" style={{ flex: 1 }}>
                    Cancelar Reserva
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </Drawer>
      ) : (
        <Modal
          title="Cancelar Reserva"
          open={isCancelModalVisible}
          onCancel={() => {
            setIsCancelModalVisible(false);
            cancelForm.resetFields();
            setSelectedBooking(null);
          }}
          footer={null}
          width={500}
        >
          {selectedBooking && (
            <div>
              <Alert
                message="Datos de la reserva a cancelar"
                description={
                  <div>
                    <p><strong>Fecha y hora:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</p>
                    <p><strong>Estudiante:</strong> {
                      selectedBooking.student?.user?.profile
                        ? `${selectedBooking.student.user.profile.firstName} ${selectedBooking.student.user.profile.lastName}`
                        : selectedBooking.student?.user?.email || 'Reunión familiar'
                    }</p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <Form form={cancelForm} layout="vertical" onFinish={handleCancelBooking}>
                <Form.Item
                  name="reason"
                  label="Motivo de la cancelación"
                  rules={[{ required: true, message: 'Introduce el motivo de la cancelación' }]}
                >
                  <TextArea rows={3} placeholder="Explica brevemente el motivo de la cancelación..." />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => { setIsCancelModalVisible(false); cancelForm.resetFields(); setSelectedBooking(null); }}>
                      Cerrar
                    </Button>
                    <Button type="primary" danger htmlType="submit">
                      Cancelar Reserva
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default FamilyMeetingsPage;