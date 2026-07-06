import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  InputNumber,
  message,
  Space,
  Tag,
  Tabs,
  Row,
  Col,
  Calendar,
  Badge,
  Tooltip,
  Popconfirm,
  Typography,
  Alert,
  List,
  Empty,
  Divider,
  Drawer,
  Dropdown,
} from 'antd';
import { useResponsive } from '../../hooks/useResponsive';
import {
  PlusOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DeleteOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  AppstoreAddOutlined,
  MoreOutlined,
  SettingOutlined,
  HistoryOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { teacherMeetingsService, meetingsService } from '../../services/meetingsService';
import {
  MeetingPeriod,
  MeetingSlot,
  CreateMeetingSlot,
  CreateBulkSlots,
  SlotTime,
  FamilyWithStudents,
  MeetingFilters,
  MeetingBooking,
  BookingStatus,
  CancelBooking,
  MeetingSpace,
  ConfirmBookingRequest,
  DenyBookingRequest,
  AssignSpaceRequest,
  FamilyMeetingsHistoryResponse,
  FamilyMeetingHistoryBooking,
} from '../../types/meetings';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

export const TeacherMeetingsPage: React.FC = () => {
  // Hook responsive
  const { isMobile, isTablet } = useResponsive();

  // Estado para períodos y slots
  const [periods, setPeriods] = useState<MeetingPeriod[]>([]);
  const [slots, setSlots] = useState<MeetingSlot[]>([]);
  const [bookings, setBookings] = useState<MeetingBooking[]>([]);
  const [families, setFamilies] = useState<FamilyWithStudents[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [showPastBookings, setShowPastBookings] = useState(false);

  // Filtrar bookings y slots por fecha actual
  const now = new Date().toISOString();
  const upcomingBookings = bookings.filter(b => b.slot.startDatetime >= now);
  const pastBookings = bookings.filter(b => b.slot.startDatetime < now);

  // Filtrar slots para ocultar los que ya pasaron
  const futureSlots = slots.filter(slot => slot.startDatetime >= now);

  // Calcular reservas pendientes (solo en futuras)
  const pendingBookingsCount = upcomingBookings.filter(b => b.status === 'pending').length;

  // Estado para modales
  const [isCreateSlotModalVisible, setIsCreateSlotModalVisible] = useState(false);
  const [isBulkCreateModalVisible, setIsBulkCreateModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MeetingSlot | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<MeetingBooking | null>(null);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isDenyModalVisible, setIsDenyModalVisible] = useState(false);
  const [isAssignSpaceModalVisible, setIsAssignSpaceModalVisible] = useState(false);
  const [isAssignFamilyModalVisible, setIsAssignFamilyModalVisible] = useState(false);
  const [familiesWithoutBooking, setFamiliesWithoutBooking] = useState<FamilyWithStudents[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Dayjs | null>(null);
  const [isCalendarDayModalVisible, setIsCalendarDayModalVisible] = useState(false);

  // Estado para espacios disponibles
  const [availableSpaces, setAvailableSpaces] = useState<MeetingSpace[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);

  // Estado para historial de reuniones con familia
  const [isFamilyHistoryModalVisible, setIsFamilyHistoryModalVisible] = useState(false);
  const [selectedFamilyHistory, setSelectedFamilyHistory] = useState<FamilyMeetingsHistoryResponse | null>(null);
  const [loadingFamilyHistory, setLoadingFamilyHistory] = useState(false);

  // Formularios
  const [createForm] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [confirmForm] = Form.useForm();
  const [denyForm] = Form.useForm();
  const [assignSpaceForm] = Form.useForm();
  const [assignFamilyForm] = Form.useForm();

  // Cargar datos al montar el componente
  useEffect(() => {
    loadPeriods();
    loadFamilies();
  }, []);

  // Cargar slots y reservas cuando se selecciona un período
  // Ya no dependemos de showPastBookings porque siempre cargamos TODOS los bookings
  // y los filtramos en el cliente
  useEffect(() => {
    if (selectedPeriod) {
      loadSlots();
      loadBookings();
    }
  }, [selectedPeriod]);

  // Cargar períodos activos
  const loadPeriods = async () => {
    try {
      const response = await teacherMeetingsService.getActivePeriods();
      setPeriods(response.periods);
      if (response.periods.length > 0 && !selectedPeriod) {
        setSelectedPeriod(response.periods[0].id);
      }
    } catch (error) {
      console.error('Error loading periods:', error);
      message.error('Error al cargar los períodos');
    }
  };

  // Cargar slots del período seleccionado
  const loadSlots = async () => {
    if (!selectedPeriod) return;
    
    try {
      setLoading(true);
      const filters: MeetingFilters = { periodId: selectedPeriod };
      const response = await teacherMeetingsService.getMySlots(filters);
      setSlots(response.slots);
    } catch (error) {
      console.error('Error loading slots:', error);
      message.error('Error al cargar los slots');
    } finally {
      setLoading(false);
    }
  };

  // Cargar familias asociadas
  const loadFamilies = async () => {
    try {
      const response = await teacherMeetingsService.getMyFamilies();
      setFamilies(response.families);
    } catch (error) {
      console.error('Error loading families:', error);
      message.error('Error al cargar las familias');
    }
  };

  // Cargar historial de reuniones con una familia
  const loadFamilyHistory = async (familyId: string) => {
    try {
      setLoadingFamilyHistory(true);
      const response = await teacherMeetingsService.getFamilyMeetingsHistory(familyId);
      setSelectedFamilyHistory(response);
      setIsFamilyHistoryModalVisible(true);
    } catch (error) {
      console.error('Error loading family history:', error);
      message.error('Error al cargar el historial de reuniones');
    } finally {
      setLoadingFamilyHistory(false);
    }
  };

  // Cargar reservas del período seleccionado
  const loadBookings = async () => {
    if (!selectedPeriod) return;

    try {
      setBookingsLoading(true);

      // IMPORTANTE: Para el modal de detalles, necesitamos TODAS las reservas
      // (tanto pasadas como futuras), no solo las filtradas por showPastBookings
      // Cargaremos todas las reservas y luego filtraremos en la UI para las tabs
      const filters: MeetingFilters = {
        periodId: selectedPeriod,
        // No enviamos showPast para obtener TODAS las reservas
      };

      // DEBUG: Log filter being sent
      console.log('🔍 [MeetingsPage] loadBookings - Filtros enviados:', filters);
      console.log('🔍 [MeetingsPage] showPastBookings state (para tabs UI):', showPastBookings);

      const response = await teacherMeetingsService.getMyBookings(filters);

      // DEBUG: Log response received
      console.log('📦 [MeetingsPage] Respuesta recibida:', {
        count: response.bookings.length,
        bookings: response.bookings.map(b => ({
          id: b.id,
          slotId: b.slot.id,
          date: b.slot.startDatetime,
          status: b.status,
          familia: b.family?.primaryContact?.profile?.firstName || 'N/A'
        }))
      });

      setBookings(response.bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      message.error('Error al cargar las reservas');
    } finally {
      setBookingsLoading(false);
    }
  };

  // Crear slot individual
  const handleCreateSlot = async (values: any) => {
    try {
      // Crear la fecha manteniendo la hora local sin conversión de timezone
      const localDateTime = values.datetime.format('YYYY-MM-DDTHH:mm:ss');
      
      const slotData: CreateMeetingSlot = {
        periodId: selectedPeriod!,
        startDatetime: localDateTime,
        durationMinutes: values.durationMinutes,
        notes: values.notes,
      };

      const response = await teacherMeetingsService.createSlot(slotData);
      message.success(response.message);
      
      setIsCreateSlotModalVisible(false);
      createForm.resetFields();
      loadSlots();
    } catch (error: any) {
      console.error('Error creating slot:', error);
      message.error(error.response?.data?.message || 'Error al crear el slot');
    }
  };

  // Crear múltiples slots
  const handleBulkCreateSlots = async (values: any) => {
    try {
      // Transformar datos del frontend al formato que espera el backend
      const slots: any[] = [];
      
      // Combinar cada fecha con cada horario para crear slots individuales
      const dates = values.dates.map((date: Dayjs) => date.format('YYYY-MM-DD'));
      const times = values.times.map((time: any) => ({
        time: time.time.format('HH:mm'),
        durationMinutes: time.duration,
      }));

      // Crear un slot por cada combinación fecha + hora
      dates.forEach((date: string) => {
        times.forEach((time: any) => {
          // Crear la fecha y hora exacta sin conversión de timezone
          // Mantenemos la hora local española sin aplicar DST automático
          const localDateTime = `${date}T${time.time}:00`;
          
          slots.push({
            startDatetime: localDateTime,
            durationMinutes: time.durationMinutes,
          });
        });
      });

      // Datos en formato que espera el backend
      const bulkData = {
        periodId: selectedPeriod!,
        slots,
        notes: values.notes,
      };

      const response = await teacherMeetingsService.createBulkSlots(bulkData);
      message.success(response.message);
      
      setIsBulkCreateModalVisible(false);
      bulkForm.resetFields();
      loadSlots();
    } catch (error: any) {
      console.error('Error creating bulk slots:', error);
      message.error(error.response?.data?.message || 'Error al crear los slots');
    }
  };

  // Eliminar slot
  const handleDeleteSlot = async (slotId: string) => {
    try {
      await teacherMeetingsService.deleteSlot(slotId);
      message.success('Slot eliminado correctamente');
      loadSlots();
    } catch (error: any) {
      console.error('Error deleting slot:', error);
      message.error(error.response?.data?.message || 'Error al eliminar el slot');
    }
  };

  // Cancelar reserva
  const handleCancelBooking = async (values: CancelBooking) => {
    if (!selectedBooking) return;

    try {
      await teacherMeetingsService.cancelBooking(selectedBooking.id, values);
      message.success('Reserva cancelada exitosamente. El slot ahora está disponible.');

      setIsCancelModalVisible(false);
      setSelectedBooking(null);
      cancelForm.resetFields();

      // Recargar datos
      loadBookings();
      loadSlots();
    } catch (error: any) {
      console.error('Error canceling booking:', error);
      message.error(error.response?.data?.message || 'Error al cancelar la reserva');
    }
  };

  // Cargar espacios disponibles para una reserva
  const loadAvailableSpaces = async (booking: MeetingBooking) => {
    try {
      setLoadingSpaces(true);
      const response = await teacherMeetingsService.getAvailableSpaces(
        booking.slot.startDatetime,
        booking.slot.durationMinutes
      );
      setAvailableSpaces(response.spaces);
    } catch (error: any) {
      console.error('Error loading available spaces:', error);
      message.error('Error al cargar los espacios disponibles');
    } finally {
      setLoadingSpaces(false);
    }
  };

  // Confirmar reserva pendiente
  const handleConfirmBooking = async (values: ConfirmBookingRequest) => {
    if (!selectedBooking) return;

    try {
      const response = await teacherMeetingsService.confirmBooking(selectedBooking.id, values);
      message.success(response.message);

      setIsConfirmModalVisible(false);
      setSelectedBooking(null);
      confirmForm.resetFields();

      // Recargar datos
      loadBookings();
      loadSlots();
    } catch (error: any) {
      console.error('Error confirming booking:', error);
      message.error(error.response?.data?.message || 'Error al confirmar la reserva');
    }
  };

  // Denegar reserva pendiente
  const handleDenyBooking = async (values: DenyBookingRequest) => {
    if (!selectedBooking) return;

    try {
      const response = await teacherMeetingsService.denyBooking(selectedBooking.id, values);
      message.success(response.message);

      setIsDenyModalVisible(false);
      setSelectedBooking(null);
      denyForm.resetFields();

      // Recargar datos
      loadBookings();
      loadSlots();
    } catch (error: any) {
      console.error('Error denying booking:', error);
      message.error(error.response?.data?.message || 'Error al denegar la reserva');
    }
  };

  // Asignar espacio a reserva confirmada
  const handleAssignSpace = async (values: AssignSpaceRequest) => {
    if (!selectedBooking) return;

    try {
      const response = await teacherMeetingsService.assignSpace(selectedBooking.id, values);
      message.success(response.message);

      setIsAssignSpaceModalVisible(false);
      setSelectedBooking(null);
      assignSpaceForm.resetFields();

      // Recargar datos
      loadBookings();
    } catch (error: any) {
      console.error('Error assigning space:', error);
      message.error(error.response?.data?.message || 'Error al asignar el espacio');
    }
  };

  // Abrir modal de confirmación y cargar espacios
  const openConfirmModal = async (booking: MeetingBooking) => {
    setSelectedBooking(booking);
    setIsConfirmModalVisible(true);
    await loadAvailableSpaces(booking);
  };

  // Abrir modal de asignación de espacio y cargar espacios
  const openAssignSpaceModal = async (booking: MeetingBooking) => {
    setSelectedBooking(booking);
    setIsAssignSpaceModalVisible(true);
    await loadAvailableSpaces(booking);
  };

  // Cargar familias sin reserva en el período actual
  const loadFamiliesWithoutBooking = async () => {
    if (!selectedPeriod) return;

    try {
      const response = await teacherMeetingsService.getFamiliesWithoutBooking(selectedPeriod);
      setFamiliesWithoutBooking(response.families);
    } catch (error: any) {
      console.error('Error loading families without booking:', error);
      message.error('Error al cargar las familias disponibles');
    }
  };

  // Abrir modal de asignación de familia
  const openAssignFamilyModal = async (slot: MeetingSlot) => {
    setSelectedSlot(slot);
    setIsAssignFamilyModalVisible(true);
    await loadFamiliesWithoutBooking();
  };

  // Asignar slot a familia
  const handleAssignFamily = async (values: { familyId: string; studentId: string; notes?: string }) => {
    if (!selectedSlot) return;

    try {
      const response = await teacherMeetingsService.assignSlotToFamily(selectedSlot.id, values);
      message.success(response.message);

      setIsAssignFamilyModalVisible(false);
      setSelectedSlot(null);
      assignFamilyForm.resetFields();

      // Recargar datos
      loadSlots();
      loadBookings();
    } catch (error: any) {
      console.error('Error assigning slot to family:', error);
      message.error(error.response?.data?.message || 'Error al asignar la reunión a la familia');
    }
  };

  // Columnas móviles para slots
  const mobileSlotColumns = [
    {
      title: 'Slot',
      key: 'slot',
      render: (record: MeetingSlot) => (
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <Text strong style={{ fontSize: 14 }}>{meetingsService.formatDateTime(record.startDatetime)}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>{record.durationMinutes} min</Text>
              </div>
            </div>
            <Space size={4}>
              <Tag color={record.isAvailable ? 'green' : 'red'} style={{ margin: 0 }}>
                {record.isAvailable ? 'Disp.' : 'No disp.'}
              </Tag>
              {record.hasActiveBooking && <Tag color="blue" style={{ margin: 0 }}>Reserv.</Tag>}
            </Space>
          </div>
          {record.notes && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              {record.notes.length > 40 ? record.notes.substring(0, 40) + '...' : record.notes}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (record: MeetingSlot) => (
        <Dropdown
          menu={{
            items: [
              { key: 'view', icon: <CalendarOutlined />, label: 'Ver detalles', onClick: () => setSelectedSlot(record) },
              ...(!record.hasActiveBooking ? [
                { key: 'assign', icon: <UserOutlined />, label: 'Asignar familia', onClick: () => openAssignFamilyModal(record) },
                { key: 'delete', icon: <DeleteOutlined />, label: 'Eliminar', danger: true, onClick: () => handleDeleteSlot(record.id) },
              ] : []),
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Dropdown>
      ),
    },
  ];

  // Columnas de la tabla de slots (desktop)
  const desktopSlotColumns = [
    {
      title: 'Fecha y Hora',
      key: 'datetime',
      render: (record: MeetingSlot) => (
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
      title: 'Estado',
      key: 'status',
      render: (record: MeetingSlot) => (
        <Space direction="vertical" size="small">
          <Tag color={record.isAvailable ? 'green' : 'red'}>
            {record.isAvailable ? 'Disponible' : 'No Disponible'}
          </Tag>
          {record.hasActiveBooking && (
            <Tag color="blue">Reservado</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Notas',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string) => notes || <Text type="secondary">Sin notas</Text>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: MeetingSlot) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space>
            <Tooltip title="Ver detalles">
              <Button
                type="text"
                icon={<CalendarOutlined />}
                onClick={() => setSelectedSlot(record)}
              />
            </Tooltip>
            {!record.hasActiveBooking && (
              <>
                <Tooltip title="Asignar a familia">
                  <Button
                    type="text"
                    icon={<UserOutlined />}
                    onClick={() => openAssignFamilyModal(record)}
                  />
                </Tooltip>
                <Popconfirm
                  title="¿Eliminar slot?"
                  description="Esta acción no se puede deshacer."
                  onConfirm={() => handleDeleteSlot(record.id)}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okType="danger"
                >
                  <Tooltip title="Eliminar">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Tooltip>
                </Popconfirm>
              </>
            )}
          </Space>
        </Space>
      ),
    },
  ];

  // Seleccionar columnas según dispositivo
  const slotsColumns = isMobile ? mobileSlotColumns : desktopSlotColumns;

  // Columnas móviles para reservas
  const mobileBookingsColumns = [
    {
      title: 'Reserva',
      key: 'booking',
      render: (record: MeetingBooking) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          confirmed: { color: 'green', text: 'Conf.' },
          cancelled: { color: 'red', text: 'Cancel.' },
          pending: { color: 'orange', text: 'Pend.' },
        };
        const config = statusConfig[record.status] || statusConfig.pending;

        return (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: 14 }}>{meetingsService.formatDateTime(record.slot.startDatetime)}</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{record.slot.durationMinutes} min</Text>
                </div>
              </div>
              <Tag color={config.color} style={{ margin: 0 }}>{config.text}</Tag>
            </div>
            <div style={{ marginBottom: 4 }}>
              <TeamOutlined style={{ marginRight: 4, color: '#1890ff' }} />
              <Text style={{ fontSize: 13 }}>
                {record.family.primaryContact.profile
                  ? `${record.family.primaryContact.profile.firstName} ${record.family.primaryContact.profile.lastName}`
                  : record.family.primaryContact.email
                }
              </Text>
            </div>
            <div>
              <UserOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.student.user.profile
                  ? `${record.student.user.profile.firstName} ${record.student.user.profile.lastName}`
                  : record.student.user.email
                }
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (record: MeetingBooking) => {
        // Si la reunión ya pasó, no permitir acciones
        const isPast = new Date(record.slot.startDatetime) < new Date();
        if (isPast) {
          return <Text type="secondary" style={{ fontSize: 11 }}>Pasada</Text>;
        }

        const menuItems = [];
        if (record.status === BookingStatus.PENDING) {
          menuItems.push(
            { key: 'confirm', icon: <CheckCircleOutlined />, label: 'Confirmar', onClick: () => openConfirmModal(record) },
            { key: 'deny', icon: <ExclamationCircleOutlined />, label: 'Denegar', danger: true, onClick: () => { setSelectedBooking(record); setIsDenyModalVisible(true); } }
          );
        }
        if (record.status === BookingStatus.CONFIRMED) {
          menuItems.push(
            { key: 'space', icon: <SettingOutlined />, label: 'Asignar espacio', onClick: () => openAssignSpaceModal(record) },
            { key: 'cancel', icon: <DeleteOutlined />, label: 'Cancelar', danger: true, onClick: () => { setSelectedBooking(record); setIsCancelModalVisible(true); } }
          );
        }
        if (menuItems.length === 0) return <Text type="secondary" style={{ fontSize: 11 }}>-</Text>;

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ];

  // Columnas desktop para reservas
  const desktopBookingsColumns = [
    {
      title: 'Fecha y Hora',
      key: 'datetime',
      render: (record: MeetingBooking) => (
        <div>
          <Text strong>{meetingsService.formatDateTime(record.slot.startDatetime)}</Text>
          <br />
          <Text type="secondary">
            Duración: {record.slot.durationMinutes} min
          </Text>
        </div>
      ),
    },
    {
      title: 'Familia',
      key: 'family',
      render: (record: MeetingBooking) => (
        <div>
          <Text strong>
            {record.family.primaryContact.profile
              ? `${record.family.primaryContact.profile.firstName} ${record.family.primaryContact.profile.lastName}`
              : record.family.primaryContact.email
            }
          </Text>
        </div>
      ),
    },
    {
      title: 'Estudiante',
      key: 'student',
      render: (record: MeetingBooking) => (
        <div>
          <Text>
            {record.student.user.profile
              ? `${record.student.user.profile.firstName} ${record.student.user.profile.lastName}`
              : record.student.user.email
            }
          </Text>
          <br />
          <Text type="secondary">Nº {record.student.enrollmentNumber}</Text>
        </div>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (record: MeetingBooking) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          confirmed: { color: 'green', text: 'Confirmada' },
          cancelled: { color: 'red', text: 'Cancelada' },
          pending: { color: 'orange', text: 'Pendiente' },
        };
        const config = statusConfig[record.status] || statusConfig.pending;

        return (
          <div>
            <Tag color={config.color}>{config.text}</Tag>
            {record.cancelledAt && (
              <>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {meetingsService.formatDateTime(record.cancelledAt)}
                </Text>
              </>
            )}
          </div>
        );
      },
    },
    {
      title: 'Notas',
      key: 'notes',
      render: (record: MeetingBooking) => (
        <div>
          {record.notes && (
            <Text style={{ display: 'block', marginBottom: '4px' }}>
              {record.notes}
            </Text>
          )}
          {record.cancelReason && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Motivo cancelación: {record.cancelReason}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: MeetingBooking) => {
        // Si la reunión ya pasó, mostrar mensaje informativo
        const isPast = new Date(record.slot.startDatetime) < new Date();
        if (isPast) {
          return (
            <Tooltip title="Esta reunión ya ha pasado y no puede modificarse">
              <Text type="secondary">Reunión pasada</Text>
            </Tooltip>
          );
        }

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {record.status === BookingStatus.PENDING && (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => openConfirmModal(record)}
                  size="small"
                  block
                >
                  Confirmar
                </Button>
                <Button
                  danger
                  icon={<ExclamationCircleOutlined />}
                  onClick={() => {
                    setSelectedBooking(record);
                    setIsDenyModalVisible(true);
                  }}
                  size="small"
                  block
                >
                  Denegar
                </Button>
              </>
            )}
            {record.status === BookingStatus.CONFIRMED && (
              <>
                <Button
                  type="default"
                  icon={<CheckCircleOutlined />}
                  onClick={() => openAssignSpaceModal(record)}
                  size="small"
                  block
                >
                  Asignar Espacio
                </Button>
                <Tooltip title="Cancelar reunión confirmada">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setSelectedBooking(record);
                      setIsCancelModalVisible(true);
                    }}
                    size="small"
                    block
                  >
                    Cancelar
                  </Button>
                </Tooltip>
              </>
            )}
            {record.status === BookingStatus.CANCELLED && (
              <Text type="secondary">Cancelada</Text>
            )}
          </Space>
        );
      },
    },
  ];

  // Seleccionar columnas de reservas según dispositivo
  const bookingsColumns = isMobile ? mobileBookingsColumns : desktopBookingsColumns;

  // Renderizar calendario con slots
  const renderCalendarCell = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const daySlots = slots.filter(slot =>
      slot.startDatetime.startsWith(dateStr)
    );

    if (daySlots.length === 0) return null;

    return (
      <div>
        {daySlots.map(slot => (
          <Badge
            key={slot.id}
            status={slot.hasActiveBooking ? 'success' : (slot.isAvailable ? 'processing' : 'error')}
            text={meetingsService.formatTime(slot.startDatetime)}
            style={{ fontSize: '10px', display: 'block' }}
          />
        ))}
      </div>
    );
  };

  // Manejar clic en día del calendario
  const handleCalendarDaySelect = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const daySlots = slots.filter(slot =>
      slot.startDatetime.startsWith(dateStr)
    );

    // Solo abrir modal si hay slots en ese día
    if (daySlots.length > 0) {
      setSelectedCalendarDate(date);
      setIsCalendarDayModalVisible(true);
    }
  };

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      {/* Header responsive */}
      <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <Title level={isMobile ? 4 : 2} style={{ margin: 0, marginBottom: 4 }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          {isMobile ? 'Mis Reuniones' : 'Mis Reuniones con Familias'}
        </Title>
        {!isMobile && (
          <Text type="secondary">
            Gestiona tus slots de reunión con las familias de tus estudiantes
          </Text>
        )}
      </div>

      {/* Selector de período - Responsive */}
      <Card size={isMobile ? 'small' : 'default'} style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Período:</Text>
              <Select
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                style={{ width: '100%' }}
                placeholder="Selecciona un período"
                size="middle"
              >
                {periods.map(period => (
                  <Option key={period.id} value={period.id}>
                    {period.name}
                  </Option>
                ))}
              </Select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateSlotModalVisible(true)}
                disabled={!selectedPeriod}
                style={{ flex: 1 }}
              >
                Crear
              </Button>
              <Button
                icon={<AppstoreAddOutlined />}
                onClick={() => setIsBulkCreateModalVisible(true)}
                disabled={!selectedPeriod}
                style={{ flex: 1 }}
              >
                Masivo
              </Button>
            </div>
          </div>
        ) : (
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space>
                <Text strong>Período:</Text>
                <Select
                  value={selectedPeriod}
                  onChange={setSelectedPeriod}
                  style={{ minWidth: '300px' }}
                  placeholder="Selecciona un período"
                >
                  {periods.map(period => (
                    <Option key={period.id} value={period.id}>
                      {period.name} ({meetingsService.formatDate(period.startDate)} - {meetingsService.formatDate(period.endDate)})
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateSlotModalVisible(true)}
                  disabled={!selectedPeriod}
                >
                  Crear Slot
                </Button>
                <Button
                  icon={<AppstoreAddOutlined />}
                  onClick={() => setIsBulkCreateModalVisible(true)}
                  disabled={!selectedPeriod}
                >
                  Creación Masiva
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </Card>

      {selectedPeriod && (
        <Tabs defaultActiveKey="list">
          <TabPane tab={isMobile ? 'Slots' : 'Lista de Slots'} key="list">
            <Card size={isMobile ? 'small' : 'default'}>
              {!isMobile && (
                <div style={{ marginBottom: '16px' }}>
                  <Text type="secondary">
                    Slots de reunión disponibles a partir de hoy (los slots pasados no se muestran)
                  </Text>
                </div>
              )}
              <Table
                columns={slotsColumns}
                dataSource={futureSlots}
                loading={loading}
                rowKey="id"
                size={isMobile ? 'small' : 'middle'}
                pagination={{
                  pageSize: isMobile ? 8 : 10,
                  showSizeChanger: !isMobile,
                  showQuickJumper: !isMobile,
                  showTotal: isMobile ? undefined : (total) => `Total: ${total} slots`,
                  simple: isMobile,
                }}
              />
            </Card>
          </TabPane>

          <TabPane tab={isMobile ? 'Calendario' : 'Vista de Calendario'} key="calendar">
            <Card size={isMobile ? 'small' : 'default'}>
              <Alert
                message={isMobile ? 'Toca un día para ver detalles' : 'Haz clic en cualquier día con reuniones para ver los detalles'}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
                <Calendar
                  cellRender={renderCalendarCell}
                  onSelect={handleCalendarDaySelect}
                  mode="month"
                  fullscreen={!isMobile}
                />
              </div>
            </Card>
          </TabPane>

          <TabPane tab={isMobile ? 'Familias' : 'Mis Familias'} key="families">
            <Card size={isMobile ? 'small' : 'default'}>
              <Title level={isMobile ? 5 : 4}>Familias de mis Estudiantes</Title>
              <Alert
                message="Haz clic en cualquier familia para ver el historial de reuniones"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              {families.length === 0 ? (
                <Empty description="No tienes familias asignadas" />
              ) : (
                <List
                  dataSource={families}
                  renderItem={(family) => (
                    <List.Item
                      onClick={() => loadFamilyHistory(family.family.id)}
                      style={{
                        cursor: 'pointer',
                        padding: '12px 16px',
                        borderRadius: 8,
                        transition: 'background-color 0.2s'
                      }}
                      className="hover:bg-gray-50"
                      actions={[
                        <Button
                          key="history"
                          type="link"
                          icon={<HistoryOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            loadFamilyHistory(family.family.id);
                          }}
                        >
                          {!isMobile && 'Ver historial'}
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<TeamOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                        title={
                          <span style={{ color: '#1890ff' }}>
                            {family.family.primaryContact.profile
                              ? `${family.family.primaryContact.profile.firstName} ${family.family.primaryContact.profile.lastName}`
                              : family.family.primaryContact.email
                            }
                          </span>
                        }
                        description={
                          <div>
                            <Text type="secondary">Estudiantes: </Text>
                            {family.students.map((student, index) => (
                              <span key={student.id}>
                                {index > 0 && ', '}
                                {student.user.profile
                                  ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
                                  : student.user.email
                                }
                              </span>
                            ))}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <Badge count={pendingBookingsCount} offset={[10, 0]}>
                <span>{isMobile ? 'Reservas' : 'Mis Reservas'}</span>
              </Badge>
            }
            key="bookings"
          >
            <Card size={isMobile ? 'small' : 'default'}>
              {!isMobile && (
                <div style={{ marginBottom: '16px' }}>
                  <Title level={4}>Reservas de Reuniones</Title>
                </div>
              )}

              <Tabs
                activeKey={showPastBookings ? 'past' : 'upcoming'}
                onChange={(key) => {
                  const newShowPast = key === 'past';
                  console.log('🔄 [MeetingsPage] Tab changed:', {
                    key,
                    oldValue: showPastBookings,
                    newValue: newShowPast
                  });
                  setShowPastBookings(newShowPast);
                }}
                size={isMobile ? 'small' : 'middle'}
              >
                <TabPane
                  tab={
                    <span>
                      <CalendarOutlined />
                      {isMobile ? ' Próximas' : ' Próximas Reuniones'}
                    </span>
                  }
                  key="upcoming"
                >
                  {!isMobile && (
                    <div style={{ marginBottom: '16px' }}>
                      <Text type="secondary">
                        Reuniones programadas a partir de hoy, ordenadas de más cercana a más lejana
                      </Text>
                    </div>
                  )}
                  <Table
                    columns={bookingsColumns}
                    dataSource={upcomingBookings}
                    loading={bookingsLoading}
                    rowKey="id"
                    size={isMobile ? 'small' : 'middle'}
                    pagination={{
                      pageSize: isMobile ? 8 : 10,
                      showSizeChanger: !isMobile,
                      showQuickJumper: !isMobile,
                      showTotal: isMobile ? undefined : (total) => `Total: ${total} reuniones próximas`,
                      simple: isMobile,
                    }}
                  />
                </TabPane>

                <TabPane
                  tab={
                    <span>
                      <ClockCircleOutlined />
                      {isMobile ? ' Pasadas' : ' Reuniones Pasadas'}
                    </span>
                  }
                  key="past"
                >
                  {!isMobile && (
                    <div style={{ marginBottom: '16px' }}>
                      <Text type="secondary">
                        Historial de reuniones realizadas, archivadas para consulta
                      </Text>
                    </div>
                  )}
                  <Table
                    columns={bookingsColumns}
                    dataSource={pastBookings}
                    loading={bookingsLoading}
                    rowKey="id"
                    size={isMobile ? 'small' : 'middle'}
                    pagination={{
                      pageSize: isMobile ? 8 : 10,
                      showSizeChanger: !isMobile,
                      showQuickJumper: !isMobile,
                      showTotal: isMobile ? undefined : (total) => `Total: ${total} reuniones pasadas`,
                      simple: isMobile,
                    }}
                  />
                </TabPane>
              </Tabs>
            </Card>
          </TabPane>
        </Tabs>
      )}

      {/* Modal/Drawer de crear slot individual */}
      {isMobile ? (
        <Drawer
          title="Crear Slot de Reunión"
          open={isCreateSlotModalVisible}
          onClose={() => {
            setIsCreateSlotModalVisible(false);
            createForm.resetFields();
          }}
          placement="bottom"
          height="70%"
          styles={{ body: { padding: 16 } }}
        >
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateSlot}
          >
            <Form.Item
              name="datetime"
              label="Fecha y Hora"
              rules={[{ required: true, message: 'Selecciona fecha y hora' }]}
            >
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder="Selecciona fecha y hora"
              />
            </Form.Item>

            <Form.Item
              name="durationMinutes"
              label="Duración (minutos)"
              rules={[{ required: true, message: 'Introduce la duración' }]}
              initialValue={30}
            >
              <InputNumber
                min={15}
                max={120}
                step={15}
                style={{ width: '100%' }}
                addonAfter="min"
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notas (opcional)"
            >
              <TextArea
                rows={3}
                placeholder="Notas sobre el slot..."
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => {
                  setIsCreateSlotModalVisible(false);
                  createForm.resetFields();
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit">
                  Crear Slot
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Drawer>
      ) : (
        <Modal
          title="Crear Slot de Reunión"
          open={isCreateSlotModalVisible}
          onCancel={() => {
            setIsCreateSlotModalVisible(false);
            createForm.resetFields();
          }}
          footer={null}
          width={500}
        >
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateSlot}
          >
            <Form.Item
              name="datetime"
              label="Fecha y Hora"
              rules={[{ required: true, message: 'Selecciona fecha y hora' }]}
            >
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder="Selecciona fecha y hora"
              />
            </Form.Item>

            <Form.Item
              name="durationMinutes"
              label="Duración (minutos)"
              rules={[{ required: true, message: 'Introduce la duración' }]}
              initialValue={30}
            >
              <InputNumber
                min={15}
                max={120}
                step={15}
                style={{ width: '100%' }}
                addonAfter="min"
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notas (opcional)"
            >
              <TextArea
                rows={3}
                placeholder="Notas sobre el slot..."
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setIsCreateSlotModalVisible(false);
                  createForm.resetFields();
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit">
                  Crear Slot
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}

      {/* Modal/Drawer de creación masiva */}
      {isMobile ? (
        <Drawer
          title="Creación Masiva"
          open={isBulkCreateModalVisible}
          onClose={() => {
            setIsBulkCreateModalVisible(false);
            bulkForm.resetFields();
          }}
          placement="bottom"
          height="85%"
          styles={{ body: { padding: 16 } }}
        >
          <Form
            form={bulkForm}
            layout="vertical"
            onFinish={handleBulkCreateSlots}
          >
            <Form.Item
              name="dates"
              label="Fechas"
              rules={[{ required: true, message: 'Selecciona las fechas' }]}
            >
              <DatePicker
                multiple
                style={{ width: '100%' }}
                placeholder="Selecciona fechas"
                format="DD/MM/YYYY"
              />
            </Form.Item>

            <Form.Item
              name="times"
              label="Horarios"
              rules={[{ required: true, message: 'Añade al menos un horario' }]}
            >
              <Form.List name="times">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'time']}
                          rules={[{ required: true, message: 'Hora' }]}
                          style={{ marginBottom: 0, flex: 1 }}
                        >
                          <TimePicker format="HH:mm" placeholder="Hora" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'duration']}
                          rules={[{ required: true, message: 'Min' }]}
                          initialValue={30}
                          style={{ marginBottom: 0, flex: 1 }}
                        >
                          <InputNumber min={15} max={120} step={15} placeholder="Min" style={{ width: '100%' }} />
                        </Form.Item>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      </div>
                    ))}
                    <Form.Item style={{ marginBottom: 8 }}>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                        Añadir
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form.Item>

            <Form.Item name="notes" label="Notas (opcional)">
              <TextArea rows={2} placeholder="Notas para todos los slots..." />
            </Form.Item>

            <Alert
              message="Se crearán slots para todas las combinaciones de fechas y horarios."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => {
                  setIsBulkCreateModalVisible(false);
                  bulkForm.resetFields();
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit">
                  Crear
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Drawer>
      ) : (
        <Modal
          title="Creación Masiva de Slots"
          open={isBulkCreateModalVisible}
          onCancel={() => {
            setIsBulkCreateModalVisible(false);
            bulkForm.resetFields();
          }}
          footer={null}
          width={700}
        >
          <Form
            form={bulkForm}
            layout="vertical"
            onFinish={handleBulkCreateSlots}
          >
            <Form.Item
              name="dates"
              label="Fechas"
              rules={[{ required: true, message: 'Selecciona las fechas' }]}
            >
              <DatePicker
                multiple
                style={{ width: '100%' }}
                placeholder="Selecciona múltiples fechas"
                format="DD/MM/YYYY"
              />
            </Form.Item>

            <Form.Item
              name="times"
              label="Horarios"
              rules={[{ required: true, message: 'Añade al menos un horario' }]}
            >
              <Form.List name="times">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'time']}
                          rules={[{ required: true, message: 'Selecciona hora' }]}
                        >
                          <TimePicker
                            format="HH:mm"
                            placeholder="Hora"
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'duration']}
                          rules={[{ required: true, message: 'Duración' }]}
                          initialValue={30}
                        >
                          <InputNumber
                            min={15}
                            max={120}
                            step={15}
                            addonAfter="min"
                            placeholder="Duración"
                          />
                        </Form.Item>
                        <Button type="text" danger onClick={() => remove(name)}>
                          Eliminar
                        </Button>
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Añadir Horario
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notas (opcional)"
            >
              <TextArea
                rows={3}
                placeholder="Notas para todos los slots..."
              />
            </Form.Item>

            <Alert
              message="Creación masiva"
              description="Se crearán slots para todas las combinaciones de fechas y horarios seleccionados."
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setIsBulkCreateModalVisible(false);
                  bulkForm.resetFields();
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit">
                  Crear Slots
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}

      {/* Modal/Drawer de detalles del slot */}
      {isMobile ? (
        <Drawer
          title="Detalles del Slot"
          open={!!selectedSlot}
          onClose={() => setSelectedSlot(null)}
          placement="bottom"
          height="80%"
          styles={{ body: { padding: 16, overflowY: 'auto' } }}
          extra={<Button size="small" onClick={() => setSelectedSlot(null)}>Cerrar</Button>}
        >
        {selectedSlot && (() => {
          // Find the booking for this slot if it exists
          // Look for any active booking (confirmed or pending), not just cancelled
          const slotBooking = bookings.find(b =>
            b.slot.id === selectedSlot.id &&
            b.status !== 'cancelled'
          );

          // Enhanced Debug log
          console.log('🔍 Modal Detalles - selectedSlot.id:', selectedSlot.id);
          console.log('🔍 Modal Detalles - selectedSlot.hasActiveBooking:', selectedSlot.hasActiveBooking);
          console.log('🔍 Modal Detalles - Total bookings disponibles:', bookings.length);
          console.log('🔍 Modal Detalles - slotBooking encontrado:', slotBooking ? 'SÍ' : 'NO');

          // Debug: Show all slot IDs from bookings for comparison
          if (!slotBooking && bookings.length > 0) {
            console.log('🔍 Modal Detalles - IDs de slots en bookings:', bookings.map(b => ({
              bookingId: b.id,
              slotId: b.slot.id,
              status: b.status,
              familia: b.family?.primaryContact?.profile?.firstName || 'N/A'
            })));
          }

          if (slotBooking) {
            console.log('🔍 Modal Detalles - Booking status:', slotBooking.status);
            console.log('🔍 Modal Detalles - Familia:', slotBooking.family.primaryContact.profile?.firstName);
          }

          return (
            <div>
              <Divider orientation="left">Información del Slot</Divider>
              <p><strong>Fecha y hora:</strong> {meetingsService.formatDateTime(selectedSlot.startDatetime)}</p>
              <p><strong>Duración:</strong> {selectedSlot.durationMinutes} minutos</p>
              <p><strong>Hora de fin:</strong> {meetingsService.formatDateTime(selectedSlot.endDatetime)}</p>
              <p><strong>Estado:</strong>
                <Tag color={selectedSlot.isAvailable ? 'green' : 'red'} style={{ marginLeft: '8px' }}>
                  {selectedSlot.isAvailable ? 'Disponible' : 'No Disponible'}
                </Tag>
              </p>
              {selectedSlot.hasActiveBooking && (
                <p><strong>Reservado:</strong>
                  <Tag color="blue" style={{ marginLeft: '8px' }}>
                    Sí
                  </Tag>
                </p>
              )}
              {selectedSlot.notes && (
                <p><strong>Notas:</strong> {selectedSlot.notes}</p>
              )}

              <Divider orientation="left">Período</Divider>
              <p><strong>Nombre:</strong> {selectedSlot.period.name}</p>

              {/* Warning if slot says it's booked but we can't find the booking */}
              {selectedSlot.hasActiveBooking && !slotBooking && (
                <Alert
                  message="Información de reserva no disponible"
                  description="Este slot está marcado como reservado pero la información detallada de la reserva no está disponible actualmente. Por favor, recarga la página o contacta con soporte si el problema persiste."
                  type="warning"
                  showIcon
                  style={{ marginTop: '12px' }}
                />
              )}

              {/* Show booking information if this slot has a confirmed booking */}
              {slotBooking && (
                <>
                  <Divider orientation="left">Información de la Reunión</Divider>

                  <div style={{ backgroundColor: '#f0f2f5', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                    <p style={{ margin: '4px 0' }}>
                      <strong>
                        <TeamOutlined style={{ marginRight: '8px' }} />
                        Familia:
                      </strong> {slotBooking.family.primaryContact.profile?.firstName} {slotBooking.family.primaryContact.profile?.lastName}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                      Email: {slotBooking.family.primaryContact.email}
                    </p>
                  </div>

                  {slotBooking.student && (
                    <div style={{ backgroundColor: '#e6f7ff', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                      <p style={{ margin: '4px 0' }}>
                        <strong>
                          <UserOutlined style={{ marginRight: '8px' }} />
                          Estudiante:
                        </strong> {slotBooking.student.user.profile?.firstName} {slotBooking.student.user.profile?.lastName}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                        Número de matrícula: {slotBooking.student.enrollmentNumber}
                      </p>
                    </div>
                  )}

                  {slotBooking.notes && (
                    <div style={{ backgroundColor: '#fffbe6', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Notas de la familia:</strong>
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '13px' }}>
                        {slotBooking.notes}
                      </p>
                    </div>
                  )}

                  <p style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
                    Reservado el: {meetingsService.formatDateTime(slotBooking.bookingDate)}
                  </p>
                </>
              )}
            </div>
          );
        })()}
        </Drawer>
      ) : (
        <Modal
          title="Detalles del Slot"
          open={!!selectedSlot}
          onCancel={() => setSelectedSlot(null)}
          footer={[
            <Button key="close" onClick={() => setSelectedSlot(null)}>
              Cerrar
            </Button>
          ]}
          width={600}
        >
        {selectedSlot && (() => {
          const slotBooking = bookings.find(b =>
            b.slot.id === selectedSlot.id &&
            b.status !== 'cancelled'
          );

          return (
            <div>
              <Divider orientation="left">Información del Slot</Divider>
              <p><strong>Fecha y hora:</strong> {meetingsService.formatDateTime(selectedSlot.startDatetime)}</p>
              <p><strong>Duración:</strong> {selectedSlot.durationMinutes} minutos</p>
              <p><strong>Hora de fin:</strong> {meetingsService.formatDateTime(selectedSlot.endDatetime)}</p>
              <p><strong>Estado:</strong>
                <Tag color={selectedSlot.isAvailable ? 'green' : 'red'} style={{ marginLeft: '8px' }}>
                  {selectedSlot.isAvailable ? 'Disponible' : 'No Disponible'}
                </Tag>
              </p>
              {selectedSlot.hasActiveBooking && (
                <p><strong>Reservado:</strong>
                  <Tag color="blue" style={{ marginLeft: '8px' }}>
                    Sí
                  </Tag>
                </p>
              )}
              {selectedSlot.notes && (
                <p><strong>Notas:</strong> {selectedSlot.notes}</p>
              )}

              <Divider orientation="left">Período</Divider>
              <p><strong>Nombre:</strong> {selectedSlot.period.name}</p>

              {selectedSlot.hasActiveBooking && !slotBooking && (
                <Alert
                  message="Información de reserva no disponible"
                  description="Este slot está marcado como reservado pero la información detallada de la reserva no está disponible actualmente."
                  type="warning"
                  showIcon
                  style={{ marginTop: '12px' }}
                />
              )}

              {slotBooking && (
                <>
                  <Divider orientation="left">Información de la Reunión</Divider>

                  <div style={{ backgroundColor: '#f0f2f5', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                    <p style={{ margin: '4px 0' }}>
                      <strong>
                        <TeamOutlined style={{ marginRight: '8px' }} />
                        Familia:
                      </strong> {slotBooking.family.primaryContact.profile?.firstName} {slotBooking.family.primaryContact.profile?.lastName}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                      Email: {slotBooking.family.primaryContact.email}
                    </p>
                  </div>

                  {slotBooking.student && (
                    <div style={{ backgroundColor: '#e6f7ff', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                      <p style={{ margin: '4px 0' }}>
                        <strong>
                          <UserOutlined style={{ marginRight: '8px' }} />
                          Estudiante:
                        </strong> {slotBooking.student.user.profile?.firstName} {slotBooking.student.user.profile?.lastName}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                        Número de matrícula: {slotBooking.student.enrollmentNumber}
                      </p>
                    </div>
                  )}

                  {slotBooking.notes && (
                    <div style={{ backgroundColor: '#fffbe6', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Notas de la familia:</strong>
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '13px' }}>
                        {slotBooking.notes}
                      </p>
                    </div>
                  )}

                  <p style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
                    Reservado el: {meetingsService.formatDateTime(slotBooking.bookingDate)}
                  </p>
                </>
              )}
            </div>
          );
        })()}
        </Modal>
      )}

      {/* Modal/Drawer de reuniones del día seleccionado en el calendario */}
      {isMobile ? (
        <Drawer
          title={selectedCalendarDate ? `${selectedCalendarDate.format('DD/MM/YYYY')}` : 'Reuniones'}
          open={isCalendarDayModalVisible}
          onClose={() => {
            setIsCalendarDayModalVisible(false);
            setSelectedCalendarDate(null);
          }}
          placement="bottom"
          height="85%"
          styles={{ body: { padding: 12, overflowY: 'auto' } }}
        >
          {selectedCalendarDate && (() => {
            const dateStr = selectedCalendarDate.format('YYYY-MM-DD');
            const daySlots = slots.filter(slot =>
              slot.startDatetime.startsWith(dateStr)
            ).sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));

            return (
              <div>
                <Alert
                  message={`${daySlots.length} reunión${daySlots.length !== 1 ? 'es' : ''}`}
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                />

                <div>
                  {daySlots.map((slot, index) => {
                    const slotBooking = bookings.find(b => b.slot.id === slot.id && b.status === 'confirmed');

                    return (
                      <Card
                        key={slot.id}
                        size="small"
                        style={{
                          marginBottom: index < daySlots.length - 1 ? 8 : 0,
                          borderLeft: `4px solid ${slot.hasActiveBooking ? '#52c41a' : (slot.isAvailable ? '#1890ff' : '#ff4d4f')}`
                        }}
                      >
                        <div style={{ marginBottom: 8 }}>
                          <Tag color={slot.hasActiveBooking ? 'success' : (slot.isAvailable ? 'processing' : 'error')} style={{ marginBottom: 4 }}>
                            {slot.hasActiveBooking ? 'RESERV.' : (slot.isAvailable ? 'DISP.' : 'NO DISP.')}
                          </Tag>
                          <Text strong style={{ fontSize: 14 }}>
                            {meetingsService.formatTime(slot.startDatetime)} - {meetingsService.formatTime(slot.endDatetime)}
                          </Text>
                          <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                            ({slot.durationMinutes}min)
                          </Text>
                        </div>

                        {slotBooking && (
                          <div style={{ backgroundColor: '#f0f2f5', padding: 8, borderRadius: 4, marginBottom: 4 }}>
                            <div style={{ fontSize: 12 }}>
                              <TeamOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                              <strong>
                                {slotBooking.family.primaryContact.profile?.firstName} {slotBooking.family.primaryContact.profile?.lastName}
                              </strong>
                            </div>
                            {slotBooking.student && (
                              <div style={{ fontSize: 11, color: '#666' }}>
                                <UserOutlined style={{ marginRight: 4 }} />
                                {slotBooking.student.user.profile?.firstName} {slotBooking.student.user.profile?.lastName}
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                <div style={{ marginTop: 12, fontSize: 11, color: '#666', display: 'flex', gap: 8 }}>
                  <Badge status="success" text="Reserv." />
                  <Badge status="processing" text="Disp." />
                  <Badge status="error" text="No disp." />
                </div>
              </div>
            );
          })()}
        </Drawer>
      ) : (
        <Modal
          title={selectedCalendarDate ? `Reuniones del ${selectedCalendarDate.format('DD/MM/YYYY')}` : 'Reuniones del Día'}
          open={isCalendarDayModalVisible}
          onCancel={() => {
            setIsCalendarDayModalVisible(false);
            setSelectedCalendarDate(null);
          }}
          footer={[
            <Button key="close" onClick={() => {
              setIsCalendarDayModalVisible(false);
              setSelectedCalendarDate(null);
            }}>
              Cerrar
            </Button>
          ]}
          width={800}
        >
          {selectedCalendarDate && (() => {
            const dateStr = selectedCalendarDate.format('YYYY-MM-DD');
            const daySlots = slots.filter(slot =>
              slot.startDatetime.startsWith(dateStr)
            ).sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));

            return (
              <div>
                <Alert
                  message={`${daySlots.length} reunión${daySlots.length !== 1 ? 'es' : ''} programada${daySlots.length !== 1 ? 's' : ''} para este día`}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {daySlots.map((slot, index) => {
                    const slotBooking = bookings.find(b => b.slot.id === slot.id && b.status === 'confirmed');

                    return (
                      <Card
                        key={slot.id}
                        size="small"
                        style={{
                          marginBottom: index < daySlots.length - 1 ? 12 : 0,
                          borderLeft: `4px solid ${slot.hasActiveBooking ? '#52c41a' : (slot.isAvailable ? '#1890ff' : '#ff4d4f')}`
                        }}
                      >
                        <Row gutter={16}>
                          <Col span={24}>
                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                              <div>
                                <Tag color={slot.hasActiveBooking ? 'success' : (slot.isAvailable ? 'processing' : 'error')}>
                                  {slot.hasActiveBooking ? 'RESERVADO' : (slot.isAvailable ? 'DISPONIBLE' : 'NO DISPONIBLE')}
                                </Tag>
                                <Text strong style={{ fontSize: '16px', marginLeft: '8px' }}>
                                  <ClockCircleOutlined /> {meetingsService.formatTime(slot.startDatetime)} - {meetingsService.formatTime(slot.endDatetime)}
                                </Text>
                                <Text type="secondary" style={{ marginLeft: '8px' }}>
                                  ({slot.durationMinutes} min)
                                </Text>
                              </div>

                              {slot.notes && (
                                <div style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    <strong>Notas del slot:</strong> {slot.notes}
                                  </Text>
                                </div>
                              )}

                              {slotBooking ? (
                                <div style={{ marginTop: '8px' }}>
                                  <Divider style={{ margin: '8px 0' }}>Información de la Reunión</Divider>
                                  <Row gutter={12}>
                                    <Col span={12}>
                                      <div style={{ backgroundColor: '#f0f2f5', padding: '10px', borderRadius: '6px' }}>
                                        <div style={{ marginBottom: '4px' }}>
                                          <TeamOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
                                          <Text strong>Familia</Text>
                                        </div>
                                        <Text style={{ fontSize: '13px' }}>
                                          {slotBooking.family.primaryContact.profile?.firstName} {slotBooking.family.primaryContact.profile?.lastName}
                                        </Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: '11px' }}>
                                          {slotBooking.family.primaryContact.email}
                                        </Text>
                                      </div>
                                    </Col>
                                    {slotBooking.student && (
                                      <Col span={12}>
                                        <div style={{ backgroundColor: '#e6f7ff', padding: '10px', borderRadius: '6px' }}>
                                          <div style={{ marginBottom: '4px' }}>
                                            <UserOutlined style={{ marginRight: '6px', color: '#52c41a' }} />
                                            <Text strong>Estudiante</Text>
                                          </div>
                                          <Text style={{ fontSize: '13px' }}>
                                            {slotBooking.student.user.profile?.firstName} {slotBooking.student.user.profile?.lastName}
                                          </Text>
                                          <br />
                                          <Text type="secondary" style={{ fontSize: '11px' }}>
                                            Matrícula: {slotBooking.student.enrollmentNumber}
                                          </Text>
                                        </div>
                                      </Col>
                                    )}
                                  </Row>
                                  {slotBooking.notes && (
                                    <div style={{ backgroundColor: '#fffbe6', padding: '8px', borderRadius: '4px', marginTop: '8px' }}>
                                      <Text style={{ fontSize: '12px' }}>
                                        <strong>Notas de la familia:</strong> {slotBooking.notes}
                                      </Text>
                                    </div>
                                  )}
                                  <Text type="secondary" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    Reservado el: {meetingsService.formatDateTime(slotBooking.bookingDate)}
                                  </Text>
                                </div>
                              ) : (
                                <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {slot.isAvailable ? (
                                      <><CheckCircleOutlined style={{ color: '#52c41a', marginRight: '6px' }} />Este slot está disponible para reservar</>
                                    ) : (
                                      <><ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: '6px' }} />Este slot no está disponible actualmente</>
                                    )}
                                  </Text>
                                </div>
                              )}
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </div>

                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                  <div>
                    <Badge status="success" text="Reservado" style={{ marginRight: 16 }} />
                    <Badge status="processing" text="Disponible" style={{ marginRight: 16 }} />
                    <Badge status="error" text="No disponible" />
                  </div>
                  <Text type="secondary">
                    Total: {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                  </Text>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Modal/Drawer de cancelar reserva */}
      {isMobile ? (
        <Drawer
          title="Cancelar Reserva"
          open={isCancelModalVisible}
          onClose={() => {
            setIsCancelModalVisible(false);
            setSelectedBooking(null);
            cancelForm.resetFields();
          }}
          placement="bottom"
          height="75%"
          styles={{ body: { padding: 16 } }}
        >
          {selectedBooking && (
            <>
              <Alert
                message="Atención"
                description={
                  <div style={{ fontSize: 12 }}>
                    <p style={{ marginBottom: 4 }}><strong>Fecha:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</p>
                    <p style={{ marginBottom: 4 }}><strong>Familia:</strong> {selectedBooking.family.primaryContact.profile
                      ? `${selectedBooking.family.primaryContact.profile.firstName} ${selectedBooking.family.primaryContact.profile.lastName}`
                      : selectedBooking.family.primaryContact.email
                    }</p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form form={cancelForm} layout="vertical" onFinish={handleCancelBooking}>
                <Form.Item
                  name="reason"
                  label="Motivo"
                  rules={[
                    { required: true, message: 'Indica el motivo' },
                    { min: 10, message: 'Mínimo 10 caracteres' }
                  ]}
                >
                  <TextArea rows={3} placeholder="Motivo de la cancelación..." />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button onClick={() => {
                      setIsCancelModalVisible(false);
                      setSelectedBooking(null);
                      cancelForm.resetFields();
                    }}>
                      Volver
                    </Button>
                    <Button type="primary" danger htmlType="submit">
                      Cancelar
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}
        </Drawer>
      ) : (
        <Modal
          title="Cancelar Reserva"
          open={isCancelModalVisible}
          onCancel={() => {
            setIsCancelModalVisible(false);
            setSelectedBooking(null);
            cancelForm.resetFields();
          }}
          footer={null}
          width={500}
        >
          {selectedBooking && (
            <>
              <Alert
                message="Atención"
                description={
                  <div>
                    <p>Estás a punto de cancelar la siguiente reserva:</p>
                    <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
                      <li><strong>Fecha y hora:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</li>
                      <li><strong>Familia:</strong> {selectedBooking.family.primaryContact.profile
                        ? `${selectedBooking.family.primaryContact.profile.firstName} ${selectedBooking.family.primaryContact.profile.lastName}`
                        : selectedBooking.family.primaryContact.email
                      }</li>
                      <li><strong>Estudiante:</strong> {selectedBooking.student.user.profile
                        ? `${selectedBooking.student.user.profile.firstName} ${selectedBooking.student.user.profile.lastName}`
                        : selectedBooking.student.user.email
                      }</li>
                    </ul>
                    <p>El slot quedará disponible para que otras familias puedan reservarlo.</p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              <Form form={cancelForm} layout="vertical" onFinish={handleCancelBooking}>
                <Form.Item
                  name="reason"
                  label="Motivo de la cancelación"
                  rules={[
                    { required: true, message: 'Por favor, indica el motivo de la cancelación' },
                    { min: 10, message: 'El motivo debe tener al menos 10 caracteres' }
                  ]}
                >
                  <TextArea rows={4} placeholder="Explica brevemente por qué cancelas esta reunión..." />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => {
                      setIsCancelModalVisible(false);
                      setSelectedBooking(null);
                      cancelForm.resetFields();
                    }}>
                      Volver
                    </Button>
                    <Button type="primary" danger htmlType="submit">
                      Confirmar Cancelación
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>
      )}

      {/* Modal/Drawer de confirmar reserva */}
      {isMobile ? (
        <Drawer
          title="Confirmar Reserva"
          open={isConfirmModalVisible}
          onClose={() => {
            setIsConfirmModalVisible(false);
            setSelectedBooking(null);
            confirmForm.resetFields();
          }}
          placement="bottom"
          height="80%"
          styles={{ body: { padding: 16 } }}
        >
          {selectedBooking && (
            <>
              <Alert
                message="Confirmación"
                description={
                  <div style={{ fontSize: 12 }}>
                    <p style={{ marginBottom: 4 }}><strong>Fecha:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</p>
                    <p style={{ marginBottom: 4 }}><strong>Familia:</strong> {selectedBooking.family.primaryContact.profile
                      ? `${selectedBooking.family.primaryContact.profile.firstName} ${selectedBooking.family.primaryContact.profile.lastName}`
                      : selectedBooking.family.primaryContact.email
                    }</p>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form form={confirmForm} layout="vertical" onFinish={handleConfirmBooking}>
                <Form.Item
                  name="spaceId"
                  label="Espacio"
                  rules={[{ required: true, message: 'Selecciona un espacio' }]}
                >
                  <Select placeholder="Selecciona espacio" loading={loadingSpaces} disabled={loadingSpaces}>
                    {availableSpaces.map((space) => (
                      <Option key={space.id} value={space.id} disabled={!space.isAvailable}>
                        {space.name} {!space.isAvailable && '(No disp.)'}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="notes" label="Notas (opcional)">
                  <TextArea rows={2} placeholder="Notas..." />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button onClick={() => {
                      setIsConfirmModalVisible(false);
                      setSelectedBooking(null);
                      confirmForm.resetFields();
                    }}>
                      Cancelar
                    </Button>
                    <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                      Confirmar
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}
        </Drawer>
      ) : (
        <Modal
          title="Confirmar Reserva"
          open={isConfirmModalVisible}
          onCancel={() => {
            setIsConfirmModalVisible(false);
            setSelectedBooking(null);
            confirmForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          {selectedBooking && (
            <>
              <Alert
                message="Confirmación de Reunión"
                description={
                  <div>
                    <p>Vas a confirmar la siguiente reserva:</p>
                    <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
                      <li><strong>Fecha y hora:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</li>
                      <li><strong>Duración:</strong> {selectedBooking.slot.durationMinutes} minutos</li>
                      <li><strong>Familia:</strong> {selectedBooking.family.primaryContact.profile
                        ? `${selectedBooking.family.primaryContact.profile.firstName} ${selectedBooking.family.primaryContact.profile.lastName}`
                        : selectedBooking.family.primaryContact.email
                      }</li>
                      <li><strong>Estudiante:</strong> {selectedBooking.student.user.profile
                        ? `${selectedBooking.student.user.profile.firstName} ${selectedBooking.student.user.profile.lastName}`
                        : selectedBooking.student.user.email
                      }</li>
                    </ul>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              <Form form={confirmForm} layout="vertical" onFinish={handleConfirmBooking}>
                <Form.Item
                  name="spaceId"
                  label="Espacio (obligatorio)"
                  rules={[{ required: true, message: 'Debes seleccionar un espacio para confirmar la reunión' }]}
                  extra="Es necesario asignar un espacio físico para la reunión"
                >
                  <Select placeholder="Selecciona un espacio" loading={loadingSpaces} disabled={loadingSpaces}>
                    {availableSpaces.map((space) => (
                      <Option key={space.id} value={space.id} disabled={!space.isAvailable}>
                        <Space>
                          {space.color && (
                            <div style={{ width: 12, height: 12, backgroundColor: space.color, borderRadius: '2px', border: '1px solid #ddd', display: 'inline-block' }} />
                          )}
                          <span>{space.name}</span>
                          {space.location && <Text type="secondary">({space.location})</Text>}
                          {!space.isAvailable && <Tag color="red" size="small">No disponible</Tag>}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="notes" label="Notas adicionales (opcional)">
                  <TextArea rows={3} placeholder="Agrega notas sobre esta reunión..." />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => {
                      setIsConfirmModalVisible(false);
                      setSelectedBooking(null);
                      confirmForm.resetFields();
                    }}>
                      Cancelar
                    </Button>
                    <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                      Confirmar Reunión
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>
      )}

      {/* Modal/Drawer de denegar reserva */}
      {isMobile ? (
        <Drawer
          title="Denegar Reserva"
          open={isDenyModalVisible}
          onClose={() => {
            setIsDenyModalVisible(false);
            setSelectedBooking(null);
            denyForm.resetFields();
          }}
          placement="bottom"
          height="70%"
          styles={{ body: { padding: 16 } }}
        >
          {selectedBooking && (
            <>
              <Alert
                message="Denegar"
                description={
                  <div style={{ fontSize: 12 }}>
                    <p style={{ marginBottom: 4 }}><strong>Fecha:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</p>
                    <p style={{ marginBottom: 4 }}><strong>Familia:</strong> {selectedBooking.family.primaryContact.profile
                      ? `${selectedBooking.family.primaryContact.profile.firstName} ${selectedBooking.family.primaryContact.profile.lastName}`
                      : selectedBooking.family.primaryContact.email
                    }</p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form form={denyForm} layout="vertical" onFinish={handleDenyBooking}>
                <Form.Item
                  name="reason"
                  label="Motivo"
                  rules={[
                    { required: true, message: 'Indica el motivo' },
                    { min: 10, message: 'Mínimo 10 caracteres' }
                  ]}
                >
                  <TextArea rows={3} placeholder="Motivo de la denegación..." maxLength={500} />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button onClick={() => {
                      setIsDenyModalVisible(false);
                      setSelectedBooking(null);
                      denyForm.resetFields();
                    }}>
                      Volver
                    </Button>
                    <Button type="primary" danger htmlType="submit">
                      Denegar
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}
        </Drawer>
      ) : (
        <Modal
          title="Denegar Reserva"
          open={isDenyModalVisible}
          onCancel={() => {
            setIsDenyModalVisible(false);
            setSelectedBooking(null);
            denyForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          {selectedBooking && (
            <>
              <Alert
                message="Denegar Reunión"
                description={
                  <div>
                    <p>Vas a denegar la siguiente solicitud de reunión:</p>
                    <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
                      <li><strong>Fecha y hora:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</li>
                      <li><strong>Duración:</strong> {selectedBooking.slot.durationMinutes} minutos</li>
                      <li><strong>Familia:</strong> {selectedBooking.family.primaryContact.profile
                        ? `${selectedBooking.family.primaryContact.profile.firstName} ${selectedBooking.family.primaryContact.profile.lastName}`
                        : selectedBooking.family.primaryContact.email
                      }</li>
                      <li><strong>Estudiante:</strong> {selectedBooking.student.user.profile
                        ? `${selectedBooking.student.user.profile.firstName} ${selectedBooking.student.user.profile.lastName}`
                        : selectedBooking.student.user.email
                      }</li>
                    </ul>
                    <p>La familia será notificada y el slot quedará disponible para otras reservas.</p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              <Form form={denyForm} layout="vertical" onFinish={handleDenyBooking}>
                <Form.Item
                  name="reason"
                  label="Motivo de la denegación"
                  rules={[
                    { required: true, message: 'Debes proporcionar un motivo para denegar la reunión' },
                    { min: 10, message: 'El motivo debe tener al menos 10 caracteres' }
                  ]}
                >
                  <TextArea rows={4} placeholder="Explica el motivo por el cual no puedes atender esta reunión..." maxLength={500} />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => {
                      setIsDenyModalVisible(false);
                      setSelectedBooking(null);
                      denyForm.resetFields();
                    }}>
                      Volver
                    </Button>
                    <Button type="primary" danger htmlType="submit" icon={<ExclamationCircleOutlined />}>
                      Denegar Reunión
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>
      )}

      {/* Modal/Drawer de asignar espacio */}
      {isMobile ? (
        <Drawer
          title="Asignar Espacio"
          open={isAssignSpaceModalVisible}
          onClose={() => {
            setIsAssignSpaceModalVisible(false);
            setSelectedBooking(null);
            assignSpaceForm.resetFields();
          }}
          placement="bottom"
          height="70%"
          styles={{ body: { padding: 16 } }}
        >
          {selectedBooking && (
            <>
              <Alert
                message="Espacio"
                description={
                  <div style={{ fontSize: 12 }}>
                    <p style={{ marginBottom: 4 }}><strong>Fecha:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</p>
                    <p style={{ marginBottom: 4 }}><strong>Familia:</strong> {selectedBooking.family.primaryContact.profile
                      ? `${selectedBooking.family.primaryContact.profile.firstName} ${selectedBooking.family.primaryContact.profile.lastName}`
                      : selectedBooking.family.primaryContact.email
                    }</p>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form form={assignSpaceForm} layout="vertical" onFinish={handleAssignSpace}>
                <Form.Item name="spaceId" label="Espacio" rules={[{ required: false }]}>
                  <Select placeholder="Selecciona espacio" allowClear loading={loadingSpaces} disabled={loadingSpaces}>
                    {availableSpaces.map((space) => (
                      <Option key={space.id} value={space.id} disabled={!space.isAvailable}>
                        {space.name} {!space.isAvailable && '(No disp.)'}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button onClick={() => {
                      setIsAssignSpaceModalVisible(false);
                      setSelectedBooking(null);
                      assignSpaceForm.resetFields();
                    }}>
                      Cancelar
                    </Button>
                    <Button type="primary" htmlType="submit">
                      Guardar
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}
        </Drawer>
      ) : (
        <Modal
          title="Asignar Espacio a Reunión"
          open={isAssignSpaceModalVisible}
          onCancel={() => {
            setIsAssignSpaceModalVisible(false);
            setSelectedBooking(null);
            assignSpaceForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          {selectedBooking && (
            <>
              <Alert
                message="Asignación de Espacio"
                description={
                  <div>
                    <p>Asigna un espacio físico para esta reunión:</p>
                    <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
                      <li><strong>Fecha y hora:</strong> {meetingsService.formatDateTime(selectedBooking.slot.startDatetime)}</li>
                      <li><strong>Duración:</strong> {selectedBooking.slot.durationMinutes} minutos</li>
                      <li><strong>Familia:</strong> {selectedBooking.family.primaryContact.profile
                        ? `${selectedBooking.family.primaryContact.profile.firstName} ${selectedBooking.family.primaryContact.profile.lastName}`
                        : selectedBooking.family.primaryContact.email
                      }</li>
                    </ul>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              <Form form={assignSpaceForm} layout="vertical" onFinish={handleAssignSpace}>
                <Form.Item name="spaceId" label="Espacio" rules={[{ required: false }]}>
                  <Select placeholder="Selecciona un espacio o déjalo vacío para quitar asignación" allowClear loading={loadingSpaces} disabled={loadingSpaces}>
                    {availableSpaces.map((space) => (
                      <Option key={space.id} value={space.id} disabled={!space.isAvailable}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Space>
                            {space.color && (
                              <div style={{ width: 12, height: 12, backgroundColor: space.color, borderRadius: '2px', border: '1px solid #ddd', display: 'inline-block' }} />
                            )}
                            <Text strong>{space.name}</Text>
                            {space.location && <Text type="secondary">({space.location})</Text>}
                          </Space>
                          {!space.isAvailable && space.conflictingBooking && (
                            <Text type="danger" style={{ fontSize: '12px' }}>
                              Conflicto: {space.conflictingBooking.teacherName} con {space.conflictingBooking.familyName}
                            </Text>
                          )}
                          {!space.isAvailable && !space.conflictingBooking && (
                            <Tag color="red" size="small">No disponible</Tag>
                          )}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => {
                      setIsAssignSpaceModalVisible(false);
                      setSelectedBooking(null);
                      assignSpaceForm.resetFields();
                    }}>
                      Cancelar
                    </Button>
                    <Button type="primary" htmlType="submit">
                      Guardar Asignación
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>
      )}

      {/* Modal/Drawer de asignar slot a familia */}
      {isMobile ? (
        <Drawer
          title="Asignar a Familia"
          open={isAssignFamilyModalVisible}
          onClose={() => {
            setIsAssignFamilyModalVisible(false);
            setSelectedSlot(null);
            assignFamilyForm.resetFields();
          }}
          placement="bottom"
          height="85%"
          styles={{ body: { padding: 16 } }}
        >
          {selectedSlot && (
            <>
              <Alert
                message="Asignación Manual"
                description={
                  <div style={{ fontSize: 12 }}>
                    <p style={{ marginBottom: 4 }}><strong>Fecha:</strong> {meetingsService.formatDateTime(selectedSlot.startDatetime)}</p>
                    <p style={{ marginBottom: 4 }}><strong>Duración:</strong> {selectedSlot.durationMinutes} min</p>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              {familiesWithoutBooking.length === 0 ? (
                <Empty description="Todas las familias ya tienen reunión" style={{ marginTop: 24, marginBottom: 24 }} />
              ) : (
                <Form form={assignFamilyForm} layout="vertical" onFinish={handleAssignFamily}>
                  <Form.Item name="familyId" label="Familia" rules={[{ required: true, message: 'Selecciona familia' }]}>
                    <Select placeholder="Selecciona familia" onChange={() => assignFamilyForm.setFieldValue('studentId', undefined)}>
                      {familiesWithoutBooking.map((familyData) => (
                        <Option key={familyData.family.id} value={familyData.family.id}>
                          {familyData.family.primaryContact.profile
                            ? `${familyData.family.primaryContact.profile.firstName} ${familyData.family.primaryContact.profile.lastName}`
                            : familyData.family.primaryContact.email
                          }
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.familyId !== currentValues.familyId}>
                    {({ getFieldValue }) => {
                      const selectedFamilyId = getFieldValue('familyId');
                      const selectedFamily = familiesWithoutBooking.find((f) => f.family.id === selectedFamilyId);

                      return (
                        <Form.Item name="studentId" label="Estudiante" rules={[{ required: true, message: 'Selecciona estudiante' }]}>
                          <Select placeholder="Selecciona estudiante" disabled={!selectedFamilyId}>
                            {selectedFamily?.students.map((student) => (
                              <Option key={student.id} value={student.id}>
                                {student.user.profile
                                  ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
                                  : student.user.email
                                }
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      );
                    }}
                  </Form.Item>

                  <Form.Item name="notes" label="Notas (opcional)">
                    <TextArea rows={2} placeholder="Notas..." />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                      <Button onClick={() => {
                        setIsAssignFamilyModalVisible(false);
                        setSelectedSlot(null);
                        assignFamilyForm.resetFields();
                      }}>
                        Cancelar
                      </Button>
                      <Button type="primary" htmlType="submit" icon={<UserOutlined />}>
                        Asignar
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              )}
            </>
          )}
        </Drawer>
      ) : (
        <Modal
          title="Asignar Slot a Familia"
          open={isAssignFamilyModalVisible}
          onCancel={() => {
            setIsAssignFamilyModalVisible(false);
            setSelectedSlot(null);
            assignFamilyForm.resetFields();
          }}
          footer={null}
          width={700}
        >
          {selectedSlot && (
            <>
              <Alert
                message="Asignación Manual de Reunión"
                description={
                  <div>
                    <p>Vas a asignar manualmente este slot a una familia:</p>
                    <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
                      <li><strong>Fecha y hora:</strong> {meetingsService.formatDateTime(selectedSlot.startDatetime)}</li>
                      <li><strong>Duración:</strong> {selectedSlot.durationMinutes} minutos</li>
                    </ul>
                    <p>La familia será notificada automáticamente de la reunión.</p>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              {familiesWithoutBooking.length === 0 ? (
                <Empty description="Todas las familias ya tienen una reunión reservada en este período" style={{ marginTop: '24px', marginBottom: '24px' }} />
              ) : (
                <Form form={assignFamilyForm} layout="vertical" onFinish={handleAssignFamily}>
                  <Form.Item name="familyId" label="Familia" rules={[{ required: true, message: 'Selecciona una familia' }]}>
                    <Select placeholder="Selecciona una familia" onChange={() => assignFamilyForm.setFieldValue('studentId', undefined)}>
                      {familiesWithoutBooking.map((familyData) => (
                        <Option key={familyData.family.id} value={familyData.family.id}>
                          <div>
                            <Text strong>
                              {familyData.family.primaryContact.profile
                                ? `${familyData.family.primaryContact.profile.firstName} ${familyData.family.primaryContact.profile.lastName}`
                                : familyData.family.primaryContact.email
                              }
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Estudiantes: {familyData.students.map((s) =>
                                s.user.profile
                                  ? `${s.user.profile.firstName} ${s.user.profile.lastName}`
                                  : s.user.email
                              ).join(', ')}
                            </Text>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.familyId !== currentValues.familyId}>
                    {({ getFieldValue }) => {
                      const selectedFamilyId = getFieldValue('familyId');
                      const selectedFamily = familiesWithoutBooking.find((f) => f.family.id === selectedFamilyId);

                      return (
                        <Form.Item name="studentId" label="Estudiante" rules={[{ required: true, message: 'Selecciona un estudiante' }]}>
                          <Select placeholder="Selecciona el estudiante para esta reunión" disabled={!selectedFamilyId}>
                            {selectedFamily?.students.map((student) => (
                              <Option key={student.id} value={student.id}>
                                <div>
                                  <Text strong>
                                    {student.user.profile
                                      ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
                                      : student.user.email
                                    }
                                  </Text>
                                  <br />
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Nº {student.enrollmentNumber}
                                  </Text>
                                </div>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      );
                    }}
                  </Form.Item>

                  <Form.Item name="notes" label="Notas adicionales (opcional)">
                    <TextArea rows={3} placeholder="Agrega notas sobre esta reunión..." />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                    <Space>
                      <Button onClick={() => {
                        setIsAssignFamilyModalVisible(false);
                        setSelectedSlot(null);
                        assignFamilyForm.resetFields();
                      }}>
                        Cancelar
                      </Button>
                      <Button type="primary" htmlType="submit" icon={<UserOutlined />}>
                        Asignar Reunión
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              )}
            </>
          )}
        </Modal>
      )}

      {/* Modal de Historial de Reuniones con Familia */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>
              Historial de Reuniones - {selectedFamilyHistory?.family.primaryContact.profile
                ? `${selectedFamilyHistory.family.primaryContact.profile.firstName} ${selectedFamilyHistory.family.primaryContact.profile.lastName}`
                : selectedFamilyHistory?.family.primaryContact.email || 'Familia'
              }
            </span>
          </Space>
        }
        open={isFamilyHistoryModalVisible}
        onCancel={() => {
          setIsFamilyHistoryModalVisible(false);
          setSelectedFamilyHistory(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsFamilyHistoryModalVisible(false);
            setSelectedFamilyHistory(null);
          }}>
            Cerrar
          </Button>
        ]}
        width={isMobile ? '95%' : 800}
      >
        {loadingFamilyHistory ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text>Cargando historial...</Text>
          </div>
        ) : selectedFamilyHistory ? (
          <>
            {/* Estadísticas */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
                  <Text type="secondary">Total</Text>
                  <Title level={3} style={{ margin: 0 }}>{selectedFamilyHistory.stats.total}</Title>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
                  <Text type="secondary">Confirmadas</Text>
                  <Title level={3} style={{ margin: 0, color: '#1890ff' }}>{selectedFamilyHistory.stats.confirmed}</Title>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ textAlign: 'center', background: '#f0f0f0' }}>
                  <Text type="secondary">Completadas</Text>
                  <Title level={3} style={{ margin: 0, color: '#52c41a' }}>{selectedFamilyHistory.stats.completed}</Title>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ textAlign: 'center', background: '#fff2e8' }}>
                  <Text type="secondary">Canceladas</Text>
                  <Title level={3} style={{ margin: 0, color: '#fa8c16' }}>{selectedFamilyHistory.stats.cancelled}</Title>
                </Card>
              </Col>
            </Row>

            {/* Lista de reuniones */}
            {selectedFamilyHistory.bookings.length === 0 ? (
              <Empty description="No hay reuniones registradas con esta familia" />
            ) : (
              <List
                dataSource={selectedFamilyHistory.bookings.sort((a, b) =>
                  new Date(b.slot.startDatetime).getTime() - new Date(a.slot.startDatetime).getTime()
                )}
                renderItem={(booking) => {
                  const slotDate = new Date(booking.slot.startDatetime);
                  const isPast = slotDate < new Date();
                  const statusTag = () => {
                    if (booking.status === 'confirmed' && isPast) {
                      return <Tag color="green">Completada</Tag>;
                    }
                    switch (booking.status) {
                      case 'confirmed':
                        return <Tag color="blue">Confirmada</Tag>;
                      case 'pending':
                        return <Tag color="orange">Pendiente</Tag>;
                      case 'cancelled':
                        return <Tag color="red">Cancelada</Tag>;
                      default:
                        return <Tag>{booking.status}</Tag>;
                    }
                  };

                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <div style={{
                            background: isPast ? '#f5f5f5' : '#e6f7ff',
                            padding: '8px 12px',
                            borderRadius: 8,
                            textAlign: 'center',
                            minWidth: 60
                          }}>
                            <Text strong style={{ fontSize: 18, display: 'block' }}>
                              {slotDate.getDate()}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {slotDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                            </Text>
                          </div>
                        }
                        title={
                          <Space wrap>
                            <ClockCircleOutlined />
                            <span>
                              {slotDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {new Date(slotDate.getTime() + booking.slot.durationMinutes * 60000)
                                .toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {statusTag()}
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text>
                              <UserOutlined /> Estudiante:{' '}
                              {booking.student?.user?.profile
                                ? `${booking.student.user.profile.firstName} ${booking.student.user.profile.lastName}`
                                : booking.student?.user?.email || 'No especificado'
                              }
                            </Text>
                            {booking.notes && (
                              <Text type="secondary">
                                <strong>Notas:</strong> {booking.notes}
                              </Text>
                            )}
                            {booking.cancelReason && (
                              <Text type="danger">
                                <strong>Motivo cancelación:</strong> {booking.cancelReason}
                              </Text>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </>
        ) : null}
      </Modal>
    </div>
  );
};

export default TeacherMeetingsPage;