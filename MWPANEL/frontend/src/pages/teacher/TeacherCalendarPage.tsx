import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Table,
  Typography,
  Tag,
  Select,
  DatePicker,
  message,
  List,
  Avatar,
  Badge,
  Tabs,
  Statistic,
  Alert,
  Modal,
  Form,
  Input,
  Drawer,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  BookOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import CalendarPage from '../shared/CalendarPage';
import { useResponsive } from '../../hooks/useResponsive';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface TeacherSchedule {
  id: string;
  subject: string;
  classGroup: string;
  timeSlot: string;
  dayOfWeek: string;
  classroom: string;
}

interface TaskDeadline {
  id: string;
  title: string;
  dueDate: string;
  subject: string;
  classGroup: string;
  submissionCount: number;
  totalStudents: number;
  status: 'upcoming' | 'due_today' | 'overdue';
}

interface ClassEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  subject: string;
  classGroup: string;
  description?: string;
}

const TeacherCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === "function") {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn("Navigation error:", error, "Path:", path);
      }
    } else {
      console.warn("Navigate function not available:", path);
    }
  }, [navigate]);
  const [loading, setLoading] = useState(false);
  const [teacherSchedule, setTeacherSchedule] = useState<TeacherSchedule[]>([]);
  const [taskDeadlines, setTaskDeadlines] = useState<TaskDeadline[]>([]);
  const [classEvents, setClassEvents] = useState<ClassEvent[]>([]);
  const [quickEventModalVisible, setQuickEventModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      
      // Use Promise.allSettled to handle individual failures gracefully
      const [scheduleResult, deadlinesResult, eventsResult] = await Promise.allSettled([
        apiClient.get('/schedules/teacher/current'),
        apiClient.get('/tasks/teacher/upcoming-deadlines'),
        apiClient.get('/calendar/teacher/class-events'),
      ]);

      // Handle schedule data
      if (scheduleResult.status === 'fulfilled') {
        setTeacherSchedule(scheduleResult.value.data || []);
      } else {
        console.warn('Error loading schedule:', scheduleResult.reason);
        setTeacherSchedule([]);
      }

      // Handle deadlines data
      if (deadlinesResult.status === 'fulfilled') {
        setTaskDeadlines(deadlinesResult.value.data || []);
      } else {
        console.warn('Error loading deadlines:', deadlinesResult.reason);
        setTaskDeadlines([]);
      }

      // Handle events data
      if (eventsResult.status === 'fulfilled') {
        setClassEvents(eventsResult.value.data || []);
      } else {
        console.warn('Error loading events:', eventsResult.reason);
        setClassEvents([]);
      }

    } catch (error: any) {
      console.error('Error fetching teacher data:', error);
      message.error('Error al cargar datos del profesor');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickEvent = async (values: any) => {
    try {
      await apiClient.post('/calendar', {
        ...values,
        startDate: values.date.toISOString(),
        endDate: values.date.add(1, 'hour').toISOString(),
        type: 'activity',
        visibility: 'class_specific',
      });
      
      message.success('Evento rápido creado exitosamente');
      setQuickEventModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      console.error('Error creating quick event:', error);
      message.error('Error al crear el evento');
    }
  };

  // Columnas para móvil - vista compacta
  const mobileScheduleColumns = [
    {
      title: 'Sesión',
      key: 'mobile',
      render: (_: any, record: TeacherSchedule) => (
        <div className="py-1">
          <div className="flex items-center justify-between mb-1">
            <Tag color="blue" className="text-xs m-0">{record.dayOfWeek}</Tag>
            <span className="text-xs text-gray-500">{record.timeSlot}</span>
          </div>
          <div className="font-medium text-sm text-blue-700">{record.subject}</div>
          <div className="text-xs text-gray-500">
            {record.classGroup} • {record.classroom}
          </div>
        </div>
      ),
    },
  ];

  // Columnas para desktop
  const desktopScheduleColumns = [
    {
      title: 'Hora',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
    },
    {
      title: 'Asignatura',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string) => (
        <Tag color="blue">{subject}</Tag>
      ),
    },
    {
      title: 'Grupo',
      dataIndex: 'classGroup',
      key: 'classGroup',
    },
    {
      title: 'Aula',
      dataIndex: 'classroom',
      key: 'classroom',
    },
    {
      title: 'Día',
      dataIndex: 'dayOfWeek',
      key: 'dayOfWeek',
    },
  ];

  const scheduleColumns = isMobile ? mobileScheduleColumns : desktopScheduleColumns;

  const getDeadlineStatus = (deadline: TaskDeadline) => {
    switch (deadline.status) {
      case 'due_today':
        return { color: 'orange', icon: <ClockCircleOutlined /> };
      case 'overdue':
        return { color: 'red', icon: <ExclamationCircleOutlined /> };
      default:
        return { color: 'blue', icon: <CheckCircleOutlined /> };
    }
  };

  const getCompletionRate = (deadline: TaskDeadline) => {
    return Math.round((deadline.submissionCount / deadline.totalStudents) * 100);
  };

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      {/* Header */}
      <div className={isMobile ? 'mb-3' : 'mb-6'}>
        <Row justify="space-between" align="middle" gutter={[8, 8]}>
          <Col xs={24} sm={18}>
            <Title level={isMobile ? 4 : 2} className="!mb-1">
              <CalendarOutlined className="mr-2" />
              {isMobile ? 'Calendario' : 'Mi Calendario de Clases'}
            </Title>
            <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
              {isMobile ? 'Horario y eventos' : 'Gestiona tu horario, eventos y fechas importantes'}
            </Text>
          </Col>
          <Col xs={24} sm={6} className={isMobile ? 'mt-2' : ''}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setQuickEventModalVisible(true)}
              size={isMobile ? 'middle' : 'large'}
              block={isMobile}
            >
              {isMobile ? 'Evento' : 'Evento Rápido'}
            </Button>
          </Col>
        </Row>
      </div>

      {/* Quick Stats */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} className={isMobile ? 'mb-3' : 'mb-6'}>
        <Col xs={8} sm={8}>
          <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '8px' : '24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? '10px' : '14px' }}>{isMobile ? 'Hoy' : 'Clases Hoy'}</span>}
              value={teacherSchedule.filter(s => s.dayOfWeek === dayjs().format('dddd')).length}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
            />
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '8px' : '24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? '10px' : '14px' }}>{isMobile ? 'Vencer' : 'Tareas por Vencer'}</span>}
              value={taskDeadlines.filter(d => d.status === 'upcoming').length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14', fontSize: isMobile ? '18px' : '24px' }}
            />
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '8px' : '24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? '10px' : '14px' }}>{isMobile ? 'Semana' : 'Eventos Esta Semana'}</span>}
              value={classEvents.filter(e => dayjs(e.date).isSame(dayjs(), 'week')).length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: isMobile ? '18px' : '24px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Calendar - Full Width */}
      <Row gutter={[isMobile ? 8 : 24, isMobile ? 8 : 24]}>
        <Col span={24}>
          <Card
            title={
              <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
                <CalendarOutlined className="mr-2" />
                {isMobile ? 'Calendario' : 'Calendario de Eventos'}
              </span>
            }
            size={isMobile ? 'small' : 'default'}
            bodyStyle={{ padding: isMobile ? '8px' : '24px' }}
          >
            <CalendarPage />
          </Card>
        </Col>
      </Row>

      {/* Events and Actions - Below Calendar */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} className={isMobile ? 'mt-3' : 'mt-6'}>
        {/* Today's Schedule */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            title={
              <span style={{ fontSize: isMobile ? '13px' : '14px' }}>
                {isMobile ? 'Hoy' : 'Horario de Hoy'}
              </span>
            }
            size="small"
            extra={<Badge count={teacherSchedule.filter(s => s.dayOfWeek === dayjs().format('dddd')).length} />}
            bodyStyle={{ padding: isMobile ? '8px' : '12px' }}
          >
            <List
              size="small"
              dataSource={teacherSchedule.filter(s => s.dayOfWeek === dayjs().format('dddd')).slice(0, isMobile ? 3 : 5)}
              renderItem={(item) => (
                <List.Item style={{ padding: isMobile ? '6px 0' : '8px 0' }}>
                  <List.Item.Meta
                    avatar={<Avatar icon={<BookOutlined />} size={isMobile ? 24 : 'small'} />}
                    title={<Text style={{ fontSize: isMobile ? '12px' : '13px' }}>{item.subject}</Text>}
                    description={
                      <div style={{ fontSize: isMobile ? '10px' : '11px' }} className="text-gray-500">
                        {item.timeSlot} • {item.classGroup}
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: <span style={{ fontSize: isMobile ? '11px' : '12px' }}>Sin clases hoy</span> }}
            />
          </Card>
        </Col>

        {/* Task Deadlines */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            title={
              <span style={{ fontSize: isMobile ? '13px' : '14px' }}>
                {isMobile ? 'Vencimientos' : 'Fechas Límite de Tareas'}
              </span>
            }
            size="small"
            bodyStyle={{ padding: isMobile ? '8px' : '12px' }}
          >
            <List
              size="small"
              dataSource={taskDeadlines.slice(0, isMobile ? 3 : 5)}
              renderItem={(deadline) => {
                const status = getDeadlineStatus(deadline);
                const completionRate = getCompletionRate(deadline);

                return (
                  <List.Item style={{ padding: isMobile ? '6px 0' : '8px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={status.icon}
                          style={{ backgroundColor: status.color }}
                          size={isMobile ? 24 : 'small'}
                        />
                      }
                      title={
                        <Text style={{ fontSize: isMobile ? '12px' : '13px' }} ellipsis>
                          {deadline.title}
                        </Text>
                      }
                      description={
                        <div style={{ fontSize: isMobile ? '10px' : '11px' }} className="text-gray-500">
                          {dayjs(deadline.dueDate).format('DD/MM')} • {completionRate}%
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
              locale={{ emptyText: <span style={{ fontSize: isMobile ? '11px' : '12px' }}>Sin vencimientos</span> }}
            />
          </Card>
        </Col>

        {/* Upcoming Class Events */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            title={
              <span style={{ fontSize: isMobile ? '13px' : '14px' }}>
                {isMobile ? 'Eventos' : 'Próximos Eventos de Clase'}
              </span>
            }
            size="small"
            bodyStyle={{ padding: isMobile ? '8px' : '12px' }}
          >
            <List
              size="small"
              dataSource={classEvents
                .filter(event => dayjs(event.date).isAfter(dayjs()))
                .slice(0, isMobile ? 3 : 5)
              }
              renderItem={(event) => (
                <List.Item style={{ padding: isMobile ? '6px 0' : '8px 0' }}>
                  <List.Item.Meta
                    avatar={<Avatar icon={<CalendarOutlined />} size={isMobile ? 24 : 'small'} />}
                    title={
                      <Text style={{ fontSize: isMobile ? '12px' : '13px' }} ellipsis>
                        {event.title}
                      </Text>
                    }
                    description={
                      <div className="flex items-center gap-1 flex-wrap">
                        <span style={{ fontSize: isMobile ? '10px' : '11px' }} className="text-gray-500">
                          {dayjs(event.date).format('DD/MM')}
                        </span>
                        <Tag style={{ fontSize: isMobile ? '9px' : '10px', margin: 0, padding: '0 4px' }}>
                          {event.type}
                        </Tag>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: <span style={{ fontSize: isMobile ? '11px' : '12px' }}>Sin eventos</span> }}
            />
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            title={
              <span style={{ fontSize: isMobile ? '13px' : '14px' }}>
                {isMobile ? 'Acciones' : 'Acciones Rápidas'}
              </span>
            }
            size="small"
            bodyStyle={{ padding: isMobile ? '8px' : '12px' }}
          >
            {isMobile ? (
              /* Vista móvil: 2x2 grid */
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setQuickEventModalVisible(true)}
                  className="text-xs"
                >
                  Evento
                </Button>
                <Button
                  size="small"
                  icon={<BookOutlined />}
                  onClick={() => safeNavigate('/teacher/tasks')}
                  className="text-xs"
                >
                  Tarea
                </Button>
                <Button
                  size="small"
                  icon={<TeamOutlined />}
                  onClick={() => safeNavigate('/teacher/evaluations')}
                  className="text-xs"
                >
                  Evaluar
                </Button>
                <Button
                  size="small"
                  icon={<BellOutlined />}
                  onClick={() => message.info('Próximamente')}
                  className="text-xs"
                >
                  Recordar
                </Button>
              </div>
            ) : (
              /* Vista desktop: lista vertical */
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Button
                  block
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setQuickEventModalVisible(true)}
                >
                  Evento Rápido
                </Button>
                <Button
                  block
                  size="small"
                  icon={<BookOutlined />}
                  onClick={() => safeNavigate('/teacher/tasks')}
                >
                  Nueva Tarea
                </Button>
                <Button
                  block
                  size="small"
                  icon={<TeamOutlined />}
                  onClick={() => safeNavigate('/teacher/evaluations')}
                >
                  Evaluación
                </Button>
                <Button
                  block
                  size="small"
                  icon={<BellOutlined />}
                  onClick={() => message.info('Función próximamente disponible')}
                >
                  Recordatorio
                </Button>
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* Weekly Schedule Tab */}
      <Card
        title={
          <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
            <CalendarOutlined className="mr-2" />
            {isMobile ? 'Semanal' : 'Horario Semanal'}
          </span>
        }
        className={isMobile ? 'mt-3' : 'mt-6'}
        size={isMobile ? 'small' : 'default'}
        bodyStyle={{ padding: isMobile ? '8px' : '24px' }}
      >
        <Table
          dataSource={teacherSchedule}
          columns={scheduleColumns}
          rowKey="id"
          pagination={isMobile ? { pageSize: 5, simple: true } : false}
          size="small"
          scroll={isMobile ? undefined : { x: 600 }}
        />
      </Card>

      {/* Quick Event - Drawer for mobile, Modal for desktop */}
      {isMobile ? (
        <Drawer
          title="Crear Evento"
          placement="bottom"
          height="85vh"
          open={quickEventModalVisible}
          onClose={() => {
            setQuickEventModalVisible(false);
            form.resetFields();
          }}
          styles={{ body: { padding: '12px', paddingBottom: '80px' } }}
          footer={
            <div className="flex gap-2 p-3 border-t bg-white">
              <Button
                block
                onClick={() => {
                  setQuickEventModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancelar
              </Button>
              <Button block type="primary" onClick={() => form.submit()}>
                Crear
              </Button>
            </div>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleQuickEvent}
            size="middle"
          >
            <Form.Item
              name="title"
              label={<span className="text-sm">Título</span>}
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <Input placeholder="Ej: Reunión" />
            </Form.Item>

            <Form.Item
              name="date"
              label={<span className="text-sm">Fecha y Hora</span>}
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder="Selecciona"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label={<span className="text-sm">Descripción</span>}
            >
              <Input.TextArea rows={2} placeholder="Descripción" />
            </Form.Item>

            <Form.Item
              name="classGroupId"
              label={<span className="text-sm">Grupo</span>}
            >
              <Select placeholder="Opcional">
                <Option value="grupo1">1º ESO A</Option>
                <Option value="grupo2">2º ESO B</Option>
              </Select>
            </Form.Item>
          </Form>
        </Drawer>
      ) : (
        <Modal
          title="Crear Evento Rápido"
          open={quickEventModalVisible}
          onCancel={() => {
            setQuickEventModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          width={500}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleQuickEvent}
          >
            <Form.Item
              name="title"
              label="Título del Evento"
              rules={[{ required: true, message: 'El título es requerido' }]}
            >
              <Input placeholder="Ej: Reunión de departamento" />
            </Form.Item>

            <Form.Item
              name="date"
              label="Fecha y Hora"
              rules={[{ required: true, message: 'La fecha es requerida' }]}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder="Selecciona fecha y hora"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Descripción (opcional)"
            >
              <Input.TextArea rows={3} placeholder="Descripción del evento" />
            </Form.Item>

            <Form.Item
              name="classGroupId"
              label="Grupo (opcional)"
            >
              <Select placeholder="Selecciona un grupo">
                <Option value="grupo1">1º ESO A</Option>
                <Option value="grupo2">2º ESO B</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Crear Evento
                </Button>
                <Button onClick={() => {
                  setQuickEventModalVisible(false);
                  form.resetFields();
                }}>
                  Cancelar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default TeacherCalendarPage;