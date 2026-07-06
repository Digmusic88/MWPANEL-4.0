/**
 * @archivo: AdminMeetingsCalendarDashboard.tsx
 * @módulo: Admin Meetings (Dashboard de Calendario de Reuniones)
 * @función: Vista completa de calendario con slots por profesor y estados visuales
 * @crítico: SÍ - Gestión centralizada de reuniones para administradores
 * @dependencias: Ant Design, dayjs, axios
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Calendar,
  Badge,
  Typography,
  Space,
  Tag,
  Select,
  Row,
  Col,
  Statistic,
  Modal,
  Descriptions,
  Alert,
  Spin,
  Button,
  Divider,
  Empty,
  Tooltip,
  Form,
  Input,
  DatePicker,
  Switch,
  message,
  Popconfirm,
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { apiClient } from '../../../services/apiClient';

import { adminMeetingsService, meetingsService } from '../../../services/meetingsService';
import type {
  CreateMeetingPeriod,
  UpdateMeetingPeriod,
} from '../../../types/meetings';
import SpacesManagementModal from '../../../components/meetings/SpacesManagementModal';
import EditBookingModal from '../../../components/meetings/EditBookingModal';

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.locale('es');

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface CalendarSlot {
  id: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes: number;
  isAvailable: boolean;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  booking?: {
    id: string;
    familyName: string;
    studentName: string;
    spaceName?: string;
    spaceLocation?: string;
    spaceColor?: string;
    status: string;
    bookedAt: string;
    notes?: string;
  };
}

interface MeetingPeriod {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  bookingDeadline: string;
  description: string;
}

interface PeriodStats {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  uniqueTeachers: number;
  uniqueFamilies: number;
}

// Paleta de colores para profesores
const TEACHER_COLORS = [
  '#1890ff', // Azul
  '#52c41a', // Verde
  '#faad14', // Amarillo/Naranja
  '#f5222d', // Rojo
  '#722ed1', // Púrpura
  '#13c2c2', // Cyan
  '#eb2f96', // Magenta
  '#fa8c16', // Naranja
];

const AdminMeetingsCalendarDashboard: React.FC = () => {
  const [periods, setPeriods] = useState<MeetingPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [teacherColors, setTeacherColors] = useState<Record<string, string>>({});

  // Estados para gestión de períodos
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<MeetingPeriod | null>(null);

  // Estados para gestión de espacios
  const [isSpacesModalVisible, setIsSpacesModalVisible] = useState(false);

  // Estados para edición de reservas
  const [isEditBookingModalVisible, setIsEditBookingModalVisible] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  // Formularios
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Cargar períodos al montar
  useEffect(() => {
    fetchPeriods();
  }, []);

  // Cargar slots y stats cuando cambia el período
  useEffect(() => {
    if (selectedPeriodId) {
      fetchCalendarData();
      fetchStats();
    }
  }, [selectedPeriodId]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/meetings/periods');
      setPeriods(response.data.periods || []);

      // Seleccionar el período activo por defecto
      const activePeriod = response.data.periods?.find((p: MeetingPeriod) => p.isActive);
      if (activePeriod) {
        setSelectedPeriodId(activePeriod.id);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/admin/meetings/periods/${selectedPeriodId}/calendar`);
      const fetchedSlots = response.data.slots || [];
      setSlots(fetchedSlots);

      // Asignar colores únicos a cada profesor
      const teachers = Array.from(new Set(fetchedSlots.map((s: CalendarSlot) => s.teacher.id)));
      const colors: Record<string, string> = {};
      teachers.forEach((teacherId, index) => {
        colors[teacherId] = TEACHER_COLORS[index % TEACHER_COLORS.length];
      });
      setTeacherColors(colors);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get(`/admin/meetings/periods/${selectedPeriodId}/stats`);
      setStats(response.data.stats || null);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Gestión de períodos - Crear
  const handleCreatePeriod = async (values: any) => {
    try {
      const periodData: CreateMeetingPeriod = {
        name: values.name,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        bookingDeadline: values.bookingDeadline.format('YYYY-MM-DD'),
        description: values.description,
      };

      const response = await adminMeetingsService.createPeriod(periodData);
      message.success(response.message);

      setIsCreateModalVisible(false);
      createForm.resetFields();
      fetchPeriods();
    } catch (error: any) {
      console.error('Error creating period:', error);
      message.error(error.response?.data?.message || 'Error al crear el período');
    }
  };

  // Gestión de períodos - Actualizar
  const handleUpdatePeriod = async (values: any) => {
    if (!editingPeriod) return;

    try {
      const updateData: UpdateMeetingPeriod = {
        name: values.name,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        bookingDeadline: values.bookingDeadline.format('YYYY-MM-DD'),
        description: values.description,
        isActive: values.isActive,
      };

      const response = await adminMeetingsService.updatePeriod(editingPeriod.id, updateData);
      message.success(response.message);

      setIsEditModalVisible(false);
      editForm.resetFields();
      setEditingPeriod(null);
      fetchPeriods();
    } catch (error: any) {
      console.error('Error updating period:', error);
      message.error(error.response?.data?.message || 'Error al actualizar el período');
    }
  };

  // Gestión de períodos - Eliminar
  const handleDeletePeriod = async (periodId: string) => {
    try {
      await adminMeetingsService.deletePeriod(periodId);
      message.success('Período eliminado correctamente');

      // Si era el período seleccionado, limpiar la selección
      if (periodId === selectedPeriodId) {
        setSelectedPeriodId('');
        setSlots([]);
        setStats(null);
      }

      fetchPeriods();
    } catch (error: any) {
      console.error('Error deleting period:', error);
      message.error(error.response?.data?.message || 'Error al eliminar el período');
    }
  };

  // Abrir modal de edición
  const openEditModal = (period: MeetingPeriod) => {
    setEditingPeriod(period);
    editForm.setFieldsValue({
      name: period.name,
      dateRange: [dayjs(period.startDate), dayjs(period.endDate)],
      bookingDeadline: dayjs(period.bookingDeadline),
      description: period.description,
      isActive: period.isActive,
    });
    setIsEditModalVisible(true);
  };

  // Obtener slots para una fecha específica
  const getSlotsForDate = (date: Dayjs): CalendarSlot[] => {
    return slots.filter((slot) => {
      const slotDate = dayjs(slot.startDatetime);
      const isSameDay = slotDate.isSame(date, 'day');
      const matchesTeacher = selectedTeacher === 'all' || slot.teacher.id === selectedTeacher;
      return isSameDay && matchesTeacher;
    });
  };

  // Renderizar contenido de celdas del calendario
  const dateCellRender = (value: Dayjs) => {
    const slotsForDay = getSlotsForDate(value);

    if (slotsForDay.length === 0) return null;

    const availableCount = slotsForDay.filter((s) => !s.booking).length;
    const bookedCount = slotsForDay.filter((s) => s.booking).length;

    return (
      <div style={{ padding: '4px 0' }}>
        {availableCount > 0 && (
          <Badge
            status="success"
            text={`${availableCount} disponible${availableCount > 1 ? 's' : ''}`}
            style={{ display: 'block', fontSize: '11px', whiteSpace: 'nowrap' }}
          />
        )}
        {bookedCount > 0 && (
          <Badge
            status="processing"
            text={`${bookedCount} reservado${bookedCount > 1 ? 's' : ''}`}
            style={{ display: 'block', fontSize: '11px', whiteSpace: 'nowrap' }}
          />
        )}
      </div>
    );
  };

  // Renderizar lista de slots del día seleccionado
  const renderDaySlots = () => {
    const slotsForDay = getSlotsForDate(selectedDate);

    if (slotsForDay.length === 0) {
      return (
        <Empty
          description="No hay slots disponibles para esta fecha"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    // Ordenar por hora
    const sortedSlots = [...slotsForDay].sort((a, b) => {
      return dayjs(a.startDatetime).diff(dayjs(b.startDatetime));
    });

    return (
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {sortedSlots.map((slot) => {
            const teacherColor = teacherColors[slot.teacher.id] || '#666';
            const isBooked = !!slot.booking;

            return (
              <Card
                key={slot.id}
                size="small"
                hoverable
                onClick={() => {
                  setSelectedSlot(slot);
                  setModalVisible(true);
                }}
                style={{
                  borderLeft: `4px solid ${teacherColor}`,
                  backgroundColor: isBooked ? '#f0f2f5' : '#ffffff',
                }}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Space>
                    <ClockCircleOutlined />
                    <Text strong>
                      {dayjs(slot.startDatetime).format('HH:mm')} -{' '}
                      {dayjs(slot.endDatetime).format('HH:mm')}
                    </Text>
                    <Tag color={teacherColor}>{slot.teacher.name}</Tag>
                  </Space>

                  {isBooked ? (
                    <>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text type="secondary">
                          Reservado por {slot.booking?.familyName}
                          {slot.booking?.studentName && ` (${slot.booking.studentName})`}
                        </Text>
                      </Space>
                      {slot.booking?.spaceName && (
                        <Space>
                          <HomeOutlined />
                          {slot.booking.spaceColor && (
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                backgroundColor: slot.booking.spaceColor,
                                borderRadius: '2px',
                                border: '1px solid #ddd',
                                display: 'inline-block',
                              }}
                            />
                          )}
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {slot.booking.spaceName}
                          </Text>
                        </Space>
                      )}
                    </>
                  ) : (
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <Text type="success">Disponible</Text>
                    </Space>
                  )}
                </Space>
              </Card>
            );
          })}
        </Space>
      </div>
    );
  };

  // Obtener lista única de profesores
  const uniqueTeachers = Array.from(
    new Set(slots.map((s) => JSON.stringify({ id: s.teacher.id, name: s.teacher.name })))
  ).map((s) => JSON.parse(s));

  if (periods.length === 0 && !loading) {
    return (
      <Card>
        <Empty description="No hay períodos de reuniones configurados" />
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <CalendarOutlined /> Dashboard de Reuniones - Vista Calendario
      </Title>
      <Text type="secondary">
        Visualiza todos los slots de reuniones por profesor, fecha y estado de reserva
      </Text>

      <Divider />

      {/* Botones de acción */}
      <Card style={{ marginBottom: '16px' }}>
        <Space size="middle">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalVisible(true)}
            size="large"
          >
            Crear Nuevo Período
          </Button>
          <Button
            icon={<HomeOutlined />}
            onClick={() => setIsSpacesModalVisible(true)}
            size="large"
          >
            Gestionar Espacios
          </Button>
        </Space>
      </Card>

      {/* Filtros y Estadísticas */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={8}>
          <Card>
            <Space.Compact style={{ width: '100%' }}>
              <Select
                style={{ width: '100%' }}
                placeholder="Seleccionar período"
                value={selectedPeriodId}
                onChange={setSelectedPeriodId}
                loading={loading}
              >
                {periods.map((period) => (
                  <Option key={period.id} value={period.id}>
                    {period.name} {period.isActive && <Tag color="green">Activo</Tag>}
                  </Option>
                ))}
              </Select>
              {selectedPeriodId && (
                <>
                  <Tooltip title="Editar período">
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => {
                        const period = periods.find((p) => p.id === selectedPeriodId);
                        if (period) openEditModal(period);
                      }}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="¿Eliminar período?"
                    description="Esta acción eliminará todos los slots y reservas asociados."
                    onConfirm={() => handleDeletePeriod(selectedPeriodId)}
                    okText="Eliminar"
                    cancelText="Cancelar"
                    okType="danger"
                  >
                    <Tooltip title="Eliminar período">
                      <Button danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </>
              )}
            </Space.Compact>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card>
            <Select
              style={{ width: '100%' }}
              placeholder="Filtrar por profesor"
              value={selectedTeacher}
              onChange={setSelectedTeacher}
            >
              <Option value="all">Todos los profesores</Option>
              {uniqueTeachers.map((teacher) => (
                <Option key={teacher.id} value={teacher.id}>
                  <Space>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: teacherColors[teacher.id],
                        display: 'inline-block',
                      }}
                    />
                    {teacher.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Button
            type="primary"
            onClick={() => {
              fetchCalendarData();
              fetchStats();
            }}
            loading={loading}
            style={{ width: '100%', height: '100%' }}
          >
            Actualizar Datos
          </Button>
        </Col>
      </Row>

      {/* Estadísticas */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Slots"
                value={stats.totalSlots}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Disponibles"
                value={stats.availableSlots}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Reservados"
                value={stats.bookedSlots}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Profesores"
                value={stats.uniqueTeachers}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Calendario y Lista de Slots */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Calendario de Slots" loading={loading}>
            <Calendar
              value={selectedDate}
              onSelect={setSelectedDate}
              cellRender={dateCellRender}
              locale={{
                lang: {
                  locale: 'es_ES',
                  month: 'Mes',
                  year: 'Año',
                  today: 'Hoy',
                  now: 'Ahora',
                  backToToday: 'Volver a hoy',
                  ok: 'Aceptar',
                  timeSelect: 'Seleccionar hora',
                  dateSelect: 'Seleccionar fecha',
                  monthSelect: 'Seleccionar mes',
                  yearSelect: 'Seleccionar año',
                  decadeSelect: 'Seleccionar década',
                },
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined />
                <span>Slots del {selectedDate.format('DD/MM/YYYY')}</span>
              </Space>
            }
          >
            {renderDaySlots()}
          </Card>
        </Col>
      </Row>

      {/* Leyenda de Colores */}
      <Card title="Leyenda - Profesores" style={{ marginTop: '16px' }}>
        <Space wrap>
          {uniqueTeachers.map((teacher) => (
            <Tag key={teacher.id} color={teacherColors[teacher.id]}>
              {teacher.name}
            </Tag>
          ))}
        </Space>
      </Card>

      {/* Modal de Detalles */}
      <Modal
        title="Detalles del Slot"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          selectedSlot?.booking && (
            <Button
              key="edit"
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingBookingId(selectedSlot.booking!.id);
                setIsEditBookingModalVisible(true);
                setModalVisible(false);
              }}
            >
              Editar Reserva
            </Button>
          ),
          <Button key="close" onClick={() => setModalVisible(false)}>
            Cerrar
          </Button>,
        ]}
        width={600}
      >
        {selectedSlot && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Profesor">
              <Space>
                <Tag color={teacherColors[selectedSlot.teacher.id]}>
                  {selectedSlot.teacher.name}
                </Tag>
                <Text type="secondary">{selectedSlot.teacher.email}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Fecha y Hora">
              {dayjs(selectedSlot.startDatetime).format('DD/MM/YYYY HH:mm')} -{' '}
              {dayjs(selectedSlot.endDatetime).format('HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Duración">
              {selectedSlot.durationMinutes} minutos
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              {selectedSlot.booking ? (
                <Tag color="blue">Reservado</Tag>
              ) : (
                <Tag color="green">Disponible</Tag>
              )}
            </Descriptions.Item>
            {selectedSlot.booking && (
              <>
                <Descriptions.Item label="Familia">
                  {selectedSlot.booking.familyName}
                </Descriptions.Item>
                <Descriptions.Item label="Estudiante">
                  {selectedSlot.booking.studentName || 'No especificado'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha de Reserva">
                  {dayjs(selectedSlot.booking.bookedAt).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
                {selectedSlot.booking.spaceName && (
                  <Descriptions.Item label="Espacio Asignado">
                    <Space>
                      {selectedSlot.booking.spaceColor && (
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            backgroundColor: selectedSlot.booking.spaceColor,
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                          }}
                        />
                      )}
                      <Text strong>{selectedSlot.booking.spaceName}</Text>
                      {selectedSlot.booking.spaceLocation && (
                        <Text type="secondary">({selectedSlot.booking.spaceLocation})</Text>
                      )}
                    </Space>
                  </Descriptions.Item>
                )}
                {selectedSlot.booking.notes && (
                  <Descriptions.Item label="Notas">
                    {selectedSlot.booking.notes}
                  </Descriptions.Item>
                )}
              </>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Modal de Crear Período */}
      <Modal
        title="Crear Nuevo Período de Reuniones"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreatePeriod}>
          <Form.Item
            name="name"
            label="Nombre del Período"
            rules={[{ required: true, message: 'Introduce el nombre del período' }]}
          >
            <Input placeholder="Ej: Reuniones Primer Trimestre 2024" />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Período de Reuniones"
            rules={[{ required: true, message: 'Selecciona las fechas del período' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              placeholder={['Fecha de inicio', 'Fecha de fin']}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="bookingDeadline"
            label="Fecha Límite de Reservas"
            rules={[{ required: true, message: 'Selecciona la fecha límite' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Fecha límite para reservar"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item name="description" label="Descripción (opcional)">
            <TextArea
              rows={4}
              placeholder="Describe el propósito de este período de reuniones..."
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsCreateModalVisible(false);
                  createForm.resetFields();
                }}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                Crear Período
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Editar Período */}
      <Modal
        title="Editar Período de Reuniones"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
          setEditingPeriod(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdatePeriod}>
          <Form.Item
            name="name"
            label="Nombre del Período"
            rules={[{ required: true, message: 'Introduce el nombre del período' }]}
          >
            <Input placeholder="Ej: Reuniones Primer Trimestre 2024" />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Período de Reuniones"
            rules={[{ required: true, message: 'Selecciona las fechas del período' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              placeholder={['Fecha de inicio', 'Fecha de fin']}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="bookingDeadline"
            label="Fecha Límite de Reservas"
            rules={[{ required: true, message: 'Selecciona la fecha límite' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Fecha límite para reservar"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item name="description" label="Descripción (opcional)">
            <TextArea
              rows={4}
              placeholder="Describe el propósito de este período de reuniones..."
            />
          </Form.Item>

          <Form.Item name="isActive" label="Estado" valuePropName="checked">
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsEditModalVisible(false);
                  editForm.resetFields();
                  setEditingPeriod(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                Actualizar Período
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Gestión de Espacios */}
      <SpacesManagementModal
        visible={isSpacesModalVisible}
        onClose={() => setIsSpacesModalVisible(false)}
      />

      {/* Modal de Edición de Reservas */}
      <EditBookingModal
        visible={isEditBookingModalVisible}
        bookingId={editingBookingId}
        onClose={() => {
          setIsEditBookingModalVisible(false);
          setEditingBookingId(null);
        }}
        onSuccess={() => {
          fetchCalendarData();
          fetchStats();
        }}
      />
    </div>
  );
};

export default AdminMeetingsCalendarDashboard;
